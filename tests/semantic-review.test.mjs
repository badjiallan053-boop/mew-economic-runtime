import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import {
  loadSemanticReviewPack,
  buildSemanticReviewHtml,
  readBoundedRegularFile,
} from "../scripts/model-semantic-review.mjs";
import {
  createSemanticReviewPack,
  createSemanticNotesTemplate,
  semanticDimensions,
  summarizeSemanticReview,
} from "../src/learning/semantic-review.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const dir = new URL(
  "../research/learning/frozen-0ab4d24bf6c71ab8/",
  import.meta.url,
);
const pack = await loadSemanticReviewPack(root);
async function rawInputs() {
  const raw = (name) => readFile(new URL(name, dir));
  return {
    benchmarkRaw: await raw("benchmark.json"),
    manifest: JSON.parse(await raw("manifest.json")),
    reportRaw: await raw("parent-context-evaluation.json"),
    fit: JSON.parse(await raw("parent-context-token-fit.json")),
    responseRaw: await raw("constrained-parent-responses.jsonl"),
    policyRaw: await raw("constrained-model-policy.json"),
    auditRaw: await raw("constrained-parent-audit.json"),
    generationScriptRaw: await readFile(
      new URL(
        "../scripts/evaluate-constrained-parent-model.py",
        import.meta.url,
      ),
    ),
  };
}
function notes() {
  const value = createSemanticNotesTemplate(pack);
  value.reviewer.name = "Example reviewer";
  value.notes = [
    {
      id: pack.cases[0].id,
      traceSha256: pack.cases[0].traceSha256,
      judgments: Object.fromEntries(
        Object.keys(semanticDimensions).map((key) => [key, "pass"]),
      ),
      observations: "Self-declared test annotation tied to the supplied trace.",
    },
  ];
  return value;
}

test("latest constrained review binds all twelve raw answers and exact supplied sources", async () => {
  assert.equal(pack.cases.length, 12);
  assert.equal(pack.strictContractPasses, 12);
  assert.equal(pack.annotatedEvidenceCoverage, 12);
  const inputs = await rawInputs(),
    benchmark = JSON.parse(inputs.benchmarkRaw),
    rows = inputs.responseRaw.toString().trim().split("\n").map(JSON.parse);
  for (const trace of pack.cases) {
    assert.equal(
      trace.rawAnswer,
      rows.find((row) => row.id === trace.id).response,
    );
    assert.equal(
      trace.question,
      benchmark.cases.find((item) => item.id === trace.id).question,
    );
    for (const source of trace.evidence)
      assert.equal(
        source.text,
        benchmark.sources.find((item) => item.id === source.id).text,
      );
    assert.equal(trace.traceSha256.length, 64);
  }
  assert.equal(pack.semanticPasses, null);
  assert.equal(pack.modelActivationAllowed, false);
});

test("substituted decoding, renderer, source bytes and generation script fail binding", async () => {
  const original = await rawInputs();
  assert.throws(
    () =>
      createSemanticReviewPack({
        ...original,
        benchmarkRaw: Buffer.concat([original.benchmarkRaw, Buffer.from(" ")]),
      }),
    /benchmark changed/,
  );
  assert.throws(
    () =>
      createSemanticReviewPack({
        ...original,
        generationScriptRaw: Buffer.from("substituted"),
      }),
    /receipt changed/,
  );
  const changedFit = structuredClone(original.fit);
  changedFit.cases[0].promptSha256 = "0".repeat(64);
  // Change the three-parent entry actually used by the constrained experiment.
  changedFit.cases.find((item) => item.maxParents === 3).promptSha256 =
    "0".repeat(64);
  assert.throws(
    () => createSemanticReviewPack({ ...original, fit: changedFit }),
    /renderer mismatch/,
  );
  const policy = JSON.parse(original.policyRaw);
  policy.modelActivationAllowed = true;
  assert.throws(
    () =>
      createSemanticReviewPack({
        ...original,
        policyRaw: Buffer.from(JSON.stringify(policy)),
      }),
    /audit or decoding policy/,
  );
});

test("no notes means unmeasured semantics, not a false zero accuracy score", () => {
  const result = summarizeSemanticReview(pack);
  assert.equal(result.annotatedCases, 0);
  assert.equal(result.semanticPasses, null);
  assert.equal(result.verdict, "BLOCKED");
  for (const counts of Object.values(result.byDimension))
    assert.deepEqual(counts, { pass: 0, fail: 0, defer: 0, unreviewed: 12 });
});

