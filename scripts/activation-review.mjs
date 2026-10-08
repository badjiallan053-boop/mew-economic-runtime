import { open, realpath } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  artifactPath,
  verifyActivationEvidence,
} from "../src/integration/activation-evidence.mjs";

const root = await realpath(
  resolve(dirname(fileURLToPath(import.meta.url)), ".."),
);
async function readArtifact(relative) {
  artifactPath(relative);
  const path = resolve(root, relative),
    actual = await realpath(path);
  if (actual !== path || !actual.startsWith(root + sep))
    throw Error("Artifact link rejected");
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > 2097152)
      throw Error("Artifact budget exceeded");
    return await file.readFile();
  } finally {
    await file.close();
  }
}
if (process.argv.length !== 2)
  throw Error("Activation review accepts no secrets or arbitrary paths");
const reviews = [];
for (const lane of ["database", "model", "payment"]) {
  try {
    const report = JSON.parse(
      await readArtifact(`research/activation/${lane}-handoff.json`),
    );
    if (report.lane !== lane) throw Error("Handoff lane mismatch");
    reviews.push(await verifyActivationEvidence(report, { readArtifact }));
  } catch {
    reviews.push({
      lane,
      reviewVerdict: "UNKNOWN",
      artifactsIntact: false,
      issues: [
        {
          id: "handoff-validation",
          reason:
            "Missing or invalid bounded handoff; no provider action attempted",
        },
      ],
    });
  }
}
const report = {
  schema: "mew.activation-team-review.v1",
  observedAt: new Date().toISOString(),
  reviewVerdict: reviews.some((r) => r.reviewVerdict === "BLOCKED")
    ? "BLOCKED"
    : reviews.some((r) => r.reviewVerdict === "UNKNOWN")
      ? "UNKNOWN"
      : "PASS",
  reviews,
  modelActivationAllowed: false,
  paymentSigningAllowed: false,
  paymentBroadcastAllowed: false,
  productionDeploymentAllowed: false,
};
console.log(JSON.stringify(report, null, 2));
if (report.reviewVerdict !== "PASS") process.exitCode = 2;
