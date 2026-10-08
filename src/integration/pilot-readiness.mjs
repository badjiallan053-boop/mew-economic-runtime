import { createHash } from "node:crypto";
import { verifyDeliveryReceipt } from "../adapters/delivery-receipt.mjs";
const text = (v) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= 512;
const exact = (v, keys) => {
  if (
    !v ||
    Object.getPrototypeOf(v) !== Object.prototype ||
    Object.keys(v).length !== keys.length ||
    keys.some((k) => !Object.hasOwn(v, k))
  )
    throw Error("Invalid pilot fields");
};
/** Operator-owned immutable contract and pre-enrolled key, never customer request
 * trust anchors. Pure offline validation; no journal, acceptance or payment write. */
export function evaluatePilotReadiness({
  contract,
  evidence = {},
  envelope,
  artifactBytes,
  trustedPublicKey,
  nowMs = Date.now(),
}) {
  exact(contract, [
    "schema",
    "expected",
    "sourceId",
    "artifactVersion",
    "clipCount",
    "revisionLimit",
    "permittedUse",
    "acceptanceOwner",
  ]);
  exact(contract.expected, [
    "keyId",
    "principal",
    "objectiveId",
    "effectId",
    "provider",
    "jobId",
    "artifactSha256",
  ]);
  if (
    contract.schema !== "mew.customer-pilot.v1" ||
    !text(contract.sourceId) ||
    !text(contract.acceptanceOwner) ||
    !["internal-review", "organic", "paid-advertising"].includes(
      contract.permittedUse,
    ) ||
    !Number.isSafeInteger(contract.artifactVersion) ||
    contract.artifactVersion < 1 ||
    !Number.isSafeInteger(contract.clipCount) ||
    contract.clipCount < 1 ||
    contract.clipCount > 100 ||
    !Number.isSafeInteger(contract.revisionLimit) ||
    contract.revisionLimit < 0 ||
    contract.revisionLimit > 20 ||
    Object.entries(contract.expected).some(([k, v]) =>
      k === "artifactSha256" ? !/^[a-f0-9]{64}$/.test(v) : !text(v),
    )
  )
    throw Error("Invalid pilot contract");
  if (
    !evidence ||
    Object.getPrototypeOf(evidence) !== Object.prototype ||
    Object.keys(evidence).some(
      (k) => !["consent", "rights", "acceptance"].includes(k),
    )
  )
    throw Error("Invalid pilot evidence");
  const gates = [];
  const gate = (id, pass, status, note) =>
    gates.push({
      id,
      status: pass ? status : "BLOCKED",
      note: pass ? note : `Missing or mismatched ${id} evidence`,
    });
  const c = evidence.consent;
  gate(
    "customer-consent",
    c &&
      c.principal === contract.expected.principal &&
      c.sourceId === contract.sourceId &&
      c.permittedUse === contract.permittedUse &&
      text(c.evidenceRef),
    "ATTESTED",
    "Operator-supplied consent reference only; authenticity requires human review.",
  );
  const r = evidence.rights;
  gate(
    "media-rights",
    r &&
      r.sourceId === contract.sourceId &&
      r.permittedUse === contract.permittedUse &&
      ["content", "music", "likeness"].every(
        (k) => r[k] && r[k].status === "APPROVED" && text(r[k].evidenceRef),
      ),
    "ATTESTED",
    "Operator-supplied content/music/likeness scope references; no legal validity inferred.",
  );
  const a = evidence.acceptance;
  const digest =
    Buffer.isBuffer(artifactBytes) && artifactBytes.length <= 16 * 1024 * 1024
      ? createHash("sha256").update(artifactBytes).digest("hex")
      : null;
  gate(
    "customer-acceptance",
    a &&
      a.principal === contract.expected.principal &&
      a.owner === contract.acceptanceOwner &&
      a.sourceId === contract.sourceId &&
      a.artifactSha256 === contract.expected.artifactSha256 &&
      a.artifactSha256 === digest &&
      a.artifactVersion === contract.artifactVersion &&
      a.clipCount === contract.clipCount &&
      Number.isSafeInteger(a.revision) &&
      a.revision >= 0 &&
      a.revision <= contract.revisionLimit &&
      a.decision === "ACCEPT" &&
      text(a.evidenceRef),
    "ATTESTED",
    "Exact artifact and revision bound to operator-supplied acceptance reference; media quality not inspected.",
  );
  let verified = null;
  try {
    verified = verifyDeliveryReceipt({
      envelope,
      expected: contract.expected,
      artifactBytes,
      trustedPublicKey,
      nowMs,
    });
  } catch {
    /* Never leak artifact/provider payload into report. */
  }
  gate(
    "authenticated-delivery",
    verified !== null,
    "VERIFIED",
    "Existing Ed25519 verifier checked pretrusted identity, artifact bytes and freshness. Replay identity has not been persisted by this tool.",
  );
  return {
    schema: "mew.customer-pilot-readiness.v1",
    status: gates.some((g) => g.status === "BLOCKED")
      ? "BLOCKED"
      : "OFFLINE_CHECKS_PASSED",
    gates,
    receipt: verified
      ? { receiptId: verified.receiptId, receiptDigest: verified.receiptDigest }
      : null,
    activationAllowed: false,
    paymentAuthority: false,
    deliveryRecorded: false,
    limitations: [
      "Consent, rights and customer acceptance are operator attestations, not independently authenticated customer evidence.",
      "No replay claim or delivery transition is written; persist through the existing private OperationStore/OperatorService before use.",
      "PostgreSQL integration has no equivalent transactional delivery path; do not copy a SQLite acceptance into it.",
      "No media rendering, external job dispatch, publishing or financial settlement is established.",
    ],
  };
}
