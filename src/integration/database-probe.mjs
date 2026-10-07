import { IntegrationStore, encode } from "./store.mjs";
const requireProbe = (id) => {
  if (typeof id !== "string" || !/^probe-[a-f0-9-]{8,80}$/.test(id))
    throw Error("Invalid synthetic probe identity");
};
const objective = (id) => ({
  id,
  semanticKey: id,
  quantity: 1,
  maxExposure: 100,
  description: "Synthetic database probe; no external dispatch",
});
const effect = (id, suffix) => ({
  objectiveId: id,
  proposedEffect: {
    id: `${id}/${suffix}`,
    semanticKey: id,
    provider: "synthetic-probe",
    type: "payment",
    amount: 60,
  },
});
const check = (ok, message) => {
  if (!ok) throw Error(message);
};
/** Writes a fresh synthetic principal. It never calls a rail, model or provider.
 * Requires real distinct server sessions; rejects a single PGlite connection. */
export async function runDatabaseProbe(pool, id) {
  requireProbe(id);
  const clients = [];
  let sessionsVerified = false;
  try {
    clients.push(await pool.connect());
    clients.push(await pool.connect());
    await Promise.all(clients.map((c) => c.query("BEGIN")));
    const identities = await Promise.all(
      clients.map((c) => c.query("SELECT pg_backend_pid() AS pid")),
    );
    check(
      Number.isInteger(identities[0].rows[0]?.pid) &&
        Number.isInteger(identities[1].rows[0]?.pid) &&
        identities[0].rows[0].pid !== identities[1].rows[0].pid,
      "Two distinct PostgreSQL sessions required",
    );
    sessionsVerified = true;
  } finally {
    const cleaned = await Promise.allSettled(
      clients.map((c) => c.query("ROLLBACK")),
    );
    clients.forEach((c, i) => c.release(cleaned[i].status === "rejected"));
    if (sessionsVerified && cleaned.some((r) => r.status === "rejected"))
      throw Error("Session cleanup failed");
  }
  const store = new IntegrationStore({ pool });
  await store.transaction(id, async (_, k) => {
    check(
      k.snapshot().objectives.length === 0,
      "Probe principal already exists",
    );
    k.createObjective({ ...objective(id), principal: id });
  });
  const peer = `${id}/peer`;
  await store.transaction(peer, async (_, k) => {
    check(k.snapshot().objectives.length === 0, "Probe peer already exists");
    k.createObjective({ ...objective(peer), principal: peer });
  });
  check(
    (await store.position(peer, peer)).remainingBudget === 100,
    "Peer principal was not established",
  );
  let secondPid, secondFailure, firstReady;
  const firstStarted = new Promise((resolve) => {
    firstReady = resolve;
  });
  const secondPool = {
    async connect() {
      const c = await pool.connect();
      return {
        async query(sql, args) {
          try {
            const result = await c.query(sql, args);
            if (sql === "BEGIN")
              secondPid = (await c.query("SELECT pg_backend_pid() AS pid"))
                .rows[0].pid;
            return result;
          } catch (e) {
            secondFailure = true;
            throw e;
          }
        },
        release: (destroy) => c.release(destroy),
      };
    },
  };
  const first = store.transaction(id, async (c, k) => {
    firstReady();
    let waitObserved = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      check(!secondFailure, "Competing session failed");
      if (Number.isInteger(secondPid)) {
        await c.query("SELECT pg_stat_clear_snapshot()");
        const { rows } = await c.query(
          "SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1",
          [secondPid],
        );
        if (rows.length === 1 && rows[0].wait_event_type === "Lock") {
          waitObserved = true;
          break;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    check(waitObserved, "No overlapping database lock wait observed");
    return k.evaluate(effect(id, "alpha"));
  });
  await Promise.race([
    firstStarted,
    first.then(() => {
      throw Error("Holder completed before race");
    }),
  ]);
  const second = new IntegrationStore({ pool: secondPool }).transaction(
    id,
    async (_, k) => k.evaluate(effect(id, "beta")),
  );
  const results = await Promise.allSettled([first, second]);
  check(
    results.every((r) => r.status === "fulfilled"),
    "Contending transactions failed",
  );
  check(
    results.filter((r) => r.value.decision === "ALLOW").length === 1 &&
      results.filter((r) => r.value.decision === "DEFER").length === 1,
    "Contention allowed incorrect capacity",
  );
  const winner = results.find((r) => r.value.decision === "ALLOW").value.effect
    .id;
  let aborted = false;
  try {
    await store.transaction(id, async (_, k) => {
      k.createObjective({ ...objective(`${id}/rollback`), principal: id });
      throw Error("deliberate rollback");
    });
  } catch (e) {
    if (e.message !== "deliberate rollback") throw e;
    aborted = true;
  }
  check(aborted, "Rollback injection failed");
  await store.transaction(id, async (_, k) =>
    check(
      !k.snapshot().objectives.some((o) => o.id === `${id}/rollback`),
      "Aborted mutation persisted",
    ),
  );
  // Close an open transaction after an uncommitted snapshot update. PostgreSQL
  // must roll it back; the following principal lock waits for server rollback.
  const lost = await pool.connect();
  try {
    await lost.query("BEGIN");
    await lost.query("SELECT set_config('mew.principal',$1,true)", [id]);
    const { rows } = await lost.query(
      "SELECT snapshot FROM mew_private.ledgers WHERE principal=$1 FOR UPDATE",
      [id],
    );
    check(rows.length === 1, "Probe ledger unavailable");
    const changed = structuredClone(rows[0].snapshot);
    changed.effects = [];
    await lost.query(
      "UPDATE mew_private.ledgers SET snapshot=$2::jsonb WHERE principal=$1",
      [id, encode(changed)],
    );
  } finally {
    lost.release(true);
  }
  const position = await store.position(id, id);
  check(
    position.reserved === 60 &&
      position.spent === 0 &&
      position.equivalents === 1,
    "Open connection loss changed exposure",
  );
  // No auto retry: simulate a lost acknowledgement only AFTER the real COMMIT
  // succeeds, so durable state must survive the deliberately thrown response.
  const wrapped = {
    async connect() {
      const c = await pool.connect();
      return {
        async query(sql, args) {
          const r = await c.query(sql, args);
          if (sql === "COMMIT")
            throw Error("injected lost commit acknowledgement");
          return r;
        },
        release: (destroy) => c.release(destroy),
      };
    },
  };
  try {
    await new IntegrationStore({ pool: wrapped }).transaction(
      id,
      async (_, k) =>
        k.observe({
          claimId: `${id}/unknown`,
          effectId: winner,
          source: "probe",
          type: "unknown",
        }),
    );
    throw Error("Missing acknowledgement injection");
  } catch (e) {
    check(
      e.message === "injected lost commit acknowledgement",
      "Unexpected commit injection failure",
    );
  }
  await store.transaction(id, async (c, k) => {
    check(
      k.snapshot().effects.find((e) => e.id === winner)?.unknown === true,
      "Acknowledged server commit was lost",
    );
    check(
      k.evaluate(effect(id, winner.endsWith("/alpha") ? "alpha" : "beta"))
        .decision === "DEFER",
      "Identical replay authorized a new effect",
    );
    const { rows } = await c.query(
      "SELECT principal FROM mew_private.ledgers WHERE principal<>$1 LIMIT 1",
      [id],
    );
    check(rows.length === 0, "Principal isolation failed");
  });
  return {
    schema: "mew.database-probe.v1",
    probeId: id,
    status: "VERIFIED_SCOPED_DATABASE_PROBE",
    checks: [
      "distinct-server-sessions",
      "observed-overlapping-lock-wait",
      "single-capacity-contention",
      "ordinary-rollback",
      "open-transaction-connection-loss",
      "injected-commit-ack-loss-retains-state",
      "identical-replay-deferred",
      "principal-rls",
    ],
    paymentsEnabled: false,
    modelActivated: false,
    limitations: [
      "Synthetic data retained; no deletes or provider calls.",
      "Lost COMMIT acknowledgement is a controlled wrapper injection, not a real network failure.",
      "Not a database crash, failover, backup restoration or live payment lifecycle test.",
    ],
  };
}
export async function verifyDatabaseProbeRecovery(pool, id) {
  requireProbe(id);
  const store = new IntegrationStore({ pool });
  return store.transaction(id, async (_, k) => {
    const position = k.position(id);
    check(
      position.reserved === 60 &&
        position.spent === 0 &&
        position.equivalents === 1 &&
        k.snapshot().effects.some((e) => e.unknown === true),
      "Reconnected state differs",
    );
    return {
      reconnectVerified: true,
      exposure: position.exposure,
      equivalents: position.equivalents,
    };
  });
}
