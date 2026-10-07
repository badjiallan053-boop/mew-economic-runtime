import test from "node:test";
import assert from "node:assert/strict";
import CSL from "@emurgo/cardano-serialization-lib-nodejs";
import {
  buildEscrowDraft,
  datumData,
} from "../src/adapters/escrow-transaction.mjs";
import { planApprovalEscrow } from "../src/adapters/approval-escrow-plan.mjs";
import {
  addr,
  intent,
  keyInput,
  fundingArgs,
  parameters,
} from "./helpers/escrow-fixture.mjs";
const build = (args) =>
  buildEscrowDraft(args, { nowMs: parameters.observedAtMs });
const closing = (action) => {
  const f = build(fundingArgs()),
    i = intent();
  return {
    ...fundingArgs(),
    action,
    inputs: [keyInput("a", 3, 5000000)],
    feeAddress: addr(3),
    collateral: [keyInput("d", 3, 3000000)],
    escrowInput: {
      txHash: f.txHash,
      index: f.scriptOutputIndex,
      address: planApprovalEscrow(i).protocol.scriptAddress,
      lovelace: i.amountLovelace,
      datumCbor: f.datumCbor,
    },
    executionUnits: { memory: 1000000, steps: 100000000 },
  };
};
test("funding creates real unsigned CBOR with inline datum, exact script identity, minimum output and conserved change", () => {
  const f = build(fundingArgs()),
    tx = CSL.Transaction.from_hex(f.cbor),
    o = tx.body().outputs().get(0);
  assert.equal(
    o.address().to_bech32(),
    planApprovalEscrow(intent()).protocol.scriptAddress,
  );
  assert.equal(o.plutus_data().to_hex(), f.datumCbor);
  assert.equal(o.data_hash(), undefined);
  assert.ok(f.feeLovelace <= intent().fundingFeeBudgetLovelace);
  assert.ok(f.minimumOutputLovelace <= intent().amountLovelace);
  assert.equal(f.dispatchAllowed, false);
  assert.equal(f.signingAllowed, false);
  assert.equal(f.synthetic, true);
  assert.equal(tx.witness_set().vkeys(), undefined);
  assert.equal(
    CSL.FixedTransaction.from_hex(f.cbor).transaction_hash().to_hex(),
    f.txHash,
  );
  assert.equal(build(fundingArgs()).cbor, f.cbor);
});
test("accept/cancel drafts encode V3 witness, exact payout, required signers, disjoint collateral and correct sorted redeemer index", () => {
  for (const action of ["accept", "cancel"]) {
    const args = closing(action),
      d = build(args),
      tx = CSL.Transaction.from_hex(d.cbor),
      body = tx.body(),
      ws = tx.witness_set(),
      plan = planApprovalEscrow(intent());
    assert.equal(
      body.outputs().get(0).address().to_bech32(),
      plan.requiredPayouts[action].address,
    );
    assert.equal(body.outputs().get(0).amount().coin().to_str(), "3000000");
    assert.equal(ws.plutus_scripts().get(0).hash().to_hex(), d.scriptHash);
    assert.equal(ws.plutus_data(), undefined);
    const redeemer = ws.redeemers().get(0);
    assert.equal(
      redeemer.data().to_hex(),
      datumData(plan.redeemers[action]).to_hex(),
    );
    const ref = body.inputs().get(Number(redeemer.index().to_str()));
    assert.equal(ref.transaction_id().to_hex(), args.escrowInput.txHash);
    assert.equal(ref.index(), args.escrowInput.index);
    assert.equal(body.required_signers().len(), action === "accept" ? 2 : 1);
    assert.equal(body.collateral().len(), 1);
    assert.equal(body.total_collateral().to_str(), "3000000");
    assert.equal(d.ledgerEvaluationPerformed, false);
    assert.equal(d.signingAllowed, false);
  }
});
test("datum address serialization agrees with independent CSL ledger conversion", () => {
  const data = datumData(planApprovalEscrow(intent()).datum);
  for (const [index, a] of [
    [1, intent().principalAddress],
    [2, intent().providerAddress],
  ])
    assert.equal(
      data.as_constr_plutus_data().data().get(index).to_hex(),
      CSL.PlutusData.from_address(CSL.Address.from_bech32(a)).to_hex(),
    );
});
test("rejects stale/wrong network parameters, below ledger minimum, insufficient fee budget and unauthorized funding owner", () => {
  for (const change of [
    (a) => (a.parameters.networkMagic = 2),
    (a) => (a.parameters.observedAtMs -= 600001),
    (a) => {
      a.intent.amountLovelace = 1000000;
      a.intent.minimumOutputLovelace = 1;
    },
    (a) => (a.intent.fundingFeeBudgetLovelace = 1),
    (a) => (a.feeAddress = addr(3)),
    (a) => (a.inputs[0].nativeAsset = "forbidden"),
  ]) {
    const a = fundingArgs();
    change(a);
    assert.throws(() => build(a));
  }
});
test("rejects substituted escrow reference/data/value, recipient-owned fees and overlapping/oversized collateral", () => {
  for (const change of [
    (a) => (a.escrowInput.datumCbor = "d87980"),
    (a) => (a.escrowInput.address = addr(4)),
    (a) => (a.escrowInput.lovelace = 2),
    (a) => (a.inputs[0].lovelace = 1000),
    (a) => (a.feeAddress = addr(2)),
    (a) => (a.collateral[0].txHash = a.inputs[0].txHash),
    (a) => (a.collateral[0].lovelace = 3000001),
    (a) => (a.executionUnits.memory = parameters.maxTxExMem + 1),
  ]) {
    const a = closing("accept");
    change(a);
    assert.throws(() => build(a));
  }
});
