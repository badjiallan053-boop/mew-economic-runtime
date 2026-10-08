import { readFile } from "node:fs/promises";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { bech32 } from "@scure/base";
import { IntegrationStore } from "../../src/integration/store.mjs";
import { IntegrationService } from "../../src/integration/service.mjs";
import { operatorTokenDigest } from "../../src/server/operator-service.mjs";
import { deliveryReceiptBytes } from "../../src/adapters/delivery-receipt.mjs";
import { addr, fundingArgs, parameters, keyInput } from "./escrow-fixture.mjs";

// Synthetic provider observations and ephemeral merchant keys; no chain/wallet I/O.
export async function privatePaymentFixture({ directory, initialize = true } = {}) {
  const db = new PGlite(directory);
  if (initialize) for (const name of ["supabase-bootstrap.sql", "supabase-delivery.sql"])
    await db.exec(await readFile(new URL(`../../deploy/${name}`, import.meta.url), "utf8"));
  await db.exec("SET ROLE mew_runtime");
  let tail = Promise.resolve();
  const pool = { async connect() {
    const previous = tail;
    let release;
    tail = new Promise((r) => { release = r; });
    await previous;
    return { query: (q, values) => db.query(q, values), release };
  } };
  const paymentPolicy = {
    principals: [{ id: "payer", address: addr(1) }, { id: "other", address: addr(1) }],
    providers: [{ id: "vendor", address: addr(2) }],
  };
  const now = parameters.observedAtMs, clock = () => now;
  const store = new IntegrationStore({ pool, paymentPolicy, clock });
  const keys = generateKeyPairSync("ed25519"), token = "t".repeat(40);
  const providerKeys = [{ provider: "vendor", keyId: "key", publicKey: keys.publicKey,
    revoked: false, notBeforeMs: now - 1000, expiresAtMs: now + 600000 }];
  const service = new IntegrationService({ store, clock, providerKeys, policy: [{
    principal: "payer", tokenDigest: operatorTokenDigest(token), revoked: false,
    expiresAtMs: now + 600000,
    actions: ["read", "create-objective", "prepare-payment", "reconcile-payment",
      "prepare-closing", "reconcile-closing", "enroll-delivery", "accept-delivery"],
  }] });
  const artifactBytes = Buffer.from("Entirely synthetic paid report fixture, not model output.");
  const artifactSha256 = createHash("sha256").update(artifactBytes).digest("hex");
  const funding = fundingArgs();
  funding.parameters.kind = "preprod-observed"; // Test label only, never live provenance.
  funding.intent.artifactSha256 = artifactSha256;
  const objective = { id: "o", semanticKey: "one-report", quantity: 1,
    maxExposure: 9000000, description: "Synthetic lifecycle fixture" };
  const closing = (action = "cancel") => {
    // Alternate full address, same enrolled principal payment key.
    const feeAddress = bech32.encode("addr_test", bech32.toWords(
      Uint8Array.from([0, ...Array(28).fill(1), ...Array(28).fill(9)])), 200);
    return { operationId: "operation", closingId: "close", action, feeAddress,
      inputs: [{ ...keyInput("1", 1, 5000000), address: feeAddress }],
      collateral: [{ ...keyInput("2", 1, 3000000), address: feeAddress }],
      parameters: structuredClone(funding.parameters),
      executionUnits: { memory: 1000000, steps: 100000000 } };
  };
  const chain = (fundingHash, { badHash, missing = false, gate } = {}) => async (url, options) => {
    if (!url.startsWith("https://cardano-preprod.blockfrost.io/api/v0/") || options.method !== "GET")
      throw Error("Unexpected fixture endpoint");
    if (gate) await gate;
    if (missing) return new Response("unavailable fixture", { status: 503 });
    const hash = url.split("/").at(-1);
    return new Response(JSON.stringify(url.endsWith("/blocks/latest")
      ? { hash: "f".repeat(64), height: 200 }
      : { hash, block: hash === badHash ? "e".repeat(64)
          : hash === fundingHash ? "a".repeat(64) : "b".repeat(64),
        block_height: hash === fundingHash ? 100 : 150, valid_contract: true }));
  };
  async function fund() {
    await store.createObjective("payer", objective);
    const r = await store.prepareFunding("payer", { operationId: "operation", providerId: "vendor", args: funding });
    await store.reconcileFunding("payer", "operation", {
      projectId: "fixture", fetchImpl: chain(r.operation.draft.txHash),
    });
    return r.operation.draft.txHash;
  }
  async function deliver({ artifactBytes: bytes = artifactBytes,
    digest = createHash("sha256").update(bytes).digest("hex") } = {}) {
    const contract = { keyId: "key", objectiveId: "o", effectId: "e", provider: "vendor",
      jobId: "job", artifactSha256: digest };
    await service.enrollDelivery(token, contract);
    const payload = { version: "mew-delivery-v1", receiptId: "receipt", ...contract,
      principal: "payer", issuedAtMs: now, expiresAtMs: now + 10000 };
    const envelope = { payload, signature: sign(null, deliveryReceiptBytes(payload), keys.privateKey).toString("base64url") };
    return service.acceptDelivery(token, { effectId: "e", envelope,
      artifactBase64: bytes.toString("base64") });
  }
  return { db, pool, store, service, token, objective, funding, closing, chain, fund,
    deliver, now, close: () => db.close() };
}
