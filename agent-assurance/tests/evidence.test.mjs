import test from 'node:test';
import assert from 'node:assert/strict';
import { MEW } from '../src/core/mew.mjs';
import { buildEvidenceCase, operationState } from '../src/core/evidence.mjs';
const setup = () => { const m = new MEW(); m.createObjective({ id: 'o', principal: 'alice', semanticKey: 'k', asset: 'USD-cents', quantity: 1, maxExposure: 10000 }); return m; };
const propose = (id = 'a', extra = {}) => ({ objectiveId: 'o', proposedEffect: { id, semanticKey: 'k', provider: 'Supplier', type: 'payment', amount: 5000, agent: 'worker', ...extra } });
test('asset is part of the mandate: a different asset is denied, same asset reserves', () => {
  const m = setup();
  assert.equal(m.evaluate(propose('a', { asset: 'lovelace' })).decision, 'DENY');
  assert.equal(m.evaluate(propose('b')).decision, 'ALLOW');
  assert.equal(m.evaluate(propose('b', { asset: 'lovelace' })).decision, 'DENY');
});
test('web2 rail claims are accepted only when verified; unknown rails are not', () => {
  const m = setup(); m.evaluate(propose());
  assert.throws(() => m.observe({ claimId: 'c', effectId: 'a', source: 'someone', type: 'payment.settled', evidence: { verified: true } }));
  m.observe({ claimId: 'c', effectId: 'a', source: 'web2', type: 'payment.settled', amount: 5000, evidence: { verified: true, verifier: 'webhook-hmac', providerReference: 'pi_1' } });
  assert.equal(m.position('o').spent, 5000);
});
test('operation state never maps a terminal ledger state to RESOLVED', () => {
  assert.equal(operationState({ status: 'reserved' }).state, 'RESERVED');
  assert.equal(operationState({ status: 'reserved', unknown: true }).state, 'UNKNOWN');
  assert.equal(operationState({ status: 'settled', deliveryVerified: false }).state, 'SETTLEMENT_OBSERVED');
  assert.equal(operationState({ status: 'settled', deliveryVerified: true }).state, 'DELIVERY_VERIFIED');
  for (const status of ['refunded', 'failed', 'released']) { const r = operationState({ status }); assert.equal(r.state, null); assert.equal(r.reviewRequired, true); }
});
test('evidence case is minimized, labeled, digest-stable and reports missingness', () => {
  const m = setup(); m.evaluate(propose());
  m.observe({ claimId: 'c', effectId: 'a', source: 'web2', type: 'payment.settled', amount: 5000, evidence: { verified: true, simulated: true, secretToken: 'do-not-export' } });
  const now = '2026-10-08T00:00:00.000Z';
  const c1 = buildEvidenceCase(m.snapshot(), { objectiveId: 'o', purpose: 'broker review', systemVersion: 'v1', now });
  const c2 = buildEvidenceCase(m.snapshot(), { objectiveId: 'o', purpose: 'broker review', systemVersion: 'v1', now });
  assert.equal(c1.caseDigest, c2.caseDigest); assert.equal(c1.simulation, true);
  assert.equal(c1.exposureByAsset['USD-cents'].spent, 5000);
  assert.ok(c1.missing.some(g => /delivery/.test(g.gap)));
  assert.ok(c1.timeline.some(f => f.sourceClass === 'synthetic'));
  assert.ok(!JSON.stringify(c1).includes('do-not-export'));
  assert.throws(() => buildEvidenceCase(m.snapshot(), { objectiveId: 'o', purpose: '' }));
  assert.throws(() => buildEvidenceCase(m.snapshot(), { objectiveId: 'nope', purpose: 'x' }));
});
