import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CompanyRuntime } from "../src/company/runtime.mjs";
import { educationMission } from "../src/company/education-context.mjs";

const directory = process.argv[2];
if (!directory)
  throw new Error("Pass the collected education snapshot directory");
const records = await readFile(resolve(directory, "records.jsonl"), "utf8");
const quality = JSON.parse(
  await readFile(resolve(directory, "quality.json"), "utf8"),
);
const mission = educationMission(records, quality);
const runtime = new CompanyRuntime(":memory:", { workflow: "compact" });
try {
  runtime.create(mission);
  const result = await runtime.run(mission.id, (context) => ({
    missionId: context.missionId,
    taskId: context.taskId,
    agentId: context.agentId,
    recommendation: "ACCEPT",
    summary: `SIMULATION of contract and handoff execution for ${context.assignment.task}. Public source metadata supplied; no model inference, training, deployment or payment is performed. Human review is still required.`,
    evidenceRefs: context.evidence.map((e) => e.id),
    riskCodes: [
      "PUBLIC_SOURCE_UNTRUSTED",
      "HUMAN_REVIEW_REQUIRED",
      "SIMULATED_PROVIDER",
    ],
  }));
  console.log(
    JSON.stringify(
      {
        snapshotDigest: quality.recordsSha256,
        mode: result.mode,
        workflow: "compact",
        evidenceCount: result.mission.evidence.length,
        tasks: result.tasks.map((t) => ({
          taskId: t.taskId,
          status: t.status,
          output: t.output,
        })),
        paymentsEnabled: false,
        modelActivated: false,
        limitations:
          "Actual mission validation and advisory handoff execution with a simulated provider; no quality improvement or model judgment is claimed.",
      },
      null,
      2,
    ),
  );
} finally {
  runtime.close();
}
