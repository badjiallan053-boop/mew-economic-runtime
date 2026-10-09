# Exact-artifact acceptance: local pilot

Run `npm run pilot` from `agent-assurance`. The demo generates distinct Ed25519 fixture keys for supplier and owner, enrolls immutable delivery terms before dispatch, receives a signed receipt for the report bytes and records a separately signed fixture-owner acceptance. Signature operations are real; business evidence is simulated. No actual human reviewed or signed the fixture.

The trusted server-side `DeliveryVerifier` API has four steps:

1. `enroll(effectId, terms)` before the first dispatch attempt. Terms include supplier/owner public SPKI DER keys encoded as canonical base64, SHA256 of acceptance criteria and a deadline at most 24 hours away. The contract binds these to the persisted request, effect, objective and principal. Keys must differ; terms cannot change.
2. `receive(effectId, signedReceipt, artifactBuffer)` verifies the supplier signature and SHA256/length of the actual bytes. Artifacts are bounded to 1 byte–1 MiB. Receipt verification alone does not mark delivery complete.
3. The owner reviews the exact bytes against the criteria and signs acceptance or rejection containing contract, receipt and artifact digests. `decide(effectId, signedDecision, artifactBuffer)` verifies the owner signature, bindings, freshness and payment settlement. New owner decisions cannot predate the receipt.
4. Acceptance and the ledger delivery claim commit together. Rejection records the decision, retains paid exposure and leaves the objective unsatisfied. Identical evidence is replay-safe even after expiry; conflicting evidence fails. Corrections require a future versioned protocol, not overwriting records.

Signature bytes are `MEW-DELIVERY-V1`, a newline, then UTF-8 JSON with recursively sorted object keys. Distinct versioned receipt/acceptance schemas reject unknown fields. This is a MEW-specific protocol, not DSSE/in-toto compliance. The module stores public keys, signatures and bounded digest records, never artifact bytes or private signing keys. Exports carry only binding digests and simulation labels.

Enrollment is a trusted local operation; it does not authenticate real-world ownership of keys. Private signer integration, principal login, supplier enrollment, key revocation/rotation, tenant separation, criteria evaluation and a real human-reviewed merchant trial remain gates. There is no public enrollment/acceptance endpoint. Fixture keys live in memory and are discarded on exit. No wallet/payment signing is introduced.

A signature authenticates its signer and bytes, not truth, quality or satisfaction of criteria. The scripted fixture decision is not customer acceptance. The existing adversarial report still labels production signed-delivery controls unsupported.
