import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyWebhookSignature, webhookToClaim } from '../src/adapters/web2.mjs';
const secret = 'webhook-secret-0123456789';
const sign = (body, ts) => createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');
const now = 1_800_000_000_000, ts = now / 1000;
const effect = { id: 'inv-1', objectiveId: 'o', amount: 5000, asset: 'USD-cents', recipientAddress: 'acct_supplier' };
const event = { id: 'evt-1', type: 'payment.settled', effectId: 'inv-1', principal: 'alice', asset: 'USD-cents', amount: 5000, recipient: 'acct_supplier', reference: 'pi_1' };
test('accepts a valid signature inside the tolerance window', () => {
  const body = JSON.stringify(event);
  assert.equal(verifyWebhookSignature({ rawBody: body, signature: sign(body, ts), timestamp: String(ts), secret, now }), true);
});
test('rejects tampered body, wrong secret, stale timestamp and malformed signature', () => {
  const body = JSON.stringify(event), signature = sign(body, ts);
  assert.throws(() => verifyWebhookSignature({ rawBody: body + ' ', signature, timestamp: String(ts), secret, now }), /mismatch/);
  assert.throws(() => verifyWebhookSignature({ rawBody: body, signature, timestamp: String(ts), secret: 'other-secret-0123456789', now }), /mismatch/);
  assert.throws(() => verifyWebhookSignature({ rawBody: body, signature: sign(body, ts - 1000), timestamp: String(ts - 1000), secret, now }), /tolerance/);
  assert.throws(() => verifyWebhookSignature({ rawBody: body, signature: 'zz', timestamp: String(ts), secret, now }), /mismatch/);
});
test('binds event to the reservation: effect, principal, asset, amount and recipient', () => {
  const claim = webhookToClaim({ event, effect, principal: 'alice' });
  assert.equal(claim.claimId, 'web2:evt-1'); assert.equal(claim.source, 'web2'); assert.equal(claim.type, 'payment.settled');
  for (const [name, patch] of Object.entries({ effectId: { effectId: 'x' }, principal: { principal: 'mallory' }, asset: { asset: 'EUR-cents' }, amount: { amount: 4999 }, recipient: { recipient: 'acct_other' }, type: { type: 'payment.captured' } }))
    assert.throws(() => webhookToClaim({ event: { ...event, ...patch }, effect, principal: 'alice' }), undefined, name);
});
