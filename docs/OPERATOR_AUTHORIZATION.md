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

## Runnable local host

Run `npm run operator:start -- /absolute/private/operator.json /absolute/private/economic.sqlite`. The launcher binds only 127.0.0.1:3040. It never reads bearer tokens from arguments or creates objectives. SIGINT/SIGTERM stops connections before closing SQLite. Startup errors are sanitized and print no configuration contents.

The version-1 JSON configuration contains exactly version, policy and providerKeys. Policy entries use the fields above and contain only digests, never raw tokens. Provider-key entries replace publicKey with publicKeyPem containing a PEM PUBLIC KEY; private PEM keys are rejected. All service rules, including Ed25519 and expiry checks, are validated before the database opens. No enrolled keys is valid for read/reserve operation; delivery still rejects until the expected provider key is enrolled.

Prepare the live ledger through a reviewed trusted OperationStore provisioning procedure with an approved objective mandate, then close it before starting the host. Do not copy or rename the public demo ledger: its immutable mode is rejected. Both configuration and database must be absolute regular files owned by the process user, with no group/other permissions. The immediate database directory must also be owned and private (0700); files should be 0600. Set a restrictive process umask when provisioning. Filesystem checks are defense in depth, not isolation from a malicious same-user process. Trust and protect ancestor directories and prevent other writers; SQLite WAL/SHM files and backups also need private custody.

No Railway service was created or enabled for this host. The existing public Docker deployment continues to run the simulation server. A private TLS proxy, operator policy, approved mandates, persistent private volume and provider enrollment must be reviewed before choosing deployment infrastructure. Do not expose the loopback listener with an unreviewed tunnel.
