import {
  auditModelExperiment,
  experimentSha,
  experimentDigest,
} from "./model-experiment.mjs";
import { validateAdvisoryOutput } from "./advisory-output.mjs";
import { semanticDimensions } from "./semantic-review.mjs";

const equal = (a, b) => experimentDigest(a) === experimentDigest(b);
const parse = (raw) => {
  if (!raw || Buffer.byteLength(raw) > 2097152)
    throw Error("Localized artifact limit");
  return JSON.parse(raw);
};
const rows = (raw) => {
  if (!raw || Buffer.byteLength(raw) > 2097152)
    throw Error("Localized artifact limit");
  return raw.toString().trim().split("\n").map(JSON.parse);
};

/** Verify a new localized run against the already validated paired baseline. */
export function auditLocalizedModelExperiment({
  baselineInput,
  policyRaw,
  completionRaw,
  requestsRaw,
  responsesRaw,
  scriptRaw,
  promptsRaw,
}) {
  const baseline = auditModelExperiment(baselineInput),
    basePolicy = parse(baselineInput.policyRaw),
    policy = parse(policyRaw),
    completion = parse(completionRaw),
    prompts = parse(promptsRaw);
  if (
    Object.keys(prompts).sort().join(",") !== "en,fr" ||
    Object.values(prompts).some((p) => typeof p !== "string" || !p.trim())
  )
    throw Error("Localized prompts missing");
  const changed = new Set([
    "schema",
    "changedVariable",
    "variants",
    "variantOrder",
    "observedAt",
    "generationScriptSha256",
    "modelIntegrity",
  ]);
  for (const [key, value] of Object.entries(basePolicy))
    if (!changed.has(key) && !equal(policy[key], value))
      throw Error("Localized controlled variable changed");
  if (
    policy.schema !== "mew.localized-model-experiment-policy.v1" ||
    policy.changedVariable !== "localizedSystemPrompt" ||
    !equal(policy.variants, prompts) ||
    !equal(policy.variantOrder, ["localized"]) ||
    policy.baselinePolicySha256 !== experimentSha(baselineInput.policyRaw) ||
    policy.baselineCompletionSha256 !==
      experimentSha(baselineInput.completionRaw) ||
    policy.baselineRequestsSha256 !==
      experimentSha(baselineInput.variants.baseline.requestsRaw) ||
    policy.baselineResponsesSha256 !==
      experimentSha(baselineInput.variants.baseline.responsesRaw) ||
    policy.baseRunnerSha256 !== experimentSha(baselineInput.scriptRaw) ||
    policy.generationScriptSha256 !== experimentSha(scriptRaw) ||
    policy.localizedPromptsSha256 !== experimentSha(promptsRaw) ||
    !equal(
      policy.modelIntegrity.verifiedFiles,
      basePolicy.modelIntegrity.verifiedFiles,
    ) ||
    policy.modelIntegrity.revision !== basePolicy.modelRevision
  )
    throw Error("Localized policy binding changed");
  if (
    completion.schema !== "mew.model-experiment-completion.v1" ||
    completion.policySha256 !== experimentSha(policyRaw) ||
    completion.requestsFiles?.localized !== experimentSha(requestsRaw) ||
    completion.responseFiles?.localized !== experimentSha(responsesRaw) ||
    completion.modelActivationAllowed !== false ||
    completion.trainingAuthorized !== false ||
    completion.paymentsEnabled !== false
  )
    throw Error("Localized completion changed");
  const requests = rows(requestsRaw),
    responses = rows(responsesRaw),
    baseRequests = rows(baselineInput.variants.baseline.requestsRaw),
    baseCases = baseline.packs.baseline.cases;
  if (
    requests.length !== baseCases.length ||
    responses.length !== baseCases.length
  )
    throw Error("Incomplete localized generation");
  const seen = new Set(),
    measured = [];
  const cases = responses.map((row, index) => {
    const request = requests[index],
      reference = baseCases[index],
      base = baseRequests[index];
    if (
      seen.has(row.id) ||
      row.id !== reference.id ||
      request.id !== reference.id ||
      row.language !== reference.language ||
      request.locale !== reference.language ||
      row.variant !== "localized" ||
      request.variant !== "localized" ||
      request.schema !== "mew.model-experiment-request.v1" ||
      row.schema !== "mew.model-experiment-response.v1"
    )
      throw Error("Localized identity/language changed");
    seen.add(row.id);
    if (
      !equal(Object.keys(request.userInput).sort(), ["evidence", "question"]) ||
      !equal(request.userInput, base.userInput) ||
      request.systemPrompt !== prompts[reference.language] ||
      !equal(request.retrievedSourceIds, base.retrievedSourceIds) ||
      !equal(request.outputSchema, base.outputSchema) ||
      request.outputSchemaSha256 !== base.outputSchemaSha256 ||
      request.policySha256 !== experimentSha(policyRaw) ||
      request.renderedPrompt !==
        base.renderedPrompt.replace(
          basePolicy.variants.baseline,
          prompts[reference.language],
        ) ||
      request.promptSha256 !== experimentSha(request.renderedPrompt) ||
      !Number.isSafeInteger(request.inputTokens) ||
      request.inputTokens < 1 ||
      request.inputTokens + 512 > 8192
    )
      throw Error("Localized evidence, locale or renderer changed");
    if (
      row.requestSha256 !== experimentDigest(request) ||
      row.promptSha256 !== request.promptSha256 ||
      row.policySha256 !== experimentSha(policyRaw) ||
      row.generationScriptSha256 !== experimentSha(scriptRaw) ||
      row.modelRevision !== basePolicy.modelRevision ||
      row.languageModelInvoked !== true ||
      row.semanticReview !== "pending" ||
      !Number.isSafeInteger(row.responseTokenCount) ||
      row.responseTokenCount < 1 ||
      row.responseTokenCount > 512 ||
      typeof row.elapsedSeconds !== "number" ||
      !Number.isFinite(row.elapsedSeconds) ||
      row.elapsedSeconds < 0
    )
      throw Error("Localized inference trace changed");
    const contract = validateAdvisoryOutput(
      row.response,
      request.retrievedSourceIds,
      { maxAnswerChars: 1000 },
    );
    measured.push({
      id: row.id,
      strictContractValid: contract.valid,
      errors: contract.errors,
      allAnnotatedEvidencePresent:
        baseline.audit.variants.baseline.casesAudit[index]
          .allAnnotatedEvidencePresent,
      semanticStatus: "not-human-reviewed",
    });
    const { traceSha256: oldHash, ...content } = reference;
    const trace = {
      ...content,
      rawAnswer: row.response,
      inferenceRequest: request,
      evidence: reference.evidence.map((source) => ({
        ...source,
        cited:
          contract.valid && contract.value.evidenceRefs.includes(source.id),
      })),
      provenance: {
        ...reference.provenance,
        responseFileSha256: experimentSha(responsesRaw),
        responseSha256: experimentSha(row.response),
        promptSha256: row.promptSha256,
        constraintPolicySha256: experimentSha(policyRaw),
        requestSha256: row.requestSha256,
        variant: "localized",
        baselinePolicySha256: experimentSha(baselineInput.policyRaw),
      },
    };
    return { ...trace, traceSha256: experimentDigest(trace) };
  });
  const strictContractPasses = measured.filter(
      (c) => c.strictContractValid,
    ).length,
    annotatedEvidenceCoverage = measured.filter(
      (c) => c.allAnnotatedEvidencePresent,
    ).length;
  const content = {
    schema: "mew.semantic-review-pack.v1",
    scope:
      "Locale-targeted inspected development experiment only; not customer holdout",
    reviewerAuthentication: "not implemented",
    dimensions: semanticDimensions,
    benchmarkSha256: basePolicy.benchmarkSha256,
    sourceSnapshotDigest: basePolicy.sourceSnapshotDigest,
    rawResponsesSha256: experimentSha(responsesRaw),
    experimentPolicySha256: experimentSha(policyRaw),
    variant: "localized",
    cases,
    strictContractPasses,
    annotatedEvidenceCoverage,
    semanticPasses: null,
    modelActivationAllowed: false,
    trainingAuthorized: false,
    paymentsEnabled: false,
  };
  const pack = { ...content, packSha256: experimentDigest(content) };
  return {
    pack,
    audit: {
      schema: "mew.localized-model-experiment-audit.v1",
      verdict: "BLOCKED",
      changedVariable: "localizedSystemPrompt",
      policySha256: experimentSha(policyRaw),
      completionSha256: experimentSha(completionRaw),
      baselinePolicySha256: experimentSha(baselineInput.policyRaw),
      cases: cases.length,
      strictContractPasses,
      annotatedEvidenceCoverage,
      semanticPasses: null,
      semanticImprovementMeasured: false,
      authenticatedHumanReviews: 0,
      customerHoldoutCases: 0,
      packSha256: pack.packSha256,
      modelActivationAllowed: false,
      trainingAuthorized: false,
      paymentsEnabled: false,
      casesAudit: measured,
      limitations: [
        "System language uses question metadata only; no gold labels entered the request.",
        "Prior inspected development cases cannot establish generalization or customer value.",
        "Local receipts/hashes are not authenticated inference or independent human judgments.",
        "Human semantic review, new customer holdout and activation provenance remain pending.",
      ],
    },
  };
}
