import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve, relative } from "node:path";
import { auditParentModel } from "../../../../src/learning/parent-model-audit.mjs";
import { verifyFrozenBenchmark } from "../../../../src/learning/benchmark.mjs";
import { validateAdvisoryOutput } from "../../../../src/learning/advisory-output.mjs";

// Offline inspection only: no provider, network, model invocation or file writes.
if (process.argv.length !== 2)
  throw Error(
    "No arguments supported; inspect the bundled repository artifacts",
  );
const root = fileURLToPath(new URL("../../../../", import.meta.url));
const dir = "research/learning/frozen-0ab4d24bf6c71ab8";
const sha = (raw) => createHash("sha256").update(raw).digest("hex");
const load = (path) => readFile(resolve(root, path));
const json = async (path) => JSON.parse(await load(path));
const manifest = await json(`${dir}/manifest.json`);
const benchmark = verifyFrozenBenchmark(
  await load(`${dir}/benchmark.json`),
  manifest,
);
const reportRaw = await load(`${dir}/parent-context-evaluation.json`);
const fit = await json(`${dir}/parent-context-token-fit.json`);
const responseRaw = await load(`${dir}/constrained-parent-responses.jsonl`);
const saved = await json(`${dir}/constrained-parent-audit.json`);
const measured = auditParentModel({
  benchmark,
  manifest,
  reportRaw,
  fit,
  responseRaw,
});
const policyRaw = await load(`${dir}/constrained-model-policy.json`);
if (
  saved.schema !== "mew.constrained-parent-audit.v1" ||
  saved.benchmarkSha256 !== manifest.sha256 ||
  saved.constraintPolicySha256 !== sha(policyRaw) ||
  saved.responseFileSha256 !== sha(responseRaw) ||
  saved.strictContractPasses !== measured.strictContractPasses ||
  saved.annotatedEvidenceCoverage !== measured.annotatedEvidenceCoverage ||
  saved.cases.length !== measured.cases.length ||
  saved.modelActivationAllowed !== false ||
  saved.trainingAuthorized !== false ||
  saved.paymentsEnabled !== false
)
  throw Error("Constrained audit binding or aggregate mismatch");
const rows = responseRaw.toString().trim().split("\n").map(JSON.parse);
for (const row of rows) {
  const recorded = saved.cases.find((c) => c.id === row.id);
  const strict = validateAdvisoryOutput(row.response, row.retrievedSourceIds);
  if (
    !recorded ||
    recorded.strictContractValid !== strict.valid ||
    recorded.semanticStatus !== "not-human-reviewed" ||
    recorded.citationEntailment !== "unmeasured"
  )
    throw Error(
      "Per-case validity or unreviewed semantic status changed; review the procedure",
    );
}
const artifact = async (path) => ({
  path: relative(root, resolve(root, path)),
  sha256: sha(await load(path)),
});
console.log(
  JSON.stringify(
    {
      schema: "mew.activation-evidence.v1",
      lane: "model",
      verdict: "BLOCKED",
      observedAt: new Date().toISOString(),
      claims: [
        {
          id: "frozen-development-identity",
          status: "PASS",
          artifact: await artifact(`${dir}/benchmark.json`),
          note: "Twelve agent-reviewed EN/FR cases verified against the frozen manifest; not a customer holdout.",
        },
        {
          id: "expanded-context-and-constrained-contract",
          status: "PASS",
          artifact: await artifact(`${dir}/constrained-parent-audit.json`),
          note: `${measured.annotatedEvidenceCoverage}/${measured.cases.length} exact annotated evidence coverage and ${measured.strictContractPasses}/${measured.cases.length} strict contract validity; no semantic success implied.`,
        },
        {
          id: "semantic-customer-readiness",
          status: "BLOCKED",
          artifact: await artifact(`${dir}/constrained-parent-audit.json`),
          note: "All cases remain not-human-reviewed; citation entailment unmeasured; no customer holdout or promotion proof.",
        },
        {
          id: "private-provider-activation",
          status: "UNKNOWN",
          artifact: null,
          note: "This read-only inspection never reads credentials, calls a provider or inspects hosting secrets.",
        },
      ],
      blockers: [
        {
          id: "domain-review",
          owner: "model-evaluation specialist + domain human",
          nextAction:
            "Review every constrained response against exact supplied spans and requested language; resolve supported failures.",
          evidenceRequired:
            "Authenticated reviewer record, rubric version, response/source hashes and per-case judgments.",
        },
        {
          id: "customer-holdout",
          owner: "product pilot owner",
          nextAction:
            "Freeze new human-reviewed, lineage-disjoint pilot cases and release criteria before running a candidate.",
          evidenceRequired:
            "Approved pilot scope, disjointness register, holdout hash and precommitted thresholds.",
        },
        {
          id: "provider-proof",
          owner: "private backend operator",
          nextAction:
            "After scoped credentials and spend control are configured, run one durably fenced synthetic attempt and retain raw outputs/usage/provenance.",
          evidenceRequired:
            "Immutable run ID, bound experiment receipt, sanitized per-case traces, actual usage and spend evidence; no automatic retry.",
        },
      ],
      authority: {
        modelActivation: false,
        paymentSigning: false,
        paymentBroadcast: false,
        productionDeployment: false,
      },
    },
    null,
    2,
  ),
);
