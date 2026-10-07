import test from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { deliveryReceiptBytes } from "../src/adapters/delivery-receipt.mjs";
import { evaluatePilotReadiness } from "../src/integration/pilot-readiness.mjs";
function fixture() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const artifactBytes = Buffer.from("test fixture only");
  const expected = {
    keyId: "key-1",
    principal: "customer-1",
    objectiveId: "obj-1",
    effectId: "effect-1",
    provider: "provider-1",
    jobId: "job-1",
    artifactSha256: createHash("sha256").update(artifactBytes).digest("hex"),
  };
  const contract = {
    schema: "mew.customer-pilot.v1",
    expected,
    sourceId: "source-1",
    artifactVersion: 1,
    clipCount: 5,
    revisionLimit: 1,
    permittedUse: "internal-review",
    acceptanceOwner: "owner-1",
  };
  const payload = {
    version: "mew-delivery-v1",
    receiptId: "receipt-1",
    ...expected,
    issuedAtMs: 1000,
    expiresAtMs: 5000,
  };
  const envelope = {
    payload,
    signature: sign(null, deliveryReceiptBytes(payload), privateKey).toString(
      "base64url",
    ),
  };
  const evidence = {
    consent: {
      principal: "customer-1",
      sourceId: "source-1",
      permittedUse: "internal-review",
      evidenceRef: "test-consent",
    },
    rights: {
      sourceId: "source-1",
      permittedUse: "internal-review",
      ...Object.fromEntries(
        ["content", "music", "likeness"].map((k) => [
          k,
          { status: "APPROVED", evidenceRef: `test-${k}` },
        ]),
      ),
    },
    acceptance: {
      principal: "customer-1",
      owner: "owner-1",
      sourceId: "source-1",
      artifactSha256: expected.artifactSha256,
      artifactVersion: 1,
      clipCount: 5,
      revision: 0,
      decision: "ACCEPT",
      evidenceRef: "test-acceptance",
    },
  };
  return {
    contract,
    evidence,
    envelope,
    artifactBytes,
    trustedPublicKey: publicKey,
    nowMs: 2000,
  };
}
test("offline receipt verification does not upgrade attestations or authorize activation", () => {
  const f = fixture(),
    before = structuredClone(f.evidence);
  const result = evaluatePilotReadiness(f);
  assert.equal(result.status, "OFFLINE_CHECKS_PASSED");
  assert.deepEqual(
    result.gates.map((g) => g.status),
    ["ATTESTED", "ATTESTED", "ATTESTED", "VERIFIED"],
  );
  assert.equal(result.activationAllowed, false);
  assert.equal(result.deliveryRecorded, false);
  assert.equal(result.paymentAuthority, false);
  assert.deepEqual(f.evidence, before);
});
test("missing consent and rights stay blocked despite genuine provider signature", () => {
  const f = fixture();
  delete f.evidence.consent;
  f.evidence.rights.music.status = "UNKNOWN";
  const r = evaluatePilotReadiness(f);
  assert.equal(r.status, "BLOCKED");
  assert.equal(r.gates[0].status, "BLOCKED");
  assert.equal(r.gates[1].status, "BLOCKED");
  assert.equal(r.gates[3].status, "VERIFIED");
});
test("wrong customer, use scope, artifact version and revisions cannot inherit acceptance", () => {
  for (const [section, key, value] of [
    ["consent", "principal", "other"],
    ["consent", "permittedUse", "paid-advertising"],
    ["acceptance", "owner", "other"],
    ["acceptance", "artifactVersion", 2],
    ["acceptance", "revision", -1],
    ["acceptance", "revision", 2],
    ["acceptance", "revision", "0"],
  ]) {
    const f = fixture();
    f.evidence[section][key] = value;
    assert.equal(evaluatePilotReadiness(f).status, "BLOCKED");
  }
});
test("tampered bytes, wrong enrolled key, stale receipt or mismatched job fail delivery", () => {
  for (const change of [
    (f) => (f.artifactBytes = Buffer.from("other")),
    (f) => (f.trustedPublicKey = generateKeyPairSync("ed25519").publicKey),
    (f) => (f.nowMs = 5000),
    (f) => (f.contract.expected.jobId = "other"),
  ]) {
    const f = fixture();
    change(f);
    assert.equal(evaluatePilotReadiness(f).gates[3].status, "BLOCKED");
  }
});
test("malformed contract and unexpected evidence keys rejected", () => {
  const f = fixture();
  assert.throws(
    () =>
      evaluatePilotReadiness({
        ...f,
        contract: { ...f.contract, activationAllowed: true },
      }),
    /Invalid/,
  );
  assert.throws(
    () =>
      evaluatePilotReadiness({
        ...f,
        evidence: { ...f.evidence, verified: true },
      }),
    /Invalid/,
  );
});

import { mkdtempSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
test("CLI checks public-key fixture but rejects private PEM, symlink and nonregular files", () => {
  const dir = mkdtempSync(join(tmpdir(), "mew-pilot-"));
  try {
    const f = fixture(),
      keys = generateKeyPairSync("ed25519");
    f.envelope.payload.issuedAtMs = Date.now() - 1000;
    f.envelope.payload.expiresAtMs = Date.now() + 100000;
    f.envelope.signature = sign(
      null,
      deliveryReceiptBytes(f.envelope.payload),
      keys.privateKey,
    ).toString("base64url");
    const paths = [
      "contract.json",
      "evidence.json",
      "receipt.json",
      "artifact",
      "key.pem",
    ].map((p) => join(dir, p));
    for (const [i, value] of [f.contract, f.evidence, f.envelope].entries())
      writeFileSync(paths[i], JSON.stringify(value));
    writeFileSync(paths[3], f.artifactBytes);
    writeFileSync(
      paths[4],
      keys.publicKey.export({ format: "pem", type: "spki" }),
    );
    const script = fileURLToPath(
      new URL("../scripts/pilot-readiness.mjs", import.meta.url),
    );
    const run = (p) =>
      spawnSync(process.execPath, [script, ...p], {
        encoding: "utf8",
        timeout: 3000,
      });
    const success = run(paths);
    assert.equal(success.status, 0, success.stderr);
    assert.equal(JSON.parse(success.stdout).activationAllowed, false);
    writeFileSync(
      paths[4],
      keys.privateKey.export({ format: "pem", type: "pkcs8" }),
    );
    assert.equal(run(paths).status, 2);
    writeFileSync(
      paths[4],
      keys.publicKey.export({ format: "pem", type: "spki" }),
    );
    const link = join(dir, "key-link");
    symlinkSync(paths[4], link);
    assert.equal(run([...paths.slice(0, 4), link]).status, 2);
    assert.equal(run([...paths.slice(0, 4), dir]).status, 2);
    if (process.platform !== "win32") {
      const fifo = join(dir, "fifo");
      const made = spawnSync("mkfifo", [fifo]);
      assert.equal(made.status, 0);
      const result = run([...paths.slice(0, 4), fifo]);
      assert.equal(result.status, 2);
      assert.equal(result.error, undefined);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
