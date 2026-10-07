# Private PostgreSQL authenticated delivery

This port connects IntegrationService and its private machine-to-machine HTTP host to the existing Ed25519 delivery verifier and the principal-scoped PostgreSQL ledger transaction. It never calls a remote worker, signs, broadcasts, settles a payment, refunds or releases exposure. The reviewed additive migration was applied to selected Supabase project ndorfchuhciidfcltbzf as version20261007225017. Its management catalog boundaries were checked; runtime authentication and hosted delivery remain unverified.

## Enrollment and acceptance

Apply `deploy/supabase-delivery.sql` with the migration owner only after reviewing the startup catalog guard for the six-table schema. The runtime receives SELECT/INSERT on `delivery_contracts` and `delivery_receipts`, not UPDATE/DELETE. Both force RLS using the existing transaction-local principal context. Global provider/job and provider/key/receipt uniqueness prevents reuse across customer partitions even though RLS hides their rows.

Existing service configurations remain valid. `providerKeys` defaults to an empty list, leaving delivery unavailable. A configured entry contains exactly provider, keyId, publicKey (a pre-enrolled Ed25519 public KeyObject), notBeforeMs, expiresAtMs, revoked. Obtain keys out of band. The service copies and freezes entries. Add the narrowly scoped `enroll-delivery` and `accept-delivery` actions only for the authorized operator. Customer identity comes from the service bearer enrollment, not body principal fields.

`POST /integration/delivery/enroll` accepts exactly keyId, objectiveId, effectId, provider, jobId, artifactSha256. It checks a current enrolled key and binds its SHA-256 SPKI DER fingerprint into the immutable accepted-artifact contract. Existing effect, provider, objective and derived principal must agree; status must be reserved, committed or settled. The job and accepted digest are operator attestations, not proof a provider actually ran or a customer reviewed the content. No new economic reservation is created here.

`POST /integration/delivery/accept` accepts exactly effectId, envelope, artifactBase64. Artifact encoding must be canonical base64 and decode to at most 128 KiB; HTTP still bounds its JSON body to 256 KiB. Receipt format remains the existing `mew-delivery-v1`, with exact principal/objective/effect/provider/job/artifact bindings and short-lived signature freshness. Requests with a browser Origin are rejected. No delivery submission/dispatch endpoint is added. Large video objects need a separately reviewed private object-storage path; this inline endpoint suits bounded artifacts and is not a video-upload service.

## Atomic evidence and replay

The existing store transaction locks the customer's ledger row before checking the immutable contract, existing receipt, enrolled key and kernel effect. The receipt and `delivery.verified` observation commit on the same checked-out PostgreSQL connection. A failure after receipt insert rolls both back. The receipt only establishes delivery under the enrolled signer; no `payment.settled` claim is emitted. Exposure remains reserved or committed/settled exactly as before acceptance.

Identical signed bytes, signature and artifact replay return the saved record idempotently, including across newly constructed store instances and reordered JSON keys. Conflicting receipt identity or a new receipt for an already consumed provider job is rejected. Unique indices enforce conflicts invisible to another principal's RLS context. These database errors are exposed only as a generic private HTTP rejection.

Current key availability, validity and fingerprint are checked before replay. Revocation or expiry therefore rejects even a historical replay through this endpoint; the original durable receipt remains recorded. A saved accepted contract cannot silently trust a replacement key under the same keyId. Rotation requires a new reviewed identity; there is no mutable reenrollment endpoint. Compromise handling is a human incident procedure: retain original records, stop new acceptance, assess affected artifacts and determine customer recourse. This implementation does not retroactively erase satisfaction or financial records.

## What local tests establish

`node --test tests/postgres-delivery.test.mjs` exercises actual PGlite PostgreSQL migration, SQL, forced RLS, rollback and an authenticated loopback HTTP path with generated fixture keys. Cases cover independent store instances, serialized concurrent acceptance, cross-principal job/receipt conflicts, tampered artifact/signature, wrong job, key replacement, revocation/expiry, released effects, immutable binding and failed ledger observation.

PGlite uses one serialized engine connection. These tests do not establish hosted multi-connection contention, crash recovery, actual private runtime connectivity, provider enrollment authenticity, actual customer acceptance or live remote delivery. Use the startup schema guard and hosted isolation checks before connecting a configured host. Human consent/rights/revision acceptance remain separate gates in CUSTOMER_NEXT_RELEASE.md.

## Reference boundary

The implementation reuses `src/adapters/delivery-receipt.mjs`; no outside implementation or skill installer ran. [Node crypto documentation](https://nodejs.org/api/crypto.html) is the primary signature-interface reference. The [skills.sh discovery procedure](https://www.skills.sh/deanpeters/product-manager-skills/discovery-process) is reference-only customer validation guidance, not authorization or authenticated evidence. Existing local mew-engineering and production-readiness skills supplied the transaction, ownership and no-uncertainty-release gates.

The private host loads optional providerKeys entries from its explicit owner-only
JSON configuration. Supply publicKeyPem instead of a KeyObject; the host parses
only a public SPKI PEM and rejects private or non-Ed25519 keys before connecting.
No provider key is included in the shipped example.
