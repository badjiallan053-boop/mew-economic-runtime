# Stripe sandbox webhook SOP

Keep the default demo simple: in `agent-assurance`, run `npm run pilot`. It needs no account. The following optional procedure tests provider callbacks locally; it is not live customer payment or supplier spending.

1. Use one Stripe sandbox and its direct merchant account. Supply `STRIPE_SANDBOX_KEY` (restricted test server key) and `STRIPE_SANDBOX_ACCOUNT_ID` privately in the local environment. Never paste secrets into chat, repository files or exports.
2. In a separate terminal, use the authenticated Stripe CLI for that same sandbox:

```sh
stripe listen --events payment_intent.succeeded,payment_intent.canceled,payment_intent.payment_failed,payment_intent.processing,payment_intent.requires_action,payment_intent.amount_capturable_updated --forward-to http://127.0.0.1:3001/stripe/webhook
```

3. Put the CLI's signing secret into `STRIPE_SANDBOX_WEBHOOK_SECRET` privately, then run `npm run pilot:listen` from `agent-assurance`. It uses the same `private-pilot/stripe` directory as the default Stripe pilot.
4. Run `npm run pilot -- --stripe` once. Run `npm run pilot -- --stripe --reconcile` to inspect the same operation. Preserve both SQLite journals and their WAL files; do not change operation IDs to bypass an unresolved result.
5. The owner checks the minimized evidence. Payment success does not satisfy delivery. Missing evidence, eight exhausted inbox attempts, refunds, disputes or conflicting observations require operator review. Stop with Ctrl+C.

The listener binds only 127.0.0.1:3001, rejects browser origins and oversized bodies, and accepts snapshot events for the configured direct account. Thin events, Connect accounts, live events and live keys are unsupported. Signature verification uses raw bytes, HMAC-SHA256, constant-time comparison and a mandatory five-minute freshness limit in both time directions. Current/previous secrets and multiple v1 signatures are supported by the verifier; the CLI command configures one current secret. Zero tolerance is forbidden. These stricter choices differ from some SDK defaults.

Intake acknowledges only after a minimized inbox record commits. A background worker retrieves the exact PaymentIntent through the fixed Stripe API origin. Event amounts/statuses never settle or release funds. The API response must match account, reference, request digest, amount and currency. Recovery does not POST, including after the original idempotency replay window. Financial observation and APPLIED marker commit together, fencing older dispatch workers. Expired inbox leases permit recovery; outages retain exposure. Duplicate event IDs are durable; changed bindings fail. Unsupported event types are retained as IGNORED and cannot move funds.

SQLite coordinates processes sharing this local store. Separate deployments, authenticated tenants, signed delivery, refunds/disputes, backup operations and a live payment service remain separate work. Signature tests and HTTP tests use local fixtures. No external Stripe CLI session or credentialed sandbox payment was executed in this development stage.
