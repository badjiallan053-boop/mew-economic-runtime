import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { privatePaymentFixture } from "./helpers/private-payment-fixture.mjs";
import { addr } from "./helpers/escrow-fixture.mjs";
import { IntegrationStore } from "../src/integration/store.mjs";
const ref = { operationId: "operation", closingId: "close" };

test("cancel close binds original cell; repeated preparation cannot choose a second terminal action", async () => {
  const f = await privatePaymentFixture();
  try {
    const hash = await f.fund(), args = f.closing();
    const [first, replay] = await Promise.all([
      f.store.prepareClosing("payer", args), f.store.prepareClosing("payer", args),
    ]);
    assert.deepEqual([first.decision, replay.decision], ["PREPARED", "DEFER"]);
    assert.equal(first.operation.closing.args.escrowInput.txHash, hash);
    assert.equal(first.operation.closing.args.escrowInput.index, 0);
    assert.equal(first.operation.closing.args.escrowInput.datumCbor, first.operation.draft.datumCbor);
    await assert.rejects(f.store.prepareClosing("payer", { ...args, action: "accept" }), /Immutable/);
    await assert.rejects(f.store.prepareClosing("payer", { ...args, closingId: "replacement" }), /Immutable/);
    await assert.rejects(f.store.reconcileFunding("payer", "operation"), /original closing/);
    await f.store.markClosingUnknown("payer", ref);
    const restarted = new IntegrationStore({ pool: f.pool, paymentPolicy: f.store.policy, clock: f.store.clock });
    assert.equal((await restarted.operation("payer", "operation")).status, "CLOSE_UNKNOWN");
    assert.equal((await restarted.position("payer", "o")).exposure, 8350000);
    assert.equal((await restarted.prepareClosing("payer", args)).decision, "DEFER");
    assert.equal(first.dispatchAllowed, false);
  } finally { await f.close(); }
});

test("acceptance requires authenticated receipt bound to original artifact, not caller verified flags", async () => {
  const f = await privatePaymentFixture();
  try {
    await f.fund();
    await assert.rejects(f.store.prepareClosing("payer", f.closing("accept")), /authenticated delivery/);
    await assert.rejects(f.store.prepareClosing("payer", { ...f.closing("accept"), verified: true }), /contract/);
    await f.deliver();
    const r = await f.store.prepareClosing("payer", f.closing("accept"));
    assert.equal(r.operation.closing.draft.action, "accept");
    assert.equal(r.position.satisfied, 1);
    assert.equal(r.dispatchAllowed, false);
    await assert.rejects(f.store.markClosingUnknown("payer", { ...ref, closingId: "wrong" }));
  } finally { await f.close(); }
});

test("another delivery artifact cannot satisfy the escrow objective or authorize acceptance", async () => {
  const f = await privatePaymentFixture();
  try {
    await f.fund();
    await assert.rejects(f.deliver({ artifactBytes: Buffer.from("Different fixture artifact") }), /committed escrow artifact/);
    assert.equal((await f.store.position("payer", "o")).satisfied, 0);
    await assert.rejects(f.store.prepareClosing("payer", f.closing("accept")), /committed artifact/);
    assert.equal((await f.store.operation("payer", "operation")).closing, undefined);
    assert.equal((await f.store.position("payer", "o")).exposure, 8350000);
  } finally { await f.close(); }
});

test("closing defense rejects a legacy inconsistent delivery flag and artifact contract", async () => {
  const f = await privatePaymentFixture();
  try {
    await f.fund();
    // Emulate old inconsistent state through the trusted test fixture boundary,
    // not through the authenticated delivery API.
    await f.store.transaction("payer", async (c, k) => {
      await c.query("INSERT INTO mew_private.delivery_contracts(principal,effect_id,provider,job_id,contract) VALUES($1,$2,$3,$4,$5::jsonb)",
        ["payer", "e", "vendor", "legacy-job", JSON.stringify({ artifactSha256: "0".repeat(64) })]);
      k.observe({ claimId: "legacy-delivery-fixture", effectId: "e", source: "merchant", type: "delivery", evidence: { verified: true, synthetic: true } });
    });
    await assert.rejects(f.store.prepareClosing("payer", f.closing("accept")), /committed artifact/);
    assert.equal((await f.store.operation("payer", "operation")).closing, undefined);
  } finally { await f.close(); }
});

test("missing funding, foreign fee owner, caller escrow reference and synthetic parameters are rejected atomically", async () => {
  const f = await privatePaymentFixture();
  try {
    await f.store.createObjective("payer", f.objective);
    await f.store.prepareFunding("payer", { operationId: "operation", providerId: "vendor", args: f.funding });
    await assert.rejects(f.store.prepareClosing("payer", f.closing()), /original funding/);
    const op = await f.store.operation("payer", "operation");
    await f.store.reconcileFunding("payer", "operation", { projectId: "fixture", fetchImpl: f.chain(op.draft.txHash) });
    for (const patch of [
      { feeAddress: addr(3) }, { escrowInput: { txHash: "0".repeat(64) } },
      { parameters: { ...f.closing().parameters, kind: "fixture" } },
      { parameters: { ...f.closing().parameters, networkMagic: 2 } },
    ]) await assert.rejects(f.store.prepareClosing("payer", { ...f.closing(), ...patch }));
    assert.equal((await f.store.operation("payer", "operation")).closing, undefined);
    assert.equal((await f.store.position("payer", "o")).exposure, 8350000);
    await assert.rejects(f.store.prepareClosing("other", f.closing()), /Unknown payment/);
  } finally { await f.close(); }
});

