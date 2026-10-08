---
name: assurance-engineering
description: Build and review assurance ledger, evidence adapters and presentation workflows.
---

# Assurance engineering procedure

Read AGENTS.md, SPEC.md and docs/ASSURANCE_CONTRACT.md. State the owned files and the acceptance condition. Assign independent work to engineers with distinct file ownership when a team is requested. Report the agents actually used.

1. Keep monetary arithmetic in integer minor units per asset. Bind objective ID and semantic key to the principal mandate.
2. Reserve capacity and durable state atomically before external dispatch. Identical authorization replay must not dispatch twice.
3. Treat missing evidence as unknown. Retain exposure until verified release, failure or refund; settlement does not prove delivery.
4. Verify financial evidence server-side. Never trust browser `verified` flags, client-supplied payment amounts or unbound transaction hashes. Keep credentials off the frontend.
5. Add meaningful failure-path tests for concurrency, evidence conflict, wrong recipient/amount and replay. Run `npm test` and record the real result.
6. Use official source repositories and API specifications to verify integration interfaces. Do not invent endpoints. Record unavailable transcripts or credentials as limitations.
7. Label all fixtures and counterfactuals simulation. Distinguish repository publication, static demo deployment and live backend operation.
8. Finish with a runnable demo, updated documentation and known production limits. Do not claim payment execution or cryptographic verification unless exercised and evidenced.
