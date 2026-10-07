import CSL from "@emurgo/cardano-serialization-lib-nodejs";
import { planApprovalEscrow } from "../adapters/approval-escrow-plan.mjs";
import { datumData } from "../adapters/escrow-transaction.mjs";

function verifyDraftSemantics(draft, intent, plan, fundingReference) {
  const tx = CSL.Transaction.from_hex(draft.cbor),
    body = tx.body(),
    witnesses = tx.witness_set();
  if (
    witnesses.vkeys()?.len() ||
    witnesses.bootstraps()?.len() ||
    body.mint() ||
    body.withdrawals() ||
    body.certs() ||
    body.reference_inputs() ||
    body.voting_procedures() ||
    body.voting_proposals() ||
    body.donation() ||
    body.current_treasury_value()
  )
    throw Error("Escrow backup unexpected transaction authority");
  const funding = draft.action === "fund",
    recipient = funding
      ? plan.protocol.scriptAddress
      : plan.requiredPayouts[draft.action].address;
  const outputs = body.outputs(),
    payouts = [];
  for (let i = 0; i < outputs.len(); i++) {
    const o = outputs.get(i);
    if (o.amount().multiasset()) throw Error("Escrow backup non-ADA output");
    if (o.address().to_bech32() === recipient) payouts.push(o);
  }
  if (
    payouts.length !== 1 ||
    payouts[0].amount().coin().to_str() !== String(intent.amountLovelace) ||
    Number(body.fee().to_str()) !== draft.feeLovelace ||
    BigInt(body.fee().to_str()) >
      BigInt(
        funding
          ? intent.fundingFeeBudgetLovelace
          : intent.closingFeeBudgetLovelace,
      )
  )
    throw Error("Escrow backup payout/fee mismatch");
  const expectedDatum = datumData(plan.datum).to_hex();
  if (draft.datumCbor !== expectedDatum)
    throw Error("Escrow backup intent/datum mismatch");
  const required = body.required_signers(),
    actualSigners = [];
  if (required)
    for (let i = 0; i < required.len(); i++)
      actualSigners.push(required.get(i).to_hex());
  if (
    JSON.stringify(actualSigners.sort()) !==
    JSON.stringify((funding ? [] : [...plan.signers[draft.action]]).sort())
  )
    throw Error("Escrow backup approval signer mismatch");
  if (funding) {
    if (
      payouts[0].plutus_data()?.to_hex() !== expectedDatum ||
      witnesses.plutus_scripts()?.len() ||
      witnesses.redeemers()?.len() ||
      body.collateral() ||
      body.script_data_hash()
    )
      throw Error("Escrow backup funding shape mismatch");
  } else {
    const redeemers = witnesses.redeemers(),
      scripts = witnesses.plutus_scripts();
    if (
      scripts?.len() !== 1 ||
      scripts.get(0).hash().to_hex() !== plan.protocol.scriptHash ||
      redeemers?.len() !== 1 ||
      witnesses.plutus_data()?.len() ||
      !body.script_data_hash() ||
      !body.collateral()?.len() ||
      !body.total_collateral() ||
      BigInt(body.total_collateral().to_str()) >
        BigInt(intent.collateralExposureLovelace)
    )
      throw Error("Escrow backup closing witness mismatch");
    const r = redeemers.get(0),
      index = Number(r.index().to_str());
    if (
      r.tag().kind() !== CSL.RedeemerTagKind.Spend ||
      !Number.isSafeInteger(index) ||
      index >= body.inputs().len() ||
      r.data().to_hex() !== datumData(plan.redeemers[draft.action]).to_hex()
    )
      throw Error("Escrow backup action/redeemer mismatch");
    const input = body.inputs().get(index);
    if (
      !fundingReference ||
      input.transaction_id().to_hex() !== fundingReference.txHash ||
      input.index() !== fundingReference.index
    )
      throw Error("Escrow backup redeemer input mismatch");
  }
}