test("input conflict rolls back close record and new locks, preserving original reserved exposure", async () => {
  const f = await privatePaymentFixture();
  try {
    await f.fund();
    const args = f.closing();
    args.inputs[0].txHash = f.funding.inputs[0].txHash;
    await assert.rejects(f.store.prepareClosing("payer", args));
    assert.equal((await f.store.operation("payer", "operation")).closing, undefined);
    const locks = await f.store.transaction("payer", async (c) =>
      (await c.query("SELECT reference FROM mew_private.input_locks")).rows);
    assert.equal(locks.length, 1);
    assert.equal((await f.store.position("payer", "o")).exposure, 8350000);
  } finally { await f.close(); }
});

test("cancel observation records returned escrow, never invents a full fee-inclusive refund or unlock", async () => {
  const f = await privatePaymentFixture();
  try {
    const hash = await f.fund();
    await f.store.prepareClosing("payer", f.closing());
    await f.store.markClosingUnknown("payer", ref);
    const unknown = await f.store.reconcileClosing("payer", ref);
    assert.equal(unknown.operation.status, "CLOSE_UNKNOWN");
    const good = { projectId: "fixture", fetchImpl: f.chain(hash) };
    const r = await f.store.reconcileClosing("payer", ref, good);
    assert.equal(r.operation.status, "CANCEL_OBSERVED");
    assert.equal(r.operation.closing.outcome.escrowLovelace, 3000000);
    assert.equal(r.operation.closing.outcome.overheadAccountingVerified, false);
    assert.equal(r.position.refunded, 0);
    assert.equal(r.position.exposure, 8350000);
    assert.equal(r.refundClaimProduced, false);
    assert.equal(r.exposureReleaseAllowed, false);
    await assert.rejects(f.store.markClosingUnknown("payer", ref));
    const closeHash = r.operation.closing.draft.txHash;
    const rolled = await f.store.reconcileClosing("payer", ref, { projectId: "fixture", fetchImpl: f.chain(hash, { badHash: closeHash }) });
    assert.equal(rolled.operation.status, "REVIEW_REQUIRED");
    assert.equal((await f.store.reconcileClosing("payer", ref, good)).operation.status, "REVIEW_REQUIRED");
    assert.equal((await f.store.position("payer", "o")).exposure, 8350000);
  } finally { await f.close(); }
});

test("accept observation stays separate from delivered artifact and aggregate exposure settlement", async () => {
  const f = await privatePaymentFixture();
  try {
    const hash = await f.fund();
    await f.deliver();
    await f.store.prepareClosing("payer", f.closing("accept"));
    const r = await f.store.reconcileClosing("payer", ref, { projectId: "fixture", fetchImpl: f.chain(hash) });
    assert.equal(r.operation.status, "ACCEPT_OBSERVED");
    assert.equal(r.operation.closing.outcome.deliveryProvenByPayment, false);
    assert.equal(r.position.satisfied, 1);
    assert.equal(r.position.spent, 0);
    assert.equal(r.position.committed, 8350000);
    assert.equal(r.settlementClaimProduced, false);
    const unknown = await f.store.reconcileClosing("payer", ref, { projectId: "fixture", fetchImpl: f.chain(hash, { missing: true }) });
    assert.equal(unknown.operation.status, "REVIEW_REQUIRED");
  } finally { await f.close(); }
});

test("asynchronous closing reconciliation cannot overwrite a concurrent journal mutation", async () => {
  const f = await privatePaymentFixture();
  try {
    const hash = await f.fund();
    await f.store.prepareClosing("payer", f.closing());
    let release, arrived;
    const gate = new Promise((r) => { release = r; });
    const seen = new Promise((r) => { arrived = r; });
    const transport = f.chain(hash, { gate });
    const pending = f.store.reconcileClosing("payer", ref, { projectId: "fixture", fetchImpl: async (...args) => { arrived(); return transport(...args); } });
    await seen;
    await f.store.markClosingUnknown("payer", ref);
    release();
    await assert.rejects(pending, /Stale closing/);
    assert.equal((await f.store.operation("payer", "operation")).status, "CLOSE_UNKNOWN");
  } finally { await f.close(); }
});

test("prepared close and input locks survive a real local PostgreSQL engine close/reopen", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mew-payment-restart-"));
  let f;
  try {
    f = await privatePaymentFixture({ directory });
    await f.fund();
    const args = f.closing();
    await f.store.prepareClosing("payer", args);
    await f.store.markClosingUnknown("payer", ref);
    await f.close(); f = null;
    f = await privatePaymentFixture({ directory, initialize: false });
    assert.equal((await f.store.operation("payer", "operation")).status, "CLOSE_UNKNOWN");
    assert.equal((await f.store.prepareClosing("payer", args)).decision, "DEFER");
    const locks = await f.store.transaction("payer", async (c) => (await c.query("SELECT reference FROM mew_private.input_locks")).rows);
    assert.equal(locks.length, 4);
    assert.equal((await f.store.position("payer", "o")).exposure, 8350000);
  } finally { await f?.close(); await rm(directory, { recursive: true, force: true }); }
});

test("inconsistent closing-before-funding height stays under review", async () => {
  const f = await privatePaymentFixture();
  try {
    const hash = await f.fund();
    await f.store.prepareClosing("payer", f.closing());
    const original = f.chain(hash);
    const result = await f.store.reconcileClosing("payer", ref, {
      projectId: "fixture", fetchImpl: async (url, options) => {
        const response = await original(url, options), value = await response.json();
        if (!url.endsWith('/blocks/latest') && value.hash !== hash) value.block_height = 1;
        return new Response(JSON.stringify(value));
      },
    });
    assert.equal(result.operation.status, "REVIEW_REQUIRED");
    assert.equal(result.exposureReleaseAllowed, false);
  } finally { await f.close(); }
});
