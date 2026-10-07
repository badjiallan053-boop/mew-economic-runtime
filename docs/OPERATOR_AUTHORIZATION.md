# Private operator authorization

OperatorService wraps a private live-mode OperationStore with three separate permissions: read, reserve and accept-delivery. It derives the principal from a preconfigured token digest and verifies ownership against the persisted objective. Request bodies cannot choose a principal. No dispatch permission, HTTP route, signing or broadcasting is provided. The public demo remains separate.

Generate unpredictable tokens with at least 256 bits of randomness outside this repository. operatorTokenDigest validates length and formatting, not randomness. SHA-256 digests apply only to these high-entropy tokens, never passwords. Keep tokens and trusted policies private; use TLS, rate limits, sanitized errors and authenticated configuration management before adding any HTTP host. Do not log bearer tokens.

Policies contain principal, tokenDigest, expiresAtMs, revoked and explicit actions. Provider enrollment contains provider, keyId, an Ed25519 public KeyObject, notBeforeMs, expiresAtMs and revoked. Keys must be authenticated out of band and independently reviewed. Receipt payloads cannot supply trusted keys: lookup uses the immutable delivery contract already bound to the reserved effect. Wrong ownership, expired or revoked permissions and inactive provider keys reject new acceptance.

The service copies configuration at construction. Rotation or revocation requires replacing the service with a newly reviewed configuration and fencing old instances; changing the input object does not update running copies. Store access remains privileged and must not be exposed to callers. Trusted host time is required. The underlying store preserves historical accepted receipts; this wrapper additionally requires a currently active enrolled key for acceptance calls, including replays. Historical journal inspection does not grant new acceptance authority.

Tests cover principal isolation, invalid tokens, forbidden impersonation fields, action scope, expiry, revocation and signed receipt acceptance. These library tests do not demonstrate a deployed authenticated operator portal or real merchant enrollment.
