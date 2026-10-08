import { createHash } from 'node:crypto';

export const EVIDENCE_SCHEMA = 'agent-assurance.evidence-case/v1';
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
export const digest = v => createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');

/** Map a ledger-native effect to the shared state vocabulary. Terminal ledger states deliberately have
 * no direct mapping to RESOLVED; they require review. Never map a single claim to RESOLVED. */
export function operationState(effect) {
  if (effect.unknown) return { state: 'UNKNOWN', reviewRequired: false };
  if (effect.status === 'reserved') return { state: 'RESERVED', reviewRequired: false };
  if (effect.status === 'committed') return { state: 'UNKNOWN', reviewRequired: false };
  if (effect.status === 'settled') return { state: effect.deliveryVerified ? 'DELIVERY_VERIFIED' : 'SETTLEMENT_OBSERVED', reviewRequired: false };
  return { state: null, reviewRequired: true };
}

function sourceClass(claim) {
  if (claim.evidence?.simulated) return 'synthetic';
  const v = claim.evidence?.verifier;
  if (v === 'blockfrost-readonly') return 'independently_observed';
  if (v === 'webhook-hmac') return 'authenticated';
  return 'operator_attested';
}

/** Minimized, purpose-bound export. A whitelist is used so raw prompts, credentials and unrestricted
 * content cannot leak by accident. This is a record of what the controls saw, not a score, and
 * it contains no underwriting, coverage or claim conclusion. */
export function buildEvidenceCase(snapshot, { objectiveId, purpose, systemVersion, now = new Date().toISOString() }) {
  if (typeof purpose !== 'string' || !purpose.trim() || purpose.length > 256) throw new Error('A stated purpose of at most 256 characters is required');
  const objective = snapshot.objectives.find(o => o.id === objectiveId);
  if (!objective) throw new Error('Unknown objective');
  const effects = snapshot.effects.filter(e => e.objectiveId === objectiveId);
  const ids = new Set(effects.map(e => e.id));
  const exposure = {};
  for (const e of effects) {
    const row = exposure[e.asset ?? objective.asset] ??= { spent: 0, reserved: 0, committed: 0, refunded: 0 };
    const key = e.status === 'settled' ? 'spent' : e.status;
    if (key in row) row[key] += e.amount;
  }
  const facts = [
    ...snapshot.decisions.filter(d => ids.has(d.effect?.id)).map(d => ({ kind: 'decision', at: d.timestamp, effectId: d.effect.id, decision: d.decision, reason: d.reason })),
    ...snapshot.claims.filter(c => ids.has(c.effectId)).map(c => ({ kind: 'claim', at: c.receivedAt, effectId: c.effectId, claimType: c.type, source: c.source, sourceClass: sourceClass(c), verifier: c.evidence?.verifier ?? null, simulated: c.evidence?.simulated === true, evidenceRef: String(c.evidence?.txHash ?? c.evidence?.providerReference ?? '').slice(0, 128) || null }))
  ].sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const operations = effects.map(e => ({ effectId: e.id, provider: e.provider, asset: e.asset ?? objective.asset, amount: e.amount, nativeStatus: e.status, deliveryVerified: e.deliveryVerified, ...operationState(e) }));
  const missing = [];
  for (const o of operations) {
    if (o.nativeStatus === 'settled' && !o.deliveryVerified) missing.push({ effectId: o.effectId, gap: 'delivery receipt not recorded' });
    if (o.state === 'RESERVED' || o.state === 'UNKNOWN') missing.push({ effectId: o.effectId, gap: 'settlement outcome not established; capacity held' });
  }
  const body = {
    schema: EVIDENCE_SCHEMA, generatedAt: now, purpose, systemVersion: systemVersion ?? 'unversioned',
    simulation: facts.some(f => f.simulated),
    mandate: { objectiveId, principal: objective.principal, asset: objective.asset, quantity: objective.quantity, maxExposure: objective.maxExposure },
    operations, exposureByAsset: exposure, timeline: facts.map(f => ({ ...f, digest: digest(f) })), missing,
    limitations: [
      'Describes controls applied to actions routed through this ledger; bypassed actions are not visible.',
      'Hashes show byte identity, not truth. Upstream evidence may be incomplete or false.',
      'Contains no underwriting, coverage, causation or claim conclusion.',
      'Safe-operation denominators and system-version periods must be supplied by the operator.'
    ]
  };
  return { ...body, caseDigest: digest(body) };
}
