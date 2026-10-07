import { createHash } from "node:crypto";
import { exact } from "./store.mjs";

const statuses = ["PASS", "BLOCKED", "UNKNOWN"];
const lanes = ["database", "model", "payment", "audit"];
const authorityKeys = [
  "modelActivation",
  "paymentSigning",
  "paymentBroadcast",
  "productionDeployment",
];
const id = (v) => typeof v === "string" && /^[a-z][a-z0-9-]{0,79}$/.test(v);
const text = (v, max = 2000) =>
  typeof v === "string" &&
  v.trim().length > 0 &&
  v.length <= max &&
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v);
export function artifactPath(v) {
  if (
    typeof v !== "string" ||
    v.length > 300 ||
    !/^(research|docs|src|scripts|tests|contracts|prompts)\/[A-Za-z0-9._/-]+$/.test(
      v,
    ) ||
    v
      .split("/")
      .some(
        (part) =>
          !part || part === "." || part === ".." || part.startsWith("."),
      )
  )
    throw Error("Invalid public artifact path");
  return v;
}

/** Advisory handoff only. Artifact integrity cannot authorize an external action. */
export function validateActivationEvidence(report) {
  exact(report, [
    "schema",
    "lane",
    "verdict",
    "observedAt",
    "claims",
    "blockers",
    "authority",
  ]);
  if (
    report.schema !== "mew.activation-evidence.v1" ||
    !lanes.includes(report.lane) ||
    !statuses.includes(report.verdict) ||
    typeof report.observedAt !== "string" ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(report.observedAt) ||
    !Number.isFinite(Date.parse(report.observedAt)) ||
    new Date(report.observedAt).toISOString() !== report.observedAt
  )
    throw Error("Invalid activation handoff");
  exact(report.authority, authorityKeys);
  if (authorityKeys.some((key) => report.authority[key] !== false))
    throw Error("Activation handoff carries no external authority");
  if (
    !Array.isArray(report.claims) ||
    !report.claims.length ||
    report.claims.length > 30 ||
    !Array.isArray(report.blockers) ||
    report.blockers.length > 30
  )
    throw Error("Invalid handoff bounds");
  const claimIds = new Set(),
    blockerIds = new Set();
  for (const claim of report.claims) {
    exact(claim, ["id", "status", "artifact", "note"]);
    if (
      !id(claim.id) ||
      claimIds.has(claim.id) ||
      !statuses.includes(claim.status) ||
      !text(claim.note)
    )
      throw Error("Invalid or duplicated claim");
    claimIds.add(claim.id);
    if (claim.artifact !== null) {
      exact(claim.artifact, ["path", "sha256"]);
      artifactPath(claim.artifact.path);
      if (
        typeof claim.artifact.sha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(claim.artifact.sha256)
      )
        throw Error("Invalid artifact digest");
    } else if (claim.status === "PASS")
      throw Error("PASS requires a bound artifact");
  }
  for (const blocker of report.blockers) {
    exact(blocker, ["id", "owner", "nextAction", "evidenceRequired"]);
    if (
      !id(blocker.id) ||
      blockerIds.has(blocker.id) ||
      !text(blocker.owner, 200) ||
      !text(blocker.nextAction) ||
      !text(blocker.evidenceRequired)
    )
      throw Error("Invalid or duplicated blocker");
    blockerIds.add(blocker.id);
  }
  if (
    report.verdict === "PASS" &&
    (report.blockers.length ||
      report.claims.some((claim) => claim.status !== "PASS"))
  )
    throw Error("PASS conflicts with missing evidence");
  if (
    report.verdict === "BLOCKED" &&
    !report.blockers.length &&
    !report.claims.some((claim) => claim.status === "BLOCKED")
  )
    throw Error("Blocked handoff needs a concrete blocker");
  return structuredClone(report);
}

export async function verifyActivationEvidence(
  report,
  { readArtifact, nowMs = Date.now(), maxAgeMs = 7 * 86400000 } = {},
) {
  const validated = validateActivationEvidence(report);
  if (
    typeof readArtifact !== "function" ||
    !Number.isSafeInteger(nowMs) ||
    nowMs < 0 ||
    !Number.isSafeInteger(maxAgeMs) ||
    maxAgeMs < 1 ||
    maxAgeMs > 30 * 86400000
  )
    throw Error("Invalid evidence verification context");
  const age = nowMs - Date.parse(validated.observedAt);
  const issues = [];
  if (age < -300000 || age > maxAgeMs)
    issues.push({
      id: "handoff-freshness",
      reason: "Handoff is future-dated or requires fresh review",
    });
  for (const claim of validated.claims) {
    if (claim.artifact === null) continue;
    try {
      const bytes = await readArtifact(claim.artifact.path);
      if (
        !(bytes instanceof Uint8Array) ||
        bytes.byteLength > 2097152 ||
        createHash("sha256").update(bytes).digest("hex") !==
          claim.artifact.sha256
      )
        throw Error("Artifact mismatch");
    } catch {
      issues.push({
        id: claim.id,
        reason: "Artifact unavailable, oversized or digest changed",
      });
    }
  }
  return {
    schema: "mew.activation-review.v1",
    lane: validated.lane,
    reportedVerdict: validated.verdict,
    reviewVerdict: issues.length ? "UNKNOWN" : validated.verdict,
    artifactsIntact: issues.length === 0,
    issues,
    blockers: validated.blockers,
    authority: validated.authority,
    limitations: [
      "Matching hashes establish artifact integrity, not semantic correctness, chain finality, independent audit or permission to activate.",
      "This report never changes a credential, model, payment, deployment or economic ledger.",
    ],
  };
}
