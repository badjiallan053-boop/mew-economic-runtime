# MEW: from agent catalog to operating company

7 October 2026. Assessment of commit 531bc83 and current repository contracts.
This is a product and execution plan, not proof of an autonomous business or a
complete security audit. No customer interviews, model evaluations, paid job or
production recovery drill occurred during this assessment.

## Product decision

Start with one hypothesis: small teams buying an AI-generated research deliverable
need a reliable record of what was requested, what was spent, what was received
and why a retry is safe or unsafe. Offer one bounded research-procurement workflow.
The economic assurance kernel is the distinguishing capability. The company
roster supports delivering that service; customers should manage missions,
results and exceptions rather than configure dozens of agent identities.

Treat the target customer, willingness to pay and channel as unvalidated. Run
five discovery interviews with authorized contacts and one observed prototype
session per willing participant before claiming demand. Record actual behavior,
current alternative, failure cost and willingness to run a pilot; do not infer
validation from compliments. No contacts are authorized by this document.
A paid pilot and sustainable unit economics are subsequent gates, not current facts.

## What the repository establishes

The code supplies deterministic exposure/capacity accounting, durable SQLite
state, fixed company profiles, strict advisory output validation, isolated review
contexts, timeouts that retain uncertainty, and read-only payment evidence
adapters. Handoffs detect byte changes under trusted expected bindings but do
not authenticate senders. The public UI rehearses fixtures and shows assignments.
The private repository has a successful push; Railway source access currently
blocks deploying that latest revision. The prior public simulation remains healthy.

These strengths do not establish model quality, a customer-facing identity system,
a paid worker, reliable merchant delivery, independent model judgment or a company
that can operate without founder intervention.

## Prioritized missing capabilities

Priorities indicate sequencing, not vulnerability severity. Owners below are
existing department responsibilities, not newly activated model agents.

| ID / order | Gap and source evidence | Accountable owner | Next bounded deliverable | Acceptance evidence |
| --- | --- | --- | --- | --- |
| P0-01 | No configured inference; src/company/runtime.mjs accepts a host provider only | Engineering + QA | One read-only model adapter, explicit model revision, validated configuration and bounded request/token budgets | Actual redacted run metadata; malformed JSON, injection, timeout, quota and output-schema tests; no tool or payment permissions |
| P0-02 | Runtime has schema tests but no real-model quality benchmark | QA + Risk | Versioned representative mission cases, expected evidence/abstention, adversarial cases and single-agent baseline | Compare same evidence and cost accounting; human review of critical cases; no cross-mission evidence admitted; report actual results and uncertainty |
| P0-03 | RUNNING/UNKNOWN deliberately have no recovery endpoint | Operations + Engineering | Inspect-only exception view, then reviewed recovery design | Crash/restart drill preserves request ID, policy and reservations; no reset/retry of uncertain effects; operator decision evidence persisted |
| P0-04 | Railway cannot access newly private repository | Operations | Grant existing Railway GitHub app access to this repository and deploy exact tested commit | New deployment SUCCESS and endpoint checks; keep repository private; no additional hosting service |
| P0-05 | Backup/restore and laptop-offline operation not demonstrated | Operations | SQLite-consistent backup procedure, disposable restore drill and incident checklist | Restored immutable contracts, pending states and economic invariants match; record recovery time, artifact location and restore owner |
| P0-06 | Initial product/customer/pricing hypothesis has no discovery evidence | Research + Communications | Interview guide, observed mission journey and decision log | Facts separated from assumptions; ranked pain and falsification evidence; explicit go/change/stop decision |
| P1-01 | Single global operator bearer boundary; public demo has shared process-local quota | Risk + Engineering | Separate customer authentication/session and resource ownership design before multi-tenant routes | Cross-tenant denial, revocation, CSRF/session tests where applicable; secrets remain server-side; distributed/edge limits assessed before scaling |
| P1-02 | Roles UI is a catalog, not customer mission control | Design responsibility: Communications + Engineering | Mission list/detail, result/evidence view and actionable blocked state | Keyboard/mobile usability; explicit fixture/provider mode; specific failure/recovery language; no operator token in browser storage |
| P1-03 | No persisted provider metering/timestamps/billing records | Finance + Engineering | Separate execution journal keyed by mission/task/attempt and immutable provider request ID | Record cost only when metered, otherwise unknown; redacted logs; budget denial before request and account-level provider cap |
| P1-04 | Strict outputs/economic contracts are manually maintained | Engineering + QA | Versioned contract inventory and API description for implemented routes | Runtime validators remain authoritative; compatibility and invalid-payload tests; no fabricated endpoints or automatic breaking migration |
| P1-05 | No dispatch/outbox/lease worker; src/adapters/masumi-collection.mjs observes receipts only | Engineering + Procurement | Durable paid-worker design, then preprod implementation after live setup | Crash after submission reconciles original operation; no double spend; approved signer isolated; exact asset/fee/recipient/quote bindings |
| P1-06 | Receipt confirmation does not establish final delivery or handle chain rollback | Delivery + Risk | Separate deliverable acceptance and chain lifecycle policy | Immutable artifact/merchant binding; partial/refund/dispute/rollback cases; uncertainty retains exposure |
| P1-07 | Skills provenance has mutable upstream references and partial dependency reviews | Knowledge + Risk | Reviewed skill lock manifest and activation checklist | Source commit/digest/license/references/role/capabilities verified; instruction changes reviewed; no runtime download or automatic tool grant |
| P2-01 | MCP/A2A are documented proposals, not implemented transports | Engineering | Implement one transport only after a concrete consumer exists | Exact-version negotiation/conformance, auth, replay, size/redirect and cross-tenant tests; protocol does not create authority |
| P2-02 | No demonstrated repeatable sales/service loop | Communications + Finance | Founder-approved pilot offer, support process and actual contribution-margin report | Authorized outreach only; track paid accepted outcomes and retention; no invented revenue or testimonials |

