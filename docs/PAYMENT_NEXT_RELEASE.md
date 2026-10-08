# Payment and durable-operation next release

The immediate next release remains a private, non-signing integration release. Hosted database setup, a healthy provider and unsigned drafts do not establish a funded payment lifecycle. Wallet custody, native-token accounting, funding/closing chain evidence and an independent contract audit remain open gates.

## Concrete recovery bug fixed

`IntegrationStore.transaction` previously swallowed a failed ROLLBACK and returned its checked-out client to the pool normally. A transaction-control request can execute at PostgreSQL while its acknowledgment is lost. An uncertain pooled connection could still carry an open transaction and transaction-local principal context into another borrower, or simply repeatedly fail future requests.

The store now discards the client with `release(true)` after a failed BEGIN acknowledgment, a failed COMMIT acknowledgment, or a failed rollback. An ordinary rejected mutation with an acknowledged rollback remains reusable. The original exception is preserved; no query, callback, financial observation or model call is automatically retried. The [official pool API](https://node-postgres.com/apis/pool) documents that a truthy destroy argument removes the connection, and reviewed installed pg-pool 3.14.0 implements it. This changes recovery behavior without changing the store interface, operation identity, exposed budget or custody boundary.

Five new tests inject control failures and verify disposal, single mutation execution, original-error preservation and healthy-client reuse. Existing serialized PGlite integration tests continue exercising actual SQL/RLS, atomic reservations/input locks, UNKNOWN retention and restart/replay fences. These tests do not simulate a real network partition or prove Supabase multi-client isolation.

## Next implementation sequence

| Step | Accountable assignment required | Evidence before proceeding |
|---|---|---|
| Private operation inspection/recovery | Backend owner and alternate | Authenticated operation-ID lookup, sanitized errors, unchanged immutable identity and no automatic replacement on lost COMMIT acknowledgment. Read the original operation from a new connection; its absence is not external payment failure proof. |
| Real PostgreSQL contention/restore | Database owner and independent reviewer | Two independent checked-out clients race the same effect and shared input; one reservation succeeds, other fails or defers; kill/reconnect cases and coordinated ledger/journal/input-lock backup restore. No public admin credentials. |
| Fresh funding context | Wallet custodian and payment integrator | Public enrolled address, provider snapshot, selected outpoints/asset contents, locks, current protocol parameters and final transaction fee/change/collateral checks. A `preprod-observed` label is operator input, not provider attestation. |
| External signer design | Wallet custodian plus second human | Scope-limited preprod-only custody, exact transaction/datum/recipient/asset and maximum total debit confirmation, revocation and incident ownership. Do not introduce private keys into MEW or agents. No signing exists in this release. |
| Funded ADA escrow lifecycle | Authorized preprod operator and reviewer | Operation-bound submitted hash, independently observed funded output/datum, actual accept and cancel closings, measured execution units under live cost models, fee/collateral conservation, UNKNOWN/restart/rollback behavior and authenticated deliverable evidence. |
| Masumi native-token lane | Payment integrator plus economic reviewer | Pinned deployed MPS schema/version and authenticated terms, full tUSDM policy/asset-name unit with string atomic amount, token-aware mandate/ledger/reservation, separate ADA overhead budgets, durable original purchase/withdrawal stages and full seller net receipt bound to task. |
| Independent contract audit | Independent qualified assessor | Exact contract/blueprint revision and digests, scope and assumptions, reviewed findings, remediation/retests and named opinion. Internal tests and source review cannot satisfy this gate. |

The existing private backend can set PostgreSQL transaction-local principal context because its credential is trusted. Forced RLS protects correctly scoped calls; it is not proof that a compromised backend credential is harmless. Keep that credential outside browsers and advisory agents. A healthy database connection is not a customer-authentication, custody or production-readiness certificate.

## ADA and native-token boundary

The current kernel and private escrow effect amount are **lovelace only**. Native-token Masumi tUSDM payment cannot be enabled by passing its atomic amount as `amountLovelace`, replacing a symbol, or adding its balance to ADA. The read-only seller receipt verifier checks a full raw token unit but does not implement token authorization or purchase/withdrawal execution. Separate amount/asset ledgers and durable lifecycle are needed before authorizing that rail. ADA also pays fees, minimum UTxO/change and collateral; token receipt is not proof these budgets are funded.

The existing funding observation records commitment rather than releasing exposure. `REVIEW_REQUIRED` after rollback remains review-required even if later observations look healthy; no timeout unlock exists. Input locks are deliberately retained until a separately designed, verified terminal lifecycle exists. Do not remove these conservative locks to improve a dashboard status.

## Research and validation

`research/activation/payment-next-sources.json` records the pinned official node-postgres pool source, installed dependency source digest, official transaction/pool docs, prior pinned MPS boundary and skills.sh verification guidance. Third-party skills were inspected as reference only; no executable bundle or framework installed. The suggested [Cardano facilitator](https://github.com/cardano-foundation/cardano-x402-facilitator) is a protocol implementation reference, not an existing MEW executor. It signs nothing, and its settlement response can remain pending after broadcast; preserve the original operation.

Fresh local verification for this change:

```sh
node --test tests/payment-session-safety.test.mjs tests/integration.test.mjs
```

All 12 targeted tests passed in the implementation review. Root release verification must additionally run the full tests and build against the final combined working tree. No funded wallet request, model provider request, financial mutation, closing transaction, external audit or deployment was performed by this workstream.
