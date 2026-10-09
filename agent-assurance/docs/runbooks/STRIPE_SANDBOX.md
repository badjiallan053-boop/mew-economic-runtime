# Stripe provider sandbox pilot

Status: adapter and mocked integration tests implemented; no credentialed Stripe API run has been performed. Stripe sandbox transactions are synthetic and do not move funds. This is a cooperative merchant payment test, not an arbitrary supplier purchasing card, customer wallet or production checkout.

## Run

Use Node 24+ from `agent-assurance/`. Provision a separate Stripe sandbox for development, distinct from live mode and CI. Supply `STRIPE_SANDBOX_KEY` and `STRIPE_SANDBOX_ACCOUNT_ID` through the private runtime environment or secret manager. Prefer a restricted test key with only the account-read and PaymentIntent create/read permissions needed; verify the exact permissions in your account. Do not commit or paste credentials into reports, the browser, or this document.

```sh
npm test
npm run payment:stripe -- --submit --state ./private-pilot --operation report-001
npm run payment:stripe -- --reconcile --state ./private-pilot --operation report-001
```

The command reserves exactly 100 USD cents for one objective and confirms Stripe's `pm_card_visa` test method. The adapter rejects live keys, other assets, a different merchant and amounts outside 50–1000 cents. It reads `/v1/account`, verifies its ID against the configured merchant, and uses the fixed `https://api.stripe.com/v1` origin. Redirects are rejected and requests time out after ten seconds. The pinned API version is `2026-09-30.endive`; changing request semantics/version requires migration and compatibility review for in-flight operations.

`private-pilot/runtime.sqlite` holds MEW's reservations/outbox; `private-pilot/stripe.sqlite` holds the request digest, first-attempt time and validated provider ID. Preserve both files and their SQLite journal files together; do not reset, remove or copy only one while an operation is unresolved. The directory is ignored by git and created privately. It contains business state, though no API key, PAN or raw provider response is persisted.

Exit 0 means an observation was recorded; inspect the evidence to distinguish settlement from verified cancellation. Exit 2 means the operation remains unresolved; exit 1 means configuration or command failure. An unsettled worker lease can require waiting until its 30-second expiry before a later reconciliation claims it. The worker bounds reconciliation cycles; exhaustion requires operator review, not deletion/recreation. Reusing the same operation never purchases again. Creating a different operation ID declares a different objective: this trusted CLI does not prove two user-supplied goals differ.

## Recovery

If the PaymentIntent ID was persisted, recovery retrieves that exact object. If Stripe accepted creation but its response was lost, recovery replays the same payload/key within 22 hours of the journal's first attempt, conservatively below Stripe's documented key retention boundary. Outside that window, it stops without creating another intent. Missing local state is not proof of provider absence. Stripe errors, 3DS/authentication, processing, failed-method states and inconsistent observations keep capacity held. Only a validated succeeded intent with the exact amount records settlement; only a validated canceled intent with zero amount received records failure/release.

Polling intentionally avoids relying on the existing generic HMAC webhook adapter, whose protocol is not Stripe's. A production deployment must add Stripe-specific raw-body signature verification, a durable deduplicated inbox, account/tenant binding and reconciliation. Refunds/disputes, customer authentication, receipt verification and partial refunds are not implemented by this adapter. No refund API is called.

The output uses the existing minimized evidence case and marks test observations synthetic with verifier `stripe-api-sandbox`. It excludes `client_secret`, provider headers and payment details. Payment does not mark fulfillment. Do not publish the private SQLite files or count the mocked tests as an external sandbox payment.

## Before real value

Use [PAYMENT_BRIDGE.md](../PAYMENT_BRIDGE.md) to select the correct money direction and signer boundary. Live mode is a separate release: authenticated principals, signed/revocable mandates, scoped merchant credentials, durable inbox/reconciliation, delivery acceptance, operator incident ownership and the relevant provider onboarding must be exercised first. This CLI has no live switch.
