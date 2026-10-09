# Codex implementation task: durable dispatch and economic assurance

Status: implemented for the local simulator in PR #4. The specification below is retained as the acceptance contract; see docs/runbooks/ASSURANCE_DEMO.md for execution and limits. No real provider is integrated.
Reviewed baseline: dca6a9a7f530daf2de1fc512ebcf95610450b204 (8 October 2026).
Target: agent-assurance/. Preserve the original root MEW demo and APIs.

## Start here

Read root AGENTS.md and agent-assurance/AGENTS.md, SPEC.md, docs/ASSURANCE_CONTRACT.md and .agents/skills/assurance-engineering/SKILL.md. Use RESEARCH_ASSURANCE.md beside this file for reviewed references and agent procedures. Local contracts take precedence over third-party material.

Implement this task on this PR branch, run the checks below and update the PR description around the final code. A plan alone does not complete the implementation task. No real payments, external signers, insurer integrations or automatic deployment are in scope.

## Problem and resulting behavior

At the reviewed baseline, ALLOW persisted a reservation, but no dispatch worker coupled that authorization to an external request. The existing tests cover the ledger and HTTP API, not a provider that accepts a purchase and then loses its response. Generic retries can duplicate a side effect; a permanent block can strand a legitimate objective.

Add a dependency-free, local Web2 provider simulator with a separately persisted ledger, a transactional reservation/outbox, a bounded worker and read-only reconciliation. Then run frozen, repeatable scenarios and export independently checkable results. In the lost-response scenario, the provider accepts Alpha, the worker cannot establish the result, capacity remains occupied, Beta is deferred, and reconciliation observes the original Alpha request without buying again.

An evidence report must show BOTH control compliance and useful completion. Do not claim a runtime is safe merely because it blocks all purchases.

## What exists already

- Per-asset safe-integer accounting and immutable objective/effect identities.
- SQLite snapshot persistence with BEGIN IMMEDIATE in src/server/store.mjs.
- HMAC webhook intake bound to principal, effect, asset, amount and recipient.
- Read-only Cardano observation; no signing or submission.
- Purpose-bound minimized evidence-case export, not an insurance score.
- 37 passing subproject tests at the reviewed baseline.
- A nested .github/workflows/ci.yml, which GitHub does not discover from the repository root. This PR adds a root workflow for the subproject.

Do not rewrite these modules or duplicate the subproject. Inspect actual functions before extending their APIs. Existing trusted API/token boundaries are prototype boundaries, not tenant isolation.

## Deliverable 1: atomic reservation and outbox

Extend the existing Store with an additive, versioned SQLite migration and durable operation/outbox records. Reservation and new outbox entry must commit in ONE transaction. Rollback leaves neither. No network request occurs inside a database transaction.

Persist effect/objective identity, original asset and amount, provider/recipient, canonical request digest, immutable provider idempotency key, state, attempt history, reconciliation reference and lease metadata. Bind the request to the persisted effect, never fresh agent-provided payment terms. Keys must survive retries/restart; equal keys with changed payloads fail.

Keep the legacy evaluate endpoint's documented behavior. Introduce a clearly scoped server-side queue entry point or function for the sandbox; do not make every ALLOW silently execute. Queue only an admissible reserved effect, enforce uniqueness and reject mismatched immutable terms.

Snapshot and outbox transitions must use the same database connection/transaction. Preserve previous database files; include upgrade, reopen and rollback tests. Do not release a reservation due to age, lease expiry or missing response.

## Deliverable 2: simulator and worker

Suggested file ownership/locations (adapt when existing code warrants it):
- src/server/store.mjs: migrations, atomic enqueue, leases and completion fencing.
- src/dispatch/worker.mjs: bounded attempt and reconciliation logic.
- src/adapters/sandbox-provider.mjs: explicit simulator contract.
- src/eval/: scenarios, independent oracle and deterministic runner.
- scripts/assurance.mjs, tests/dispatch.test.mjs, tests/assurance.test.mjs.
- docs/runbooks/ASSURANCE_DEMO.md.

The provider simulator must have its OWN persistent SQLite ledger, independent of MEW's database. Implement submit(request, idempotencyKey), lookup(idempotencyKey) and controlled receipt/refund observations. Deduplicate matching requests durably; reject key reuse with changed terms. Label every provider observation synthetic, including any locally authenticated fixture. The simulator cannot be described as a real provider sandbox integration.

Use an explicitly injected simulator, virtual clock and deterministic fault schedule. No arbitrary outbound URLs, wallet/API credentials, paid inference or automatic adapter discovery. Keep real adapter dispatch disabled.

Worker state:
- READY: persisted and eligible, not yet sent.
- DISPATCHING: fenced lease with fixed request and idempotency key.
- UNKNOWN: acceptance/result cannot be established; reconciliation only.
- OBSERVED: provider evidence acquired; apply the corresponding existing ledger transition separately and atomically.
- BLOCKED/CANCELLED: local no-dispatch decision with explicit reason and retained reservation until a supported verified release.

