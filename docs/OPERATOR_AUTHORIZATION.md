# Private operator authorization

OperatorService wraps a private live-mode OperationStore with three separate permissions: read, reserve and accept-delivery. It derives the principal from a preconfigured token digest and verifies ownership against the persisted objective. Request bodies cannot choose a principal. No dispatch permission, signing or broadcasting is provided. The optional private HTTP factory is separate from the public server and is not deployed. The public demo remains separate.

Generate unpredictable tokens with at least 256 bits of randomness outside this repository. operatorTokenDigest validates length and formatting, not randomness. SHA-256 digests apply only to these high-entropy tokens, never passwords. Keep tokens and trusted policies private; use TLS, rate limits, sanitized errors and authenticated configuration management before adding any HTTP host. Do not log bearer tokens.

Policies contain principal, tokenDigest, expiresAtMs, revoked and explicit actions. Provider enrollment contains provider, keyId, an Ed25519 public KeyObject, notBeforeMs, expiresAtMs and revoked. Keys must be authenticated out of band and independently reviewed. Receipt payloads cannot supply trusted keys: lookup uses the immutable delivery contract already bound to the reserved effect. Wrong ownership, expired or revoked permissions and inactive provider keys reject new acceptance.

The service copies configuration at construction. Trusted state is held in private class fields. Rotation or revocation requires replacing the service with a newly reviewed configuration and fencing old instances; changing the input object does not update running copies. Store access remains privileged and must not be exposed to callers. Trusted host time is required. The underlying store preserves historical accepted receipts; this wrapper additionally requires a currently active enrolled key for acceptance calls, including replays. Historical journal inspection does not grant new acceptance authority.

Tests cover principal isolation, invalid tokens, forbidden impersonation fields, action scope, expiry, revocation and signed receipt acceptance. These library tests do not demonstrate a deployed authenticated operator portal or real merchant enrollment.

## Private HTTP host

makeOperatorServer accepts an explicitly constructed OperatorService and returns an unbound Node HTTP server. The host owns provisioning, lifecycle and listen address. Bind to loopback behind a TLS reverse proxy with a private ingress policy; do not expose it through the public demonstration service. No configuration files or environment secrets are automatically loaded.

GET /operator/position?objectiveId=… reads the authenticated principal’s position. POST /operator/reserve accepts exactly operationId, objectiveId and proposedEffect. POST /operator/delivery accepts exactly effectId, envelope and artifactBase64 (canonical padded base64). All require Bearer tokens. Delivery artifacts are limited by the shared JSON body limit (256 KiB by default, maximum 1 MiB), deliberately smaller than the library's artifact ceiling. Large media needs a separate authenticated bounded streaming/hash design; this endpoint does not upload videos to a provider.

The interface denies browser Origin headers, compressed bodies, unknown routes and malformed content types, uses a bounded shared request quota, and emits sanitized failures. Body and header timeouts bound slow clients. The shared quota protects one process, not a distributed deployment; one client can exhaust it. Upstream per-client limits and ingress controls are deployment requirements. Reverse proxy headers are not trusted for identity. There is no public health, objective creation, key enrollment, contract binding, reset or dispatch route. Provision objectives and accepted contracts through a separately reviewed operator procedure.

Tests exercise actual loopback HTTP reservations, replay, ownership denial, browser rejection, token rejection, input bounds and quota. A configured TLS deployment, key enrollment and customer authentication remain unevidenced.
