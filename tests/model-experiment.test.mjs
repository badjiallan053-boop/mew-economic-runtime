import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  auditModelExperiment,
  experimentSha,
  experimentDigest,
} from "../src/learning/model-experiment.mjs";
import {
  loadModelExperiment,
  buildModelExperimentReviewHtml,
} from "../scripts/model-experiment-audit.mjs";
import { summarizeSemanticReview } from "../src/learning/semantic-review.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const input = await loadModelExperiment(
  root,
  "research/experiments/prompt-grounding-language-2026-10-08",
);
const fresh = () => ({
  ...input,
  variants: Object.fromEntries(
    Object.entries(input.variants).map(([k, v]) => [k, { ...v }]),
  ),
});
const rows = (raw) => raw.toString().trim().split("\n").map(JSON.parse);
const jsonl = (values) =>
  Buffer.from(values.map((v) => JSON.stringify(v)).join("\n") + "\n");
function mutateVariant(input, variant, mutate) {
  const requestRows = rows(input.variants[variant].requestsRaw),
    responseRows = rows(input.variants[variant].responsesRaw);
  mutate(requestRows, responseRows);
  responseRows.forEach(
    (r, i) => (r.requestSha256 = experimentDigest(requestRows[i])),
  );
  input.variants[variant] = {
    requestsRaw: jsonl(requestRows),
    responsesRaw: jsonl(responseRows),
  };
  const complete = JSON.parse(input.completionRaw);
  complete.requestsFiles[variant] = experimentSha(
    input.variants[variant].requestsRaw,
  );
  complete.responseFiles[variant] = experimentSha(
    input.variants[variant].responsesRaw,
  );
  input.completionRaw = Buffer.from(JSON.stringify(complete));
}

test("actual paired run is complete but cannot measure semantic improvement or authorize activation", () => {
  const { audit, packs } = auditModelExperiment(input);
  assert.equal(audit.verdict, "BLOCKED");
  assert.equal(audit.semanticImprovementMeasured, false);
  assert.equal(audit.customerHoldoutCases, 0);
  for (const variant of ["baseline", "candidate"]) {
    assert.equal(audit.variants[variant].cases, 12);
    assert.equal(audit.variants[variant].strictContractPasses, 12);
    assert.equal(audit.variants[variant].annotatedEvidenceCoverage, 12);
    assert.equal(audit.variants[variant].semanticPasses, null);
    assert.equal(
      summarizeSemanticReview(packs[variant]).authenticatedHumanReviews,
      0,
    );
    assert.equal(packs[variant].modelActivationAllowed, false);
    assert.equal(packs[variant].trainingAuthorized, false);
    assert.equal(packs[variant].paymentsEnabled, false);
  }
});
test("gold criteria cannot leak into model input even when an attacker reseals local file hashes", () => {
  const candidate = fresh();
  mutateVariant(
    candidate,
    "candidate",
    (requests) => (requests[0].userInput.criteria = ["gold answer"]),
  );
  assert.throws(() => auditModelExperiment(candidate), /request\/evidence/);
});
test("context mutation is rejected independently of request-file hashes", () => {
  const candidate = fresh();
  mutateVariant(
    candidate,
    "candidate",
    (requests) => (requests[0].userInput.evidence[0].text += " invented data"),
  );
  assert.throws(() => auditModelExperiment(candidate), /request\/evidence/);
});
test("additional renderer change cannot masquerade as only a system prompt change", () => {
  const candidate = fresh();
  mutateVariant(candidate, "candidate", (requests) => {
    requests[0].renderedPrompt += " extra instructions";
    requests[0].promptSha256 = experimentSha(requests[0].renderedPrompt);
  });
  assert.throws(
    () => auditModelExperiment(candidate),
    /More than system prompt/,
  );
});
test("code, model or completion receipts cannot be silently substituted", () => {
  assert.throws(
    () =>
      auditModelExperiment({
        ...input,
        scriptRaw: Buffer.concat([input.scriptRaw, Buffer.from("\n")]),
      }),
    /Unbound/,
  );
  assert.throws(
    () =>
      auditModelExperiment({
        ...input,
        receiptRaw: Buffer.from(
          JSON.stringify({
            ...JSON.parse(input.receiptRaw),
            revision: "a".repeat(40),
          }),
        ),
      }),
    /Unbound/,
  );
  assert.throws(
    () => auditModelExperiment({ ...input, completionRaw: Buffer.from("{}") }),
    /incomplete/,
  );
});
test("case ordering, duplication and omitted generations are rejected", () => {
  for (const mode of ["duplicate", "reverse", "omit"]) {
    const candidate = fresh();
    mutateVariant(candidate, "candidate", (requests, responses) => {
      if (mode === "duplicate") {
        requests[1] = requests[0];
        responses[1] = responses[0];
      }
      if (mode === "reverse") {
        requests.reverse();
        responses.reverse();
      }
      if (mode === "omit") {
        requests.pop();
        responses.pop();
      }
    });
    assert.throws(
      () => auditModelExperiment(candidate),
      /case identity|Incomplete variant/,
    );
  }
});
test("output constraints, invocation identity and token ceiling are receipt-bound", () => {
  for (const mode of ["schema", "invoked", "tokens"]) {
    const candidate = fresh();
    mutateVariant(candidate, "candidate", (requests, responses) => {
      if (mode === "schema")
        requests[0].outputSchema.properties.authority.const = "can-spend";
      if (mode === "invoked") responses[0].languageModelInvoked = false;
      if (mode === "tokens") responses[0].responseTokenCount = 513;
    });
    assert.throws(
      () => auditModelExperiment(candidate),
      /request\/evidence|response trace/,
    );
  }
});
test("review interface exposes exact input safely; grading remains independent from model calls", () => {
  const pack = auditModelExperiment(input).packs.candidate;
  const html = buildModelExperimentReviewHtml(pack);
  assert.match(html, /Exact inference request/);
  assert.match(html, /inferenceRequest/);
  assert.match(html, /textContent=JSON\.stringify/);
  const malicious = {
    ...pack,
    cases: [
      {
        ...pack.cases[0],
        rawAnswer: '</script><img src="https://tracker.invalid">',
      },
    ],
  };
  assert.ok(
    !buildModelExperimentReviewHtml(malicious).includes("</script><img"),
  );
  assert.match(html, /Gold criteria are for review only/);
});