Do not make the prototype multi-tenant or add payment dispatch merely to complete
a checklist. Implement those boundaries when the selected pilot requires them.
Defer vector databases, additional orchestrators, new blockchains and more roles
until measurements establish a concrete need.

## Skills selected through skills.sh and primary sources

Use directory listings for discovery and actual repositories for review. These
are selected reference candidates, not installed or fully audited dependencies.
Mutable main URLs below are not reproducible pins. No installer ran in this pass.

| Discipline / source | Useful MEW practice | Scope and adoption limit |
| --- | --- | --- |
| Product/strategy: [product-strategy-session](https://www.skills.sh/deanpeters/product-manager-skills/product-strategy-session), [actual SKILL.md](https://github.com/deanpeters/product-manager-skills/blob/main/skills/product-strategy-session/SKILL.md) | Positioning, problem evidence, options and sequenced roadmap | Top-level procedure reviewed; its referenced facilitation/component skill tree not fully reviewed; not running its full workshop or copying its materials |
| Engineering: [TDD](https://www.skills.sh/addyosmani/agent-skills/test-driven-development), [actual SKILL.md](https://github.com/addyosmani/agent-skills/blob/main/skills/test-driven-development/SKILL.md) | Regression cases prove behavior before implementation | Existing local QA reference; prioritize boundary/recovery tests rather than mirroring implementation |
| Backend: [backend-architecture](https://www.skills.sh/we-are-singular/skills/backend-architecture), [actual SKILL.md](https://github.com/we-are-singular/skills/blob/main/skills/backend-architecture/SKILL.md) | Keep transport, use-case, persistence and vendor boundaries explicit | Review candidate; preserve current JavaScript/ESM contracts instead of forcing its TypeScript preference; SKILL.md declares MIT, separate repository license retrieval failed |
| Security: [security-best-practices](https://www.skills.sh/openai/skills/security-best-practices), [actual SKILL.md](https://github.com/openai/skills/blob/main/skills/.curated/security-best-practices/SKILL.md) | Stack-specific review and evidence-based finding prioritization | Top-level and browser reference inspected; backend reference set not fully reviewed; no full audit claimed |
| Frontend/accessibility: [web-design-guidelines](https://www.skills.sh/vercel-labs/agent-skills/web-design-guidelines), [actual SKILL.md](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md), [guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md) | Task clarity, keyboard focus, labels and useful error states | Source review, not a browser usability or accessibility certification |
| Design: [frontend-design](https://www.skills.sh/anthropics/skills/frontend-design), [actual SKILL.md](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) | Purpose-led visual direction, consistent language, responsive and reduced-motion treatment | Review candidate only; its LICENSE.txt and complete package require review before redistribution |
| Integration: local interoperability-review; [MCP builder](https://www.skills.sh/anthropics/skills/mcp-builder) | Typed inputs, bounded artifacts and explicit protocol/capability boundaries | Prior review recorded in INTEROPERABILITY.md; no server adoption or new tool authority |

Skills are procedures. An effective department also needs evidence, a constrained
host, measurable quality and recovery. More skill text can raise cost or introduce
conflicting instructions; select only task-relevant reviewed references. Benchmark
changes before replacing an existing mission policy. The new original local
company-product-delivery procedure is for host planning, not automatic injection
into existing agent contexts.

## Company operating loop

1. Founder sets customer outcome, accepted external actions, total cost ceiling
   and acceptance criteria. Product owner records assumptions and opportunity.
2. Research obtains assigned sources and authorized customer evidence. Knowledge
   records immutable source revisions and separates facts from interpretations.
3. Chief of staff selects a small existing workflow and named deliverable owners.
   Design/engineering compare reuse and alternative solutions before expansion.
4. Engineering produces a bounded diff. QA verifies objective acceptance and failure
   paths. Risk and red team assess the same frozen evidence independently.
5. Trusted host checks authorization, quality and budget. Already authorized routine
   work proceeds; missing authority or unresolved critical evidence stops dependent work.
6. Operations deploys a tested immutable revision, checks health and preserves a
   rollback/restore path. Delivery links accepted artifact to the original mission.
7. Finance records observed spend and accepted outcome cost. Communications uses
   verified claims in approved customer material. Customer feedback becomes the
   next evidence-backed product decision.

Keep this loop visible as one work package, not a swarm transcript. The founder
sees outcome, cost, blocking issue and next decision. The customer sees request,
progress, deliverable, evidence and recourse.

## Data and interoperability design

Retain separate economic SQLite, company SQLite and dedicated MPS PostgreSQL
boundaries. Add execution observations beside company tasks, not into monetary
claims. Do not use the wallet database as a general company database. Use a
versioned artifact catalog plus access-controlled file/object storage when real
artifacts require it; a digest is not access control. Add retrieval/vector indexing
only after measured search failures and deletion/access policies exist.

A future tenant-aware control plane owns identity, mission routing, artifact access
and provider budgets. A separate worker owns approved external effects through a
durable outbox. Existing adapters observe evidence. The UI never constructs a
verified payment or receives signer credentials. Transport interoperability wraps
these boundaries and cannot override them. Private repository access must be
explicit for Railway, future knowledge retrieval and any judge/collaborator.

## Measurements and release sequence

Track accepted deliverables/attempts, evidence coverage, human correction rate,
wrong-action rate, time to accepted outcome, recovery duration and actual cost per
accepted outcome. Compare the multi-role workflow with a single-role baseline.
Lower latency or more tasks completed alone does not prove better decisions.

First release: restore deployment access, add one configured read-only provider,
run quality evaluations and a restore drill, and publish honest mission states.
Second: validated pilot workflow, customer identity and mission interface, signed
or authenticated artifact provenance as required. Third: preprod paid worker and
reconciliation only after credentials/funding and dispatch gates are satisfied.
Expand autonomous authority based on observed performance and a founder-approved
mandate; never because a role or skill declares it can act.

Existing submission hosting authorization is US$10 total. No new paid resource,
model expenditure or spending-cap increase is authorized by this plan. Milestones
are acceptance gates, not delivery-time promises or claims of customer demand.
