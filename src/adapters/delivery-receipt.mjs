import { createHash, KeyObject, verify } from 'node:crypto';

const FIELDS = ['version', 'receiptId', 'keyId', 'principal', 'objectiveId', 'effectId', 'provider', 'jobId', 'artifactSha256', 'issuedAtMs', 'expiresAtMs'];
const IDS = ['receiptId', 'keyId', 'principal', 'objectiveId', 'effectId', 'provider', 'jobId'];
function exact(value, keys, name) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype || Object.keys(value).length !== keys.length || keys.some(k => !Object.hasOwn(value, k))) throw new Error(`Invalid ${name} fields`);
  for (const key of keys) if (!Object.getOwnPropertyDescriptor(value, key)?.hasOwnProperty('value')) throw new Error(`Invalid ${name} accessor`);
}
function validate(payload) {
  exact(payload, FIELDS, 'receipt');
  if (payload.version !== 'mew-delivery-v1') throw new Error('Unsupported delivery receipt version');
  for (const key of IDS) if (typeof payload[key] !== 'string' || !/^[A-Za-z0-9._:@/-]{1,200}$/.test(payload[key])) throw new Error(`Invalid ${key}`);
  if (typeof payload.artifactSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(payload.artifactSha256)) throw new Error('Invalid artifact hash');
  for (const key of ['issuedAtMs', 'expiresAtMs']) if (!Number.isSafeInteger(payload[key]) || payload[key] < 0) throw new Error(`Invalid ${key}`);
  if (payload.expiresAtMs <= payload.issuedAtMs) throw new Error('Invalid receipt lifetime');
}
/** Versioned fixed-order JSON array, not generic JSON canonicalization. */
export function deliveryReceiptBytes(payload) {
  validate(payload);
  return Buffer.from(JSON.stringify(['MEW authenticated delivery receipt', ...FIELDS.map(key => payload[key])]), 'utf8');
}

/** Pure verification only. Caller must transactionally persist replay identity before use. */
export function verifyDeliveryReceipt({ envelope, expected, artifactBytes, trustedPublicKey, nowMs = Date.now(), maxAgeMs = 300000, maxLifetimeMs = 300000, clockSkewMs = 30000 }) {
  exact(envelope, ['payload', 'signature'], 'envelope');
  exact(expected, ['keyId', 'principal', 'objectiveId', 'effectId', 'provider', 'jobId', 'artifactSha256'], 'expected contract');
  for (const [name, value, min, max] of [['nowMs', nowMs, 0, Number.MAX_SAFE_INTEGER], ['maxAgeMs', maxAgeMs, 1, 86400000], ['maxLifetimeMs', maxLifetimeMs, 1, 86400000], ['clockSkewMs', clockSkewMs, 0, 300000]]) if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`Invalid ${name}`);
  const payload = envelope.payload;
  const bytes = deliveryReceiptBytes(payload);
  for (const key of Object.keys(expected)) if (expected[key] !== payload[key]) throw new Error(`Delivery binding mismatch: ${key}`);
  if (!Buffer.isBuffer(artifactBytes) || artifactBytes.length > 16 * 1024 * 1024) throw new Error('Artifact must be a bounded byte buffer');
  if (createHash('sha256').update(artifactBytes).digest('hex') !== payload.artifactSha256) throw new Error('Artifact bytes do not match receipt');
  if (payload.issuedAtMs > nowMs + clockSkewMs || nowMs - payload.issuedAtMs > maxAgeMs || nowMs >= payload.expiresAtMs || payload.expiresAtMs - payload.issuedAtMs > maxLifetimeMs) throw new Error('Delivery receipt outside freshness policy');
  if (!(trustedPublicKey instanceof KeyObject) || trustedPublicKey.type !== 'public' || trustedPublicKey.asymmetricKeyType !== 'ed25519') throw new Error('Pretrusted Ed25519 public KeyObject required');
  if (typeof envelope.signature !== 'string' || !/^[A-Za-z0-9_-]{86}$/.test(envelope.signature)) throw new Error('Invalid Ed25519 signature encoding');
  const signature = Buffer.from(envelope.signature, 'base64url');
  if (signature.length !== 64 || signature.toString('base64url') !== envelope.signature || !verify(null, bytes, trustedPublicKey, signature)) throw new Error('Delivery signature verification failed');
  const receiptDigest = createHash('sha256').update(bytes).digest('hex');
  return Object.freeze({ receiptId: payload.receiptId, receiptDigest, keyId: payload.keyId, principal: payload.principal, objectiveId: payload.objectiveId, effectId: payload.effectId, provider: payload.provider, jobId: payload.jobId, artifactSha256: payload.artifactSha256, verifiedAtMs: nowMs, verifier: 'ed25519-delivery-v1' });
}
