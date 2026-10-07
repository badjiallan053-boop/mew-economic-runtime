# MEW prototype specification

MEW prevents individually admissible agent actions from exceeding one principal's economic mandate when those actions are considered together. The decision path is deterministic JavaScript; no LLM approves spending.

An objective has a stable ID, principal, precommitted semantic key, integer quantity and integer maxExposure. An effect has an immutable ID, objective ID, semantic key, provider, type and integer amount. The principal supplies equivalence; this build does not infer it from text. A second objective with the same principal and semantic key is rejected. Different semantic keys are a trusted configuration boundary, not proof that goals differ.

All money is lovelace in one currency. The canonical demo permits one report and at most 1,000,000 lovelace. Alpha costs 550,000 and Beta costs 490,000. No currency conversion is performed.

## Accounting and decisions

Spent is settled value. Reserved is authorized value that has not yet committed. Committed is verified in-flight value. Exposure is their sum; these categories are disjoint. Equivalent paid or unresolved effects consume objective capacity, even when delivery is unknown. Full verified refund or verified failure/release of an unpaid reservation can restore capacity. Delivery satisfaction and payment settlement are separate facts.

ALLOW reserves capacity before dispatch. DEFER means reconcile the original effect rather than issue another payment. DENY rejects mandate mismatch, exceeded budget, reused effect identity or completed objective. simulate uses a copy and does not reserve real capacity. Server persistence must wrap evaluate plus reservation write in one database transaction. A reservation has no automatic timeout release: silence does not prove a payment failed.

Claims have stable IDs, source, effect ID, type and evidence. Replay of identical evidence is idempotent; conflicting evidence is rejected. Payment settlement requires rail verification. The Cardano verifier reads transaction inputs and outputs from the fixed preprod Blockfrost origin, validates a 64-character hash, exactly matches net recipient lovelace receipt to the reserved contract, and requires latestHeight - transactionHeight + 1 to meet its threshold. Live HTTP reconciliation requires an immutable operator-attested operation binding; it does not cryptographically establish payer or mission ownership. It never signs or sends payments. Confirmation depth is a configured observation policy, not absolute finality. See docs/CARDANO_INTEGRATION.md.

## Threat model and prototype limits

The API boundary is trusted. A JSON field `evidence.verified=true` is not a signature or an oracle. Demo claims are controlled fixtures and must stay labeled simulation. Real payment claims must be produced server-side by a verifier; the server must prevent reuse of one transaction for multiple effects. The recipient and amount must come from the persisted reservation, not from a reconcile request. Merchant delivery remains a trusted input and requires authenticated signed receipt verification before production.

The accounting layer only governs actions sent through it. Bypassing MEW, malicious principals, forged upstream data, compromised Blockfrost credentials, chain rollback and multiple independently deployed reservation stores are outside this demo's guarantees. Production requires principal authentication, authorization per objective, signed mandates and receipts, resilient reconciliation, scoped secrets, durable backups and coordinated multi-instance locking. Public demo state must never control wallets. A test suite proves the checked scenarios, not every economic workflow.

## Separate private PostgreSQL integration

`src/integration` adds a separate private store without changing the public SQLite
API or kernel contracts. Its authenticated operator enrollment derives principal
identity server-side. Each principal's snapshot mutation, escrow reservation and
global funding-input locks commit on one checked-out connection under a row lock.
Forced RLS requires transaction-local principal context; the trusted backend can
set that context, so its credential is never a browser credential. Hosted schema
and isolation checks are complete; application login, multi-client contention and
crash verification against Supabase remain separate prerequisites.

Model evaluation durably records RUNNING before any provider request. COMPLETE,
UNKNOWN and interrupted attempts cannot automatically retry or activate a model.
The four synthetic cases are distinct from the research benchmark and customer
holdout. Payment preparation admits only enrolled-address, unsigned preprod ADA
funding drafts. A bound transaction observation preserves the full exposure;
rollback requires review and cannot release capacity. The private PostgreSQL delivery port now binds Ed25519 receipts to immutable
provider/job/artifact/key identity and commits receipt replay plus satisfaction
atomically. Its migration is installed; hosted runtime delivery remains unverified.
Native-token Masumi writes, closing transactions, signing and broadcast remain pending.
A separate asset-aware in-memory prototype has no dispatch or durable authority.
See docs/SUPABASE_MODEL_PAYMENTS.md for exact integration boundaries and setup.

Supabase Auth SDK session helpers and a scoped session-status endpoint are separate
from private database bearer enrollment. Auth user identity grants no economic or
private ledger access; no automatic mapping to principal mandates exists.
