import CSL from "@emurgo/cardano-serialization-lib-nodejs";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  planApprovalEscrow,
  decodeEscrowAddress,
} from "./approval-escrow-plan.mjs";
const sha = (v) => createHash("sha256").update(v).digest("hex");
const bn = (v) => CSL.BigNum.from_str(String(v));
const integer = (v, min = 1) => {
  if (!Number.isSafeInteger(v) || v < min)
    throw Error("Invalid integer transaction parameter");
  return v;
};
const exact = (v, keys) => {
  if (
    !v ||
    Object.getPrototypeOf(v) !== Object.prototype ||
    Object.keys(v).length !== keys.length ||
    keys.some((k) => !Object.hasOwn(v, k))
  )
    throw Error("Invalid transaction fields");
};
const inputRef = (u) =>
  CSL.TransactionInput.new(CSL.TransactionHash.from_hex(u.txHash), u.index);
const value = (v) => CSL.Value.new(bn(v));
const address = (v) => CSL.Address.from_bech32(v);
export const datumData = (json) =>
  CSL.PlutusData.from_json(
    JSON.stringify(json),
    CSL.PlutusDatumSchema.DetailedSchema,
  );

function keyInputs(rows, expectedAddress, seen) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 20)
    throw Error("Bounded explicit UTxOs required");
  return rows.map((u) => {
    exact(u, ["txHash", "index", "address", "lovelace"]);
    if (!/^[a-f0-9]{64}$/.test(u.txHash)) throw Error("Invalid input hash");
    integer(u.index, 0);
    if (u.index > 65535) throw Error("Input index exceeds supported range");
    integer(u.lovelace);
    decodeEscrowAddress(u.address);
    if (u.address !== expectedAddress)
      throw Error("Unexpected input owner/address");
    const ref = `${u.txHash}#${u.index}`;
    if (seen.has(ref)) throw Error("Repeated or overlapping UTxO");
    seen.add(ref);
    return u;
  });
}
function config(p) {
  for (const k of [
    "minFeeA",
    "minFeeB",
    "coinsPerUtxoByte",
    "maxTxSize",
    "maxValueSize",
    "keyDeposit",
    "poolDeposit",
    "collateralPercentage",
    "maxCollateralInputs",
    "maxTxExMem",
    "maxTxExSteps",
  ])
    integer(p[k]);
  const unit = (v) => {
    exact(v, ["numerator", "denominator"]);
    integer(v.numerator);
    integer(v.denominator);
    return CSL.UnitInterval.new(bn(v.numerator), bn(v.denominator));
  };
  return CSL.TransactionBuilderConfigBuilder.new()
    .fee_algo(CSL.LinearFee.new(bn(p.minFeeA), bn(p.minFeeB)))
    .coins_per_utxo_byte(bn(p.coinsPerUtxoByte))
    .pool_deposit(bn(p.poolDeposit))
    .key_deposit(bn(p.keyDeposit))
    .max_value_size(p.maxValueSize)
    .max_tx_size(p.maxTxSize)
    .ex_unit_prices(CSL.ExUnitPrices.new(unit(p.priceMem), unit(p.priceStep)))
    .do_not_burn_extra_change(true)
    .build();
}

/** Real unsigned CBOR only. Supplied parameters/UTxOs are trusted operator inputs,
 * not verified chain facts. No wallet, witness signing, dispatch or fee release. */