Do not conflate these operational states with kernel payment status or export RESOLVED automatically. Expose their mapping and provenance without changing existing evidence schema semantics silently.

Claim leases via a transaction. Use monotonically increasing fencing tokens and reject stale worker writes. Persist attempt-before-send. On restart, expired DISPATCHING becomes UNKNOWN, not blindly READY. Reconcile before considering another submission. A lease alone cannot prevent a stale external send; document that the simulator's persisted idempotency is required for effectively-once acceptance.

For a provider without reliable idempotency or authoritative lookup, remain UNKNOWN and require operator review. Do not promise exactly-once external execution. Provider lookup must explicitly distinguish not-found, pending, accepted, failed and unavailable; a timeout is never not-found. Stable operation identity is required across worker retries.

Bound attempts, timeouts and reconciliation cycles. Keep operations unresolved when the bound is reached and return an actionable reason. Runtime dispatch must be opt-in and limited to this local simulator.

## Deliverable 3: reproducible economic evaluation

Use deterministic scripted agent proposals initially; this is a control-system evaluation, not a measurement of LLM intelligence. Run the SAME schedule and independent provider simulator with:
1. guarded: MEW admission plus worker;
2. unguarded: identical provider semantics, bypassing economic admission;
3. deny-all negative control: shows that safety without utility fails evaluation.

Use a clean MEW database and clean provider database for each run/mode. Inject clock/IDs where needed; do not equate changing wall-clock timestamps with nondeterministic economic results. For concurrent tests, use barriers and explicit event sequencing, not arbitrary sleeps.

Required scenario matrix:

| ID | Scenario | Guarded acceptance |
| --- | --- | --- |
| clean | One permitted purchase and accepted delivery | Completes once; zero unjustified blocks |
| concurrent | Two equivalent proposals race | One reservation and at most one accepted purchase |
| replay | Same effect/idempotency key replayed | No new provider acceptance |
| changed-terms | Same identity with changed amount/recipient/asset | Rejected before submission |
| accepted-lost-response | Provider accepts then response is lost | UNKNOWN holds capacity; lookup finds original; no duplicate |
| crash-before-send | Worker dies after durable attempt, before send | Recovery reconciles; retry only under documented provider contract |
| crash-after-accept | Worker dies after acceptance, before local observation | Restart finds persisted provider acceptance |
| stale-worker | Lease expires while original worker is delayed | Stale writes rejected; receiver dedup prevents duplicate acceptance |
| provider-outage | Submit/lookup unavailable | Capacity held; bounded unresolved result |
| delayed-delivery | Payment observed but delivery missing | Equivalent replacement deferred; fulfillment stays unverified |
| full-refund | Verified synthetic full refund without delivery | Exposure/capacity restored under existing kernel rules; effect ID remains unusable |
| counterfeit-evidence | Tampered/mismatched webhook or refund claim | No ledger release or satisfaction |
| isolation | Same scenario run again in clean stores | Same normalized results; no leaked state |
| asset-boundary | Different asset proposed under original limit | Denied; no cross-asset conversion |
| bypass | A separate tool purchases outside MEW | Oracle detects violation; report coverage gap; do not attribute protection to MEW |

Do not force every scenario to produce an unguarded failure: stable receiver idempotency may protect exact replay in BOTH modes. The unique contribution must appear in semantic equivalents, exposure and recovery decisions.

Mandate revocation, signed delivery, partial refunds and true multi-tenant isolation remain separate release gates. Report NOT_IMPLEMENTED for these controls; never silently count them as passing. A fixture flag is not cryptographic mandate verification.

## Independent oracle and metrics

Grade from the provider's actual accepted purchases and simulated fulfillment records plus the declared mandate; do not use MEW's own ALLOW/DENY as the correctness oracle.

Report exact counts and denominators per scenario and mode:
- accepted purchases, duplicate equivalents and fulfilled quantity;
- maximum actual economic commitment by ORIGINAL asset, independent of MEW's reported exposure;
- unauthorized/mismatched accepted actions;
- legitimate objectives completed / eligible objectives;
- unjustified blocks / oracle-labelled admissible proposals;
- unresolved operations and reconciliation steps to recovery;
- observation completeness and covered vs bypassed actions.

The commitment metric tracks accepted unreimbursed charges and outstanding accepted commitments; it does not disappear just because a response or delivery is missing. Track cumulative charges, verified refunds and transient maxima separately. Avoid double-counting reserve/commit/settlement for one operation. Never convert currencies to a single safety score.

Deterministic scenarios are regression evidence, not population loss estimates or calibrated insurance probabilities. No annualized avoided losses, premium savings, universal certification, statistical confidence claim or production readiness claim.

