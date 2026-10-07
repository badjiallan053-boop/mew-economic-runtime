// Read-only reproduction of agent annotations; no inference or activation.
import fs from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  blindedDigest,
  summarizeBlindedComparison,
} from "../../../src/learning/blinded-model-review.mjs";
import { auditModelExperiment } from "../../../src/learning/model-experiment.mjs";
import { auditLocalizedModelExperiment } from "../../../src/learning/model-experiment-localized.mjs";
import { loadModelExperiment } from "../../../scripts/model-experiment-audit.mjs";
import { loadLocalizedModelExperiment } from "../../../scripts/model-experiment-localized-audit.mjs";

const directory = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(directory, "../../..");
const bytes = (name) => fs.readFileSync(resolve(directory, name));
const read = (name) => JSON.parse(bytes(name));
const sha = (value) => createHash("sha256").update(value).digest("hex");
const requireMatch = (condition, label) => {
  if (!condition) throw Error(label);
};
const pack = read("blinded-pack.json"),
  notes = read("review-notes.json"),
  key = read("unblinded-mapping.json"),
  freeze = read("pre-unblinding-freeze.json"),
  opened = read("unblinding-record.json");

requireMatch(
  sha(bytes("review-notes.json")) === freeze.notesFileSha256 &&
    sha(bytes("review-protocol.md")) === freeze.protocolFileSha256 &&
    freeze.packSha256 === pack.packSha256 &&
    freeze.mappingOpenedByThisReview === false &&
    opened.notesFileSha256 === freeze.notesFileSha256 &&
    opened.protocolFileSha256 === freeze.protocolFileSha256 &&
    Number.isFinite(Date.parse(freeze.finalizedAt)) &&
    Date.parse(opened.openedAt) >= Date.parse(freeze.finalizedAt),
  "Changed pre-unblinding record",
);
requireMatch(
  notes.reviewer.type === "agent" &&
    notes.reviewer.identityAuthenticated === false,
  "This artifact must remain an unauthenticated agent review",
);
const baseline = auditModelExperiment(
  await loadModelExperiment(
    root,
    "research/experiments/prompt-grounding-language-2026-10-08",
  ),
).packs.baseline;
const localized = auditLocalizedModelExperiment(
  await loadLocalizedModelExperiment(
    root,
    "research/experiments/prompt-localized-action-v2-2026-10-08",
  ),
).pack;
requireMatch(
  baseline.packSha256 === key.leftPackSha256 &&
    localized.packSha256 === key.rightPackSha256 &&
    key.leftVariant === baseline.variant &&
    key.rightVariant === localized.variant,
  "Mapping does not bind the preserved audited source packs",
);
const sources = new Map();
for (const pair of pack.cases) {
  const mapping = key.rows.find((row) => row.id === pair.id);
  requireMatch(Boolean(mapping), "Missing mapping");
  for (const label of ["A", "B"]) {
    const source = mapping[label].side === "left" ? baseline : localized;
    const trace = source.cases.find((row) => row.id === mapping[label].id);
    requireMatch(
      trace &&
        trace.traceSha256 === mapping[label].traceSha256 &&
        trace.rawAnswer === pair.answers[label] &&
        trace.language === pair.language &&
        trace.question === pair.question &&
        trace.criteria === pair.criteria &&
        blindedDigest(trace.supportingEvidenceSpans) ===
          blindedDigest(pair.supportingEvidenceSpans) &&
        blindedDigest(
          trace.evidence.map(({ id, text, sha256 }) => ({ id, text, sha256 })),
        ) === blindedDigest(pair.evidence),
      "Changed source answer, criteria or supplied context",
    );
  }
  for (const evidence of pair.evidence) {
    requireMatch(sha(evidence.text) === evidence.sha256, "Changed evidence");
    requireMatch(
      !sources.has(evidence.id) || sources.get(evidence.id) === evidence.sha256,
      "Conflicting evidence versions",
    );
    sources.set(evidence.id, evidence.sha256);
  }
}
requireMatch(
  blindedDigest([...sources].map(([id, sha256]) => ({ id, sha256 }))) ===
    blindedDigest(freeze.sourceEvidence),
  "Changed frozen evidence manifest",
);
const summary = summarizeBlindedComparison(pack, key, notes);
requireMatch(
  blindedDigest(summary) === blindedDigest(read("summary.json")),
  "Changed stored summary",
);
const judgments = notes.notes.flatMap((row) =>
  Object.values(row.judgments).flatMap((answer) => Object.values(answer)),
);
requireMatch(
  pack.cases.length === 12 &&
    notes.notes.length === 12 &&
    judgments.length === 144 &&
    judgments.every((value) => ["pass", "fail", "defer"].includes(value)),
  "Incomplete review",
);
requireMatch(
  summary.verdict === "BLOCKED" &&
    summary.semanticPasses === null &&
    summary.authenticatedHumanReviews === 0 &&
    summary.customerHoldoutCases === 0 &&
    summary.modelActivationAllowed === false &&
    summary.trainingAuthorized === false &&
    summary.paymentsEnabled === false,
  "Review must not grant authority",
);
console.log(
  JSON.stringify(
    {
      schema: "mew.agent-review-verification.v1",
      integrityChecksPassed: true,
      inferencePerformed: false,
      packSha256: pack.packSha256,
      notesFileSha256: freeze.notesFileSha256,
      auditedSourcePackSha256: {
        baseline: baseline.packSha256,
        localized: localized.packSha256,
      },
      pairs: 12,
      reviewedAnswers: 24,
      judgments: 144,
      authenticatedHumanReviews: 0,
      customerHoldoutCases: 0,
      semanticPasses: null,
      modelActivationAllowed: false,
      trainingAuthorized: false,
      paymentsEnabled: false,
      limitation: "Hashes reproduce bytes and counts, not judgment correctness or reviewer independence.",
    },
    null,
    2,
  ),
);
