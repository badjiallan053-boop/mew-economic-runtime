import { createHash, KeyObject } from "node:crypto";
import {
  deliveryReceiptBytes,
  verifyDeliveryReceipt,
} from "../adapters/delivery-receipt.mjs";
const hash = (v) => createHash("sha256").update(v).digest("hex");
const fields = [
  "keyId",
  "principal",
  "objectiveId",
  "effectId",
  "provider",
  "jobId",
  "artifactSha256",
];
const encode = (v) =>
  JSON.stringify(
    Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, v[k]]),
    ),
  );
function exact(v, keys) {
  if (
    !v ||
    Object.getPrototypeOf(v) !== Object.prototype ||
    Object.keys(v).length !== keys.length ||
    keys.some((k) => !Object.hasOwn(v, k))
  )
    throw Error("Invalid delivery fields");
}
const id = (v) => typeof v === "string" && /^[A-Za-z0-9._:@/-]{1,200}$/.test(v);
function validateExpected(expected) {
  exact(expected, [...fields, "keyFingerprint"]);
  if (!/^[a-f0-9]{64}$/.test(expected.keyFingerprint))
    throw Error("Invalid trust anchor");
  if (
    fields.some((k) =>
      k === "artifactSha256"
        ? !/^[a-f0-9]{64}$/.test(expected[k])
        : !id(expected[k]),
    )
  )
    throw Error("Invalid delivery contract");
}
export function enrolledDeliveryKeys(rows) {
  if (!Array.isArray(rows) || rows.length > 100)
    throw Error("Invalid delivery key enrollment");
  const seen = new Set();
  return Object.freeze(
    rows.map((r) => {
      exact(r, [
        "provider",
        "keyId",
        "publicKey",
        "notBeforeMs",
        "expiresAtMs",
        "revoked",
      ]);
      const ref = JSON.stringify([r.provider, r.keyId]);
      if (
        !id(r.provider) ||
        !id(r.keyId) ||
        seen.has(ref) ||
        !(r.publicKey instanceof KeyObject) ||
        r.publicKey.type !== "public" ||
        r.publicKey.asymmetricKeyType !== "ed25519" ||
        !Number.isSafeInteger(r.notBeforeMs) ||
        r.notBeforeMs < 0 ||
        !Number.isSafeInteger(r.expiresAtMs) ||
        r.expiresAtMs <= r.notBeforeMs ||
        typeof r.revoked !== "boolean"
      )
        throw Error("Invalid pre-enrolled delivery key");
      seen.add(ref);
      return Object.freeze({ ...r });
    }),
  );
}
export const deliveryKeyFingerprint = (key) =>
  hash(key.export({ type: "spki", format: "der" }));
