import { createHash } from "node:crypto";
import { evaluatePilotReadiness } from "./pilot-readiness.mjs";
const exact = (value, keys) => {
  if (
    !value ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).length !== keys.length ||
    keys.some((k) => !Object.hasOwn(value, k))
  )
    throw Error("Invalid measurement fields");
};
const text = (v) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= 512;
const hash = (v) => createHash("sha256").update(v).digest("hex");
/** Offline private evidence import. Money is invoice metadata, never ledger units
 * or a price estimate. Customer declarations retain operator-attested authority. */
export function importPilotMeasurement({
  contract,
  evidence,
  envelope,
  manifestBytes,
  artifacts,
  measurements,
  trustedPublicKey,
  nowMs = Date.now(),
}) {
  if (!Buffer.isBuffer(manifestBytes) || manifestBytes.length > 65536)
    throw Error("Bounded manifest required");
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  exact(manifest, ["schema", "sourceId", "artifactVersion", "clips"]);
  if (
    manifest.schema !== "mew.pilot-deliverables.v1" ||
    !text(manifest.sourceId) ||
    !Number.isSafeInteger(manifest.artifactVersion) ||
    manifest.artifactVersion < 1 ||
    !Array.isArray(manifest.clips) ||
    manifest.clips.length < 1 ||
    manifest.clips.length > 100
  )
    throw Error("Invalid deliverable manifest");
  const ids = new Set();
  for (const clip of manifest.clips) {
    exact(clip, ["id", "sha256", "byteLength"]);
    if (
      !text(clip.id) ||
      ids.has(clip.id) ||
      !/^[a-f0-9]{64}$/.test(clip.sha256) ||
      !Number.isSafeInteger(clip.byteLength) ||
      clip.byteLength < 1 ||
      clip.byteLength > 8388608
    )
      throw Error("Invalid clip identity");
    ids.add(clip.id);
  }
  if (!Array.isArray(artifacts) || artifacts.length > 100)
    throw Error("Bounded artifact list required");
  let bytes = 0;
  const imported = new Map();
  for (const artifact of artifacts) {
    exact(artifact, ["id", "bytes"]);
    if (
      !text(artifact.id) ||
      imported.has(artifact.id) ||
      !Buffer.isBuffer(artifact.bytes) ||
      artifact.bytes.length > 8388608
    )
      throw Error("Invalid imported artifact");
    bytes += artifact.bytes.length;
    if (bytes > 33554432) throw Error("Artifact byte budget exceeded");
    imported.set(artifact.id, artifact.bytes);
  }
  exact(measurements, ["cost", "usage", "startedAtMs", "completedAtMs"]);
  const readiness = evaluatePilotReadiness({
    contract,
    evidence,
    envelope,
    artifactBytes: manifestBytes,
    trustedPublicKey,
    nowMs,
  });
  const gates = readiness.gates.map((g) => ({ ...g }));
  const manifestMatches =
    manifest.sourceId === contract.sourceId &&
    manifest.artifactVersion === contract.artifactVersion &&
    manifest.clips.length === contract.clipCount &&
    artifacts.length === manifest.clips.length &&
    manifest.clips.every((clip) => {
      const b = imported.get(clip.id);
      return b && b.length === clip.byteLength && hash(b) === clip.sha256;
    });
  gates.push({
    id: "deliverable-files",
    status: manifestMatches ? "VERIFIED" : "BLOCKED",
    note: manifestMatches
      ? "Local bytes match every trusted signed manifest entry; video quality and customer acceptance remain attested."
      : "Missing, changed or contract-mismatched deliverable files",
  });
  let cost = null;
  const c = measurements.cost;
  if (c !== null) {
    exact(c, [
      "currency",
      "minorUnitExponent",
      "amountMinor",
      "authority",
      "evidenceRef",
      "provider",
      "jobId",
    ]);
    if (
      c.authority === "OPERATOR_ATTESTED_INVOICE" &&
      /^[A-Z]{3,6}$/.test(c.currency) &&
      Number.isSafeInteger(c.minorUnitExponent) &&
      c.minorUnitExponent >= 0 &&
      c.minorUnitExponent <= 12 &&
      Number.isSafeInteger(c.amountMinor) &&
      c.amountMinor >= 0 &&
      text(c.evidenceRef) &&
      c.provider === contract.expected.provider &&
      c.jobId === contract.expected.jobId
    )
      cost = {
        currency: c.currency,
        minorUnitExponent: c.minorUnitExponent,
        amountMinor: c.amountMinor,
        authority: c.authority,
      };
  }
  gates.push({
    id: "actual-provider-cost",
    status: cost ? "ATTESTED" : "BLOCKED",
    note: cost
      ? "Operator-attested invoiced amount bound to provider/job; invoice authenticity and payment are not verified."
      : "No matching actual invoice cost; estimates and usage-derived prices do not count.",
  });
  let usage = null;
  if (measurements.usage !== null) {
    const u = measurements.usage;
    exact(u, ["provider", "jobId", "unit", "quantity", "evidenceRef"]);
    if (
      !text(u.unit) ||
      !text(u.evidenceRef) ||
      !Number.isSafeInteger(u.quantity) ||
      u.quantity < 0 ||
      u.provider !== contract.expected.provider ||
      u.jobId !== contract.expected.jobId
    )
      throw Error("Invalid usage measurement");
    usage = {
      unit: u.unit,
      quantity: u.quantity,
      authority: "OPERATOR_IMPORTED_PROVIDER_USAGE",
    };
  }
  const timeValid =
    Number.isSafeInteger(measurements.startedAtMs) &&
    Number.isSafeInteger(measurements.completedAtMs) &&
    measurements.startedAtMs >= 0 &&
    measurements.completedAtMs >= measurements.startedAtMs &&
    measurements.completedAtMs <= nowMs;
  gates.push({
    id: "elapsed-time",
    status: timeValid ? "ATTESTED" : "BLOCKED",
    note: timeValid
      ? "Operator-imported start/end timestamps; no independent clock provenance established."
      : "Missing or invalid observation timestamps",
  });
  return {
    schema: "mew.pilot-measurement.v1",
    status: gates.some((g) => g.status === "BLOCKED")
      ? "BLOCKED"
      : "MEASUREMENT_RECORD_COMPLETE",
    gates,
    metrics: {
      deliverableBytesVerified: manifestMatches,
      deliverableCount: manifestMatches ? manifest.clips.length : 0,
      acceptedCountAttested:
        readiness.gates.find((g) => g.id === "customer-acceptance").status ===
        "ATTESTED"
          ? contract.clipCount
          : 0,
      cost,
      usage,
      elapsedMs: timeValid
        ? measurements.completedAtMs - measurements.startedAtMs
        : null,
    },
    activationAllowed: false,
    publishingAllowed: false,
    paymentAuthority: false,
    customerSuccessVerified: false,
    limitations: [
      "No customer was contacted; records must come from the authorized pilot.",
      "Consent, rights, acceptance, invoice and timestamps are operator attestations, not independently authenticated customer or billing evidence.",
      "Byte verification does not inspect rendered media quality, legal scope or business outcomes.",
      "Usage counts never become invoiced money; no currency conversion or economic ledger mutation occurs.",
    ],
  };
}
