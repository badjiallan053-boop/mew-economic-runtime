import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { spawnSync } from "node:child_process";
import {
  runDatabaseProbe,
  verifyDatabaseProbeRecovery,
} from "../src/integration/database-probe.mjs";
test("probe rejects a single-session engine before any private data mutation", async () => {
  const db = new PGlite();
  const released = [];
  const pool = {
    connect: async () => ({
      query: (...args) => db.query(...args),
      release: (destroy) => released.push(destroy),
    }),
  };
  try {
    await assert.rejects(
      () => runDatabaseProbe(pool, "probe-acde1234"),
      /distinct PostgreSQL sessions/,
    );
    assert.deepEqual(released, [false, false]);
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM pg_namespace WHERE nspname='mew_private'",
        )
      ).rows[0].n,
      0,
    );
  } finally {
    await db.close();
  }
});
test("invalid probe identities never connect or imply recovery", async () => {
  const pool = {
    connect() {
      throw Error("must not connect");
    },
  };
  await assert.rejects(
    () => runDatabaseProbe(pool, "customer data with spaces"),
    /probe identity/,
  );
  await assert.rejects(
    () => verifyDatabaseProbeRecovery(pool, "x"),
    /probe identity/,
  );
});
test("CLI needs an explicit local config and write-probe flag and reports no credentials", () => {
  const run = spawnSync(
    process.execPath,
    ["scripts/integration-contention.mjs"],
    { encoding: "utf8" },
  );
  assert.equal(run.status, 1);
  const report = JSON.parse(run.stdout);
  assert.equal(report.status, "BLOCKED");
  assert.equal(report.hostedChecksVerified, false);
  assert.equal(report.paymentsEnabled, false);
  assert.equal(report.modelActivated, false);
  assert.equal(run.stderr, "");
});
