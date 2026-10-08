# Agent payment assurance layer

Updated 8 October 2026. This is the product and integration contract for a future release. It does not enable live dispatch, payment, custody or insurance.

## Product boundary

MEW is the control and evidence layer between an agent's proposed purchase and a customer's payment systems. It binds the human mandate, supplier terms, reservation, one dispatch attempt, independently observed payment, accepted delivery and later recovery to one durable operation. Agents may propose and inspect; deterministic services enforce authority and exposure; a separately controlled signer or payment provider moves value; named humans own exceptions. Brokers and insurers receive a minimized evidence export and make their own decisions.

The assurance claim is limited: **MEW can show whether an action followed the configured controls and which evidence supports each recorded state.** It cannot prove that the operator disclosed every tool, that upstream evidence is truthful or complete, that an external action caused a loss, or that insurance responds.

## One operation, eight controls

| Step | Required binding or check | Accountable source | Safe behavior when missing or uncertain |
| --- | --- | --- | --- |
| Authority | Authenticated principal; human owner; agent/workflow and tool version; action class; recipient/resource scope; mandate revision; expiry and limits | Customer identity and policy service | `BLOCKED`; no authority inferred from agent output |
| Intent | Stable objective/effect IDs; purpose/semantic key; quantity; idempotency key; customer-visible request | MEW intake and mandate | Reject identity reuse with changed terms; equivalent open effect is `DEFER` |
| Quote | Supplier identity; exact service; amount and asset unit; recipient; expiry; cancellation/refund terms; maximum fee | Authenticated provider quote, treated as untrusted until checked | Expired, changed or incomplete quote cannot dispatch; re-quote under the same operation |
| Reservation | Atomic budget and quantity check; principal plus fee/collateral reserves by asset; immutable decision and policy digest | Deterministic MEW journal | Persist reservation before returning `ALLOW`; otherwise no external call |
| Dispatch | Durable outbox; single submission key; provider request digest; worker lease and attempt history | Isolated payment worker/provider | Timeout or crash becomes `UNKNOWN`; query/reconcile original request, never submit a replacement blindly |
| Settlement | Correct network/rail; exact asset/unit, amount, payer, recipient, fee and operation linkage; provider/chain reference; freshness and confirmation policy | Independently authenticated provider or chain verifier | Observation is distinct from finality; mismatch and outage stay unresolved and keep exposure held |
| Delivery | Pre-agreed acceptance criteria; enrolled supplier key; signed receipt bound to operation/job and exact artifact bytes or result digest | Supplier verifier plus customer acceptance owner | Payment does not imply fulfillment; missing or disputed receipt remains open |
| Recovery | Retry/replay, reversal/refund, cancellation, worker restart, key revocation and correction lineage | MEW journal plus provider/rail and human operator | Append corrections; preserve original facts; release only after a verified, policy-allowed terminal transition |

Every checkpoint records the same operation ID, actor/source, observed time, verification method, evidence digest/reference, policy/schema version, simulation flag and correction/revocation link where relevant. References are access-controlled and bounded; raw prompts, credentials, seed phrases, private keys, unrestricted customer content and wallet secrets are excluded from partner exports. Hashes prove byte identity, not truth.

## Shared state vocabulary

Use state terms consistently across adapters and screens:

- `PROPOSED`: agent requested an action; no spending authority exists.
- `BLOCKED`: required authority, quote, policy or preflight check failed.
- `RESERVED`: deterministic mandate checks passed and capacity is durably occupied.
- `READY`: exact request is durably queued and eligible for a worker.
- `DISPATCHING`: one provider attempt is in progress; the idempotency key is fixed.
- `UNKNOWN`: outcome cannot yet be established. Keep capacity occupied and reconcile the same operation.
- `SETTLEMENT_OBSERVED`: a trusted adapter observed a payment reference and configured evidence; this is not automatically final or fulfillment.
- `DELIVERY_VERIFIED`: enrolled supplier receipt matches the accepted job and artifact contract.
- `RESOLVED`: the operation reached an allowed terminal state with required evidence and human review where policy requires it.
- `CORRECTED` / `REVOKED`: a later record links to and qualifies earlier evidence; history is not overwritten.

Adapters must preserve their own native states and map them explicitly. Do not map HTTP 200, a Task marked complete, a Cardano confirmation, a payment intent, a transaction hash or an agent `ACCEPT` directly to `RESOLVED`.

## Adapter boundary: Web2 and Web3

