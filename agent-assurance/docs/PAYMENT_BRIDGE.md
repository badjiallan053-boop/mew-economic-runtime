# MEW payment, wallet and contract bridge

Reviewed 9 October 2026 against implementation `723c02e` plus this follow-up. This is an engineering recommendation and implementation backlog, not a claim of real transactions, audit, wallet custody or provider eligibility. Primary sources and inspected skills are recorded in [PAYMENT_RESEARCH.md](PAYMENT_RESEARCH.md).

## Product outcome

One customer authorizes one report, an agent chooses an enrolled supplier, MEW reserves the budget, an isolated payment service executes the permitted action, and the customer accepts a bound deliverable. A lost response pauses/reconciles the original purchase rather than buying an equivalent replacement. Every stage carries one durable operation identity and original-asset accounting.

The first concrete bridge is implemented: opt-in Stripe test-provider submission and recovery, driven by the existing reservation/outbox and worker, with minimized synthetic evidence. The CLI purchases against a configured cooperative merchant using Stripe's test payment method. Mocked API tests establish adapter behavior; no external sandbox payment has been exercised. Keep the original 45-run independent simulator evaluation as regression evidence, not evidence that the remote provider was tested.

## Decide money direction before choosing a rail

| Use case | Suitable interface | MEW's role | Scope limit |
| --- | --- | --- | --- |
| Sell your own service/report | Stripe-hosted Checkout; server records the resulting payment identity | Controlled order, customer confirmation, fulfillment and evidence | Collects customer payment; not a general supplier wallet |
| Agent buys from cooperative Stripe sellers | Scoped Shared Payment Token (SPT), redeemed by the enrolled seller | Reserve before issuing a scoped token; reconcile seller payment and delivery | Seller/agent eligibility and country support must be confirmed |
| Buy from ordinary card merchants | An eligible issuing program and authorization integration | Bind purchase intent to authorization/capture/reversal | Merchant/card controls and program onboarding differ; not implemented |
| Pay an enrolled API per request | x402 `exact` with a customer-approved wallet/signer | Inspect terms, reserve, persist authorization, execute and reconcile | Automatic paid-fetch must not bypass MEW |
| Lock payment pending contractual acceptance | Narrow escrow contract plus an external wallet | Quote, funding operation, acceptance and refund lineage | A contract cannot determine external report quality by itself |

Do not describe PaymentIntent creation in our own merchant account as paying any supplier on behalf of any customer. Stripe's currently published SPT country list does not include Singapore; the user's timezone does not establish where the business is incorporated or eligible. Commercial issuing has separate regional restrictions. Provider onboarding is an input to the product decision, not something an SDK supplies.

Recommendation: validate the merchant workflow with the built sandbox bridge; implement human-approved service collection or one enrolled supplier pilot next. For machine-to-machine on-chain payments, use one test network first. Cardano preprod reuses the current observer; Base Sepolia/x402 is a separate adapter if the chosen supplier accepts it. Neither route requires transporting funds between chains. Do not add a cross-chain bridge merely to unify the UI.

## One operation, several independent dimensions

Keep principal/tenant, objective, effect/operation, semantic key, mandate revision, quote digest and acceptance contract stable. Version the envelope before adding fields. One operation has separate authority, dispatch, financial observation and delivery states; OBSERVED is not RESOLVED.

The next envelope must bind rail and network; original asset identity and integer units; payer/account; recipient; exact amount; independent fee/collateral caps; quote expiry; signer-policy reference; provider request identity; artifact/acceptance digest; and correction lineage. Names such as `USDC` alone are insufficient: bind chain and contract address from the issuer's registry. Cardano native assets need policy ID and asset name. USD cents, USDC base units, ETH wei and ADA lovelace remain separate balances. The current JS safe-integer kernel must reject out-of-range chain amounts; a BigInt/string schema migration precedes larger amounts, not a silent cast from uint256.

Use one operation ID across UI, worker, webhook inbox, provider object/chain transaction and receipt. Use distinct phase keys for create, confirm, capture and refund; freeze each phase's payload. Store native references separately: PaymentIntent ID, x402 payment ID/authorization nonce, EVM transaction or user-operation hash, or Cardano transaction-body hash and selected inputs. These references are not interchangeable.

No distributed transaction spans SQLite and a provider/chain. Synchronization is durable intent plus deduplicated observations and compensating recovery. A per-operation transition/version check commits MEW and outbox state together; at-least-once workers and inbox consumers enforce replay safety. Use provider truth for settlement and an enrolled acceptance verifier for delivery. A webhook timestamp alone is not event order. An out-of-order refund/settlement observation triggers reconciliation rather than blind rollback or inferred release.

## Wallet and execution boundary

Agents can propose, inspect quotes and request reconciliation. They cannot receive keys, arbitrary signing access or unreviewed paid network tools. A customer-owned wallet or isolated signing service rechecks the persisted authorization, exact destination and maximum total exposure. Bind human approval to exact bytes/typed data, not a browser boolean. Restrict target chains, token contracts, recipients and method selectors; prevent generic `approve`, arbitrary call/delegatecall and unlimited allowance paths from escaping those constraints.

A delegated wallet allowance is an additional cap; it does not replace objective quantity/equivalence checks. The reviewed Coinbase spend-permission interface has token, spender, allowance, period and expiry. It does not establish our supplier or deliverable contract. Its documentation also distinguishes user-operation hashes from transaction hashes. Validate actual deployed code and routing before use; README descriptions are not an audit of MEW.

Revocation stops future authorization, but cannot recall a payment already accepted/broadcast. Pending operations keep their evidence and occupied capacity until supported terminal evidence. The signer itself must enforce scope; blocking one frontend button while another tool retains wallet access leaves the bypass demonstrated in our suite intact.

