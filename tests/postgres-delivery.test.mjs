import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { IntegrationStore } from "../src/integration/store.mjs";
import { IntegrationService } from "../src/integration/service.mjs";
import { operatorTokenDigest } from "../src/server/operator-service.mjs";
import { deliveryReceiptBytes } from "../src/adapters/delivery-receipt.mjs";
async function fixture() {
  const db = new PGlite();
  await db.exec(
    await readFile(
      new URL("../deploy/supabase-bootstrap.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL("../deploy/supabase-delivery.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec("SET ROLE mew_runtime");
  let tail = Promise.resolve();
  const pool = {
    async connect() {
      const before = tail;
      let release;
      tail = new Promise((r) => (release = r));
      await before;
      return { query: (q, v) => db.query(q, v), release };
    },
  };
  const store = new IntegrationStore({ pool });
  const token = "a".repeat(40),
    other = "b".repeat(40);
  const keys = generateKeyPairSync("ed25519");
  const providerKeys = [
    {
      provider: "vendor",
      keyId: "key",
      publicKey: keys.publicKey,
      notBeforeMs: 0,
      expiresAtMs: 99999,
      revoked: false,
    },
  ];
  const policy = [
    {
      principal: "payer",
      tokenDigest: operatorTokenDigest(token),
      expiresAtMs: 99999,
      revoked: false,
      actions: [
        "create-objective",
        "read",
        "enroll-delivery",
        "accept-delivery",
      ],
    },
    {
      principal: "other",
      tokenDigest: operatorTokenDigest(other),
      expiresAtMs: 99999,
      revoked: false,
      actions: [
        "create-objective",
        "read",
        "enroll-delivery",
        "accept-delivery",
      ],
    },
  ];
  const service = new IntegrationService({
    store,
    policy,
    providerKeys,
    clock: () => 2000,
  });
  const artifactBytes = Buffer.from("synthetic private artifact");
  const contract = {
    keyId: "key",
    objectiveId: "o",
    effectId: "e",
    provider: "vendor",
    jobId: "job",
    artifactSha256: createHash("sha256").update(artifactBytes).digest("hex"),
  };
  async function reserve(principal, id = "o", effectId = "e") {
    await store.createObjective(principal, {
      id,
      semanticKey: id,
      quantity: 1,
      maxExposure: 10000000,
      description: "test",
    });
    await store.transaction(principal, async (_, k) =>
      k.evaluate({
        objectiveId: id,
        proposedEffect: {
          id: effectId,
          semanticKey: id,
          provider: "vendor",
          amount: 8000000,
        },
      }),
    );
  }
  await reserve("payer");
  const payload = {
    version: "mew-delivery-v1",
    receiptId: "receipt",
    ...contract,
    principal: "payer",
    issuedAtMs: 1000,
    expiresAtMs: 5000,
  };
  const envelope = {
    payload,
    signature: sign(
      null,
      deliveryReceiptBytes(payload),
      keys.privateKey,
    ).toString("base64url"),
  };
  const body = {
    effectId: "e",
    envelope,
    artifactBase64: artifactBytes.toString("base64"),
  };
  return {
    db,
    pool,
    store,
    service,
    token,
    other,
    keys,
    providerKeys,
    policy,
    contract,
    envelope,
    body,
    reserve,
    close: () => db.close(),
  };
}
test("Postgres delivery commits receipt and satisfaction, preserves exposure and idempotent replay", async () => {
  const f = await fixture();
  try {
    await f.service.enrollDelivery(f.token, f.contract);
    const r = await f.service.acceptDelivery(f.token, f.body);
    assert.equal(r.idempotent, false);
    assert.equal(r.position.status, "SATISFIED");
    assert.equal(r.position.reserved, 8000000);
    assert.equal(r.position.spent, 0);
    assert.equal(r.paymentSettlementProduced, false);
    assert.equal(
      (await f.service.acceptDelivery(f.token, f.body)).idempotent,
      true,
    );
    await f.db.exec("BEGIN; SELECT set_config('mew.principal','payer',true)");
    assert.equal(
      (
        await f.db.query(
          "SELECT count(*)::int AS n FROM mew_private.delivery_receipts",
        )
      ).rows[0].n,
      1,
    );
    await f.db.exec("ROLLBACK");
  } finally {
    await f.close();
  }
});
test("RLS/global provider job uniqueness blocks cross-principal delivery enrollment and receipt reads", async () => {
  const f = await fixture();
  try {
    await f.service.enrollDelivery(f.token, f.contract);
    await f.reserve("other");
    await assert.rejects(() => f.service.enrollDelivery(f.other, f.contract));
    await assert.rejects(() => f.service.acceptDelivery(f.other, f.body));
    assert.equal((await f.store.position("other", "o")).satisfied, 0);
    assert.equal(
      (await f.db.query("SELECT * FROM mew_private.delivery_contracts")).rows
        .length,
      0,
    );
    await assert.rejects(() =>
      f.db.query("UPDATE mew_private.delivery_contracts SET job_id=$1", [
        "bad",
      ]),
    );
  } finally {
    await f.close();
  }
});
test("wrong artifact/signature/job, stale receipt and key replacement cannot complete delivery", async () => {
  const f = await fixture();
  try {
    await f.service.enrollDelivery(f.token, f.contract);
    await assert.rejects(() =>
      f.service.enrollDelivery(f.token, {
        ...f.contract,
        artifactSha256: "a".repeat(64),
      }),
    );
    await assert.rejects(() =>
      f.service.acceptDelivery(f.token, {
        ...f.body,
        artifactBase64: Buffer.from("changed").toString("base64"),
      }),
    );
    await assert.rejects(() =>
      f.service.acceptDelivery(f.token, {
        ...f.body,
        envelope: { ...f.envelope, signature: "A".repeat(86) },
      }),
    );
    await assert.rejects(() =>
      f.service.acceptDelivery(f.token, {
        ...f.body,
        envelope: {
          ...f.envelope,
          payload: { ...f.envelope.payload, jobId: "other" },
        },
      }),
    );
    const replacement = new IntegrationService({
      store: f.store,
      policy: f.policy,
      providerKeys: [
        {
          ...f.providerKeys[0],
          publicKey: generateKeyPairSync("ed25519").publicKey,
        },
      ],
      clock: () => 2000,
    });
    await assert.rejects(
      () => replacement.acceptDelivery(f.token, f.body),
      /fingerprint/,
    );
    const expired = new IntegrationService({
      store: f.store,
      policy: f.policy,
      providerKeys: f.providerKeys,
      clock: () => 5000,
    });
    await assert.rejects(
      () => expired.acceptDelivery(f.token, f.body),
      /freshness/,
    );
    const revoked = new IntegrationService({
      store: f.store,
      policy: f.policy,
      providerKeys: [{ ...f.providerKeys[0], revoked: true }],
      clock: () => 2000,
    });
    await assert.rejects(
      () => revoked.acceptDelivery(f.token, f.body),
      /unavailable/,
    );
    assert.equal((await f.store.position("payer", "o")).satisfied, 0);
  } finally {
    await f.close();
  }
});
test("receipt insert rolls back if ledger observation fails and conflicting replay cannot overwrite", async () => {
  const f = await fixture();
  try {
    await f.service.enrollDelivery(f.token, f.contract);
    await f.store.transaction("payer", async (_, k) =>
      k.state.claims.push({
        claimId:
          "postgres-delivery:" +
          createHash("sha256")
            .update(JSON.stringify(["vendor", "job"]))
            .digest("hex"),
        effectId: "e",
        source: "merchant",
        type: "delivery.verified",
        evidence: { verified: true, conflict: true },
      }),
    );
    await assert.rejects(() => f.service.acceptDelivery(f.token, f.body));
    await f.db.exec("BEGIN; SELECT set_config('mew.principal','payer',true)");
    assert.equal(
      (
        await f.db.query(
          "SELECT count(*)::int AS n FROM mew_private.delivery_receipts",
        )
      ).rows[0].n,
      0,
    );
    await f.db.exec("ROLLBACK");
    assert.equal((await f.store.position("payer", "o")).satisfied, 0);
  } finally {
    await f.close();
  }
});
test("released effects cannot be accepted and default empty key enrollment grants no authority", async () => {
  const f = await fixture();
  try {
    const unconfigured = new IntegrationService({
      store: f.store,
      policy: f.policy,
      clock: () => 2000,
    });
    await assert.rejects(
      async () => unconfigured.enrollDelivery(f.token, f.contract),
      /unavailable/,
    );
    await f.service.enrollDelivery(f.token, f.contract);
    await f.store.transaction("payer", async (_, k) =>
      k.observe({
        claimId: "release",
        effectId: "e",
        source: "cardano",
        type: "released",
        evidence: { verified: true },
      }),
    );
    await assert.rejects(
      () => f.service.acceptDelivery(f.token, f.body),
      /binding/,
    );
  } finally {
    await f.close();
  }
});

test("independent stores serialize simultaneous acceptance and retain replay after restart", async () => {
  const f = await fixture();
  try {
    await f.service.enrollDelivery(f.token, f.contract);
    const second = new IntegrationStore({ pool: f.pool });
    const otherService = new IntegrationService({
      store: second,
      policy: f.policy,
      providerKeys: f.providerKeys,
      clock: () => 2000,
    });
    const results = await Promise.all([
      f.service.acceptDelivery(f.token, f.body),
      otherService.acceptDelivery(f.token, f.body),
    ]);
    assert.deepEqual(results.map((r) => r.idempotent).sort(), [false, true]);
    const reordered = {
      signature: f.envelope.signature,
      payload: Object.fromEntries(Object.entries(f.envelope.payload).reverse()),
    };
    assert.equal(
      (
        await otherService.acceptDelivery(f.token, {
          ...f.body,
          envelope: reordered,
        })
      ).idempotent,
      true,
    );
    const payload = { ...f.envelope.payload, receiptId: "new-receipt" };
    const envelope = {
      payload,
      signature: sign(
        null,
        deliveryReceiptBytes(payload),
        f.keys.privateKey,
      ).toString("base64url"),
    };
    await assert.rejects(
      () => otherService.acceptDelivery(f.token, { ...f.body, envelope }),
      /Conflicting/,
    );
  } finally {
    await f.close();
  }
});
test("global receipt identity cannot satisfy a second customer even on another job", async () => {
  const f = await fixture();
  try {
    await f.service.enrollDelivery(f.token, f.contract);
    await f.service.acceptDelivery(f.token, f.body);
    await f.reserve("other");
    const contract = { ...f.contract, jobId: "second-job" };
    await f.service.enrollDelivery(f.other, contract);
    const payload = {
      ...f.envelope.payload,
      principal: "other",
      jobId: "second-job",
    };
    const envelope = {
      payload,
      signature: sign(
        null,
        deliveryReceiptBytes(payload),
        f.keys.privateKey,
      ).toString("base64url"),
    };
    await assert.rejects(() =>
      f.service.acceptDelivery(f.other, { ...f.body, envelope }),
    );
    assert.equal((await f.store.position("other", "o")).satisfied, 0);
    assert.equal((await f.store.position("other", "o")).reserved, 8000000);
  } finally {
    await f.close();
  }
});

import { makeIntegrationServer } from "../src/integration/http.mjs";
test("private HTTP connects enrollment and signed delivery to PostgreSQL with strict auth and artifact bounds", async () => {
  const f = await fixture();
  const server = makeIntegrationServer({
    service: f.service,
    requestLimit: 20,
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, extra = {}) =>
    fetch(origin + path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${f.token}`,
        "Content-Type": "application/json",
        ...extra,
      },
      body: JSON.stringify(body),
    });
  try {
    assert.equal(
      (
        await post("/integration/delivery/enroll", f.contract, {
          Origin: "http://localhost",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await post("/integration/delivery/enroll", {
          ...f.contract,
          principal: "other",
        })
      ).status,
      403,
    );
    assert.equal(
      (await post("/integration/delivery/enroll", f.contract)).status,
      200,
    );
    assert.equal(
      (
        await post("/integration/delivery/accept", {
          ...f.body,
          artifactBase64: "AA",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await post("/integration/delivery/accept", {
          ...f.body,
          artifactBase64: Buffer.alloc(131073).toString("base64"),
        })
      ).status,
      403,
    );
    const accepted = await post("/integration/delivery/accept", f.body);
    assert.equal(accepted.status, 200);
    assert.equal(accepted.headers.get("cache-control"), "no-store");
    const record = await accepted.json();
    assert.equal(record.position.satisfied, 1);
    assert.equal(record.position.exposure, 8000000);
    assert.equal(record.paymentSettlementProduced, false);
    assert.equal(
      (
        await post("/integration/delivery/accept", f.body, {
          Authorization: `Bearer ${f.other}`,
        })
      ).status,
      403,
    );
    assert.equal((await post("/integration/delivery/submit", {})).status, 404);
  } finally {
    await new Promise((r) => {
      server.close(r);
      server.closeAllConnections();
    });
    await f.close();
  }
});
