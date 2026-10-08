# Agent collaboration audit

Reviewed 8 October 2026 by separate architecture, workflow-test and product/operator reviewers, then reconciled by the lead. This audit distinguishes implemented host handoffs from model behavior. It does not claim live model calls or autonomous operation.

## What works today

- Fixed workflow profiles constrain task assignments; the compact profile uses five roles and six tasks instead of fanning out the 48-role catalog.
- The host persists task attempts and blocks automatic retries after `UNKNOWN`.
- Risk and Red Team receive the same frozen proposal through separate branches. Neither reviewer receives the other's output.
- The compact coordinator now receives the original proposal and both independent reviews. This fixes a real context gap: previously it was told to reconcile the proposal but only received the reviews.
- The compact rehearsal mission ID is versioned forward so previously saved immutable runs are not silently reinterpreted under the changed graph.
- Role assignments carry no wallet or payment authority. Company execution is separate from the MEW economic ledger.
- The public team page and documentation label role configuration and synthetic rehearsal as such.

## What is still missing

| Priority | Gap | Why it matters | Next implementation |
| --- | --- | --- | --- |
| P0 | No typed findings or blocker-resolution contract | A free-text summary plus `ACCEPT` cannot prove that a critical finding was preserved or closed. A reviewer can describe a blocker in prose and still return `ACCEPT`; the host cannot interpret it. | Version the advisory output with findings `{id,severity,evidenceRefs,disposition}` and explicit unresolved blockers. Fail closed when a blocking finding remains. Add conflicting-review and ACCEPT-with-blocker tests. |
| P0 | No actual multi-provider execution | Every task currently uses one injected provider callback. The default provider is synthetic and accepts any task with supplied evidence. The graph demonstrates wiring, not independent model judgment. | Keep the current provider disabled until model quality passes holdout review. Then add host-selected provider adapters per role, fixed model/version metadata, budget and timeout limits, and separate run evidence. Never let model output select its own provider or tools. |
| P1 | No challenge, response and re-review cycle | Independent reviews can surface disagreement, but the one-pass plan cannot ask an owner to address it and then verify the exact revision. | Add a bounded revision round: frozen proposal → independent reviews → implementation response bound to findings → both reviewers re-check the exact revised artifact → coordinator records unresolved items and human next action. Cap rounds and stop on UNKNOWN. |
| P1 | Evidence is shared too broadly and lacks provenance | Each task receives the full brief and evidence list; prompt language about assigned evidence is not enforced by the host. Evidence records have no capture time, digest, rights or supersedes link. | Define task-level evidence IDs and redact context at host assembly. Attach capture time, source revision/digest, claim mapping, rights/retention state and freshness. Reject out-of-scope references. |
| P1 | No operator work queue or run trace on the hosted site | `/api/company` serves the registry only. There is no hosted mission execution/history route, named human owner, due date, approval request, or next-action queue. The page is a role catalog, not an interaction trace. | First build a synthetic, read-only trace UI over a saved fixture. Show role, input handoff, output, evidence, state, blocker, owner and next action. Only later consider an authenticated, metered runtime endpoint. |
| P2 | No useful outcome measurement | Synthetic completion cannot show customer value or model utility. Provider cost, latency, disagreement rate, corrections, evidence coverage and accepted deliverables are not linked in one run record. | Freeze a benchmark and independent holdout; measure base-model retrieval and contract/semantic quality. For a consenting pilot, record accepted artifact, rework, time saved, cost and customer acceptance. |
| P2 | Marketing/clipping remains a rehearsal | The campaign path creates synthetic outlines, not authorized clips. Rights, approved source time ranges, exact rendered artifact hashes, publication IDs and later campaign outcomes are not connected. | Gate the workflow on creator/source rights and human approval; bind reviews to exact media and version hashes; connect post/campaign IDs and measured analytics only after permission. Keep production, ad and creator budgets distinct. |

## How the agents should interact

Use explicit, persisted handoffs rather than free-form peer chat. Each handoff must name its source task, artifact revision, evidence IDs, recommendation, structured findings, unresolved items and required consumer check. The host—not an agent—decides which task may run next. Risk and Red Team stay independent until both reviews are frozen. The coordinator sees the proposal and both reviews, records the disagreement, and cannot erase an unresolved blocker. A producer may respond to a finding, but reviewers must inspect the new artifact revision independently. A human owns residual-risk acceptance and any external action.

The current compact graph now demonstrates only the first portion of this pattern: evidence → proposal → two independent reviews → coordinator context. The response/re-review cycle and structured blocker gate are not implemented yet.

## Recommended sequence

1. Add versioned structured findings and fail-closed blocker enforcement with adversarial tests.
2. Add one bounded revision/re-review cycle while preserving frozen independent reviews.
3. Render the persisted fixture as a clear, read-only handoff trace on the public team page; label it synthetic.
4. Resolve the existing model semantic-quality gate against a blinded independent holdout before enabling providers.
5. Add authenticated operator execution only after private database connectivity, per-role provider configuration, cost ceilings and recovery drills pass.
6. Connect customer artifacts or clip publishing only after consent, rights, exact-byte review and human approval are in place.

Do not add more agent roles, MCP/A2A transports, or broad tool access to address these gaps. The limiting factors are interaction semantics, evidence scope, measured model quality and operator controls—not role count.

## Verification boundary

The code change accompanying this review makes the compact coordinator's dependencies explicit and tests the handoff contents. It does not change model availability, payment state, the public company API or the hosted workflow. In particular, successful synthetic review output remains fixture evidence only.
