# Local assurance demo (90 seconds)

Use Node 24+ from `agent-assurance/`. No packages, credentials, network calls, model inference or real payments are required. This is an independent local provider simulator, not a named payment provider sandbox.

## Run and inspect

```sh
npm test
npm run assurance -- --out ./artifacts/assurance
npm run assurance:verify -- ./artifacts/assurance/report.json
```

Open `artifacts/assurance/report.html`. Both exports use the same normalized report. CI retains only these minimized files for seven days. Local output is unversioned; CI records its checked-out GITHUB_SHA.

1. **Normal purchase:** find `clean / guarded`. One accepted purchase and one delivered report complete the objective. Compare `clean / deny-all`: zero purchases, but useful completion fails.
2. **Lost response:** find `accepted-lost-response / guarded`. The receiver accepts Alpha, its response is lost, and Beta is deferred while exposure remains occupied. Lookup recovers the original submission; the receiver still records one purchase. Compare unguarded: a distinct equivalent purchase exceeds the mandate.
3. **Restart:** inspect `crash-after-accept / guarded` and `crash-before-send / guarded`. A real child process is killed at each fault point; the reopened store reconciles the stable request key. After an authoritative not-found, same-key retry is permitted under the simulator's reliable idempotency contract.
4. **Inspect evidence:** JSON results contain bounded timelines, accepted-purchase counts, observations, original-asset commitment and denominators. The oracle reads the independent receiver's purchases/events before temporary stores are removed. JSON is minimized, not a raw database export.

For direct inspection of both persistent ledgers outside the runner, instantiate `Store` and `SandboxProvider` with distinct local files, call `Store.enqueue`, inject the provider into `DispatchWorker`, and use `store.operation(id)`, `store.kernel.snapshot()`, `provider.records()` and `provider.events()`. The HTTP admission API does not dispatch. Tests demonstrate these calls without introducing a live endpoint.

## How to read the result

There are 45 results: 15 schedules × guarded, unguarded and deny-all. Guarded passes 14/15; `bypass` must fail coverage because MEW cannot govern another tool's purchase. The verifier rejects a fabricated all-green outcome. Provider outage holds capacity after bounded reconciliation. Missing delivery never counts as fulfillment. A fully verified synthetic undelivered refund restores capacity, while cumulative charges and transient peak remain visible. A late observation refresh commits atomically.

Zero eligible completion denominators are NOT_APPLICABLE, not a successful purchase. Signed mandate/revocation, signed delivery, partial refunds and true tenant isolation are NOT_IMPLEMENTED. Comparator crash behavior is scripted; real process kills and same-database process races are exercised in guarded mode. No LLM or additional agent was evaluated.

## Recovery limits

Worker leases fence local writes; receiver deduplication prevents repeated acceptance of the same request. Neither alone promises exactly-once external execution. A pending, unavailable or non-idempotent result stays UNKNOWN and requires operator review. Do not release funds because a lease expired or a timeout elapsed.

Do not put provider credentials into this demo, enable real adapters, reset a store with dispatch history, or call it production-ready. There is no signer, custody, insurer integration, signed supplier receipt or real payment. Hashes identify bytes; they do not authenticate a report or measure insurance risk. Existing root demo behavior is preserved.
