import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { EscrowStore } from "../src/server/escrow-store.mjs";
import {
  addr,
  intent,
  keyInput,
  fundingArgs,
  parameters,
} from "./helpers/escrow-fixture.mjs";
import { planApprovalEscrow } from "../src/adapters/approval-escrow-plan.mjs";
const parties = {
    principals: [{ id: "p", address: addr(1) }],
    providers: [{ id: "vendor", address: addr(2) }],
  },
  reserve = () => ({
    operationId: "op",
    principal: "p",
    provider: "vendor",
    agent: "builder",
    intent: intent(),
  }),
  options = { nowMs: parameters.observedAtMs };
function setup(path = ":memory:") {
  const s = new EscrowStore(path, { ...parties, mode: "demo" });
  s.transact((k) =>
    k.createObjective({
      id: "o",
      principal: "p",
      semanticKey: "one-report",
      quantity: 1,
      maxExposure: 9000000,
    }),
  );
  return s;
}
const provider = (
  draft,
  { block = "f", height = 100, tip = 104, gate } = {},
) => ({
  projectId: "fixture",
  fetchImpl: async (url, opts) => {
    if (gate) await gate;
    assert.ok(url.startsWith("https://cardano-preprod.blockfrost.io/api/v0/"));
    assert.equal(opts.redirect, "error");
    return {
      ok: true,
      json: async () =>
        url.endsWith("/blocks/latest")
          ? { hash: "9".repeat(64), height: tip }
          : {
              hash: draft.txHash,
              block: block.repeat(64),
              block_height: height,
              valid_contract: true,
            },
    };
  },
});
const closing = (s, action) => {
  const f = s.draft("op", "fund");
  return {
    ...fundingArgs(),
    action,
    feeAddress: addr(3),
    inputs: [keyInput("a", 3, 5000000)],
    collateral: [keyInput("d", 3, 3000000)],
    escrowInput: {
      txHash: f.txHash,
      index: f.scriptOutputIndex,
      address: planApprovalEscrow(intent()).protocol.scriptAddress,
      lovelace: intent().amountLovelace,
      datumCbor: f.datumCbor,
    },
    executionUnits: { memory: 1000000, steps: 100000000 },
  };
};
test("escrow reserves full lifecycle exposure and immutable outbox atomically; duplicate/equivalent operations cannot reserve twice", () => {
  const s = setup();
  try {
    assert.equal(s.reserveEscrow(reserve()).decision, "ALLOW");
    assert.equal(s.read().position("o").exposure, 8350000);
    assert.equal(s.reserveEscrow(reserve()).decision, "DEFER");
    assert.equal(
      s.reserveEscrow({
        ...reserve(),
        operationId: "second",
        intent: { ...intent(), effectId: "other" },
      }).decision,
      "DEFER",
    );
    assert.throws(() =>
      s.reserveEscrow({
        ...reserve(),
        intent: { ...intent(), artifactSha256: "c".repeat(64) },
      }),
    );
    assert.throws(() =>
      s.reserveEscrow({
        ...reserve(),
        intent: { ...intent(), principalAddress: addr(4) },
      }),
    );
  } finally {
    s.close();
  }
});
test("failed journal insert rolls economic reservation back", () => {
  const s = setup();
  try {
    s.db.exec(
      "CREATE TRIGGER fail_escrow BEFORE INSERT ON escrow_operations BEGIN SELECT RAISE(ABORT,'fixture'); END;",
    );
    assert.throws(() => s.reserveEscrow(reserve()));
    assert.equal(s.read().position("o").exposure, 0);
    assert.equal(s.operation("op"), null);
  } finally {
    s.close();
  }
});
test("prepared hashes/input locks and unknown submission survive restart; replacement/retry stays blocked", () => {
  const dir = mkdtempSync(join(tmpdir(), "mew-escrow-")),
    path = join(dir, "db");
  let s = setup(path);
  try {
    s.reserveEscrow(reserve());
    const d = s.prepareDraft("op", fundingArgs(), options);
    assert.equal(d.idempotent, false);
    s.markSubmissionUnknown("op", "fund");
    s.close();
    s = new EscrowStore(path, { ...parties });
    assert.equal(s.operation("op").status, "FUND_UNKNOWN");
    assert.equal(s.read().position("o").exposure, 8350000);
    assert.equal(s.prepareDraft("op", fundingArgs(), options).idempotent, true);
    const replacement = fundingArgs();
    replacement.inputs[0].txHash = "e".repeat(64);
    assert.throws(() => s.prepareDraft("op", replacement, options));
    assert.equal(
      s.db.prepare("SELECT COUNT(*) AS n FROM escrow_input_locks").get().n,
      1,
    );
  } finally {
    s.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("funding confirmation binds exact output, permits one closing draft, and observed cancellation retains unreconciled fees/collateral exposure", async () => {
  const s = setup();
  try {
    s.reserveEscrow(reserve());
    const f = s.prepareDraft("op", fundingArgs(), options);
    s.markSubmissionUnknown("op", "fund");
    const funded = await s.observeDraft("op", "fund", provider(f));
    assert.equal(funded.operation.status, "FUNDED");
    assert.equal(s.read().position("o").committed, 8350000);
    const bad = closing(s, "cancel");
    bad.escrowInput.txHash = "0".repeat(64);
    assert.throws(() => s.prepareDraft("op", bad, options));
    const c = s.prepareDraft("op", closing(s, "cancel"), options);
    assert.throws(() => s.prepareDraft("op", closing(s, "accept"), options));
    s.markSubmissionUnknown("op", "cancel");
    const seen = await s.observeDraft("op", "cancel", provider(c));
    assert.equal(seen.operation.status, "CANCEL_OBSERVED");
    assert.equal(seen.exposureReleaseAllowed, false);
    assert.equal(s.read().position("o").exposure, 8350000);
    assert.equal(s.read().position("o").refunded, 0);
    assert.equal(s.read().position("o").spent, 0);
  } finally {
    s.close();
  }
});
test("re-inclusion or unavailable observation quarantines without rewriting original binding or releasing capacity", async () => {
  const s = setup();
  try {
    s.reserveEscrow(reserve());
    const f = s.prepareDraft("op", fundingArgs(), options);
    await s.observeDraft("op", "fund", provider(f));
    const r = await s.observeDraft(
      "op",
      "fund",
      provider(f, { block: "8", height: 101 }),
    );
    assert.equal(r.operation.status, "REVIEW_REQUIRED");
    assert.equal(r.operation.observations.fund.blockHash, "f".repeat(64));
    assert.throws(() => s.prepareDraft("op", closing(s, "accept"), options));
    await s.observeDraft("op", "fund", provider(f));
    assert.equal(s.operation("op").status, "REVIEW_REQUIRED");
    assert.equal(s.read().position("o").exposure, 8350000);
  } finally {
    s.close();
  }
});
test("asynchronous observations are fenced and cannot override transaction/binding fields through provider options", async () => {
  const s = setup();
  try {
    s.reserveEscrow(reserve());
    const f = s.prepareDraft("op", fundingArgs(), options);
    await assert.rejects(
      s.observeDraft("op", "fund", { ...provider(f), txHash: "0".repeat(64) }),
    );
    let release;
    const gate = new Promise((r) => (release = r));
    const pending = s.observeDraft("op", "fund", provider(f, { gate }));
    s.markSubmissionUnknown("op", "fund");
    release();
    await assert.rejects(pending, /Stale/);
    assert.equal(s.operation("op").status, "FUND_UNKNOWN");
    assert.equal(s.read().position("o").exposure, 8350000);
  } finally {
    s.close();
  }
});
test("released economic reservation cannot prepare a new funding draft", () => {
  const s = setup();
  try {
    s.reserveEscrow(reserve());
    s.transact((k) =>
      k.observe({
        claimId: "fixture-release",
        effectId: "e",
        source: "cardano",
        type: "released",
        evidence: { verified: true, simulated: true },
      }),
    );
    assert.throws(() => s.prepareDraft("op", fundingArgs(), options));
  } finally {
    s.close();
  }
});

test("policy is pinned across reopen and shared funding inputs cannot be reused across mandates", () => {
  const dir = mkdtempSync(join(tmpdir(), "mew-escrow-policy-")),
    path = join(dir, "db");
  const s = setup(path);
  try {
    s.reserveEscrow(reserve());
    s.prepareDraft("op", fundingArgs(), options);
    s.transact((k) =>
      k.createObjective({
        id: "o2",
        principal: "p",
        semanticKey: "two",
        quantity: 1,
        maxExposure: 9000000,
      }),
    );
    const second = {
      ...intent(),
      objectiveId: "o2",
      effectId: "e2",
      semanticKey: "two",
    };
    s.reserveEscrow({ ...reserve(), operationId: "op2", intent: second });
    assert.throws(() =>
      s.prepareDraft("op2", { ...fundingArgs(), intent: second }, options),
    );
    assert.equal(s.operation("op2").status, "RESERVED");
    assert.equal(s.draft("op2", "fund"), null);
  } finally {
    s.close();
  }
  try {
    assert.throws(
      () =>
        new EscrowStore(path, {
          ...parties,
          providers: [{ id: "vendor", address: addr(4) }],
        }),
      /policy changed/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("backup restore validates escrow hashes and locks without activating or releasing unknown work", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const { createBackup, inspectBackup, restoreDrill } = await import(
    "../src/server/backup.mjs"
  );
  const dir = mkdtempSync(join(tmpdir(), "mew-escrow-backup-")),
    path = join(dir, "backup");
  const s = setup(join(dir, "source"));
  try {
    s.reserveEscrow(reserve());
    s.prepareDraft("op", fundingArgs(), options);
    s.markSubmissionUnknown("op", "fund");
    const receipt = await createBackup(s.db, path),
      restored = await restoreDrill(path, { expectedDigest: receipt.sha256 });
    assert.equal(restored.escrowOperations[0].status, "FUND_UNKNOWN");
    assert.equal(restored.positions[0].exposure, 8350000);
    assert.equal(restored.activationAllowed, false);
    const db = new DatabaseSync(path);
    db.exec("DELETE FROM escrow_input_locks");
    db.close();
    assert.throws(() => inspectBackup(path), /missing input lock/);
  } finally {
    s.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("acceptance observation never claims delivery or releases total exposure and released effects cannot be observed", async () => {
  const s = setup();
  try {
    s.reserveEscrow(reserve());
    const f = s.prepareDraft("op", fundingArgs(), options);
    await s.observeDraft("op", "fund", provider(f));
    const d = s.prepareDraft("op", closing(s, "accept"), options);
    const result = await s.observeDraft("op", "accept", provider(d));
    assert.equal(result.operation.status, "ACCEPT_OBSERVED");
    assert.equal(result.settlementClaimProduced, false);
    assert.equal(s.read().position("o").exposure, 8350000);
    s.transact((k) =>
      k.observe({
        claimId: "bad-release",
        effectId: "e",
        source: "cardano",
        type: "refunded",
        amount: 8350000,
        evidence: { verified: true, simulated: true },
      }),
    );
    await assert.rejects(
      s.observeDraft("op", "accept", provider(d)),
      /reservation/,
    );
  } finally {
    s.close();
  }
});

test("backup rejects self-consistent altered CBOR even when stored hashes and draft metadata are updated", async () => {
  const CSL = (await import("@emurgo/cardano-serialization-lib-nodejs"))
    .default;
  const { inspectEscrowJournal } = await import(
    "../src/server/escrow-backup.mjs"
  );
  const rebuild = (tx, change) => {
    const body = tx.body(),
      out = CSL.TransactionOutputs.new();
    for (let i = 0; i < body.outputs().len(); i++)
      out.add(change(body.outputs().get(i), i));
    const b = CSL.TransactionBody.new_tx_body(body.inputs(), out, body.fee());
    if (body.ttl_bignum()) b.set_ttl(body.ttl_bignum());
    if (body.validity_start_interval_bignum())
      b.set_validity_start_interval_bignum(
        body.validity_start_interval_bignum(),
      );
    if (body.collateral()) b.set_collateral(body.collateral());
    if (body.total_collateral())
      b.set_total_collateral(body.total_collateral());
    if (body.script_data_hash())
      b.set_script_data_hash(body.script_data_hash());
    if (body.required_signers())
      b.set_required_signers(body.required_signers());
    return CSL.Transaction.new(b, tx.witness_set(), tx.auxiliary_data());
  };
  for (const action of ["fund", "accept"]) {
    const s = setup();
    try {
      s.reserveEscrow(reserve());
      const fund = s.prepareDraft("op", fundingArgs(), options);
      if (action === "accept") {
        await s.observeDraft("op", "fund", provider(fund));
        s.prepareDraft("op", closing(s, "accept"), options);
      }
      assert.equal(inspectEscrowJournal(s.db, s.read().snapshot()).length, 1);
      const d = s.draft("op", action),
        tx = CSL.Transaction.from_hex(d.cbor);
      const altered = rebuild(tx, (o, i) => {
        if (i !== 0) return o;
        const output = CSL.TransactionOutput.new(
          CSL.Address.from_bech32(
            action === "fund" ? o.address().to_bech32() : addr(4),
          ),
          o.amount(),
        );
        if (action === "fund")
          output.set_plutus_data(CSL.PlutusData.new_bytes(Uint8Array.of(1)));
        return output;
      });
      const changed = {
        ...d,
        cbor: altered.to_hex(),
        txHash: CSL.FixedTransaction.from_hex(altered.to_hex())
          .transaction_hash()
          .to_hex(),
        ...(action === "fund"
          ? { datumCbor: CSL.PlutusData.new_bytes(Uint8Array.of(1)).to_hex() }
          : {}),
      };
      s.db
        .prepare(
          "UPDATE escrow_drafts SET tx_hash=?,record=? WHERE operation_id=? AND action=?",
        )
        .run(changed.txHash, JSON.stringify(changed), "op", action);
      assert.throws(
        () => inspectEscrowJournal(s.db, s.read().snapshot()),
        action === "fund" ? /intent\/datum mismatch/ : /payout\/fee mismatch/,
      );
    } finally {
      s.close();
    }
  }
});
