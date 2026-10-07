import { mkdir, writeFile, lstat, realpath } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { auditModelExperiment } from "../src/learning/model-experiment.mjs";
import {
  readBoundedRegularFile,
  buildSemanticReviewHtml,
} from "./model-semantic-review.mjs";
import {
  summarizeSemanticReview,
  createSemanticNotesTemplate,
} from "../src/learning/semantic-review.mjs";

export function buildModelExperimentReviewHtml(pack) {
  return buildSemanticReviewHtml(pack)
    .replace(
      "<title>MEW constrained semantic review</title>",
      "<title>MEW controlled prompt experiment review</title>",
    )
    .replace(
      "<h2>Separate judgments</h2>",
      '<details><summary>Exact inference request: system prompt, evidence and rendered input</summary><pre id="inference-request"></pre></details><h2>Separate judgments</h2>',
    )
    .replace(
      "</script></html>",
      '</script><script>function showExperimentRequest(){document.getElementById("inference-request").textContent=JSON.stringify(pack.cases[index].inferenceRequest,null,2)}showExperimentRequest();new MutationObserver(showExperimentRequest).observe(document.getElementById("question"),{childList:true});</script></html>',
    );
}

export async function loadModelExperiment(repository, experiment) {
  const root = resolve(repository),
    path = resolve(root, experiment),
    rel = relative(resolve(root, "research/experiments"), path);
  if (
    !rel ||
    rel.startsWith("..") ||
    isAbsolute(rel) ||
    (await lstat(path)).isSymbolicLink() ||
    (await realpath(path)) !== path
  )
    throw Error("Expected local research experiment directory");
  const frozen = resolve(root, "research/learning/frozen-0ab4d24bf6c71ab8");
  const read = (name) => readBoundedRegularFile(resolve(path, name));
  return {
    benchmarkRaw: await readBoundedRegularFile(
      resolve(frozen, "benchmark.json"),
    ),
    manifest: JSON.parse(
      await readBoundedRegularFile(resolve(frozen, "manifest.json")),
    ),
    reportRaw: await readBoundedRegularFile(
      resolve(frozen, "parent-context-evaluation.json"),
    ),
    fitRaw: await readBoundedRegularFile(
      resolve(frozen, "parent-context-token-fit.json"),
    ),
    receiptRaw: await readBoundedRegularFile(
      resolve(root, "research/learning/local-model-receipt.json"),
    ),
    scriptRaw: await readBoundedRegularFile(
      resolve(root, "scripts/model-experiment-local.py"),
    ),
    policyRaw: await read("policy.json"),
    completionRaw: await read("completion.json"),
    variants: {
      baseline: {
        requestsRaw: await read("baseline-requests.jsonl"),
        responsesRaw: await read("baseline-responses.jsonl"),
      },
      candidate: {
        requestsRaw: await read("candidate-requests.jsonl"),
        responsesRaw: await read("candidate-responses.jsonl"),
      },
    },
  };
}

async function main() {
  const args = process.argv.slice(2),
    [experiment, output, flag, variant, notesPath] = args;
  if (
    !experiment ||
    !output ||
    ![2, 5].includes(args.length) ||
    (args.length === 5 &&
      (flag !== "--notes" || !["baseline", "candidate"].includes(variant)))
  )
    throw Error(
      "Usage: node scripts/model-experiment-audit.mjs research/experiments/<run> <fresh-review-directory> [--notes baseline|candidate <notes-file>]",
    );
  const result = auditModelExperiment(
    await loadModelExperiment(process.cwd(), experiment),
  );
  const notesRaw = notesPath
    ? await readBoundedRegularFile(resolve(notesPath), 262144)
    : undefined;
  const readiness = Object.fromEntries(
    Object.entries(result.packs).map(([name, pack]) => [
      name,
      summarizeSemanticReview(pack, name === variant ? notesRaw : undefined),
    ]),
  );
  const out = resolve(output);
  await mkdir(out, { mode: 0o700 });
  const write = (name, value) =>
    writeFile(
      resolve(out, name),
      typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n",
      { flag: "wx", mode: 0o600 },
    );
  await write("audit.json", result.audit);
  for (const [variant, pack] of Object.entries(result.packs)) {
    await write(`${variant}-review-pack.json`, pack);
    await write(`${variant}-review.html`, buildModelExperimentReviewHtml(pack));
    await write(
      `${variant}-notes-template.json`,
      createSemanticNotesTemplate(pack),
    );
    await write(`${variant}-review-readiness.json`, readiness[variant]);
  }
  process.stdout.write(JSON.stringify(result.audit, null, 2) + "\n");
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    process.stderr.write(error.message + "\n");
    process.exitCode = 1;
  });