export function buildEscrowDraft(args, { nowMs = Date.now() } = {}) {
  args = structuredClone(args);
  exact(args, [
    "intent",
    "action",
    "inputs",
    "feeAddress",
    "collateral",
    "escrowInput",
    "parameters",
    "executionUnits",
  ]);
  const {
    intent,
    action,
    inputs,
    feeAddress,
    collateral,
    escrowInput,
    parameters: p,
    executionUnits,
  } = args;
  if (!["fund", "accept", "cancel"].includes(action))
    throw Error("Invalid escrow action");
  integer(nowMs, 0);
  if (
    p.network !== "cardano:preprod" ||
    p.networkMagic !== 1 ||
    !["fixture", "preprod-observed"].includes(p.kind)
  )
    throw Error("Explicit preprod parameter context required");
  integer(p.observedAtMs, 0);
  integer(p.slot, 0);
  if (
    p.slot > Number.MAX_SAFE_INTEGER - 600 ||
    p.observedAtMs > nowMs ||
    nowMs - p.observedAtMs > 600000
  )
    throw Error("Stale or future parameter snapshot");
  const plan = planApprovalEscrow(intent),
    feeOwner = decodeEscrowAddress(feeAddress);
  const blueprintRaw = readFileSync(
    new URL("../../contracts/approval-escrow/plutus.json", import.meta.url),
  );
  if (sha(blueprintRaw) !== plan.protocol.blueprintSha256)
    throw Error("Compiled blueprint changed");
  const validator = JSON.parse(blueprintRaw).validators.find((v) =>
    v.title.endsWith(".spend"),
  );
  // Aiken compiledCode is already singly CBOR-wrapped; preserving these bytes
  // as script bytes adds the witness wrapper and matches the blueprint hash.
  const script = CSL.PlutusScript.new_v3(
    Buffer.from(validator.compiledCode, "hex"),
  );
  if (script.hash().to_hex() !== plan.protocol.scriptHash)
    throw Error("Plutus version/wrapping mismatch");
  const datum = datumData(plan.datum),
    datumCbor = datum.to_hex();
  if (
    datumData(
      JSON.parse(
        CSL.PlutusData.from_hex(datumCbor).to_json(
          CSL.PlutusDatumSchema.DetailedSchema,
        ),
      ),
    ).to_hex() !== datumCbor
  )
    throw Error("Datum serialization drift");
  const builder = CSL.TransactionBuilder.new(config(p)),
    seen = new Set();
  const keys = keyInputs(inputs, feeAddress, seen);
  let scriptInput, costs;
  if (action === "fund") {
    if (
      feeAddress !== intent.principalAddress ||
      escrowInput !== null ||
      executionUnits !== null ||
      collateral.length
    )
      throw Error("Funding shape mismatch");
  } else {
    const payout = plan.requiredPayouts[action];
    if (feeAddress === payout.address)
      throw Error("Recipient cannot fund closing fees/change");
    exact(escrowInput, ["txHash", "index", "address", "lovelace", "datumCbor"]);
    if (
      !/^[a-f0-9]{64}$/.test(escrowInput.txHash) ||
      !Number.isSafeInteger(escrowInput.index) ||
      escrowInput.index < 0 ||
      escrowInput.index > 65535 ||
      escrowInput.address !== plan.protocol.scriptAddress ||
      escrowInput.lovelace !== intent.amountLovelace ||
      escrowInput.datumCbor !== datumCbor
    )
      throw Error("Exact funded escrow reference/datum/value required");
    const ref = `${escrowInput.txHash}#${escrowInput.index}`;
    if (seen.has(ref)) throw Error("Repeated escrow input");
    seen.add(ref);
    scriptInput = escrowInput;
    exact(executionUnits, ["memory", "steps"]);
    integer(executionUnits.memory);
    integer(executionUnits.steps);
    if (
      executionUnits.memory > p.maxTxExMem ||
      executionUnits.steps > p.maxTxExSteps
    )
      throw Error("Execution budget exceeds protocol parameters");
    if (
      !Array.isArray(p.costModelV3) ||
      p.costModelV3.length < 251 ||
      p.costModelV3.length > 400 ||
      p.costModelV3.some((v) => !Number.isSafeInteger(v))
    )
      throw Error("Versioned V3 cost model required");
    costs = CSL.Costmdls.new();
    const cost = CSL.CostModel.new();
    p.costModelV3.forEach((v, i) => cost.set(i, CSL.Int.from_str(String(v))));
    costs.insert(CSL.Language.new_plutus_v3(), cost);
    const redeemer = CSL.Redeemer.new(
      CSL.RedeemerTag.new_spend(),
      bn(0),
      datumData(plan.redeemers[action]),
      CSL.ExUnits.new(bn(executionUnits.memory), bn(executionUnits.steps)),
    );
    builder.add_plutus_script_input(
      CSL.PlutusWitness.new_without_datum(script, redeemer),
      inputRef(escrowInput),
      value(escrowInput.lovelace),
    );
    const collateralKeys = keyInputs(collateral, feeAddress, seen);
    if (collateralKeys.length > p.maxCollateralInputs)
      throw Error("Too many collateral inputs");
    const collateralSum = collateralKeys.reduce(
      (sum, u) => sum + BigInt(u.lovelace),
      0n,
    );
    if (collateralSum > BigInt(intent.collateralExposureLovelace))
      throw Error("Collateral exceeds reserved exposure");
    const cb = CSL.TxInputsBuilder.new();
    for (const u of collateralKeys)
      cb.add_key_input(
        CSL.Ed25519KeyHash.from_hex(feeOwner.paymentKeyHash),
        inputRef(u),
        value(u.lovelace),
      );
    builder.set_collateral(cb);
    // Conservatively expose the complete selected collateral, with no return.
    builder.set_total_collateral(bn(collateralSum));
    for (const key of plan.signers[action])
      builder.add_required_signer(CSL.Ed25519KeyHash.from_hex(key));
  }
  for (const u of keys)
    builder.add_key_input(
      CSL.Ed25519KeyHash.from_hex(feeOwner.paymentKeyHash),
      inputRef(u),
      value(u.lovelace),
    );
  if (costs) builder.calc_script_data_hash(costs);
  const target =
    action === "fund"
      ? plan.protocol.scriptAddress
      : plan.requiredPayouts[action].address;
  const output = CSL.TransactionOutput.new(
    address(target),
    value(intent.amountLovelace),
  );
  if (action === "fund") output.set_plutus_data(datum);
  const minimum = CSL.min_ada_for_output(
    output,
    CSL.DataCost.new_coins_per_byte(bn(p.coinsPerUtxoByte)),
  );
  if (BigInt(intent.amountLovelace) < BigInt(minimum.to_str()))
    throw Error("Actual serialized output is below minimum ADA");
  builder.add_output(output);
  builder.set_validity_start_interval_bignum(bn(p.slot));
  builder.set_ttl_bignum(bn(p.slot + 600));
  builder.add_change_if_needed(address(feeAddress));
  const tx = builder.build_tx(),
    body = tx.body(),
    fee = BigInt(body.fee().to_str()),
    feeCap = BigInt(
      action === "fund"
        ? intent.fundingFeeBudgetLovelace
        : intent.closingFeeBudgetLovelace,
    );
  if (fee > feeCap) throw Error("Calculated fee exceeds reserved fee budget");
  if (
    action !== "fund" &&
    BigInt(body.total_collateral().to_str()) * 100n <
      fee * BigInt(p.collateralPercentage)
  )
    throw Error("Insufficient collateral for calculated fee");
  let outputSum = 0n;
  for (let i = 0; i < body.outputs().len(); i++) {
    const o = body.outputs().get(i);
    outputSum += BigInt(o.amount().coin().to_str());
    if (o.amount().multiasset()) throw Error("Non-ADA output");
    if (
      BigInt(o.amount().coin().to_str()) <
      BigInt(
        CSL.min_ada_for_output(
          o,
          CSL.DataCost.new_coins_per_byte(bn(p.coinsPerUtxoByte)),
        ).to_str(),
      )
    )
      throw Error("Change below minimum ADA");
  }
  const inputSum = keys.reduce(
    (n, u) => n + BigInt(u.lovelace),
    scriptInput ? BigInt(scriptInput.lovelace) : 0n,
  );
  if (inputSum !== outputSum + fee) throw Error("Value conservation failed");
  const cbor = tx.to_hex(),
    roundTrip = CSL.Transaction.from_hex(cbor);
  if (roundTrip.to_hex() !== cbor)
    throw Error("Transaction CBOR round trip mismatch");
  if (tx.witness_set().vkeys()?.len() || tx.witness_set().bootstraps()?.len())
    throw Error("Unexpected signing witness");
  const txHash = CSL.FixedTransaction.from_hex(cbor)
    .transaction_hash()
    .to_hex();
  return {
    schema: "mew.escrow-unsigned-draft.v1",
    network: "cardano:preprod",
    networkMagic: 1,
    action,
    intentSha256: plan.intentSha256,
    parameterSnapshotSha256: sha(JSON.stringify(p)),
    txHash,
    cbor,
    datumCbor,
    scriptHash: plan.protocol.scriptHash,
    feeLovelace: Number(fee),
    minimumOutputLovelace: Number(minimum.to_str()),
    inputReferences: [...seen],
    requiredSigningKeys: [
      ...new Set([
        feeOwner.paymentKeyHash,
        ...(action === "fund" ? [] : plan.signers[action]),
      ]),
    ],
    scriptOutputIndex: action === "fund" ? 0 : null,
    synthetic: p.kind === "fixture",
    ledgerEvaluationPerformed: false,
    signingAllowed: false,
    dispatchAllowed: false,
    exposureReleaseAllowed: false,
    blockers: [
      "UTxOs and parameter provenance require independent fresh chain verification",
      "Redeemer execution units require evaluation against this exact transaction",
      "External principal/provider signing review and approved wallet remain required",
      "Independent contract audit and funded preprod lifecycle remain pending",
    ],
  };
}
