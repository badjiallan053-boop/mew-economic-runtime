import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createHash, sign } from 'node:crypto';
import { deliveryReceiptBytes, verifyDeliveryReceipt } from '../src/adapters/delivery-receipt.mjs';
const keys = generateKeyPairSync('ed25519');
const artifactBytes = Buffer.from('exact accepted artifact\n');
const expected = { keyId: 'vendor-key-1', principal: 'principal-1', objectiveId: 'objective-1', effectId: 'effect-1', provider: 'provider-1', jobId: 'job-1', artifactSha256: createHash('sha256').update(artifactBytes).digest('hex') };
function fixture(overrides = {}) {
  const payload = { version: 'mew-delivery-v1', receiptId: 'receipt-1', ...expected, issuedAtMs: 100000, expiresAtMs: 200000, ...overrides };
  return { envelope: { payload, signature: sign(null, deliveryReceiptBytes(payload), keys.privateKey).toString('base64url') }, expected, artifactBytes, trustedPublicKey: keys.publicKey, nowMs: 150000 };
}
test('delivery verifier binds exact bytes and trusted contract; deterministic replay identity', () => {
  const result = verifyDeliveryReceipt(fixture());
  assert.equal(result.effectId, expected.effectId);
  assert.deepEqual(verifyDeliveryReceipt(fixture()), result);
  const reversed = Object.fromEntries(Object.entries(fixture().envelope.payload).reverse());
  assert.deepEqual(deliveryReceiptBytes(reversed), deliveryReceiptBytes(fixture().envelope.payload));
});
test('delivery verifier rejects signed wrong binding across every contract field', () => {
  for (const key of Object.keys(expected)) assert.throws(() => verifyDeliveryReceipt(fixture({ [key]: key === 'artifactSha256' ? 'a'.repeat(64) : 'other' })), /binding mismatch/);
});
test('delivery verifier rejects tampering, wrong key, changed artifact and unknown fields', () => {
  const tampered = fixture(); tampered.envelope.payload.receiptId = 'forged';
  assert.throws(() => verifyDeliveryReceipt(tampered), /signature/);
  assert.throws(() => verifyDeliveryReceipt({ ...fixture(), trustedPublicKey: generateKeyPairSync('ed25519').publicKey }), /signature/);
  assert.throws(() => verifyDeliveryReceipt({ ...fixture(), artifactBytes: Buffer.from('altered') }), /Artifact bytes/);
  const extra = fixture(); extra.envelope.publicKey = keys.publicKey;
  assert.throws(() => verifyDeliveryReceipt(extra), /fields/);
  const bad = fixture(); bad.envelope.signature = 'A'.repeat(86);
  assert.throws(() => verifyDeliveryReceipt(bad), /signature/);
  assert.throws(() => verifyDeliveryReceipt({ ...fixture(), trustedPublicKey: keys.privateKey }), /Pretrusted/);
});
test('delivery verifier bounds freshness and rejects malformed payload and policy', () => {
  assert.throws(() => verifyDeliveryReceipt({ ...fixture(), nowMs: 200000 }), /freshness/);
  assert.throws(() => verifyDeliveryReceipt({ ...fixture(), nowMs: 0 }), /freshness/);
  assert.throws(() => verifyDeliveryReceipt({ ...fixture(), maxAgeMs: 1 }), /freshness/);
  assert.throws(() => verifyDeliveryReceipt(fixture({ expiresAtMs: 500001 })), /freshness/);
  assert.throws(() => deliveryReceiptBytes({ ...fixture().envelope.payload, issuedAtMs: NaN }), /issuedAtMs/);
  assert.throws(() => deliveryReceiptBytes({ ...fixture().envelope.payload, jobId: '\n' }), /jobId/);
  assert.throws(() => verifyDeliveryReceipt({ ...fixture(), maxAgeMs: Infinity }), /maxAgeMs/);
});
test('caller can detect a correctly signed conflicting receipt with same replay identity', () => {
  const first = verifyDeliveryReceipt(fixture());
  const conflict = verifyDeliveryReceipt(fixture({ expiresAtMs: 190000 }));
  assert.equal(first.receiptId, conflict.receiptId);
  assert.notEqual(first.receiptDigest, conflict.receiptDigest);
});