test("even all self-declared passes cannot authenticate review or activate training/model", () => {
  const value = notes();
  value.notes = pack.cases.map((trace) => ({
    ...structuredClone(value.notes[0]),
    id: trace.id,
    traceSha256: trace.traceSha256,
  }));
  const result = summarizeSemanticReview(pack, JSON.stringify(value));
  assert.equal(result.annotatedCases, 12);
  assert.equal(result.byDimension.materialCorrectness.pass, 12);
  assert.equal(result.authenticatedHumanReviews, 0);
  assert.equal(result.semanticPasses, null);
  assert.equal(result.modelActivationAllowed, false);
  assert.equal(result.trainingAuthorized, false);
  assert.equal(result.paymentsEnabled, false);
  assert.equal(result.verdict, "BLOCKED");
});

test("annotation imports reject stale hashes, authority escalation and silent missing reasons", () => {
  for (const mutate of [
    (value) => (value.packSha256 = "0".repeat(64)),
    (value) => (value.notes[0].traceSha256 = "0".repeat(64)),
    (value) => value.notes.push(structuredClone(value.notes[0])),
    (value) => (value.notes[0].id = "unknown-case"),
    (value) => (value.reviewer.identityAuthenticated = true),
    (value) => (value.reviewer.type = "human-authenticated"),
    (value) => (value.modelActivationAllowed = true),
    (value) => (value.notes[0].judgments.materialCorrectness = "approved"),
    (value) => delete value.notes[0].judgments.citationEntailment,
    (value) => (value.notes[0].observations = ""),
    (value) => (value.notes[0].trainingAuthorized = true),
  ]) {
    const value = notes();
    mutate(value);
    assert.throws(() => summarizeSemanticReview(pack, JSON.stringify(value)));
  }
  assert.throws(
    () => summarizeSemanticReview(pack, " ".repeat(262145)),
    /limit/,
  );
  const altered = structuredClone(pack);
  altered.cases[0].rawAnswer = "changed";
  assert.throws(() => summarizeSemanticReview(altered), /pack changed/);
});

test("agent annotations retain reviewer type and per-dimension failures", () => {
  const value = notes();
  value.reviewer.type = "agent";
  value.notes[0].judgments.answerRelevance = "fail";
  value.notes[0].judgments.citationEntailment = "defer";
  const result = summarizeSemanticReview(pack, JSON.stringify(value));
  assert.equal(result.annotationSource, "agent");
  assert.equal(result.byDimension.answerRelevance.fail, 1);
  assert.equal(result.byDimension.citationEntailment.defer, 1);
  assert.equal(result.byDimension.citationEntailment.unreviewed, 11);
});

test("review renderer treats hostile model/source content as text and has no network/storage", () => {
  const hostile = "</script><img src=x onerror=alert(1)>";
  const sample = structuredClone(pack);
  sample.cases[0].rawAnswer = hostile;
  sample.cases[0].evidence[0].text = hostile;
  const html = buildSemanticReviewHtml(sample);
  assert.equal(html.includes(hostile), false);
  const embedded = html.match(/id="pack">([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(embedded).cases[0].rawAnswer, hostile);
  assert.equal(html.includes("innerHTML"), false);
  assert.equal(html.includes("fetch("), false);
  assert.equal(html.includes("localStorage"), false);
  const browserScript = html.match(/<script>\n([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(() => new Script(browserScript));
});

test("CLI input reads bound bytes before parsing and reject nonregular/symlink files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mew-semantic-notes-"));
  try {
    const file = join(dir, "notes.json");
    await writeFile(file, "12345");
    assert.equal((await readBoundedRegularFile(file, 5)).toString(), "12345");
    await assert.rejects(readBoundedRegularFile(file, 4), /bounded regular/);
    await assert.rejects(readBoundedRegularFile(dir, 100), /regular|EISDIR/);
    const link = join(dir, "linked-notes.json");
    await symlink(file, link);
    await assert.rejects(readBoundedRegularFile(link, 100));
    await assert.rejects(readBoundedRegularFile(file, 2097153), /Invalid/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
