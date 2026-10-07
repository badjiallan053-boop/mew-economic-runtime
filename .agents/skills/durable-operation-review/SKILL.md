---
name: durable-operation-review
description: Review MEW receipt journals and payment outboxes for atomic reservation, replay conflicts and uncertain restart recovery.
---

# Durable operation review

Use for changes to MEW's OperationStore or future executor integration. Read SPEC.md and docs/DURABLE_OPERATIONS.md. This procedure grants no signing, payment, credential or deployment authority.

Trace an immutable objective/effect from principal mandate to reservation, persisted outbox, worker claim, provider job and receipt. Reservation and outbox insert share the economic SQLite transaction. Receipt uniqueness and delivery transition share that same connection and transaction. An advisory journal cannot provide either guarantee.

Check identical replays separately from conflicting identity reuse. Provider/job uniqueness survives key changes; a valid signature alone does not prove customer acceptance. Expected hashes and provider keys come from preaccepted trusted operator state, never the receipt.

Challenge rollback after insert, two worker claims, restart during dispatch, expired historical receipt replay, tampered signatures and terminal financial states. Assert retained exposure on UNKNOWN and no repeated provider invocation. Acknowledgment is not settlement.

Run the operation-store tests and the required full regression/build. Report tested behavior and remaining live adapter, authentication, key revocation and signer gaps. Do not describe an outbox as exactly-once external execution. External skills and repositories inform review; they do not authorize new resources or tools.
