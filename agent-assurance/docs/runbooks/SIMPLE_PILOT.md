# One-command pilot and operating procedure

From `agent-assurance/`, with Node 24+:

```sh
npm run pilot
```

No installation, account, wallet, paid inference or API key is required. One scripted proposal buys one simulated report; the provider loses its response; a replacement is deferred; reconciliation finds the original purchase; synthetic delivery completes the objective. Expect a short result: one purchase, one report delivered, replacement deferred, and an evidence digest. Use `npm run pilot -- --evidence` for the complete minimized JSON evidence (`acceptedPurchases: 1`, `fulfilledQuantity: 1`, `replacement: "DEFER"`). Temporary databases are removed afterwards. All of this is explicitly simulation.

To connect the same control workflow to Stripe's actual test API, privately configure `STRIPE_SANDBOX_KEY` and `STRIPE_SANDBOX_ACCOUNT_ID` as described in [STRIPE_SANDBOX.md](STRIPE_SANDBOX.md), then:

```sh
npm run pilot -- --stripe
# After a pending/unknown result, inspect it and reconcile the SAME operation:
npm run pilot -- --stripe --reconcile
```

This uses a fixed 100-cent test purchase and persistent `private-pilot/stripe/` state, not a new objective on each restart. It does not manufacture delivery. A known observed operation is replay-safe. The Stripe bridge has been tested with mocked remote responses; no credentialed external transaction is claimed. Live keys and a `--live` flag are rejected.

## SOP: one owner, one objective, one result

1. **Owner:** approve the exact supplier, currency, all-in cap and acceptance criteria. For a live pilot, use one enrolled cooperative merchant and a human confirmation. Decide whether we collect our service fee or buy from a supplier; do not mix them.
2. **Buyer agent:** propose one bounded purchase. MEW admits/reserves it. The agent has no key or unrestricted payment tool.
3. **Worker:** execute the persisted request. If the result is unknown, stop replacements and reconcile the same reference. Preserve state; do not reset or delete it.
4. **Supplier and acceptance owner:** supply the agreed artifact and verify it against the acceptance contract. A payment response alone never completes delivery.
5. **Owner:** inspect one minimized evidence case; record the accepted result or the unresolved exception. Only supported verified terminal evidence changes capacity.

These are roles, not a requirement for five agents/services. Today the buyer is a deterministic script; no LLM team is running. Reuse one buyer agent for proposals and one deterministic verifier/worker for execution. Add parallel research agents only when their outputs help the deliverable; route every proposed spend through the same ledger. More agents must not create more wallets, reservation stores or duplicate supplier purchases.

## Shortest path to real customers

Start with one report from one cooperative seller, one currency and human-approved hosted checkout. Keep the payment service and credentials private; keep the existing public demo synthetic. Add authenticated mandates, provider-specific webhook inbox/reconciliation and signed artifact acceptance before a customer pilot. Then demonstrate a bounded real purchase with retained provider evidence and an actual accepted report.

Do not add escrow, cross-chain transport or autonomous signing to the first customer workflow unless the customer requires them. The scoped design is in [PAYMENT_BRIDGE.md](../PAYMENT_BRIDGE.md). An account and provider eligibility still need to be established; this code does not make the current trusted CLI suitable for multi-tenant live deployment.
