# Authenticated delivery integration boundary

`src/adapters/delivery-receipt.mjs` implements local Ed25519 signature verification for an exact artifact. It performs no HTTP requests, loads no keys from a receipt, writes no state and does not settle payments or satisfy an objective. Tests use generated local keys; no real merchant integration has run.

## Contract

Call `verifyDeliveryReceipt` with a strict envelope `{payload, signature}`, a persisted trusted contract `expected`, the exact `artifactBytes` Buffer and a pretrusted public Ed25519 `KeyObject`. The trusted contract has exactly `keyId`, `principal`, `objectiveId`, `effectId`, `provider`, `jobId`, `artifactSha256`. These values must come from authenticated mandate, reservation and accepted artifact state, never from the receipt under verification. An independent artifact acceptance policy is needed; a merchant signature proves attribution, not quality or rights.

Payload has exactly `version`, `receiptId`, all seven contract fields, `issuedAtMs`, `expiresAtMs`. Version is `mew-delivery-v1`; identifiers use ASCII letters, digits and `._:@/-`, length 1–200. SHA-256 is lowercase hexadecimal. Times are nonnegative safe integer Unix milliseconds; expiration must follow issuance. Signature is canonical unpadded base64url representing exactly 64 bytes. Extra properties, embedded keys and accessors are rejected.

Signed bytes are UTF-8 encoding of the JSON array:

```text
["MEW authenticated delivery receipt", version, receiptId, keyId, principal,
 objectiveId, effectId, provider, jobId, artifactSha256, issuedAtMs, expiresAtMs]
```

`deliveryReceiptBytes(payload)` produces these bytes with fixed field order. This is a versioned local wire format, not a universal JSON canonicalization or an existing Masumi signing standard. Sender integration must explicitly adopt it. Ed25519 uses `sign(null, bytes, privateKey)` and `verify(null, bytes, publicKey, signature)`. The sender owns its private key; MEW never receives it. The recipient requires an independently authenticated provider/key binding, validity/rotation/revocation policy and authenticated clock. Do not automatically import source-supplied key IDs or PEM keys into that trust configuration.

Defaults: maximum age and lifetime 300,000 ms, future issuance skew 30,000 ms, exact expiration boundary rejected. Policy age/lifetime are capped at one day, skew at five minutes. Artifact Buffer cap is 16 MiB. Acquisition, content-type validation and larger streaming workflows are separate integration tasks; this verifier accepts no URLs and performs no fetching.

## Durable replay gate before production

The output is a verification observation containing `receiptDigest` (SHA-256 of signed bytes), not an economic claim. Before consuming it, the caller must atomically persist the observation and apply its delivery transition in the same transaction. Enforce unique `(provider, keyId, receiptId)` and unique `(provider, jobId)` bound to one immutable principal/objective/effect/artifact tuple. Identical receipt replay is idempotent; a reused identity with a different digest or binding is rejected. Key rotation must not permit reuse of one provider job for another effect. Retain historical observations across restarts, expiration and key rotation. Never release reservations on expired or unverifiable evidence. A previously accepted receipt may remain historical evidence after expiration; fresh verification is not a replacement for the durable acceptance record.

No server endpoint invokes this verifier yet. Production requires principal authentication, persisted accepted-artifact binding, provider key enrollment/revocation, database uniqueness and transactional transitions. Keep simulation routes separate. Delivery satisfaction remains separate from rail settlement and independently verified refunds.

## Verification and references

Run `node --test tests/delivery-receipt.test.mjs`. Coverage includes exact-byte hashing, all binding fields, altered payload/signature, wrong/private keys, source-supplied extra keys, malformed timestamps, expiration/future issuance/age/lifetime, canonical ordering and a correctly signed conflicting replay digest. Replay persistence itself is a documented caller requirement, not implemented by this stateless adapter.

Primary API reference: [Node.js crypto signatures](https://nodejs.org/api/crypto.html#cryptoverifyalgorithm-data-key-signature-callback). Implementation uses public KeyObjects and Ed25519 null algorithm supported by the project's Node 24 runtime; it does not use Node 26-only Ed25519 context options. The versioned GitHub source URL for Node 24.19.0 could not be retrieved by the web reader; API behavior was verified through official documentation and local tests. No external repository code was copied.
