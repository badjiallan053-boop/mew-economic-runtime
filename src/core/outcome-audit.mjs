/**
 * Read-only diagnostic for gaps that span multiple MEW objectives.
 *
 * This is NOT an authorization guard, proof verifier, receipt authenticator,
 * or production security control. It never changes MEW state or moves funds.
 * Equivalence groups must be supplied by an authenticated principal/reviewer;
 * matching business intent is not inferred from arbitrary agent language.
 */
export function analyzeOutcomeSnapshot(snapshot, {
  principal,
  maxAggregateExposure,
  equivalenceByObjective = {}
} = {}) {
  if (!snapshot || !Array.isArray(snapshot.objectives) ||
      !Array.isArray(snapshot.effects) || !Array.isArray(snapshot.claims)) {
    throw new TypeError("Expected a MEW snapshot with objectives, effects and claims arrays");
  }
  if (typeof principal !== "string" || !principal.trim()) {
    throw new TypeError("An explicit principal is required");
  }
  if (maxAggregateExposure !== undefined &&
      (!Number.isSafeInteger(maxAggregateExposure) || maxAggregateExposure < 0)) {
    throw new TypeError("maxAggregateExposure must be a nonnegative safe integer");
  }
  const objectives = snapshot.objectives.filter(o => o.principal === principal);
  const allowedIds = new Set(objectives.map(o => o.id));
  const effects = snapshot.effects.filter(e => allowedIds.has(e.objectiveId));
  const findings = [];
  const open = new Set(["reserved", "committed", "settled"]);
  let aggregateExposure = 0;
  for (const effect of effects) {
    if (!Number.isSafeInteger(effect.amount) || effect.amount < 0) {
      throw new TypeError("Invalid effect amount in snapshot");
    }
    if (open.has(effect.status)) {
      const next = aggregateExposure + effect.amount;
      if (!Number.isSafeInteger(next)) throw new RangeError("Aggregate exposure overflow");
      aggregateExposure = next;
    }
    // The existing prototype does not bind payment requests to an immutable
    // signed resource quote. These optional fields describe a future contract.
    if (!effect.resourceDigest || !effect.quoteDigest) {
      findings.push({
        code: "PURCHASE_BINDING_UNPROVEN",
        severity: "review",
        effectIds: [effect.id],
        detail: "No verifiable resource/quote commitment is recorded. A digest field alone would not prove signer authorization."
      });
    }
  }
  if (maxAggregateExposure !== undefined && aggregateExposure > maxAggregateExposure) {
    findings.push({
      code: "AGGREGATE_MANDATE_OVEREXPOSED",
      severity: "high",
      objectiveIds: objectives.map(o => o.id),
      detail: "Combined exposure crosses a caller-supplied cap that current per-objective accounting cannot enforce atomically."
    });
  }
  const byEquivalence = new Map();
  for (const objective of objectives) {
    const key = equivalenceByObjective[objective.id];
    if (key === undefined) continue;
    if (typeof key !== "string" || !key.trim()) throw new TypeError("Equivalence keys must be nonempty strings");
    const group = byEquivalence.get(key) || [];
    group.push(objective.id);
    byEquivalence.set(key, group);
  }
  for (const [group, ids] of byEquivalence) {
    if (ids.length > 1) {
      findings.push({
        code: "POTENTIALLY_DUPLICATE_OBJECTIVES",
        severity: "review",
        objectiveIds: ids,
        detail: "The same caller-attested deliverable group appears in multiple independent objectives: " + group
      });
    }
  }
  const receiptOwners = new Map();
  for (const claim of snapshot.claims) {
    if (!effects.some(e => e.id === claim.effectId)) continue;
    const kind = String(claim.type || claim.outcome || "").toLowerCase();
    if (kind !== "delivery" && kind !== "delivery.verified") continue;
    const receiptId = claim.evidence?.receiptId;
    if (typeof receiptId !== "string" || !receiptId.trim()) continue;
    const owners = receiptOwners.get(receiptId) || new Set();
    owners.add(claim.effectId);
    receiptOwners.set(receiptId, owners);
  }
  for (const [receiptId, ids] of receiptOwners) {
    if (ids.size > 1) {
      findings.push({
        code: "DELIVERY_EVIDENCE_REUSED",
        severity: "high",
        effectIds: [...ids],
        detail: "Multiple effects claim the same unverified receipt identifier: " + receiptId
      });
    }
  }
  const status = findings.some(f => f.severity === "high") ? "REQUIRES_REVIEW" : "DIAGNOSTIC_ONLY";
  return {principal, objectiveCount: objectives.length, effectCount: effects.length,
    aggregateExposure, status, findings};
}
