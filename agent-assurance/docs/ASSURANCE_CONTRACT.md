# Agent payment assurance layer

Updated 9 October 2026. This is the product and integration contract. It does not enable live dispatch, payment, custody or insurance.

## Product boundary

The layer is the control and evidence plane between an agent's proposed purchase or trade and a customer's payment systems. It binds the human mandate, supplier terms, reservation, one dispatch attempt, independently observed payment, accepted delivery and later recovery to one durable operation. Agents may propose and inspect; deterministic services enforce authority and exposure; a separately controlled signer or payment provider moves value; named humans own exceptions. Brokers and insurers receive a minimized evidence export and make their own decisions.

The assurance claim is limited: **the system can show whether an action followed the configured controls and which evidence supports each recorded state.** It cannot prove the operator disclosed every tool, that upstream evidence is truthful or complete, that an external action caused a loss, or that insurance responds.

## One operation, eight controls

| Step | Required binding or check | Accountable source | Safe behavior when missing or uncertain |
| --- | --- | --- | --- |
| Authority | Authenticated principal; human owner; agent/workflow and tool version; action class; recipient/resource scope; mandate revision; expiry and limits | Customer identity and policy service | `BLOCKED`; no authority inferred from agent output |
| Intent | Stable objective/effect IDs; purpose/semantic key; quantity; idempotency key; customer-visible request | Intake and mandate | Reject identity reuse with changed terms; equivalent open effect is `DEFER` |
| Quote | Supplier identity; exact service; amount and asset unit; recipient; expiry; cancellation/refund terms; maximum fee | Authenticated provider quote, untrusted until checked | Expired, changed or incomplete quote cannot dispatch; re-quote under the same operation |
| Reservation | Atomic budget and quantity check; principal plus fee/collateral reserves by asset; immutable decision and policy digest | Deterministic journal | Persist reservation before returning `ALLOW`; otherwise no external call |
| Dispatch | Durable outbox; single submission key; provider request digest; worker lease and attempt history | Isolated payment worker/provider | Timeout or crash becomes `UNKNOWN`; query/reconcile the original request, never submit a replacement blindly |
| Settlement | Correct network/rail; exact asset/unit, amount, payer, recipient, fee and operation linkage; provider/chain reference; freshness and confirmation policy | Independently authenticated provider or chain verifier | Observation is distinct from finality; mismatch and outage stay unresolved and keep exposure held |
| Delivery | Pre-agreed acceptance criteria; enrolled supplier key; signed receipt bound to operation/job and exact artifact bytes or result digest | Supplier verifier plus customer acceptance owner | Payment does not imply fulfillment; missing or disputed receipt remains open |
| Recovery | Retry/replay, reversal/refund, cancellation, worker restart, key revocation and correction lineage | Journal plus provider/rail and human operator | Append corrections; preserve original facts; release only after a verified, policy-allowed terminal transition |

Every checkpoint records the same operation ID, actor/source, observed time, verification method, evidence digest/reference, policy/schema version, simulation flag and correction/revocation link where relevant. References are access-controlled and bounded; raw prompts, credentials, seed phrases, private keys, unrestricted customer content and wallet secrets are excluded from partner exports. Hashes prove byte identity, not truth.

## Shared state vocabulary

- `PROPOSED`: agent requested an action; no spending authority exists.
- `BLOCKED`: required authority, quote, policy or preflight check failed.
- `RESERVED`: deterministic mandate checks passed and capacity is durably occupied.
- `READY`: exact request is durably queued and eligible for a worker.
- `DISPATCHING`: one provider attempt is in progress; the idempotency key is fixed.
- `UNKNOWN`: outcome cannot yet be established. Keep capacity occupied and reconcile the same operation.
- `SETTLEMENT_OBSERVED`: a trusted adapter observed a payment reference and configured evidence; not automatically final or fulfillment.
- `DELIVERY_VERIFIED`: enrolled supplier receipt matches the accepted job and artifact contract.
- `RESOLVED`: allowed terminal state reached with required evidence and human review where policy requires it.
- `CORRECTED` / `REVOKED`: a later record links to and qualifies earlier evidence; history is not overwritten.

Adapters preserve their own native states and map them explicitly. Do not map HTTP 200, a Task marked complete, a chain confirmation, a payment intent, a transaction hash or an agent `ACCEPT` directly to `RESOLVED`. `operationState` in `src/core/evidence.mjs` implements the mapping the ledger can support today; it never emits `READY`, `DISPATCHING`, `BLOCKED`, `PROPOSED`, `RESOLVED`, `CORRECTED` or `REVOKED`.

## Adapter boundary: Web2 and Web3

The control plane and operation IDs are rail-neutral. Money is not. Each adapter gets an explicit asset ledger and fee model; no USD, ADA or token amount may silently fund another asset's limit.

