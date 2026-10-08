import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  validateActivationEvidence,
  verifyActivationEvidence,
} from "../src/integration/activation-evidence.mjs";
const bytes = Buffer.from("actual reviewed artifact"),
  nowMs = Date.parse("2026-10-08T00:00:00.000Z");
const fixture = () => ({
  schema: "mew.activation-evidence.v1",
  lane: "model",
  verdict: "BLOCKED",
  observedAt: "2026-10-08T00:00:00.000Z",
  claims: [
    {
      id: "format-coverage",
      status: "PASS",
      artifact: {
        path: "research/learning/example.json",
        sha256: createHash("sha256").update(bytes).digest("hex"),
      },
      note: "A formatting result does not establish semantic correctness",
    },
    {
      id: "customer-holdout",
      status: "UNKNOWN",
      artifact: null,
      note: "No customer evaluation yet",
    },
  ],
  blockers: [
    {
      id: "human-review",
      owner: "model evaluator",
      nextAction: "Review frozen responses",
      evidenceRequired: "Versioned semantic labels and customer holdout",
    },
  ],
  authority: {
    modelActivation: false,
    paymentSigning: false,
    paymentBroadcast: false,
    productionDeployment: false,
  },
});
test("intact artifacts retain blocked semantics and never grant activation authority", async () => {
  const result = await verifyActivationEvidence(fixture(), {
    nowMs,
    readArtifact: async () => bytes,
  });
  assert.equal(result.artifactsIntact, true);
  assert.equal(result.reviewVerdict, "BLOCKED");
  assert.ok(Object.values(result.authority).every((v) => v === false));
});
test("substituted, missing and stale artifacts cannot pass review", async () => {
  for (const readArtifact of [
    async () => Buffer.from("changed output"),
    async () => {
      throw Error("secret-bearing path failure");
    },
  ]) {
    const result = await verifyActivationEvidence(fixture(), {
      nowMs,
      readArtifact,
    });
    assert.equal(result.reviewVerdict, "UNKNOWN");
    assert.ok(!JSON.stringify(result).includes("secret-bearing"));
  }
  const stale = await verifyActivationEvidence(fixture(), {
    nowMs: nowMs + 8 * 86400000,
    readArtifact: async () => bytes,
  });
  assert.equal(stale.reviewVerdict, "UNKNOWN");
});
test("handoffs reject authority escalation, false completeness and unsafe artifact reads", () => {
  const invalid = [];
  let r = fixture();
  r.authority.paymentBroadcast = true;
  invalid.push(r);
  r = fixture();
  r.verdict = "PASS";
  invalid.push(r);
  r = fixture();
  r.claims[0].artifact = null;
  invalid.push(r);
  r = fixture();
  r.claims.push(structuredClone(r.claims[0]));
  invalid.push(r);
  for (const path of [
    "research/../.env",
    "/etc/passwd",
    ".local/config.json",
    "research/.secret.json",
  ]) {
    r = fixture();
    r.claims[0].artifact.path = path;
    invalid.push(r);
  }
  for (const report of invalid)
    assert.throws(() => validateActivationEvidence(report));
});
