import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadLocalizedModelExperiment } from "../scripts/model-experiment-localized-audit.mjs";
import { auditLocalizedModelExperiment } from "../src/learning/model-experiment-localized.mjs";
import {
  experimentSha,
  experimentDigest,
} from "../src/learning/model-experiment.mjs";
import { summarizeSemanticReview } from "../src/learning/semantic-review.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const input = await loadLocalizedModelExperiment(
  root,
  "research/experiments/prompt-localized-action-v2-2026-10-08",
);
const rows = (raw) => raw.toString().trim().split("\n").map(JSON.parse);
const encode = (values) =>
  Buffer.from(values.map(JSON.stringify).join("\n") + "\n");
function mutated(edit) {
  const next = { ...input },
    requests = rows(input.requestsRaw),
    responses = rows(input.responsesRaw);
  edit(requests, responses);
  responses.forEach(
    (row, i) => (row.requestSha256 = experimentDigest(requests[i])),
  );
  next.requestsRaw = encode(requests);
  next.responsesRaw = encode(responses);
  const completion = JSON.parse(next.completionRaw);
  completion.requestsFiles.localized = experimentSha(next.requestsRaw);
  completion.responseFiles.localized = experimentSha(next.responsesRaw);
  next.completionRaw = Buffer.from(JSON.stringify(completion));
  return next;
}
test("twelve actual localized outputs preserve all economic and promotion boundaries", () => {
  const { audit, pack } = auditLocalizedModelExperiment(input);
  assert.equal(audit.cases, 12);
  assert.equal(audit.strictContractPasses, 12);
  assert.equal(audit.annotatedEvidenceCoverage, 12);
  assert.equal(audit.semanticPasses, null);
  assert.equal(audit.semanticImprovementMeasured, false);
  assert.equal(audit.customerHoldoutCases, 0);
  assert.equal(audit.verdict, "BLOCKED");
  assert.equal(summarizeSemanticReview(pack).authenticatedHumanReviews, 0);
  assert.ok(pack.cases.every((c) => c.inferenceRequest.locale === c.language));
  for (const flag of [
    "modelActivationAllowed",
    "trainingAuthorized",
    "paymentsEnabled",
  ])
    assert.equal(audit[flag], false);
});
test("locale cannot be selected by altered model request metadata", () => {
  assert.throws(
    () =>
      auditLocalizedModelExperiment(
        mutated((requests) => (requests[1].locale = "en")),
      ),
    /identity\/language/,
  );
  assert.throws(
    () =>
      auditLocalizedModelExperiment(
        mutated(
          (requests) => (requests[1].systemPrompt = requests[0].systemPrompt),
        ),
      ),
    /evidence, locale or renderer/,
  );
});
test("localized renderer must preserve original JSON field order exactly", () => {
  const changed = mutated((requests) => {
    requests[0].renderedPrompt = requests[0].renderedPrompt.replace(
      '"question":',
      '"goldQuestion":',
    );
    requests[0].promptSha256 = experimentSha(requests[0].renderedPrompt);
  });
  assert.throws(() => auditLocalizedModelExperiment(changed), /renderer/);
});
test("gold fields, source edits and omitted cases are rejected after resealing local hashes", () => {
  assert.throws(
    () =>
      auditLocalizedModelExperiment(
        mutated(
          (requests) => (requests[0].userInput.criteria = ["answer key"]),
        ),
      ),
    /evidence/,
  );
  assert.throws(
    () =>
      auditLocalizedModelExperiment(
        mutated(
          (requests) => (requests[0].userInput.evidence[0].text += " invented"),
        ),
      ),
    /evidence/,
  );
  assert.throws(
    () =>
      auditLocalizedModelExperiment(
        mutated((requests, responses) => {
          requests.pop();
          responses.pop();
        }),
      ),
    /Incomplete/,
  );
});
test("localized source script, instructions and controlled baseline are immutable inputs", () => {
  assert.throws(
    () =>
      auditLocalizedModelExperiment({
        ...input,
        scriptRaw: Buffer.concat([input.scriptRaw, Buffer.from("\n")]),
      }),
    /policy binding/,
  );
  assert.throws(
    () =>
      auditLocalizedModelExperiment({
        ...input,
        promptsRaw: Buffer.from(
          JSON.stringify({ en: "claim success", fr: "déclarer réussi" }),
        ),
      }),
    /policy binding/,
  );
  assert.throws(
    () =>
      auditLocalizedModelExperiment({
        ...input,
        baselineInput: {
          ...input.baselineInput,
          scriptRaw: Buffer.from("changed"),
        },
      }),
    /Unbound/,
  );
});