**Web2:** map card processors, invoice/payment APIs or marketplaces to provider quote IDs, payment intent/request IDs, idempotency keys, authenticated webhook signatures and settlement/refund references. Verify webhook timestamp, signing key and event replay. A provider status is one source observation; reconcile against the provider API or bank record before declaring a terminal state. Protect against a webhook being replayed across tenants. (`src/adapters/web2.mjs` implements signature, tolerance and reservation binding; provider API reconciliation is pending.)

**Web3 (any chain):** bind network, asset, units, payer and recipient, transaction reference, fee and confirmation policy. Persist input selection before signing. Render exact transaction bytes for an enrolled external signer and validate returned witnesses against them. Submission is idempotently journaled; after timeout, query the original transaction before any new input selection. Distinguish buyer settlement, escrow state, seller collection, refund and supplier delivery. A short confirmation depth is an observation policy, not absolute finality. A contract controls only the conditions encoded in it. Chain selection: see [CHAIN_DECISION.md](CHAIN_DECISION.md).

Operator-facing `ALLOW` only means the local mandate admitted a proposed effect. It does not sign, broadcast, bind an insurance policy or establish that the rail completed.

## Assurance evidence and partner review

Export a versioned evidence case, not a score. Each fact has an issuer/source class and verification method. A consumer can trace a claim to its bounded evidence reference, see whether it is synthetic, authenticated, operator-attested or independently observed, and identify missing intervals. A reviewer's conclusion, policy terms or claim disposition is a separate issuer's record and is never inferred from the export.

For an insurer or broker, offer a consented, purpose-bound, minimized export: system/workflow versions, permitted tools and action scope, tested controls, operation timeline, observed exposure by original asset, incidents, corrections and coverage-relevant missingness. Include safe-operation denominators and system-version periods; incident-only data biases risk analysis. Keep execution-control incidents distinct from trading P&L, market movement, liquidation, oracle/MEV, custody and protocol risks. Do not advertise premiums saved, loss avoided or insurability without an accepted independent method and adequate customer data. See [MARKET_NOTES.md](MARKET_NOTES.md) for claims to avoid.

## Implementation and release gates

The first customer delivery is a **Web2 shadow-mode purchase workflow**. It exercises the common authority and evidence contract without wallet custody. An on-chain adapter is separate and gated.

1. **Identity and mandate:** private database login, authenticated principal/roles, signed versioned mandate and revocation. Confirm tenant isolation and concurrent admission.
2. **Durable dispatch:** transactionally write reservation and outbox; enforce one provider idempotency key; persist attempt and lease; prove crash recovery against a provider sandbox.
3. **Evidence:** validate authenticated quote/webhook/receipt keys, freshness, exact amount/recipient/job/artifact bindings, replay protection and correction history.
4. **Reconciliation:** test timeout before/after provider acceptance, duplicate callback, restart, provider outage, settlement reversal, partial refund and late delivery. No unresolved result releases capacity.
5. **Independent validation:** frozen adversarial and customer holdout cases; a consenting pilot, accepted deliverable, measured provider/model cost, retention terms and named incident owners.
6. **On-chain testnet adapter:** exact asset-aware lifecycle, external signer policy, funded tests, refunds and concurrent inputs; independent contract/security audit before any mainnet consideration.
7. **Insurance discovery:** ask one authorized broker/underwriter which existing review workflow the minimized evidence helps. The partner decides whether to use it; no underwriting/claims decision is delegated to this system.

## Current implementation status

An opt-in Stripe test-provider adapter and private pilot CLI now implement fixed-origin API submission, account/request binding and durable PaymentIntent recovery. Automated checks mock the remote API; a credentialed external sandbox run has not been performed. All observations stay synthetic. It does not implement live customer collection, customer-funded supplier spending or signed delivery. Stripe snapshot webhooks now have a separate test-only loopback receiver and durable inbox; financial state is reconciled through read-only provider retrieval. This is locally fixture-tested, not evidence of a credentialed external sandbox run.


The local simulator now exercises atomic reservation/outbox, fenced worker recovery, durable receiver idempotency and 15 frozen scenarios in three modes. The receiver database is separate from MEW; all its observations, delivery and refunds are synthetic. Genuine subprocess kills and competing-process admission are tested in guarded mode; comparator modes use scripted equivalents for crash faults. See [ASSURANCE_DEMO.md](runbooks/ASSURANCE_DEMO.md). This does not satisfy a real provider sandbox, customer identity, signed delivery or production gate.


Implemented: deterministic reserve/defer accounting with per-asset objectives, SQLite transactional reservation journal that survives restart, idempotent claim ledger, read-only Cardano preprod payment observation, provider-neutral HMAC webhook intake and binding, minimized evidence-case export. **Pending (do not remove these labels without retained verification evidence per gate):** live authentication and production signed mandates, real provider dispatch/outbox integration, quote and signed delivery-receipt verification, provider API reconciliation, tenant isolation, any signer, a funded audited on-chain lifecycle, and any actual insurer integration. Nothing here signs, custodies or moves value.