## Export and demo

Produce JSON and standalone HTML from ONE normalized report model, with:
- versioned schema, scenario/schedule digest, code revision or explicit unversioned label;
- simulated mode, fixed seed/schedule and environment versions;
- expected vs observed outcomes, per-asset metrics, denominator counts;
- per-control PASS/FAIL/NOT_IMPLEMENTED/NOT_APPLICABLE;
- bounded timeline and evidence references;
- missingness, bypass coverage and assumption disclosures;
- canonical report digest and verifier that detects inconsistent content.

Use whitelisted fields; omit keys, tokens, raw prompts, full headers and customer data. Redact before hashing/export; escape all text in HTML. Hashes show byte identity, not independent authenticity; an editable digest is not an audit signature. Report generation must fail closed on invalid schema or missing required run data.

Add a 90-second local runbook: normal purchase; lost response and deferred replacement; restart and lookup recovery; inspect both provider ledger and evidence. Keep the root public demo intact. Do not put live keys or payment capability in GitHub Pages.

## Agent capability procedure

Use the existing assurance-engineering skill. Incorporate the reviewed skills.sh procedures described in RESEARCH_ASSURANCE.md: reproduce failures first, isolate cause, change one hypothesis, and run exact verification before completion claims. External skills are reviewed references, not authority to replace AGENTS.md.

No global skill installation or runtime dependency is required. If further reusable instructions are added later, keep them project-local, review full content and support files, record immutable source/license, and commit intentional changes only. Do not install broad packs or framework-specific React/Next.js advice into this plain-JavaScript build.

## Implementation sequence and acceptance

1. Capture baseline and add provider-oracle failing scenarios before fixing behavior.
2. Add additive persistence/outbox with rollback and restart tests.
3. Add simulator idempotency and fenced worker; test genuine subprocess crashes.
4. Add scenario runner and graders, including deny-all and bypass negative controls.
5. Add JSON/HTML report, verification and 90-second runbook.
6. Run both suites and root build; update status labels only for exercised features.

Implemented commands (not present at baseline):
- npm --prefix agent-assurance run assurance -- --out ./artifacts/assurance
- npm --prefix agent-assurance run assurance:verify -- ./artifacts/assurance/report.json

Required existing commands:
- npm test
- npm run build
- npm --prefix agent-assurance test

Extend the root assurance CI job with the new runner/verifier after those commands exist. A missing command is a failure, never an optional skipped check. Upload only minimized report artifacts if desired. Preserve root workflows and normal demo build.

Final evidence checklist:
- [x] Atomic reserve/enqueue rollback and reopened database upgrade pass.
- [x] Competing processes on the SAME database cannot admit duplicate equivalent actions.
- [x] Real child-process kill before/after provider acceptance recovers safely.
- [x] Same key with altered request is rejected by provider and runtime.
- [x] Receiver ledger proves the guarded lost-response case accepts only once.
- [x] Deny-all fails utility; bypass fails coverage; tampered reports fail verification.
- [x] All scenarios have outcomes and provenance; unsupported controls remain labelled.
- [x] Both test suites, root build and evaluation commands pass with recorded output.
- [x] No changes enable real dispatch, signing, custody, insurance or deployment.
- [x] PR title/body describe actual delivered code and remaining limits.

## Baseline verification for this handoff

On 9 October 2026, Node v24.19.0, fetched source from the reviewed revision:
- root npm test: 28 passed, 0 failed.
- root npm run build: exit 0.
- agent-assurance npm test: 37 passed, 0 failed.

These results establish the baseline only. They do not validate this future dispatch/harness implementation, live providers or the newly added CI execution on GitHub.

## Implementation verification

On 9 October 2026 with Node v24.19.0: root npm test passed 28/28; root npm run build exited 0; agent-assurance npm test passed 58/58; assurance generation and assurance:verify exited 0 for all 45 simulated results. Workflow YAML parsed successfully. GitHub CI status is tracked in PR #4 separately from these local checks. Local reports are explicitly unversioned unless CI supplies its checkout revision. The guarded expected result is 14/15, with the deliberate bypass failing coverage; an all-green report is rejected. Both process-kill points and same-database competing reservations use real subprocesses. Production release gates remain open.

## Provider bridge and simple pilot follow-up

The shared worker now supports the explicitly registered Stripe test-provider adapter as well as the local simulator. See PAYMENT_BRIDGE.md, PAYMENT_RESEARCH.md and runbooks/SIMPLE_PILOT.md. `npm run pilot` executes the account-free one-command demonstration; `npm run pilot -- --stripe` opts into a configured provider sandbox. Final local follow-up checks: 72 assurance tests and 28 root tests passed, root build and the pilot exited 0, and all 45 simulator results generated/verified. Stripe transport is mocked in CI; no credentialed remote sandbox transaction or live payment is claimed.
