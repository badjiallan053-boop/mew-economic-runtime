import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { IntegrationStore } from "../src/integration/store.mjs";
import { IntegrationService } from "../src/integration/service.mjs";
import { operatorTokenDigest } from "../src/server/operator-service.mjs";
import { postgresOptions } from "../src/integration/postgres.mjs";
import { runModelEvaluation } from "../src/integration/model.mjs";
import { addr, fundingArgs, parameters } from "./helpers/escrow-fixture.mjs";

// Real WASM PostgreSQL SQL/RLS/rollback checks. One serial engine connection:
// production multi-connection contention requires a separate hosted PG test.
async function fixture() {
  const db = new PGlite();
  await db.exec(
    await readFile(
      new URL("../deploy/supabase-bootstrap.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec("SET ROLE mew_runtime;");
  let tail = Promise.resolve();
  const pool = {
    async connect() {
      const previous = tail;
      let release;
      tail = new Promise((r) => {
        release = r;
      });
      await previous;
      return { query: (sql, values) => db.query(sql, values), release };
    },
  };
  const paymentPolicy = {
    principals: [
      { id: "payer", address: addr(1) },
      { id: "other", address: addr(1) },
    ],
    providers: [{ id: "vendor", address: addr(2) }],
  };
  const store = new IntegrationStore({
    pool,
    paymentPolicy,
    clock: () => parameters.observedAtMs,
  });
  return {
    db,
    pool,
    store,
    async close() {
      await db.close();
    },
  };
}
const objective = (id = "o", semanticKey = "one-report") => ({
  id,
  semanticKey,
  quantity: 1,
  maxExposure: 9000000,
  description: "Synthetic private integration test only",
});
const args = () => {
  const a = fundingArgs();
  a.parameters.kind = "preprod-observed";
  return a;
};
const prepare = (
  store,
  principal = "payer",
  operationId = "operation",
  a = args(),
) =>
  store.prepareFunding(principal, {
    operationId,
    providerId: "vendor",
    args: a,
  });

test("Postgres enforces RLS and preserves mandates across independent store instances", async () => {
  const f = await fixture();
  try {
    await f.store.createObjective("payer", objective());
    await f.store.createObjective("other", objective());
    const second = new IntegrationStore({
      pool: f.pool,
      paymentPolicy: f.store.policy,
      clock: f.store.clock,
    });
    assert.equal((await second.position("payer", "o")).remainingQuantity, 1);
    await assert.rejects(() =>
      second.createObjective("payer", { ...objective(), quantity: 2 }),
    );
    await assert.rejects(() =>
      second.createObjective("payer", objective("equivalent")),
    );
    assert.equal(
      (await f.db.query("SELECT principal FROM mew_private.ledgers")).rows
        .length,
      0,
    );
    await f.db.exec("BEGIN; SELECT set_config('mew.principal','payer',true);");
    assert.deepEqual(
      (await f.db.query("SELECT principal FROM mew_private.ledgers")).rows,
      [{ principal: "payer" }],
    );
    await assert.rejects(() =>
      f.db.query(
        "UPDATE mew_private.ledgers SET principal='other' WHERE principal='payer'",
      ),
    );
    await f.db.exec(
      "ROLLBACK; RESET ROLE; CREATE ROLE anon NOLOGIN; SET ROLE anon;",
    );
    await assert.rejects(() => f.db.query("SELECT * FROM mew_private.ledgers"));
  } finally {
    await f.close();
  }
});
test("economic reservation, outbox and global input locks commit together; uncertain exposure never frees", async () => {
  const f = await fixture();
  try {
    await f.store.createObjective("payer", objective());
    const results = await Promise.all([prepare(f.store), prepare(f.store)]);
    assert.deepEqual(
      results.map((r) => r.decision),
      ["ALLOW", "DEFER"],
    );
    const expected = 8350000;
    assert.equal((await f.store.position("payer", "o")).exposure, expected);
    assert.equal(
      (await f.store.operation("payer", "operation")).draft.signingAllowed,
      false,
    );
    await f.store.markFundingUnknown("payer", "operation");
    assert.equal((await f.store.position("payer", "o")).exposure, expected);
    const a = args();
    a.intent.effectId = "second";
    a.intent.nonceHex = "d".repeat(64);
    assert.equal(
      (await prepare(f.store, "payer", "second-operation", a)).decision,
      "DEFER",
    );
    await f.store.createObjective("other", objective());
    const b = args();
    b.intent.effectId = "other-effect";
    b.intent.nonceHex = "e".repeat(64);
    await assert.rejects(() =>
      prepare(f.store, "other", "cross-principal-input-reuse", b),
    );
    assert.equal((await f.store.position("other", "o")).exposure, 0);
    assert.equal(
      await f.store.operation("other", "cross-principal-input-reuse"),
      null,
    );
    const c = args();
    c.intent.providerAddress = addr(3);
    await assert.rejects(() => prepare(f.store, "payer", "wrong-seller", c));
    const synthetic = fundingArgs();
    await assert.rejects(
      () => prepare(f.store, "payer", "fixture", synthetic),
      /Fixture/,
    );
  } finally {
    await f.close();
  }
});
test("read-only funding observations retain exposure through provider failure, funding and rollback", async () => {
  const f = await fixture();
  try {
    await f.store.createObjective("payer", objective());
    const first = await prepare(f.store);
    const unknown = await f.store.reconcileFunding("payer", "operation");
    assert.equal(unknown.operation.status, "FUND_UNKNOWN");
    assert.equal(unknown.position.exposure, 8350000);
    const txHash = first.operation.draft.txHash,
      block = "a".repeat(64);
    const good = async (url) =>
      new Response(
        JSON.stringify(
          url.endsWith("/blocks/latest")
            ? { hash: "b".repeat(64), height: 102 }
            : { hash: txHash, block, block_height: 100, valid_contract: true },
        ),
      );
    const result = await f.store.reconcileFunding("payer", "operation", {
      projectId: "test-fixture",
      fetchImpl: good,
    });
    assert.equal(result.operation.status, "FUNDED_OBSERVED");
    assert.equal(result.position.committed, 8350000);
    assert.equal(result.settlementClaimProduced, false);
    const changed = async (url) =>
      new Response(
        JSON.stringify(
          url.endsWith("/blocks/latest")
            ? { hash: "b".repeat(64), height: 102 }
            : {
                hash: txHash,
                block: "c".repeat(64),
                block_height: 100,
                valid_contract: true,
              },
        ),
      );
    assert.equal(
      (
        await f.store.reconcileFunding("payer", "operation", {
          projectId: "test-fixture",
          fetchImpl: changed,
        })
      ).operation.status,
      "REVIEW_REQUIRED",
    );
    const restored = await f.store.reconcileFunding("payer", "operation", {
      projectId: "test-fixture",
      fetchImpl: good,
    });
    assert.equal(restored.operation.status, "REVIEW_REQUIRED");
    assert.equal(restored.position.exposure, 8350000);
    await assert.rejects(() =>
      f.store.markFundingUnknown("payer", "operation"),
    );
  } finally {
    await f.close();
  }
});
test("durable model attempt fences block replay, concurrent invocations and restart retry", async () => {
  const f = await fixture();
  try {
    let calls = 0;
    const fetchImpl = async (url, options) => {
      calls++;
      assert.equal(url, "https://api.openai.com/v1/responses");
      const input = JSON.parse(JSON.parse(options.body).input);
      return new Response(
        JSON.stringify({
          status: "completed",
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    missionId: input.missionId,
                    taskId: input.taskId,
                    agentId: input.agentId,
                    recommendation: "ABSTAIN",
                    summary:
                      "Synthetic transport fixture, not a model judgment",
                    evidenceRefs: [],
                    riskCodes: ["TEST_FIXTURE"],
                  }),
                },
              ],
            },
          ],
        }),
      );
    };
    const config = {
      store: f.store,
      principal: "payer",
      id: "evaluation",
      apiKey: "fixture",
      model: "fixture-model",
      approved: true,
      fetchImpl,
    };
    const run = await runModelEvaluation(config);
    assert.equal(run.status, "COMPLETE");
    assert.equal(calls, 4);
    assert.equal(run.modelActivated, false);
    assert.equal(run.result.productionReady, false);
    const replay = await runModelEvaluation(config);
    assert.equal(replay.claimed, false);
    assert.equal(replay.externalCallPerformed, false);
    assert.equal(calls, 4);
    await assert.rejects(
      () => runModelEvaluation({ ...config, model: "substituted" }),
      /conflict/,
    );
    await assert.rejects(
      () => runModelEvaluation({ ...config, id: "additional" }),
      /limit/,
    );
    assert.equal(calls, 4);
    const claim = await f.store.startModelRun("other", {
      id: "interrupted",
      contract: { source: "fixture" },
      maxRuns: 1,
    });
    assert.equal(
      (
        await f.store.startModelRun("other", {
          id: "interrupted",
          contract: { source: "fixture" },
          maxRuns: 1,
        })
      ).claimed,
      false,
    );
    await assert.rejects(
      () =>
        f.store.finishModelRun("other", {
          id: "interrupted",
          fence: "0".repeat(36),
          result: {},
        }),
      /fence/,
    );
    assert.equal(
      (
        await f.store.finishModelRun("other", {
          id: "interrupted",
          fence: claim.fence,
          result: { unknown: true },
          unknown: true,
        })
      ).status,
      "UNKNOWN",
    );
    assert.equal(
      (
        await f.store.startModelRun("other", {
          id: "interrupted",
          contract: { source: "fixture" },
          maxRuns: 1,
        })
      ).status,
      "UNKNOWN",
    );
  } finally {
    await f.close();
  }
});
test("provider failure is durably UNKNOWN and a restarted store cannot retry it", async () => {
  const f = await fixture();
  try {
    let calls = 0;
    const config = {
      store: f.store,
      principal: "payer",
      id: "provider-failure",
      apiKey: "fixture",
      model: "m".repeat(100),
      approved: true,
      fetchImpl: async () => {
        calls++;
        return new Response("private upstream diagnostic", { status: 503 });
      },
    };
    const first = await runModelEvaluation(config);
    assert.equal(first.status, "UNKNOWN");
    assert.equal(calls, 4);
    assert.equal(first.result.passed, 0);
    assert.ok(!JSON.stringify(first).includes("private upstream diagnostic"));
    const restarted = new IntegrationStore({
      pool: f.pool,
      paymentPolicy: f.store.policy,
      clock: f.store.clock,
    });
    const replay = await runModelEvaluation({ ...config, store: restarted });
    assert.equal(replay.status, "UNKNOWN");
    assert.equal(replay.externalCallPerformed, false);
    assert.equal(calls, 4);
    assert.throws(() => f.store.policy.principals.push({ id: "intruder" }));
    assert.throws(() => {
      f.store.policy.providers[0].address = addr(3);
    });
  } finally {
    await f.close();
  }
});
test("strict TLS and role URLs reject admin connections, endpoint substitution and insecure options", () => {
  const ref = "a".repeat(20),
    base = {
      projectRef: ref,
      connectionString: `postgresql://mew_runtime:test@db.${ref}.supabase.co:5432/postgres?sslmode=require`,
    };
  const good = postgresOptions(base);
  assert.equal(good.ssl.rejectUnauthorized, true);
  assert.ok(!good.connectionString.includes("sslmode"));
  assert.equal(good.max, 2);
  assert.equal(
    postgresOptions({
      ...base,
      connectionString: `postgresql://mew_runtime.${ref}:test@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres`,
    }).ssl.rejectUnauthorized,
    true,
  );
  for (const connectionString of [
    base.connectionString.replace("mew_runtime:", "postgres:"),
    base.connectionString.replace(ref, "b".repeat(20)),
    base.connectionString.replace("sslmode=require", "sslmode=disable"),
    base.connectionString + "&options=unsafe",
  ])
    assert.throws(() => postgresOptions({ ...base, connectionString }));
});
test("service derives principal and separates read, model and payment scopes without client authority", async () => {
  const token = "t".repeat(40),
    now = 1000;
  const service = new IntegrationService({
    store: { createObjective: async (p, input) => ({ principal: p, input }) },
    policy: [
      {
        principal: "payer",
        tokenDigest: operatorTokenDigest(token),
        expiresAtMs: 2000,
        revoked: false,
        actions: ["read", "create-objective"],
      },
    ],
    clock: () => now,
  });
  assert.equal(
    (await service.createObjective(token, objective())).principal,
    "payer",
  );
  assert.throws(
    () => service.evaluateModel(token, { id: "run" }),
    /Authorization/,
  );
  assert.throws(
    () => service.principal("x".repeat(40), "read"),
    /Authorization/,
  );
  assert.throws(
    () => service.preparePayment(token, { principal: "victim" }),
    /contract/,
  );
  const expired = new IntegrationService({
    store: {},
    policy: [
      {
        principal: "payer",
        tokenDigest: operatorTokenDigest(token),
        expiresAtMs: 1000,
        revoked: false,
        actions: ["read"],
      },
    ],
    clock: () => now,
  });
  assert.throws(() => expired.principal(token, "read"));
});
