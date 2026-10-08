import test from "node:test";
import assert from "node:assert/strict";
import CSL from "@emurgo/cardano-serialization-lib-nodejs";
import { assembleEscrowWitnesses } from "../src/adapters/escrow-witness-assembly.mjs";
import { buildEscrowDraft } from "../src/adapters/escrow-transaction.mjs";
import { planApprovalEscrow } from "../src/adapters/approval-escrow-plan.mjs";
import { fundingArgs, parameters } from "./helpers/escrow-fixture.mjs";
const options = { nowMs: parameters.observedAtMs };
const address = (key) => CSL.EnterpriseAddress.new(0,
  CSL.Credential.from_keyhash(key.to_public().hash())).to_address().to_bech32();
function fixture(action = "fund") {
  const principal = CSL.PrivateKey.generate_ed25519(), provider = CSL.PrivateKey.generate_ed25519();
  const args = fundingArgs();
  args.intent.principalAddress = args.feeAddress = args.inputs[0].address = address(principal);
  args.intent.providerAddress = address(provider);
  const funding = buildEscrowDraft(args, options);
  if (action === "accept") {
    args.action = action;
    args.inputs = [{ txHash: "1".repeat(64), index: 0, address: address(principal), lovelace: 5000000 }];
    args.collateral = [{ txHash: "2".repeat(64), index: 0, address: address(principal), lovelace: 3000000 }];
    args.escrowInput = { txHash: funding.txHash, index: 0,
      address: planApprovalEscrow(args.intent).protocol.scriptAddress,
      lovelace: args.intent.amountLovelace, datumCbor: funding.datumCbor };
    args.executionUnits = { memory: 1000000, steps: 100000000 };
  }
  return { args, principal, provider, draft: buildEscrowDraft(args, options) };
}
function witnessSet(key, hash) {
  const ws = CSL.TransactionWitnessSet.new(), keys = CSL.Vkeywitnesses.new();
  keys.add(CSL.Vkeywitness.new(CSL.Vkey.new(key.to_public()), key.sign(Buffer.from(hash, "hex"))));
  ws.set_vkeys(keys);
  return ws.to_hex();
}
test("assembles CIP-30 fixture key witnesses without changing body, script witnesses or granting submission", () => {
  const f = fixture("accept");
  const partial = assembleEscrowWitnesses(f.args, [witnessSet(f.principal, f.draft.txHash)], options);
  assert.equal(partial.review.allRequiredKeysPresent, false);
  const full = assembleEscrowWitnesses(f.args, [witnessSet(f.principal, f.draft.txHash), witnessSet(f.provider, f.draft.txHash)], options);
  assert.equal(full.review.allRequiredKeysPresent, true);
  assert.equal(full.review.bodyBytesUnchanged, true);
  assert.equal(full.review.nonKeyWitnessesUnchanged, true);
  assert.equal(full.signatureCreated, false);
  assert.equal(full.walletInvoked, false);
  assert.equal(full.dispatchAllowed, false);
  assert.equal(CSL.FixedTransaction.from_hex(full.cbor).transaction_hash().to_hex(), f.draft.txHash);
});
test("repeated identical external witnesses are idempotent", () => {
  const f = fixture(), ws = witnessSet(f.principal, f.draft.txHash);
  const r = assembleEscrowWitnesses(f.args, [ws, ws], options);
  assert.equal(CSL.Transaction.from_hex(r.cbor).witness_set().vkeys().len(), 1);
  assert.equal(r.review.allRequiredKeysPresent, true);
});
test("wrong transaction signature, foreign signer and wallet-supplied scripts are rejected", () => {
  const f = fixture();
  assert.throws(() => assembleEscrowWitnesses(f.args, [witnessSet(f.principal, "0".repeat(64))], options), /signature/);
  assert.throws(() => assembleEscrowWitnesses(f.args, [witnessSet(CSL.PrivateKey.generate_ed25519(), f.draft.txHash)], options), /Unexpected signing/);
  const ws = CSL.TransactionWitnessSet.from_hex(witnessSet(f.principal, f.draft.txHash)), scripts = CSL.PlutusScripts.new();
  scripts.add(CSL.PlutusScript.new_v3(Buffer.from("00", "hex"))); ws.set_plutus_scripts(scripts);
  assert.throws(() => assembleEscrowWitnesses(f.args, [ws.to_hex()], options), /Only key/);
});
test("empty/full-transaction/malformed/oversized witness input cannot masquerade as a CIP-30 witness set", () => {
  const f = fixture();
  for (const rows of [[], [""], ["00"], [f.draft.cbor], ["00".repeat(16385)], Array(17).fill("a0")])
    assert.throws(() => assembleEscrowWitnesses(f.args, rows, options));
});
