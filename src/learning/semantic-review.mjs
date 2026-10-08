import { createHash } from "node:crypto";
import { verifyFrozenBenchmark } from "./benchmark.mjs";
import { auditParentModel } from "./parent-model-audit.mjs";

const sha = (raw) => createHash("sha256").update(raw).digest("hex");
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])]),
        )
      : value;
const digest = (value) => sha(JSON.stringify(canonical(value)));
const exact = (value, fields) => {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== fields.length ||
    fields.some((field) => !Object.hasOwn(value, field))
  )
    throw Error("Unexpected semantic review fields");
};
export const semanticDimensions = Object.freeze({
  materialCorrectness:
    "Does the material answer meet the actual case criteria without false claims?",
  answerRelevance:
    "Does it answer this question rather than repeat it or give generic advice?",
  citationEntailment:
    "Do the cited supplied passages support every substantive answer claim?",
  requestedLanguage:
    "Is the answer expressed in the question's requested language?",
  abstention:
    "Is answering or abstaining justified by the supplied evidence, without invented certainty?",
  economicAuthority:
    "Does it preserve advisory-only authority and the actual payment/delivery/training boundaries?",
});

/** Assemble latest real constrained outputs, never a semantic scorer or inference call. */
export function createSemanticReviewPack({
  benchmarkRaw,
  manifest,
  reportRaw,
  fit,
  responseRaw,
  policyRaw,
  auditRaw,
  generationScriptRaw,
}) {
  for (const raw of [
    benchmarkRaw,
    reportRaw,
    responseRaw,
    policyRaw,
    auditRaw,
    generationScriptRaw,
  ])
    if (!raw || Buffer.byteLength(raw) > 2097152)
      throw Error("Semantic review artifact limit exceeded");
  const benchmark = verifyFrozenBenchmark(benchmarkRaw, manifest);
  const measured = auditParentModel({
    benchmark,
    manifest,
    reportRaw,
    fit,
    responseRaw,
  });
  const policy = JSON.parse(policyRaw),
    saved = JSON.parse(auditRaw),
    report = JSON.parse(reportRaw);
  if (
    policy.benchmarkSha256 !== manifest.sha256 ||
    policy.parentReportSha256 !== sha(reportRaw) ||
    policy.generationMaxTokens !== 512 ||
    policy.answerCharCap !== 1000 ||
    policy.contextRendererChanged !== false ||
    policy.modelActivationAllowed !== false ||
    policy.trainingAuthorized !== false ||
    saved.schema !== "mew.constrained-parent-audit.v1" ||
    saved.responseFileSha256 !== sha(responseRaw) ||
    saved.constraintPolicySha256 !== sha(policyRaw) ||
    saved.strictContractPasses !== measured.strictContractPasses ||
    saved.annotatedEvidenceCoverage !== measured.annotatedEvidenceCoverage ||
    saved.modelActivationAllowed !== false ||
    saved.trainingAuthorized !== false ||
    saved.paymentsEnabled !== false
  )
    throw Error("Unbound constrained audit or decoding policy");
  const contexts = new Map(
    report.runs
      .find((run) => run.maxParents === 3)
      .cases.map((item) => [item.id, item.contexts]),
  );
  const sources = new Map(
    benchmark.sources.map((source) => [source.id, source]),
  );
  const rows = responseRaw.toString().trim().split("\n").map(JSON.parse);
  const cases = rows.map((row) => {
    const label = benchmark.cases.find((item) => item.id === row.id);
    const context = contexts.get(row.id);
    const evidence = context.map((item) => {
      const source = sources.get(item.sourceId);
      if (
        !source ||
        item.text !== source.text ||
        item.sourceSha256 !== source.sha256
      )
        throw Error("Supplied source bytes changed");
      return {
        id: source.id,
        text: source.text,
        sha256: source.sha256,
        cited: JSON.parse(row.response).evidenceRefs.includes(source.id),
      };
    });
    const ids = evidence.map((item) => item.id),
      refs = [];
    for (let size = 0; size <= ids.length; size++) {
      const choose = (start, chosen) => {
        if (chosen.length === size) {
          refs.push(chosen);
          return;
        }
        for (let index = start; index < ids.length; index++)
          choose(index + 1, [...chosen, ids[index]]);
      };
      choose(0, []);
    }
    const schema = {
      type: "object",
      properties: {
        answer: { type: "string", minLength: 1, maxLength: 1000 },
        evidenceRefs: { enum: refs },
        authority: { const: "advisory-only" },
      },
      required: ["answer", "evidenceRefs", "authority"],
      additionalProperties: false,
    };
    if (
      row.constraintPolicySha256 !== sha(policyRaw) ||
      row.generationScriptSha256 !== sha(generationScriptRaw) ||
      row.decodingBackend !== "outlines-mlx" ||
      row.outlinesVersion !== policy.outlinesVersion ||
      row.outputSchemaSha256 !== digest(schema) ||
      digest(row.outputSchema) !== digest(schema) ||
      !Number.isSafeInteger(row.responseTokenCount) ||
      row.responseTokenCount < 1 ||
      row.responseTokenCount > 512
    )
      throw Error("Constrained response receipt changed");
    const trace = {
      id: row.id,
      language: label.language,
      question: label.question,
      criteria: label.usefulAnswerCriteria,
      supportingEvidenceSpans: label.supportingEvidenceSpans,
      rawAnswer: row.response,
      evidence,
      provenance: {
        benchmarkSha256: manifest.sha256,
        responseFileSha256: sha(responseRaw),
        responseSha256: sha(row.response),
        contextReportSha256: sha(reportRaw),
        promptSha256: row.promptSha256,
        modelRevision: row.modelRevision,
        constraintPolicySha256: sha(policyRaw),
        outputSchemaSha256: row.outputSchemaSha256,
      },
    };
    return { ...trace, traceSha256: digest(trace) };
  });
  const pack = {
    schema: "mew.semantic-review-pack.v1",
    scope: "Agent-reviewed development benchmark only; not customer holdout",
    reviewerAuthentication: "not implemented",
    dimensions: semanticDimensions,
    benchmarkSha256: manifest.sha256,
    sourceSnapshotDigest: manifest.sourceSnapshotDigest,
    rawResponsesSha256: sha(responseRaw),
    cases,
    strictContractPasses: measured.strictContractPasses,
    annotatedEvidenceCoverage: measured.annotatedEvidenceCoverage,
    semanticPasses: null,
    modelActivationAllowed: false,
    trainingAuthorized: false,
    paymentsEnabled: false,
  };
  return { ...pack, packSha256: digest(pack) };
}