The control plane and operation IDs are rail-neutral. Money is not. Each adapter gets an explicit asset ledger and fee model; no USD, ADA or token amount may silently fund another asset's limit.

**Web2:** map card processors, invoice/payment APIs or service marketplaces to provider quote IDs, payment intent/request IDs, idempotency keys, authenticated webhook signatures and settlement/refund references. Verify webhook timestamp, signing key and event replay. A provider status is one source observation; reconcile against the provider API or bank record before declaring the configured terminal state. Protect against a webhook being replayed across tenants.

**Web3/Cardano:** bind network, asset policy/name, lovelace/token units, payer and recipient, transaction body/reference, inputs/outputs, fee, collateral, script/redeemer and confirmation policy. Persist UTxO selection before signing. Render exact transaction bytes for an enrolled external signer; validate returned witnesses against those bytes. Submission is idempotently journaled; after timeout, query the original transaction before any new input selection. Distinguish buyer settlement, escrow state, seller collection, refund and supplier delivery. A short confirmation depth is an observation policy, not absolute finality. A contract controls only the conditions encoded in that contract.

The operator-facing `ALLOW` only means the local mandate admitted a proposed effect. It does not itself sign, broadcast, bind an insurance policy or establish that the rail completed.

## Assurance evidence and partner review

Export a versioned evidence case, not a score. Each fact has an issuer/source class and verification method. A consumer should be able to trace a claim to its bounded evidence reference, see whether it is synthetic, authenticated, operator-attested or independently observed, and identify missing intervals. A reviewer's conclusion, policy terms or claim disposition is a separate issuer's record and must never be inferred from the export.

For an insurer or broker, offer a consented, purpose-bound and minimized export containing system/workflow versions, permitted tools and action scope, tested controls, operation timeline, observed exposure by original asset, incidents, corrections and coverage-relevant missingness. Include safe-operation denominators and system-version periods; incident-only data would bias a future risk analysis. Keep execution-control incidents distinct from trading P&L, market movement, liquidation, oracle/MEV, custody and protocol risks. Do not advertise premiums saved, loss avoided or insurability without an accepted independent method and adequate customer data.

## Implementation and release gates

The first customer delivery should be a **Web2 shadow-mode purchase workflow**. It exercises the common authority and evidence contract without introducing wallet custody. Cardano is a separate preprod adapter after its transaction construction, asset accounting, signer and contract gates pass.

1. **Identity and mandate:** private database login, authenticated principal/roles, signed versioned mandate and revocation. Confirm tenant isolation and concurrent admission.
2. **Durable dispatch:** transactionally write reservation and outbox; enforce one provider idempotency key; persist attempt and lease; prove crash recovery against a provider sandbox.
3. **Evidence:** validate authenticated quote/webhook/receipt keys, freshness, exact amount/recipient/job/artifact bindings, replay protection and correction history.
4. **Reconciliation:** test timeout before/after provider acceptance, duplicate callback, restart, provider outage, settlement reversal, partial refund and late delivery. No unresolved result releases capacity.
5. **Independent validation:** run frozen adversarial and customer holdout cases; obtain a consenting pilot, accepted deliverable, measured provider/model cost, retention terms and named incident owners.
6. **Cardano preprod:** review an exact asset-aware lifecycle, external signer policy, funded tests, refunds and concurrent UTxOs; obtain independent contract/security audit before any mainnet consideration.
7. **Insurance discovery:** ask one authorized broker/underwriter which existing review workflow the minimized evidence helps. The partner determines whether to use it; no underwriting/claims decision is delegated to MEW.

Current implementation has deterministic reserve/defer accounting, durable operation and receipt journals, an authenticated delivery receipt path and read-only Cardano payment observation. The hosted product remains demo-only. Live authentication, production signed mandates, dispatch worker, settlement identity/amount binding, funded audited Cardano lifecycle and an actual insurer integration are pending. Never remove disabled or pending labels until each gate has its own retained verification evidence.

## Design references

- [MEW accounting specification](../SPEC.md)
- [Operating ecosystem and authority map](MEW_OPERATING_ECOSYSTEM.md)
- [Insurance evidence and partner boundary](AGENTIC_INSURANCE.md)
- [Authenticated delivery implementation](POSTGRES_AUTHENTICATED_DELIVERY.md)
- [Durable operation journal](DURABLE_OPERATIONS.md)
- [Cardano integration status](CARDANO_INTEGRATION.md)
