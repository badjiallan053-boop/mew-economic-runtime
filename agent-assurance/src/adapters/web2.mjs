import { createHmac, timingSafeEqual } from 'node:crypto';

/** Provider-neutral webhook verifier. The scheme (HMAC-SHA256 over `${timestamp}.${rawBody}`,
 * hex signature) is a generic shape, not any specific provider's format; adapt it per provider
 * after reading that provider's documentation. Pass the exact raw request bytes, not re-serialized JSON. */
export function verifyWebhookSignature({ rawBody, signature, timestamp, secret, toleranceSeconds = 300, now = Date.now() }) {
  if (typeof rawBody !== 'string' || typeof signature !== 'string' || typeof secret !== 'string' || secret.length < 16) throw new Error('rawBody, signature and a secret of at least 16 characters are required');
  const ts = Number(timestamp);
  if (!Number.isSafeInteger(ts)) throw new Error('Webhook timestamp must be integer seconds');
  if (Math.abs(now / 1000 - ts) > toleranceSeconds) throw new Error('Webhook timestamp outside tolerance');
  const expected = createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest();
  const given = /^[a-f0-9]{64}$/i.test(signature) ? Buffer.from(signature, 'hex') : Buffer.alloc(0);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new Error('Webhook signature mismatch');
  return true;
}

/** Bind a signature-verified provider event to a reserved effect. Every bound field comes from the
 * persisted reservation, never from the request. A provider status is one observation; it is
 * only accepted when it names this exact effect, principal, asset, amount and recipient. */
export function webhookToClaim({ event, effect, principal }) {
  if (!event || typeof event !== 'object') throw new Error('Event is required');
  if (typeof event.id !== 'string' || !event.id) throw new Error('Event id is required');
  if (event.effectId !== effect.id) throw new Error('Event is bound to a different effect');
  if (event.principal !== principal) throw new Error('Event principal does not match the objective principal');
  if (event.asset !== effect.asset) throw new Error('Event asset does not match the reserved asset');
  if (event.amount !== effect.amount) throw new Error('Event amount does not match the reserved amount');
  if (typeof effect.recipientAddress !== 'string' || event.recipient !== effect.recipientAddress) throw new Error('Event recipient must match the reservation, which must name a recipient');
  const types = { 'payment.settled': 'settled', 'payment.failed': 'failed', 'payment.refunded': 'refunded' };
  const type = types[event.type];
  if (!type) throw new Error('Unsupported event type');
  return {
    claimId: `web2:${event.id}`, source: 'web2', type: `payment.${type}`, effectId: effect.id, objectiveId: effect.objectiveId, amount: effect.amount,
    evidence: { verified: true, verifier: 'webhook-hmac', providerReference: String(event.reference ?? ''), eventId: event.id }
  };
}