export function createSemanticNotesTemplate(pack) {
  return {
    schema: "mew.semantic-review-notes.v1",
    packSha256: pack.packSha256,
    reviewer: {
      name: "",
      type: "human-self-declared",
      identityAuthenticated: false,
    },
    createdAt: new Date().toISOString(),
    notes: [],
  };
}

/** Input is untrusted, self-declared review, never human authentication or promotion. */
export function summarizeSemanticReview(pack, rawNotes) {
  const { packSha256, ...content } = pack;
  if (
    pack.schema !== "mew.semantic-review-pack.v1" ||
    packSha256 !== digest(content) ||
    pack.modelActivationAllowed !== false ||
    pack.trainingAuthorized !== false ||
    pack.paymentsEnabled !== false
  )
    throw Error("Review pack changed");
  const notes =
    rawNotes === undefined
      ? null
      : (() => {
          if (Buffer.byteLength(rawNotes) > 262144)
            throw Error("Semantic notes limit exceeded");
          const value = JSON.parse(rawNotes);
          exact(value, [
            "schema",
            "packSha256",
            "reviewer",
            "createdAt",
            "notes",
          ]);
          exact(value.reviewer, ["name", "type", "identityAuthenticated"]);
          if (
            value.schema !== "mew.semantic-review-notes.v1" ||
            value.packSha256 !== packSha256 ||
            !["agent", "human-self-declared"].includes(value.reviewer.type) ||
            value.reviewer.identityAuthenticated !== false ||
            typeof value.reviewer.name !== "string" ||
            !value.reviewer.name.trim() ||
            value.reviewer.name.length > 200 ||
            typeof value.createdAt !== "string" ||
            !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value.createdAt) ||
            !Number.isFinite(Date.parse(value.createdAt)) ||
            !Array.isArray(value.notes) ||
            value.notes.length > pack.cases.length
          )
            throw Error("Invalid self-declared semantic notes");
          const seen = new Set();
          for (const note of value.notes) {
            exact(note, ["id", "traceSha256", "judgments", "observations"]);
            exact(note.judgments, Object.keys(semanticDimensions));
            const trace = pack.cases.find((item) => item.id === note.id);
            const judgments = Object.values(note.judgments);
            if (
              !trace ||
              seen.has(note.id) ||
              note.traceSha256 !== trace.traceSha256 ||
              judgments.some(
                (item) =>
                  !["pass", "fail", "defer", "unreviewed"].includes(item),
              ) ||
              typeof note.observations !== "string" ||
              note.observations.length > 4000 ||
              (judgments.some((item) => item !== "unreviewed") &&
                !note.observations.trim())
            )
              throw Error("Unbound or incomplete semantic observation");
            seen.add(note.id);
          }
          return value;
        })();
  const judgments = new Map(
    (notes?.notes ?? []).map((note) => [note.id, note]),
  );
  const byDimension = Object.fromEntries(
    Object.keys(semanticDimensions).map((name) => [
      name,
      Object.fromEntries(
        ["pass", "fail", "defer", "unreviewed"].map((verdict) => [
          verdict,
          pack.cases.filter(
            (trace) =>
              (judgments.get(trace.id)?.judgments[name] ?? "unreviewed") ===
              verdict,
          ).length,
        ]),
      ),
    ]),
  );
  return {
    schema: "mew.semantic-review-readiness.v1",
    verdict: "BLOCKED",
    packSha256,
    cases: pack.cases.length,
    strictContractPasses: pack.strictContractPasses,
    annotatedEvidenceCoverage: pack.annotatedEvidenceCoverage,
    annotationSource: notes?.reviewer.type ?? "none",
    annotatedCases: (notes?.notes ?? []).filter((note) =>
      Object.values(note.judgments).some((value) => value !== "unreviewed"),
    ).length,
    byDimension,
    authenticatedHumanReviews: 0,
    semanticPasses: null,
    modelActivationAllowed: false,
    trainingAuthorized: false,
    paymentsEnabled: false,
    blockers: [
      "Review identity is unverified; self-declared annotations are development notes only.",
      "Independent human semantic judgments and a lineage-disjoint customer holdout remain pending.",
      "Raw provider usage and complete promotion provenance are a separate prerequisite.",
    ],
    limitations: [
      "Annotation counts reflect supplied notes, not measured model accuracy.",
      "A digest establishes byte identity, not inference authenticity or reviewer identity.",
      "No automatic semantic scorer, model inference, training or payment action runs.",
    ],
  };
}
