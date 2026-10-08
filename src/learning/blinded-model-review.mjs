import { createHash, randomInt, randomUUID } from "node:crypto";
import { semanticDimensions } from "./semantic-review.mjs";
const canonical = (v) =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, canonical(v[k])]),
        )
      : v;
export const blindedDigest = (v) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(v)))
    .digest("hex");
const without = (object, key) =>
  Object.fromEntries(Object.entries(object).filter(([name]) => name !== key));
const exact = (value, keys) => {
  if (
    !value ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).length !== keys.length ||
    keys.some((k) => !Object.hasOwn(value, k))
  )
    throw Error("Unexpected blinded review fields");
};
const shuffle = (rows) => {
  for (let i = rows.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  return rows;
};
function validatePack(pack) {
  if (
    !pack ||
    pack.schema !== "mew.semantic-review-pack.v1" ||
    pack.packSha256 !== blindedDigest(without(pack, "packSha256")) ||
    !Array.isArray(pack.cases) ||
    !pack.cases.length ||
    pack.cases.length > 200 ||
    pack.modelActivationAllowed !== false ||
    pack.trainingAuthorized !== false ||
    pack.paymentsEnabled !== false ||
    blindedDigest(pack.dimensions) !== blindedDigest(semanticDimensions)
  )
    throw Error("Invalid source review pack");
  if (
    new Set(pack.cases.map((c) => c.id)).size !== pack.cases.length ||
    pack.cases.some(
      (c) =>
        !["en", "fr"].includes(c.language) ||
        c.traceSha256 !== blindedDigest(without(c, "traceSha256")),
    )
  )
    throw Error("Invalid source trace");
}
const shared = (trace) => ({
  language: trace.language,
  question: trace.question,
  criteria: trace.criteria,
  supportingEvidenceSpans: trace.supportingEvidenceSpans,
  evidence: trace.evidence.map(({ id, text, sha256 }) => ({
    id,
    text,
    sha256,
  })),
});
/** Audited source packs in, blinded development review out. The mapping is private.
 * No generation, semantic inference, reviewer authentication or promotion. */
export function createBlindedComparison(left, right) {
  validatePack(left);
  validatePack(right);
  if (
    left.benchmarkSha256 !== right.benchmarkSha256 ||
    left.sourceSnapshotDigest !== right.sourceSnapshotDigest ||
    left.cases.length !== right.cases.length
  )
    throw Error("Mismatched review corpus");
  const sessionId = randomUUID(),
    key = {
      schema: "mew.blinded-review-key.v1",
      sessionId,
      leftPackSha256: left.packSha256,
      rightPackSha256: right.packSha256,
      leftVariant: left.variant,
      rightVariant: right.variant,
      rows: [],
    },
    pairs = [];
  for (const language of ["en", "fr"]) {
    const traces = left.cases.filter((c) => c.language === language),
      count =
        Math.floor(traces.length / 2) + (traces.length % 2 ? randomInt(2) : 0),
      orientations = shuffle(traces.map((_, i) => i < count));
    traces.forEach((trace, index) => {
      const other = right.cases.find((c) => c.id === trace.id);
      if (
        !other ||
        blindedDigest(shared(trace)) !== blindedDigest(shared(other))
      )
        throw Error("Mismatched review question, lineage or context");
      const id = randomUUID(),
        leftA = orientations[index],
        pair = {
          id,
          ...shared(trace),
          answers: {
            A: (leftA ? trace : other).rawAnswer,
            B: (leftA ? other : trace).rawAnswer,
          },
        };
      pairs.push({ ...pair, pairSha256: blindedDigest(pair) });
      const mapping = (side) => ({
        side,
        id: trace.id,
        traceSha256: (side === "left" ? trace : other).traceSha256,
      });
      key.rows.push({
        id,
        language,
        A: mapping(leftA ? "left" : "right"),
        B: mapping(leftA ? "right" : "left"),
      });
    });
  }
  const pack = {
    schema: "mew.blinded-review-pack.v1",
    sessionId,
    scope: "Previously inspected EN/FR development cases; not customer holdout",
    keySha256: blindedDigest(key),
    dimensions: semanticDimensions,
    cases: shuffle(pairs),
    modelActivationAllowed: false,
    trainingAuthorized: false,
    paymentsEnabled: false,
  };
  return { pack: { ...pack, packSha256: blindedDigest(pack) }, key };
}
export function blindedNotesTemplate(pack) {
  return {
    schema: "mew.blinded-review-notes.v1",
    packSha256: pack.packSha256,
    reviewer: {
      name: "",
      type: "human-self-declared",
      identityAuthenticated: false,
    },
    notes: pack.cases.map((row) => ({
      id: row.id,
      pairSha256: row.pairSha256,
      judgments: Object.fromEntries(
        ["A", "B"].map((side) => [
          side,
          Object.fromEntries(
            Object.keys(semanticDimensions).map((k) => [k, "unreviewed"]),
          ),
        ]),
      ),
      observations: "",
    })),
  };
}
export function summarizeBlindedComparison(pack, key, notes) {
  exact(key, [
    "schema",
    "sessionId",
    "leftPackSha256",
    "rightPackSha256",
    "leftVariant",
    "rightVariant",
    "rows",
  ]);
  if (
    key.schema !== "mew.blinded-review-key.v1" ||
    !Array.isArray(key.rows) ||
    !key.rows.length ||
    key.rows.length > 200
  )
    throw Error("Invalid blinded mapping");
  for (const row of key.rows) {
    exact(row, ["id", "language", "A", "B"]);
    for (const side of ["A", "B"]) {
      exact(row[side], ["side", "id", "traceSha256"]);
      if (
        !["left", "right"].includes(row[side].side) ||
        typeof row[side].id !== "string" ||
        !row[side].id ||
        !/^([0-9a-f]{64})$/.test(row[side].traceSha256)
      )
        throw Error("Invalid blinded mapping");
    }
    if (
      row.A.side === row.B.side ||
      row.A.id !== row.B.id ||
      !["en", "fr"].includes(row.language)
    )
      throw Error("Invalid blinded mapping");
  }
  if (
    !pack ||
    pack.schema !== "mew.blinded-review-pack.v1" ||
    pack.packSha256 !== blindedDigest(without(pack, "packSha256")) ||
    pack.keySha256 !== blindedDigest(key) ||
    key.sessionId !== pack.sessionId ||
    !Array.isArray(key.rows) ||
    key.rows.length !== pack.cases.length ||
    new Set(key.rows.map((r) => r.id)).size !== key.rows.length ||
    pack.cases.some(
      (c) =>
        !key.rows.some((r) => r.id === c.id && r.language === c.language) ||
        c.pairSha256 !== blindedDigest(without(c, "pairSha256")),
    ) ||
    pack.modelActivationAllowed !== false ||
    pack.trainingAuthorized !== false ||
    pack.paymentsEnabled !== false
  )
    throw Error("Changed blinded review pack or mapping");
  const observed = new Map();
  if (notes) {
    exact(notes, ["schema", "packSha256", "reviewer", "notes"]);
    exact(notes.reviewer, ["name", "type", "identityAuthenticated"]);
    if (
      notes.schema !== "mew.blinded-review-notes.v1" ||
      notes.packSha256 !== pack.packSha256 ||
      !["agent", "human-self-declared"].includes(notes.reviewer.type) ||
      notes.reviewer.identityAuthenticated !== false ||
      typeof notes.reviewer.name !== "string" ||
      notes.reviewer.name.length > 200 ||
      !Array.isArray(notes.notes) ||
      notes.notes.length > pack.cases.length
    )
      throw Error("Invalid blinded notes");
    for (const row of notes.notes) {
      exact(row, ["id", "pairSha256", "judgments", "observations"]);
      exact(row.judgments, ["A", "B"]);
      const pair = pack.cases.find((c) => c.id === row.id);
      if (
        !pair ||
        observed.has(row.id) ||
        row.pairSha256 !== pair.pairSha256 ||
        typeof row.observations !== "string" ||
        row.observations.length > 4000
      )
        throw Error("Unbound blinded note");
      for (const side of ["A", "B"]) {
        exact(row.judgments[side], Object.keys(semanticDimensions));
        if (
          Object.values(row.judgments[side]).some(
            (v) => !["pass", "fail", "defer", "unreviewed"].includes(v),
          )
        )
          throw Error("Invalid review judgment");
      }
      if (
        Object.values(row.judgments).some((j) =>
          Object.values(j).some((v) => v !== "unreviewed"),
        ) &&
        (!row.observations.trim() || !notes.reviewer.name.trim())
      )
        throw Error(
          "Reviewed answers require observations and a self-declared name",
        );
      observed.set(row.id, row);
    }
  }
  const counts = Object.fromEntries(
    ["left", "right"].map((side) => [
      side,
      Object.fromEntries(
        ["en", "fr"].map((language) => [
          language,
          Object.fromEntries(
            Object.keys(semanticDimensions).map((dimension) => [
              dimension,
              Object.fromEntries(
                ["pass", "fail", "defer", "unreviewed"].map((verdict) => [
                  verdict,
                  key.rows
                    .filter((row) => row.language === language)
                    .filter((row) => {
                      const label = row.A.side === side ? "A" : "B";
                      return (
                        (observed.get(row.id)?.judgments[label][dimension] ??
                          "unreviewed") === verdict
                      );
                    }).length,
                ]),
              ),
            ]),
          ),
        ]),
      ),
    ]),
  );
  return {
    schema: "mew.blinded-review-summary.v1",
    verdict: "BLOCKED",
    packSha256: pack.packSha256,
    annotationSource: notes?.reviewer.type ?? "none",
    pairs: pack.cases.length,
    annotatedPairs: [...observed.values()].filter((row) =>
      Object.values(row.judgments).some((j) =>
        Object.values(j).some((v) => v !== "unreviewed"),
      ),
    ).length,
    selfDeclaredJudgmentCounts: counts,
    authenticatedHumanReviews: 0,
    customerHoldoutCases: 0,
    semanticPasses: null,
    modelActivationAllowed: false,
    trainingAuthorized: false,
    paymentsEnabled: false,
    limitations: [
      "Balanced randomized sides mask variant labels and prompts, not answer style or publicly accessible prior answers.",
      "Self-declared notes are development observations, not authenticated human review or accuracy.",
      "These known question families cannot establish customer generalization.",
    ],
  };
}
