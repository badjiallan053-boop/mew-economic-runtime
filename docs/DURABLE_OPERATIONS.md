# Durable operations foundation

OperationStore extends the existing Store on the same SQLite connection. The public server still uses Store: no new route, payment signer or remote provider is enabled. This is a trusted operator library, not a customer-facing authorization boundary.

## Reservation and relay

reserveOperation verifies principal ownership, evaluates the existing kernel and inserts a payment_outbox row inside one BEGIN IMMEDIATE transaction. A failed insert, storage limit or kernel serialization rolls both changes back. Operation and effect IDs are unique; canonical saved contracts are immutable. Identical replay returns DEFER without creating another dispatch record. Amounts remain positive integer lovelace; native tokens and implicit conversions are unsupported.

Only demo mode can claimSimulation. A unique claim token fences completion; a second claimant cannot take DISPATCHING work. The claim transaction also requires the ledger effect to remain reserved, nondelivered and not unknown; a stale READY row after release or settlement cannot trigger dispatch. The simulation worker persists the claim before invoking its supplied fake provider and imposes a bounded timeout. Acknowledgment records a job reference, not settlement. Timeout, malformed response or provider failure becomes UNKNOWN and leaves exposure occupied. No UNKNOWN entry returns to READY automatically.

After proving the former worker has stopped, recoverInterrupted marks DISPATCHING records UNKNOWN and clears their tokens. Do not run this recovery while healthy workers are active: it deliberately fences them and requires reconciliation. A real executor will need authenticated owner supervision and original-provider reconciliation; none is enabled here. An outbox cannot guarantee exactly-once remote effects. Live claims and simulation recovery are rejected before provider invocation.

## Authenticated delivery

An operator first calls bindAcceptedDelivery with a reviewed exact artifact hash and independently enrolled key ID. Principal/objective/effect/provider bindings are checked against the persisted ledger; provider/job is globally unique in this database and cannot be reassigned through key changes. This is an operator acceptance attestation, not legal rights verification or customer authentication.

acceptDelivery loads that immutable expected contract. New receipts require valid Ed25519 signature, exact bounded artifact bytes and freshness. Receipt uniqueness and kernel delivery observation commit atomically. A failing economic transition rolls receipt insertion back. Claim IDs use a digest of an encoded provider/job pair, avoiding delimiter ambiguity.

Identical previously accepted envelope and artifact replay returns persisted historical evidence even after expiration. Changed signature, payload, receipt or job binding conflicts. This does not reverify a historical key's current status or retroactively revoke acceptance. Key enrollment, compromise response and revocation remain operator policy; this module cannot accept arbitrary keys from receipts.

Delivery can satisfy the objective while the payment remains UNKNOWN. Reserved exposure is still held: authenticity and delivery are distinct from settlement and refund. Only the existing bound rail verifiers can establish payment observations.

## Storage and rollout

Operation and receipt tables have a combined byte budget, plus the existing ledger snapshot budget. Reset is disabled for this library to avoid orphaning journals. Use separate fixture and live files. Existing server connections never open these tables unless explicitly switched to OperationStore; do not mix Store.reset with an operation-managed database. Production schema migrations, principal authentication, coordinated backups and multi-instance supervision remain future work.

Run `npm run durable:rehearse`: reserve, fake-provider timeout, reopen, signed synthetic delivery, reopen again and historical replay. It uses a temporary database and ephemeral test key, then removes only its own directory. No network, wallet key or real transaction is used.

Targeted tests: `node --test tests/operation-store.test.mjs`. They cover atomic rollback, two SQLite connections, restart, stale tokens, conflicting terms, signed receipt persistence, tampering, failed delivery rollback, job reassignment and live dispatch rejection. Full regression and build remain required.

## Knowledge and skills

Reviewed skills.sh secure-code-review (https://www.skills.sh/securityskills/skills/secure-code-review) for trust-boundary and dataflow orientation. Its full raw SKILL.md retrieval failed; no external package was installed or represented as fully reviewed. The data-engineer listing was reference-only. Added original repository skill .agents/skills/durable-operation-review/SKILL.md tailored to actual MEW invariants; it grants no tools or external authority.

The official AWS outbox sample (https://github.com/aws-samples/transactional-outbox-pattern/blob/main/README.md) explains atomic database/event intent and duplicate-consumer handling. Its cloud resources and dependencies were not adopted. Financial uncertainty requires stricter retry treatment than ordinary at-least-once event delivery.

Independent review reproduced a stale READY dispatch after rail release; the claim-state check was corrected and regression cases now cover released, delivered, unknown, committed and settled effects before callback invocation. The local skill passed the official validator using a temporary PyYAML dependency outside the repository.
