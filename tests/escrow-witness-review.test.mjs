import test from "node:test";
import assert from "node:assert/strict";
import CSL from "@emurgo/cardano-serialization-lib-nodejs";
import { bech32 } from "@scure/base";
import { buildEscrowDraft } from "../src/adapters/escrow-transaction.mjs";
import { reviewEscrowWitnesses } from "../src/adapters/escrow-witness-review.mjs";
import { fundingArgs, parameters } from "./helpers/escrow-fixture.mjs";
import { planApprovalEscrow } from "../src/adapters/approval-escrow-plan.mjs";
const nowMs = parameters.observedAtMs;
function fixture() {
  const key = CSL.PrivateKey.generate_ed25519();
  const address = bech32.encode(
    "addr_test",
    bech32.toWords(
      Uint8Array.from([0x60, ...key.to_public().hash().to_bytes()]),
    ),
    200,
  );
  const args = fundingArgs();
  args.intent.principalAddress = address;
  args.feeAddress = address;
  args.inputs[0].address = address;
  const draft = buildEscrowDraft(args, { nowMs });
  return { key, args, draft };
}
function signed(draft, keys, hash = draft.txHash) {
  const tx = CSL.Transaction.from_hex(draft.cbor),
    ws = tx.witness_set(),
    vkeys = CSL.Vkeywitnesses.new();
  for (const key of keys)
    vkeys.add(
      CSL.Vkeywitness.new(
        CSL.Vkey.new(key.to_public()),
        key.sign(Buffer.from(hash, "hex")),
      ),
    );
  ws.set_vkeys(vkeys);
  return CSL.Transaction.new(tx.body(), ws, tx.auxiliary_data()).to_hex();
}
test("verifies genuine ephemeral fixture signatures over exact draft body without granting dispatch", () => {
  const { key, args, draft } = fixture();
  const r = reviewEscrowWitnesses(args, signed(draft, [key]), { nowMs });
  assert.equal(r.allRequiredKeysPresent, true);
  assert.deepEqual(r.missingSigningKeys, []);
  assert.equal(r.dispatchAllowed, false);
  assert.equal(r.signingAllowed, false);
  assert.equal(r.ledgerEvaluationPerformed, false);
  assert.equal(r.synthetic, true);
  assert.equal(r.txHash, draft.txHash);
});
test("an unsigned original is a bounded incomplete review, never approved", () => {
  const { args, draft } = fixture();
  const r = reviewEscrowWitnesses(args, draft.cbor, { nowMs });
  assert.equal(r.allRequiredKeysPresent, false);
  assert.equal(r.missingSigningKeys.length, 1);
  assert.equal(r.paymentsEnabled, false);
});
test("rejects changed body even when the signer supplies a valid signature for that body", () => {
  const { key, args, draft } = fixture();
  const tx = CSL.Transaction.from_hex(draft.cbor),
    bodyJson = JSON.parse(tx.body().to_json());
  bodyJson.fee = "999999";
  const body = CSL.TransactionBody.from_json(JSON.stringify(bodyJson));
  const modified = CSL.Transaction.new(body, tx.witness_set());
  const hash = CSL.FixedTransaction.from_hex(modified.to_hex())
    .transaction_hash()
    .to_hex();
  assert.throws(
    () =>
      reviewEscrowWitnesses(
        args,
        signed({ ...draft, cbor: modified.to_hex() }, [key], hash),
        { nowMs },
      ),
    /body/,
  );
});
test("rejects an invalid signature and unrequired key witnesses", () => {
  const { key, args, draft } = fixture();
  assert.throws(
    () =>
      reviewEscrowWitnesses(args, signed(draft, [key], "0".repeat(64)), {
        nowMs,
      }),
    /signature/,
  );
  assert.throws(
    () =>
      reviewEscrowWitnesses(
        args,
        signed(draft, [CSL.PrivateKey.generate_ed25519()]),
        { nowMs },
      ),
    /Unexpected signing key/,
  );
});
test("rejects attached auxiliary data and invalid-contract flag", () => {
  const { args, draft } = fixture();
  const tx = CSL.Transaction.from_hex(draft.cbor),
    aux = CSL.AuxiliaryData.new(),
    metadata = CSL.GeneralTransactionMetadata.new();
  metadata.insert(
    CSL.BigNum.from_str("1"),
    CSL.TransactionMetadatum.new_text("changed"),
  );
  aux.set_metadata(metadata);
  assert.throws(
    () =>
      reviewEscrowWitnesses(
        args,
        CSL.Transaction.new(tx.body(), tx.witness_set(), aux).to_hex(),
        { nowMs },
      ),
    /auxiliary/,
  );
  tx.set_is_valid(false);
  assert.throws(
    () => reviewEscrowWitnesses(args, tx.to_hex(), { nowMs }),
    /validity/,
  );
});
test("rejects changed script witness bytes and malformed or oversized CBOR", () => {
  const { args, draft } = fixture();
  const tx = CSL.Transaction.from_hex(draft.cbor),
    ws = tx.witness_set(),
    scripts = CSL.PlutusScripts.new();
  scripts.add(CSL.PlutusScript.new_v3(Buffer.from("00", "hex")));
  ws.set_plutus_scripts(scripts);
  assert.throws(
    () =>
      reviewEscrowWitnesses(args, CSL.Transaction.new(tx.body(), ws).to_hex(), {
        nowMs,
      }),
    /witness/,
  );
  for (const hex of ["", "00", draft.cbor.toUpperCase(), "00".repeat(131073)])
    assert.throws(() => reviewEscrowWitnesses(args, hex, { nowMs }));
});
test("partial accept witnesses preserve original V3 scripts and require all three enrolled fixture keys", () => {
  const { key: principal, args: funding, draft: funded } = fixture(),
    provider = CSL.PrivateKey.generate_ed25519(),
    feeKey = CSL.PrivateKey.generate_ed25519(),
    address = (key) =>
      bech32.encode(
        "addr_test",
        bech32.toWords(
          Uint8Array.from([0x60, ...key.to_public().hash().to_bytes()]),
        ),
        200,
      );
  funding.intent.providerAddress = address(provider);
  const fresh = buildEscrowDraft(funding, { nowMs });
  const args = {
    ...funding,
    action: "accept",
    feeAddress: address(feeKey),
    inputs: [
      {
        txHash: "1".repeat(64),
        index: 0,
        address: address(feeKey),
        lovelace: 5000000,
      },
    ],
    collateral: [
      {
        txHash: "2".repeat(64),
        index: 0,
        address: address(feeKey),
        lovelace: 3000000,
      },
    ],
    escrowInput: {
      txHash: fresh.txHash,
      index: 0,
      address: planApprovalEscrow(funding.intent).protocol.scriptAddress,
      lovelace: funding.intent.amountLovelace,
      datumCbor: fresh.datumCbor,
    },
    executionUnits: { memory: 1000000, steps: 100000000 },
  };
  const draft = buildEscrowDraft(args, { nowMs });
  const partial = reviewEscrowWitnesses(args, signed(draft, [principal]), {
    nowMs,
  });
  assert.equal(partial.allRequiredKeysPresent, false);
  assert.equal(partial.missingSigningKeys.length, 2);
  const full = reviewEscrowWitnesses(
    args,
    signed(draft, [principal, provider, feeKey]),
    { nowMs },
  );
  assert.equal(full.allRequiredKeysPresent, true);
  assert.equal(full.nonKeyWitnessesUnchanged, true);
  assert.equal(full.ledgerEvaluationPerformed, false);
});
