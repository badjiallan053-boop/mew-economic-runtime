# Engineering research and agent procedures

Reviewed 9 October 2026. Sources below informed the implementation handoff; no external implementation or skill text is vendored. Recommendations are design inferences, not evidence that MEW is novel, independently audited or production-ready.

## YouTube discovery and evidence limits

| Talk | Retrieval status | How it is used |
| --- | --- | --- |
| [How We Build Effective Agents: Barry Zhang, Anthropic](https://www.youtube.com/watch?v=D7_ipDqhtwk) | Title/description discovered; opened page returned no usable transcript | Reading lead; no timestamp, quotation or claim of watching |
| [Building more effective AI agents: Anthropic](https://www.youtube.com/watch?v=uhJJgc-0iTQ) | Title/description discovered; opened page returned no usable transcript | Reading lead on tools and agent orchestration, not implementation evidence |

Primary written sources carry the engineering requirements:
- [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents). Application outcomes and environment state matter; balanced tasks and isolated runs avoid misleading success. MEW consequence: use an independent provider oracle, useful-completion cases and a deny-all control.
- [Temporal: standalone activities and idempotency](https://learn.temporal.io/tutorials/python/standalone-activities/). Receiver idempotency is required alongside retries for effectively-once side effects. MEW consequence: persist one request identity and reconcile unknown results; a lease is insufficient.
- [Temporal retry policies](https://github.com/temporalio/documentation/blob/main/docs/encyclopedia/retry-policies.mdx). Deterministic replay and retryable external work are separate responsibilities. MEW consequence: do not put external network calls in SQLite transactions.
- [AI Verify Foundation assurance sandbox](https://assurance.aiverifyfoundation.sg/). Context-specific tests, realistic failure data and intermediate pipeline inspection are emphasized. MEW consequence: provide bounded, reproducible traces and explicit missingness.
- [Event: AI Assurance Exchange](https://luma.com/g42u6qi8). Enterprise deployment, testing and oversight are relevant discovery topics. Attendance or listed speakers do not establish buyer interest or endorsement.

## GitHub implementations reviewed

| Repository and inspected material | Relevant pattern | Decision |
| --- | --- | --- |
| [temporalio/samples-typescript](https://github.com/temporalio/samples-typescript), README blob e5d49303bed820880efa3fa3238898b58945a431 | State, cancellation, activity boundaries, durable agent orchestration examples | Reference for semantics. Do not add Temporal as a dependency for this bounded Node/SQLite prototype |
| [floritange/AgentChaos](https://github.com/floritange/AgentChaos), README blob 10a2bab8a9de2500e6deae31d69ee4ad4e4c28bd | Controlled transport faults and normal/faulted trace comparison | Adapt the approach to economic provider boundaries; do not add Python or record raw model prompts |
| [vercel-labs/skills](https://github.com/vercel-labs/skills), README blob d8c490ed14299dec390728c6d17d0f6c02933a16 | Project-scoped skills, selected installs and Codex support | Discovery/reference layer. No CLI or global installation was executed |

These are inspected documentation blobs, not repository audits. Blob hashes identify inspected bytes, not runnable dependency versions. Before copying any source later, inspect the actual implementation, pin its COMMIT, review license/NOTICE and preserve required attribution. This task requires no copied third-party code.

The earlier claim that a test harness is entirely new is too broad. Existing evaluation and chaos frameworks cover related territory. The proposed focus is economic equivalence, independent accepted-effect accounting and safe recovery, with scope-limited tests.

## skills.sh selections

Reviewed directory listings and full GitHub SKILL.md sources for:
- [find-skills / vercel-labs/skills](https://skills.sh/vercel-labs/skills/find-skills): inspected blob a41bdd074bb587afd861332cf2f473f3154de4d7.
- [systematic-debugging / obra/superpowers](https://skills.sh/obra/superpowers/systematic-debugging): inspected blob 095d194ac041502905f15b01d22d294fb94db8b2.
- [verification-before-completion / obra/superpowers](https://skills.sh/obra/superpowers/verification-before-completion): inspected blob 7d45333cc4a49c57a80df6c1fe2fa777a207afbc.

The existing local assurance-engineering skill remains authoritative for task procedure. The external sources are optional reading; no external pack was installed or executed. Popularity and directory audit labels are discovery signals, not a security proof.

Operational application, in original wording:
1. Pick procedures that fit the actual Node/SQLite task; avoid framework migration.
2. Reproduce the fault and inspect both runtime and receiver state.
3. State one causal hypothesis; test it with a minimal change.
4. Keep failure injection in deterministic test boundaries, never production credentials.
5. Run the exact verification command; inspect exit code and every relevant result.
6. Report what was exercised and what remains unimplemented.

These procedures improve the work process. They do not create new model capabilities, independent agents or a verified financial authority. No agent/model is recorded as having run unless it actually did.

## Current source observations driving scope

Baseline: dca6a9a7f530daf2de1fc512ebcf95610450b204.
- agent-assurance/src/server/store.mjs persists a single kernel snapshot, transactionally, but has no outbox or worker lease.
- agent-assurance/src/server/server.mjs exposes admission, evidence and verified observation; no dispatch executes a purchase.
- agent-assurance/src/core/evidence.mjs uses a minimized export and explicit source classes; retain those boundaries.
- agent-assurance/src/adapters/web2.mjs uses a generic HMAC shape, not any named provider's protocol. Do not advertise compatibility with Stripe or another processor.
- agent-assurance/docs/ASSURANCE_CONTRACT.md already specifies durable dispatch, signed delivery and identity as future gates. This handoff operationalizes a narrow part of that contract.
- root .github/workflows/ci.yml runs only root tests/build. The subproject's nested workflow does not establish root-repository CI coverage.

## Honest product claim after implementation

If all new checks pass, say that the specified controls passed the frozen simulated scenarios under documented assumptions. Report provider idempotency dependence, unresolved outcomes, bypass gaps and unsupported identity/delivery controls. A simulation does not establish production loss reduction, regulatory certification or insurance coverage.