export function deliveryKey(keys, provider, keyId, now) {
  const key = keys.find((k) => k.provider === provider && k.keyId === keyId);
  if (
    !Number.isSafeInteger(now) ||
    now < 0 ||
    !key ||
    key.revoked ||
    now < key.notBeforeMs ||
    now >= key.expiresAtMs
  )
    throw Error("Delivery key unavailable");
  return key.publicKey;
}
function boundEffect(kernel, principal, expected) {
  const effect = kernel
    .snapshot()
    .effects.find((e) => e.id === expected.effectId);
  if (
    expected.principal !== principal ||
    !effect ||
    effect.objectiveId !== expected.objectiveId ||
    effect.provider !== expected.provider ||
    kernel.objective(expected.objectiveId).principal !== principal ||
    !["reserved", "committed", "settled"].includes(effect.status)
  )
    throw Error("Delivery effect binding mismatch");
  return effect;
}
/** Immutable operator-attested external job and accepted digest, no dispatch. */
export async function enrollPostgresDelivery(store, principal, expected) {
  validateExpected(expected);
  if (expected.principal !== principal)
    throw Error("Delivery ownership mismatch");
  return store.transaction(principal, async (c, k) => {
    boundEffect(k, principal, expected);
    const old = await c.query(
      "SELECT contract FROM mew_private.delivery_contracts WHERE principal=$1 AND (effect_id=$2 OR (provider=$3 AND job_id=$4))",
      [principal, expected.effectId, expected.provider, expected.jobId],
    );
    if (old.rows.length) {
      if (
        old.rows.length !== 1 ||
        encode(old.rows[0].contract) !== encode(expected)
      )
        throw Error("Immutable delivery binding conflict");
      return { ...expected, idempotent: true };
    }
    const count = await c.query(
      "SELECT count(*)::int AS n FROM mew_private.delivery_contracts WHERE principal=$1",
      [principal],
    );
    if (count.rows[0].n >= 100)
      throw Error("Delivery contract budget exceeded");
    await c.query(
      "INSERT INTO mew_private.delivery_contracts(principal,effect_id,provider,job_id,contract) VALUES($1,$2,$3,$4,$5::jsonb)",
      [
        principal,
        expected.effectId,
        expected.provider,
        expected.jobId,
        encode(expected),
      ],
    );
    return { ...expected, idempotent: false };
  });
}
/** Receipt replay row and delivery-only ledger observation commit together. */
export async function acceptPostgresDelivery(
  store,
  principal,
  { effectId, envelope, artifactBytes, keys, nowMs },
) {
  if (!id(effectId)) throw Error("Invalid effect identity");
  exact(envelope, ["payload", "signature"]);
  if (
    typeof envelope.signature !== "string" ||
    !/^[A-Za-z0-9_-]{86}$/.test(envelope.signature)
  )
    throw Error("Invalid delivery signature");
  const signed = deliveryReceiptBytes(envelope.payload),
    wireDigest = hash(JSON.stringify([hash(signed), envelope.signature]));
  if (
    !Buffer.isBuffer(artifactBytes) ||
    artifactBytes.length > 131072 ||
    hash(artifactBytes) !== envelope.payload.artifactSha256
  )
    throw Error("Bounded artifact mismatch");
  return store.transaction(principal, async (c, k) => {
    const contract = await c.query(
      "SELECT contract FROM mew_private.delivery_contracts WHERE principal=$1 AND effect_id=$2",
      [principal, effectId],
    );
    const expected = contract.rows[0]?.contract;
    if (!expected) throw Error("No accepted delivery contract");
    validateExpected(expected);
    boundEffect(k, principal, expected);
    for (const field of fields)
      if (envelope.payload[field] !== expected[field])
        throw Error("Delivery receipt binding mismatch");
    const publicKey = deliveryKey(
      keys,
      expected.provider,
      expected.keyId,
      nowMs,
    );
    if (deliveryKeyFingerprint(publicKey) !== expected.keyFingerprint)
      throw Error("Immutable delivery key fingerprint mismatch");
    const old = await c.query(
      "SELECT record FROM mew_private.delivery_receipts WHERE principal=$1 AND ((provider=$2 AND key_id=$3 AND receipt_id=$4) OR (provider=$2 AND job_id=$5))",
      [
        principal,
        expected.provider,
        expected.keyId,
        envelope.payload.receiptId,
        expected.jobId,
      ],
    );
    if (old.rows.length) {
      const saved = old.rows[0].record;
      if (
        old.rows.length !== 1 ||
        saved.wireDigest !== wireDigest ||
        saved.receiptDigest !== hash(signed)
      )
        throw Error("Conflicting delivery replay");
      return {
        ...saved,
        idempotent: true,
        position: k.position(expected.objectiveId),
        paymentSettlementProduced: false,
        exposureReleaseAllowed: false,
      };
    }
    const verified = verifyDeliveryReceipt({
      envelope,
      expected: Object.fromEntries(
        fields.map((field) => [field, expected[field]]),
      ),
      artifactBytes,
      trustedPublicKey: publicKey,
      nowMs,
    });
    const record = { ...verified, wireDigest };
    await c.query(
      "INSERT INTO mew_private.delivery_receipts(principal,provider,key_id,receipt_id,job_id,record) VALUES($1,$2,$3,$4,$5,$6::jsonb)",
      [
        principal,
        verified.provider,
        verified.keyId,
        verified.receiptId,
        verified.jobId,
        JSON.stringify(record),
      ],
    );
    const result = k.observe({
      claimId: `postgres-delivery:${hash(JSON.stringify([expected.provider, expected.jobId]))}`,
      objectiveId: expected.objectiveId,
      effectId,
      source: "merchant",
      type: "delivery.verified",
      evidence: {
        verified: true,
        receiptDigest: verified.receiptDigest,
        artifactSha256: verified.artifactSha256,
        verifier: verified.verifier,
      },
    });
    return {
      ...record,
      idempotent: false,
      position: result.position,
      paymentSettlementProduced: false,
      exposureReleaseAllowed: false,
    };
  });
}
