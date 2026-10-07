import { resolve, relative, isAbsolute } from "node:path";
import { mkdir, writeFile, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { readBoundedRegularFile } from "./model-semantic-review.mjs";
import {
  loadModelExperiment,
  buildModelExperimentReviewHtml,
} from "./model-experiment-audit.mjs";
import { auditLocalizedModelExperiment } from "../src/learning/model-experiment-localized.mjs";
import {
  createSemanticNotesTemplate,
  summarizeSemanticReview,
} from "../src/learning/semantic-review.mjs";

export async function loadLocalizedModelExperiment(root, experiment) {
  const path = resolve(root, experiment),
    rel = relative(resolve(root, "research/experiments"), path);
  if (
    !rel ||
    rel.startsWith("..") ||
    isAbsolute(rel) ||
    (await realpath(path)) !== path
  )
    throw Error("Expected local research experiment");
  const read = (name) => readBoundedRegularFile(resolve(path, name));
  return {
    baselineInput: await loadModelExperiment(
      root,
      "research/experiments/prompt-grounding-language-2026-10-08",
    ),
    policyRaw: await read("policy.json"),
    completionRaw: await read("completion.json"),
    requestsRaw: await read("localized-requests.jsonl"),
    responsesRaw: await read("localized-responses.jsonl"),
    scriptRaw: await readBoundedRegularFile(
      resolve(root, "scripts/model-experiment-localized.py"),
    ),
    promptsRaw: await readBoundedRegularFile(
      resolve(root, "src/learning/model-experiment-localized-prompts.json"),
    ),
  };
}
async function main() {
  const args = process.argv.slice(2),
    [experiment, output, flag, notesPath] = args;
  if (
    ![2, 4].includes(args.length) ||
    !experiment ||
    !output ||
    (args.length === 4 && flag !== "--notes")
  )
    throw Error(
      "Usage: node scripts/model-experiment-localized-audit.mjs research/experiments/<run> <fresh-review-directory> [--notes <notes-file>]",
    );
  const { pack, audit } = auditLocalizedModelExperiment(
    await loadLocalizedModelExperiment(process.cwd(), experiment),
  );
  const readiness = summarizeSemanticReview(
    pack,
    notesPath
      ? await readBoundedRegularFile(resolve(notesPath), 262144)
      : undefined,
  );
  const out = resolve(output);
  await mkdir(out, { mode: 0o700 });
  const write = (name, value) =>
    writeFile(
      resolve(out, name),
      typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n",
      { mode: 0o600, flag: "wx" },
    );
  await write("audit.json", audit);
  await write("localized-review-pack.json", pack);
  await write("localized-review.html", buildModelExperimentReviewHtml(pack));
  await write(
    "localized-notes-template.json",
    createSemanticNotesTemplate(pack),
  );
  await write("localized-review-readiness.json", readiness);
  process.stdout.write(JSON.stringify(audit, null, 2) + "\n");
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    process.stderr.write(error.message + "\n");
    process.exitCode = 1;
  });
