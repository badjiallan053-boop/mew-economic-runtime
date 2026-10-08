import test from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { deliveryReceiptBytes } from "../src/adapters/delivery-receipt.mjs";
import { importPilotMeasurement } from "../src/integration/pilot-measurement.mjs";
import { mkdtempSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const hash = (b) => createHash("sha256").update(b).digest("hex");
function fixture(nowMs = 2000) {
  const keys = generateKeyPairSync("ed25519"),
    bytes = Buffer.from("synthetic test media bytes");
  const manifestBytes = Buffer.from(
    JSON.stringify({
      schema: "mew.pilot-deliverables.v1",
      sourceId: "source",
      artifactVersion: 1,
      clips: [{ id: "clip", sha256: hash(bytes), byteLength: bytes.length }],
    }),
  );
  const expected = {
    keyId: "key",
    principal: "customer",
    objectiveId: "objective",
    effectId: "effect",
    provider: "provider",
    jobId: "job",
    artifactSha256: hash(manifestBytes),
  };
  const contract = {
    schema: "mew.customer-pilot.v1",
    expected,
    sourceId: "source",
    artifactVersion: 1,
    clipCount: 1,
    revisionLimit: 1,
    permittedUse: "internal-review",
    acceptanceOwner: "owner",
  };
  const evidence = {
    consent: {
      principal: "customer",
      sourceId: "source",
      permittedUse: "internal-review",
      evidenceRef: "fixture-consent",
    },
    rights: {
      sourceId: "source",
      permittedUse: "internal-review",
      ...Object.fromEntries(
        ["content", "music", "likeness"].map((k) => [
          k,
          { status: "APPROVED", evidenceRef: `fixture-${k}` },
        ]),
      ),
    },
    acceptance: {
      principal: "customer",
      owner: "owner",
      sourceId: "source",
      artifactSha256: hash(manifestBytes),
      artifactVersion: 1,
      clipCount: 1,
      revision: 0,
      decision: "ACCEPT",
      evidenceRef: "fixture-acceptance",
    },
  };
  const payload = {
    version: "mew-delivery-v1",
    receiptId: "receipt",
    ...expected,
    issuedAtMs: nowMs - 1000,
    expiresAtMs: nowMs + 100000,
  };
  const envelope = {
    payload,
    signature: sign(
      null,
      deliveryReceiptBytes(payload),
      keys.privateKey,
    ).toString("base64url"),
  };
  const measurements = {
    cost: {
      currency: "USD",
      minorUnitExponent: 2,
      amountMinor: 1200,
      authority: "OPERATOR_ATTESTED_INVOICE",
      evidenceRef: "fixture-invoice",
      provider: "provider",
      jobId: "job",
    },
    usage: {
      provider: "provider",
      jobId: "job",
      unit: "render-seconds",
      quantity: 40,
      evidenceRef: "fixture-provider-usage",
    },
    startedAtMs: nowMs - 1000,
    completedAtMs: nowMs,
  };
  return {
    contract,
    evidence,
    envelope,
    manifestBytes,
    artifacts: [{ id: "clip", bytes }],
    measurements,
    trustedPublicKey: keys.publicKey,
    nowMs,
    keys,
  };
}
test("manifest bytes and imported artifact hashes verified without upgrading customer/cost authority", () => {
  const f = fixture();
  const r = importPilotMeasurement(f);
  assert.equal(r.status, "MEASUREMENT_RECORD_COMPLETE");
  assert.equal(r.metrics.deliverableCount, 1);
  assert.equal(r.metrics.cost.amountMinor, 1200);
  assert.equal(r.metrics.cost.authority, "OPERATOR_ATTESTED_INVOICE");
  assert.equal(r.metrics.usage.quantity, 40);
  assert.equal(r.customerSuccessVerified, false);
  assert.equal(r.paymentAuthority, false);
  assert.equal(r.activationAllowed, false);
});
test("missing actual invoice, estimated cost, wrong job and invalid rights block complete record", () => {
  for (const change of [
    (f) => (f.measurements.cost = null),
    (f) => (f.measurements.cost.authority = "ESTIMATE"),
    (f) => (f.measurements.cost.jobId = "other"),
    (f) => (f.evidence.rights.music.status = "UNKNOWN"),
    (f) => delete f.evidence.consent,
    (f) => (f.evidence.acceptance.decision = "REJECT"),
  ]) {
    const f = fixture();
    change(f);
    const r = importPilotMeasurement(f);
    assert.equal(r.status, "BLOCKED");
    assert.equal(r.customerSuccessVerified, false);
  }
});
test("changed or missing local file cannot inherit manifest/customer acceptance", () => {
  for (const change of [
    (f) => (f.artifacts[0].bytes = Buffer.from("changed")),
    (f) => (f.artifacts = []),
    (f) => (f.artifacts[0].id = "other"),
  ]) {
    const f = fixture();
    change(f);
    const r = importPilotMeasurement(f);
    assert.equal(r.status, "BLOCKED");
    assert.equal(r.metrics.deliverableCount, 0);
  }
});
test("numeric costs and timings are explicit and unsafe revisions/schema rejected", () => {
  const f = fixture();
  f.measurements.cost.amountMinor = 0.5;
  assert.equal(importPilotMeasurement(f).status, "BLOCKED");
  f.measurements.cost.amountMinor = 1200;
  f.measurements.completedAtMs = 3000;
  assert.equal(importPilotMeasurement(f).status, "BLOCKED");
  f.measurements.usage.quantity = 0.5;
  assert.throws(() => importPilotMeasurement(f), /usage/);
  const other = fixture();
  other.artifacts.push(other.artifacts[0]);
  assert.throws(() => importPilotMeasurement(other), /artifact/);
});
test("CLI private file import excludes customer references and rejects private keys and symlinks", () => {
  const dir = mkdtempSync(join(tmpdir(), "mew-measured-"));
  try {
    const f = fixture(Date.now());
    const paths = [
      "contract",
      "evidence",
      "receipt",
      "manifest",
      "key",
      "measurements",
      "clip",
    ].map((p) => join(dir, p));
    [f.contract, f.evidence, f.envelope].forEach((v, i) =>
      writeFileSync(paths[i], JSON.stringify(v)),
    );
    writeFileSync(paths[3], f.manifestBytes);
    writeFileSync(
      paths[4],
      f.keys.publicKey.export({ type: "spki", format: "pem" }),
    );
    writeFileSync(paths[5], JSON.stringify(f.measurements));
    writeFileSync(paths[6], f.artifacts[0].bytes);
    const script = fileURLToPath(
      new URL("../scripts/pilot-measurement.mjs", import.meta.url),
    );
    const run = (p) =>
      spawnSync(process.execPath, [script, ...p], {
        encoding: "utf8",
        timeout: 3000,
      });
    const ok = run(paths);
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(ok.stdout.includes("fixture-consent"), false);
    writeFileSync(
      paths[4],
      f.keys.privateKey.export({ type: "pkcs8", format: "pem" }),
    );
    assert.equal(run(paths).status, 2);
    writeFileSync(
      paths[4],
      f.keys.publicKey.export({ type: "spki", format: "pem" }),
    );
    const link = join(dir, "link");
    symlinkSync(paths[6], link);
    assert.equal(run([...paths.slice(0, 6), link]).status, 2);
    f.measurements.cost = null;
    writeFileSync(paths[5], JSON.stringify(f.measurements));
    assert.equal(run(paths).status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