// Recovery validation is structural; it never attests chain state or unlocks inputs.
export function inspectEscrowJournal(db, snapshot) {
  const tables = [
    "escrow_policy",
    "escrow_operations",
    "escrow_drafts",
    "escrow_input_locks",
  ];
  const present = tables.filter((name) =>
    db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
      .get(name),
  );
  if (!present.length) return [];
  if (present.length !== tables.length) throw Error("Incomplete escrow backup");
  const policies = db.prepare("SELECT id,digest FROM escrow_policy").all();
  if (
    policies.length !== 1 ||
    policies[0].id !== 1 ||
    !/^[a-f0-9]{64}$/.test(policies[0].digest)
  )
    throw Error("Escrow policy missing");
  const operations = db
    .prepare("SELECT id,effect_id,record FROM escrow_operations")
    .all();
  const drafts = db
    .prepare("SELECT tx_hash,operation_id,action,record FROM escrow_drafts")
    .all();
  const locks = db
    .prepare(
      "SELECT output_reference,operation_id,action FROM escrow_input_locks",
    )
    .all();
  const expectedLocks = new Map(),
    summaries = [];
  const phases = [
    "RESERVED",
    "FUNDED",
    "REVIEW_REQUIRED",
    ...["FUND", "ACCEPT", "CANCEL"].flatMap((a) => [
      a + "_PREPARED",
      a + "_UNKNOWN",
      ...(a === "FUND" ? [] : [a + "_OBSERVED"]),
    ]),
  ];
  for (const row of operations) {
    const r = JSON.parse(row.record),
      plan = planApprovalEscrow(r.contract.intent);
    const effect = snapshot.effects.find((e) => e.id === row.effect_id);
    if (
      row.id !== r.id ||
      r.contract.operationId !== r.id ||
      row.effect_id !== r.contract.intent.effectId ||
      r.intentSha256 !== plan.intentSha256 ||
      r.totalExposureLovelace !== plan.funding.totalExposureLovelace ||
      !phases.includes(r.status) ||
      !Number.isSafeInteger(r.revision) ||
      r.revision < 0 ||
      !effect ||
      effect.type !== "escrow" ||
      effect.objectiveId !== r.contract.intent.objectiveId ||
      effect.amount !== r.totalExposureLovelace ||
      !["reserved", "committed"].includes(effect.status)
    )
      throw Error("Escrow backup economic binding invalid");
    const own = drafts.filter((d) => d.operation_id === r.id),
      fund = own.find((d) => d.action === "fund");
    if (
      own.length > 2 ||
      own.filter((d) => d.action !== "fund").length > 1 ||
      (r.status === "RESERVED" ? own.length !== 0 : !fund)
    )
      throw Error("Escrow backup phase/draft invalid");
    for (const d of own) {
      const draft = JSON.parse(d.record);
      if (
        !["fund", "accept", "cancel"].includes(d.action) ||
        draft.action !== d.action ||
        draft.schema !== "mew.escrow-unsigned-draft.v1" ||
        draft.intentSha256 !== r.intentSha256 ||
        draft.scriptHash !== plan.protocol.scriptHash ||
        draft.txHash !== d.tx_hash ||
        draft.signingAllowed !== false ||
        draft.dispatchAllowed !== false ||
        draft.exposureReleaseAllowed !== false ||
        CSL.FixedTransaction.from_hex(draft.cbor)
          .transaction_hash()
          .to_hex() !== d.tx_hash ||
        !Array.isArray(draft.inputReferences) ||
        !draft.inputReferences.length
      )
        throw Error("Escrow backup draft invalid");
      verifyDraftSemantics(draft, r.contract.intent, plan, r.fundingReference);
      const body = CSL.Transaction.from_hex(draft.cbor).body(),
        actual = [];
      for (const inputs of [body.inputs(), body.collateral()])
        if (inputs)
          for (let i = 0; i < inputs.len(); i++) {
            const u = inputs.get(i);
            actual.push(`${u.transaction_id().to_hex()}#${u.index()}`);
          }
      if (
        JSON.stringify(actual.sort()) !==
        JSON.stringify([...draft.inputReferences].sort())
      )
        throw Error("Escrow backup CBOR/input lock mismatch");
      if (d.action === "fund") {
        const o = body.outputs().get(0);
        if (
          draft.scriptOutputIndex !== 0 ||
          o.address().to_bech32() !== plan.protocol.scriptAddress ||
          o.amount().coin().to_str() !==
            String(r.contract.intent.amountLovelace) ||
          o.plutus_data()?.to_hex() !== draft.datumCbor
        )
          throw Error("Escrow backup funded output mismatch");
      } else if (
        !r.fundingReference ||
        !actual.includes(
          `${r.fundingReference.txHash}#${r.fundingReference.index}`,
        )
      )
        throw Error("Escrow backup closing input mismatch");
      for (const ref of draft.inputReferences) {
        if (
          typeof ref !== "string" ||
          !/^[a-f0-9]{64}#[0-9]{1,5}$/.test(ref) ||
          expectedLocks.has(ref)
        )
          throw Error("Escrow backup repeated input");
        expectedLocks.set(ref, { operationId: r.id, action: d.action });
      }
    }
    const closeAction = r.status.startsWith("ACCEPT_")
      ? "accept"
      : r.status.startsWith("CANCEL_")
        ? "cancel"
        : null;
    if (closeAction && !own.some((d) => d.action === closeAction))
      throw Error("Escrow backup closing draft missing");
    const funded = [
      "FUNDED",
      ...["ACCEPT", "CANCEL"].flatMap((a) => [
        a + "_PREPARED",
        a + "_UNKNOWN",
        a + "_OBSERVED",
      ]),
    ].includes(r.status);
    if (funded && !r.observations.fund)
      throw Error("Escrow backup funding attestation missing");
    for (const [action, o] of Object.entries(r.observations)) {
      const d = own.find((d) => d.action === action);
      if (
        !d ||
        o.txHash !== d.tx_hash ||
        !/^[a-f0-9]{64}$/.test(o.blockHash) ||
        !Number.isSafeInteger(o.blockHeight) ||
        o.blockHeight < 0
      )
        throw Error("Escrow backup observation invalid");
    }
    if (
      r.observations.fund &&
      (!r.fundingReference ||
        r.fundingReference.txHash !== fund.tx_hash ||
        r.fundingReference.index !== JSON.parse(fund.record).scriptOutputIndex)
    )
      throw Error("Escrow backup output binding invalid");
    if (r.status.endsWith("_OBSERVED") && !r.observations[closeAction])
      throw Error("Escrow backup closing attestation missing");
    summaries.push({
      operationId: r.id,
      effectId: row.effect_id,
      status: r.status,
      draftHashes: own.map((d) => d.tx_hash),
      retainedExposureLovelace: r.totalExposureLovelace,
    });
  }
  if (
    drafts.some((d) => !operations.some((o) => o.id === d.operation_id)) ||
    locks.length !== expectedLocks.size ||
    locks.some((l) => {
      const e = expectedLocks.get(l.output_reference);
      return !e || e.operationId !== l.operation_id || e.action !== l.action;
    })
  )
    throw Error("Escrow backup orphan draft or missing input lock");
  return summaries;
}
