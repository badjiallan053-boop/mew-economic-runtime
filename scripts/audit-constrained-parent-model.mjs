import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { verifyFrozenBenchmark } from "../src/learning/benchmark.mjs";
import { auditParentModel } from "../src/learning/parent-model-audit.mjs";
const dir = "research/learning/frozen-0ab4d24bf6c71ab8",
  sha = (v) => createHash("sha256").update(v).digest("hex"),
  canonical = (v) =>
    Array.isArray(v)
      ? v.map(canonical)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, canonical(v[k])]),
          )
        : v;
const manifest = JSON.parse(await readFile(`${dir}/manifest.json`)),
  benchmark = verifyFrozenBenchmark(
    await readFile(`${dir}/benchmark.json`),
    manifest,
  ),
  responseRaw = await readFile(`${dir}/constrained-parent-responses.jsonl`),
  policyRaw = await readFile(`${dir}/constrained-model-policy.json`),
  policy = JSON.parse(policyRaw);
const result = auditParentModel({
  benchmark,
  manifest,
  reportRaw: await readFile(`${dir}/parent-context-evaluation.json`),
  fit: JSON.parse(await readFile(`${dir}/parent-context-token-fit.json`)),
  responseRaw,
});
const scriptHash = sha(
  await readFile("scripts/evaluate-constrained-parent-model.py"),
);
if (
  policy.outlinesVersion !== "1.3.3" ||
  policy.outlinesCoreVersion !== "0.2.14" ||
  policy.benchmarkSha256 !== manifest.sha256 ||
  policy.parentReportSha256 !==
    sha(await readFile(`${dir}/parent-context-evaluation.json`)) ||
  policy.generationMaxTokens !== 512 ||
  policy.answerCharCap !== 1000 ||
  policy.contextRendererChanged !== false ||
  policy.modelActivationAllowed !== false ||
  policy.trainingAuthorized !== false
)
  throw Error("Constrained policy changed");
for (const row of responseRaw.toString().trim().split("\n").map(JSON.parse)) {
  if (
    row.decodingBackend !== "outlines-mlx" ||
    row.outlinesVersion !== policy.outlinesVersion ||
    row.constraintPolicySha256 !== sha(policyRaw) ||
    row.generationScriptSha256 !== scriptHash ||
    row.outputSchemaSha256 !== sha(JSON.stringify(canonical(row.outputSchema)))
  )
    throw Error("Grammar receipt mismatch");
  const ids = row.retrievedSourceIds,
    refs = [];
  for (let n = 0; n <= ids.length; n++) {
    const visit = (start, chosen) => {
      if (chosen.length === n) {
        refs.push(chosen);
        return;
      }
      for (let i = start; i < ids.length; i++)
        visit(i + 1, [...chosen, ids[i]]);
    };
    visit(0, []);
  }
  const expected = {
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
    JSON.stringify(canonical(row.outputSchema)) !==
    JSON.stringify(canonical(expected))
  )
    throw Error("Unbound schema/source choices");
  const output = JSON.parse(row.response);
  if (
    Array.from(output.answer).length > policy.answerCharCap ||
    !refs.some(
      (r) => JSON.stringify(r) === JSON.stringify(output.evidenceRefs),
    ) ||
    !Number.isSafeInteger(row.responseTokenCount) ||
    row.responseTokenCount < 1 ||
    row.responseTokenCount > 512
  )
    throw Error("Response violates recorded decoding policy");
}
result.schema = "mew.constrained-parent-audit.v1";
result.constraintPolicySha256 = sha(policyRaw);
result.decodingBackend = "outlines-mlx";
result.limitations = [
  "Actual same-weight local generation with a constrained decoder; no adapter or answer repair.",
  "Shorter bounded answers and canonical source-subset choices change the generation policy.",
  "Strict validity does not prove correct answers, citation entailment or correct language.",
  "Visible unsupported product claims and mixed-language answers require further work.",
  "No human grading, customer holdout, model activation, training permission or payment authority.",
  "Trusted local hashes are not authenticated inference attestation.",
];
await writeFile(
  `${dir}/constrained-parent-audit.json`,
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    strictContractPasses: result.strictContractPasses,
    cases: result.cases.length,
    modelActivationAllowed: result.modelActivationAllowed,
  }),
);