## x402 integration

Intercept `onBeforePaymentCreation` in the chosen pinned SDK: validate HTTPS origin, resource/method, amount, asset, network, payTo, scheme and expiration; atomically reserve and persist the exact authorized payload before a signer or paid wrapper proceeds. Abort on DEFER/DENY. Allowlist origins/redirect behavior so payment challenges cannot become arbitrary outbound calls or signatures.

Persist a payment identifier and require enrolled-server deduplication bound to request fingerprint and operation. The extension is optional and its server cache has a configurable TTL: it cannot be our permanent recovery ledger. Do not follow the generic cache-failure suggestion to process another payment when our original result is unresolved. Reuse the same authorization identity and investigate settlement before considering any new authorization. `upto` and batch settlement change the exposure model; leave them disabled until separately specified.

Signed offers bind payment terms. Signed receipts authenticate the issuer's assertion of an interaction; they do not automatically prove our required report bytes, quality or customer acceptance. Verify enrolled signer/key rotation, audience, operation, request and artifact digest, then run the separate acceptance policy. Never turn HTTP 200 into fulfilled quantity. The public quickstart facilitator is not assumed to be a production mainnet service; choose and verify that deployment explicitly.

## Smart contract design

Build a narrowly scoped escrow only when the pilot needs conditional release. It adds enforceable custody conditions and operational responsibilities; it is not necessary for ordinary payment collection or x402 exact transfers.

Proposed immutable terms: buyer, enrolled seller, network/asset, principal amount, operation/quote digest, artifact acceptance digest, expiry, refund destination and explicit dispute authority. Minimal lifecycle: funded, released, refunded or disputed. Release requires the enrolled customer's bound acceptance; expiry may permit an undelivered refund under the agreed policy. Prevent release/refund races and reuse of an operation. Keep fees, taxes, gas and script collateral outside the seller principal and explicitly budgeted. Contract timeout rules are different from a financial API timeout.

For an EVM implementation, use vetted signature/token/access-control primitives, scoped EIP-712 domains, consumed nonces, checks-effects-interactions and reentrancy defenses. EIP-712 itself supplies no replay protection. ERC-3009 specifies authorization nonces and validity windows where a chosen token supports it; it does not prove delivery and is not universal token support. Test adversarial tokens, pause/dispute authority, authorization revocation, double release, forged acceptance and all refund/release interleavings. Resolve upgrade policy explicitly; do not give an administrator arbitrary withdrawal powers without documenting the trust model. No Solidity contract is implemented in this follow-up.

For Cardano, an Aiken validator controls spending an escrow UTxO using datum/redeemer rules, expected output value, signatories and validity interval. Persist chosen inputs, collateral/return collateral, output indices, exact transaction body and hash before requesting wallet signatures. CIP-30 `signTx` returns witnesses; validate/assemble them against the approved body and persist before submission. `getNetworkId() == 0` only identifies testnet, so separately establish the intended preprod network. An expired local lease does not justify choosing different inputs or another payment. After uncertainty, query the original transaction/inputs under the chain's validity and confirmation policy. Native payments need no new escrow script merely to send ADA. A contract release/refund is a separate operation, not another buyer purchase.

Current Cardano observer gaps before funded use: it verifies preprod recipient lovelace and confirmation depth, but does not establish an enrolled payer, match a locally approved transaction body or persist globally unique transaction/output consumption. Add those bindings, reorganization handling and restart tests before calling it an authorization-to-settlement integration. Base observations likewise distinguish unsafe/safe/finalized chain status; a mined receipt is not an absolute finality claim.

## Implementation order and acceptance

1. **Delivered now:** async test-provider adapter, fixed account/terms, provider journal, expiry-aware recovery, private CLI and mocked failure tests. Preserve all simulator outputs and synthetic labels. External sandbox execution still needs configured test credentials; keys are not requested in chat.
2. **Next provider pilot:** dedicated sandbox and enrolled supplier; Stripe-specific signed webhook inbox, raw-body limits/replay deduplication, retrieved-object binding, reconciliation, exact provider references and signed delivery/acceptance. Test lost responses past key TTL, 3DS, duplicate/out-of-order events, cancellations, full/partial refunds and dispute transitions. No success-page fulfillment.
3. **Identity and signer:** authenticated tenant-owned mandates, signatures/revocation, expiry, least-privilege tool routing, operator recovery and private secrets. Prove no signing/payment tool can bypass admission. Do not weaken the worker's explicit adapter registry into arbitrary plugins.
4. **One wallet/testnet:** human-approved exact transaction/authorization; independent observer; fee/input/nonce reservation; wrong-network/recipient/asset and crashed-sign/broadcast tests. Retain verified testnet evidence before describing a funded test.
5. **Escrow, if needed:** implement the chosen chain's contract, property/state-machine tests and independent security review; pin compiler/dependencies and retain deployment/code identity. Separate card/chain adapters share the operation contract, not native cryptographic code.
6. **Limited real-value pilot:** provider/program eligibility, agreed cap, one enrolled recipient/workflow, real acceptance owner, reconciliation/incident operator and reviewed deployment. Enable a distinct live adapter only after this evidence exists. Collection, delegated spending and contract custody have different obligations; establish the actual business/jurisdiction and provider terms before launch.

Use the receiver's actual records as the economic oracle. Properties to generate over event sequences include: one operation never settles twice; no competing equivalent remains admissible while an accepted/unresolved purchase occupies quantity; fees cannot exceed their asset-specific cap; stale/revoked authority cannot create new signed payloads; and release/refund/acceptance races cannot credit capacity twice. These are proposed tests, not already executed property-based campaigns or a contract audit.
