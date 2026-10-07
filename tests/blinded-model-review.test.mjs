import test from "node:test";
import assert from "node:assert/strict";
import {
  createBlindedComparison,
  summarizeBlindedComparison,
  blindedDigest,
  blindedNotesTemplate,
} from "../src/learning/blinded-model-review.mjs";
import { semanticDimensions } from "../src/learning/semantic-review.mjs";
function pack(variant) {
  const cases = ["en", "fr"].flatMap((language) =>
    Array.from({ length: 2 }, (_, i) => {
      const row = {
        id: language + i,
        language,
        question: "Q " + language + i,
        criteria: "Review exact evidence",
        supportingEvidenceSpans: [],
        rawAnswer: JSON.stringify({
          answer: variant + " answer",
          evidenceRefs: ["s"],
          authority: "advisory-only",
        }),
        inferenceRequest: { systemPrompt: variant + " SECRET-PROMPT" },
        evidence: [
          {
            id: "s",
            text: "Exact source",
            sha256: "a".repeat(64),
            cited: true,
          },
        ],
        provenance: { modelRevision: variant + " SECRET-MODEL" },
      };
      return { ...row, traceSha256: blindedDigest(row) };
    }),
  );
  const value = {
    schema: "mew.semantic-review-pack.v1",
    variant,
    benchmarkSha256: "b".repeat(64),
    sourceSnapshotDigest: "c".repeat(64),
    dimensions: semanticDimensions,
    cases,
    modelActivationAllowed: false,
    trainingAuthorized: false,
    paymentsEnabled: false,
  };
  return { ...value, packSha256: blindedDigest(value) };
}
const make = () => createBlindedComparison(pack("baseline"), pack("candidate"));
test("rejects malformed mapping semantics even when local hashes are recomputed", () => {
  const { pack: review, key } = make();
  key.rows[0].A.side = "forged";
  review.keySha256 = blindedDigest(key);
  const { packSha256, ...rest } = review;
  review.packSha256 = blindedDigest(rest);
  assert.throws(() => summarizeBlindedComparison(review, key), /mapping/);
});
test("masks identity and prompts, retains exact answers and context, balances sides within each language", () => {
  const { pack: review, key } = make();
  const raw = JSON.stringify(review);
  assert.ok(!raw.includes("SECRET-"));
  assert.ok(!raw.includes("inferenceRequest"));
  assert.ok(!raw.includes("modelRevision"));
  assert.equal(review.cases.length, 4);
  assert.equal(key.rows.length, 4);
  for (const language of ["en", "fr"])
    assert.equal(
      key.rows.filter(
        (row) => row.language === language && row.A.side === "left",
      ).length,
      1,
    );
  assert.equal(review.keySha256, blindedDigest(key));
  assert.equal(review.cases[0].evidence[0].text, "Exact source");
});
test("rejects modified packs and mismatched questions, evidence or case lineages", () => {
  for (const mutate of [
    (p) => (p.cases[0].question = "different"),
    (p) => (p.cases[0].evidence[0].text = "different"),
    (p) => (p.cases[0].id = "unknown"),
  ]) {
    const right = pack("candidate");
    mutate(right);
    assert.throws(() => createBlindedComparison(pack("baseline"), right));
  }
  const right = pack("candidate");
  right.modelActivationAllowed = true;
  assert.throws(() => createBlindedComparison(pack("baseline"), right));
});
test("absence of notes remains unmeasured, all-pass self-declared notes cannot promote", () => {
  const { pack: review, key } = make();
  const empty = summarizeBlindedComparison(review, key);
  assert.equal(empty.semanticPasses, null);
  assert.equal(empty.annotatedPairs, 0);
  const notes = blindedNotesTemplate(review);
  notes.reviewer.name = "Fixture reviewer";
  for (const row of notes.notes) {
    for (const side of ["A", "B"])
      for (const dimension of Object.keys(semanticDimensions))
        row.judgments[side][dimension] = "pass";
    row.observations = "Fixture judgments, not real review";
  }
  const result = summarizeBlindedComparison(review, key, notes);
  assert.equal(result.annotatedPairs, 4);
  assert.equal(result.authenticatedHumanReviews, 0);
  assert.equal(result.semanticPasses, null);
  assert.equal(result.modelActivationAllowed, false);
  assert.equal(result.paymentsEnabled, false);
});
test("rejects substituted mapping, stale note hashes, duplicate pairs and authority injection", () => {
  const { pack: review, key } = make();
  const wrong = structuredClone(key);
  wrong.rows[0].A.side = "forged";
  assert.throws(() => summarizeBlindedComparison(review, wrong));
  for (const mutate of [
    (n) => (n.packSha256 = "0".repeat(64)),
    (n) => n.notes.push(n.notes[0]),
    (n) => (n.paymentsEnabled = true),
    (n) => (n.reviewer.identityAuthenticated = true),
    (n) => (n.notes[0].pairSha256 = "f".repeat(64)),
  ]) {
    const notes = blindedNotesTemplate(review);
    mutate(notes);
    assert.throws(() => summarizeBlindedComparison(review, key, notes));
  }
});
