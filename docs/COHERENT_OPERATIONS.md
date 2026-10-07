# Coherent company operations

Checked 7 October 2026. Company roles are a capability catalog, not an instruction to run 48 agents for every task. Model access remains pending; fixture runs validate orchestration and cannot establish autonomous company operation, paid execution or model quality. Existing MEW accounting, payment evidence and module contracts remain authoritative.

## Run one work package

The founder supplies the objective, acceptance criteria, deadline, approved external actions and cost ceiling. The chief of staff proposes a workflow; the trusted host selects the fixed profile and its necessary specialists. The host selects a fixed, reviewed profile with only the specialists necessary for that work package; it does not automatically fan out to all three specialists per department. A future custom profile requires a reviewed host change, not a model-generated delegation. Preserve the full legacy 48-role graph as an explicit compatibility/rehearsal profile, never the routine default.

Each work package records a stable mission ID, selected profile and role IDs, mandate revision, immutable evidence references, owners, deliverable path/digest, acceptance checks, unresolved blockers and next action. A change to mandate, provider, recipient, asset or budget goes back to the founder. The chief of staff can sequence approved work but cannot create economic authority. Existing user authorization remains valid; routine reversible engineering does not need redundant approval.

## Workflow RACI

R = responsible producer; A = accountable decision owner; C = consulted independent reviewer; I = informed recipient. The founder is A for mandates and external authority. A department lead may own delivery of an already approved package but cannot increase its permissions. Risk and red team receive the same frozen input separately and do not see one another's conclusions before submitting.

| Profile / stage | R | A | C | I | Measurable deliverable and stop condition |
| --- | --- | --- | --- | --- | --- |
| Discovery: scope | Chief of staff | Founder | Research | Communications | One question, success criterion and source budget; stop if scope is undefined |
| Discovery: sources and synthesis | Knowledge + Research | Research lead for artifact | Needed repository/freshness specialist only | Chief of staff | Source/version/claim matrix; every technical claim traced or marked unknown |
| Discovery: challenge | Risk + Red team independently | Founder for accepting recommendation | Specific authority/injection specialist if justified | Research | Findings, severity, evidence and resolution owner; unresolved critical gap blocks recommendation |
| Discovery: brief | Communications | Founder for publication | Research | Chief of staff | Evidence-linked decision brief with options and next action; no external publication by the advisory runtime |
| Release: implementation | Engineering | Engineering lead for diff | Needed contract/migration specialist | Chief of staff | Bounded diff preserving contracts, actual commands/results and rollback notes |
| Release: validation | QA | QA lead for acceptance recommendation | Risk + Red team independently | Engineering | Meaningful tests pass; unresolved correctness/security failure blocks release |
| Release: deployment plan | Operations | Founder for authorized external scope | QA + Finance cost reviewer | Chief of staff | Exact revision, configuration, restore/shutdown owner and health checks; missing credentials or scope block external action |
| Paid-readiness: evidence | Knowledge | Knowledge lead for readiness packet | Needed chain/provider specialist | Chief of staff | Matching deployed API/source revision and explicit prerequisite list |
| Paid-readiness: quote review | Procurement | Founder for commercial mandate | Risk + Red team independently | Finance | Exact candidate/resource/recipient/asset/price binding assessment; unknown quote fields block readiness |
| Paid-readiness: funding and operations | Finance + Operations | Founder | Needed funding/reconciliation specialist | Communications | Distinguish hosting cost, model cost, escrow funds and seller receipt; unresolved setup yields BLOCKED readiness, never a fabricated paid job |
| Full legacy 48 | Existing lead/specialist assignments | Founder for mandate | Existing independent review branches | Chief of staff | Compatibility rehearsal only; output explicitly identifies synthetic/provider execution and profile |

Typical selected leads: discovery = scope, knowledge, research, risk, red team, communications; release = scope, engineering, QA, risk, red team, finance, operations, communications; paid-readiness = scope, knowledge, procurement, risk, red team, finance, operations, communications. This is task routing, not a requirement to invoke all listed roles when a narrower question suffices. Profile task IDs and permissions must be validated by the runtime, not chosen from an untrusted source document.

## Evidence and recovery

The durable record should separate workflow progress from economic state. Mark tasks PLANNED, RUNNING, ACCEPTED, REJECTED or BLOCKED, with reason and evidence; a human request also needs its own identity and pending/resolved response. Advisory acceptance is not spend authorization. Persist actual provider execution metadata separately from fixture output. Record latency, role count, model/token cost when metered, accepted deliverables and unresolved findings; unknown cost is unknown, not zero.

For a future live host, checkpoint the approved plan and result references before advancing. On restart verify mandate/profile/source revisions, recover pending requests and inspect uncertain external operations. Never repeat a purchase, submission or deployment merely because the last model turn or workflow checkpoint is missing. Financial effect IDs and the MEW ledger remain the deduplication authority; no timeout releases exposure. No new checkpoint engine or payment worker is implemented by this document.

A founder gate applies when scope or authority is missing, an approved ceiling would be exceeded, credentials/funding are absent or a material unresolved finding prevents the agreed outcome. Gates should show a concrete artifact, blocker and exact decision needed. They must not repeatedly ask for already authorized steps. Failed or unknown evidence stops dependent work while independent local work can continue.

## Definition of done

A work package is complete only when its named artifact exists, acceptance evidence is attached, reviewers' blocking findings are resolved or the founder explicitly accepts a documented residual risk within authority, and operational claims match observed execution. Report selected roles and actual model/tool runs rather than claiming the whole catalog ran. For release, include verified revision and health evidence. For paid-readiness, completion means a verified setup checklist; it does not mean a payment occurred.

## Reviewed external patterns; reuse before installation

| Official/source reference | Reviewed lesson | Decision, pin and license |
| --- | --- | --- |
| [Microsoft Agent Framework workflows](https://learn.microsoft.com/en-us/agent-framework/journey/workflows), [repository](https://github.com/microsoft/agent-framework) | Explicit graphs fit fixed handoffs; choose complexity to match the task | Reference architecture only; no Python/.NET framework dependency added to this Node runtime. [MIT license](https://github.com/microsoft/agent-framework/blob/main/LICENSE) inspected. Current commit lookup was inaccessible; no exact source pin or SDK compatibility claimed. Pin a tested release before future adoption. |
| [Microsoft checkpoint documentation](https://learn.microsoft.com/en-us/agent-framework/workflows/checkpoints) | Capture executor/message/request state and choose storage with the required durability | Reuse recovery concepts; existing MEW SQLite does not thereby become Agent Framework checkpoint storage. In-memory state cannot establish restart durability. Docs inspected on this date; mutable documentation has no immutable pin here. |
| [Microsoft human-in-the-loop documentation](https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop) | Pending external requests can survive checkpoints and be surfaced on resume | Use explicit pending decisions, scoped to founder authority; no implied automatic payment retry or blanket approval. Reference-only. |
| [skills.sh writing-plans listing](https://www.skills.sh/obra/superpowers/writing-plans), [actual SKILL.md](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md) | Bounded tasks with exact owned files and acceptance commands | Reviewed planning procedure; not installed or invoked as a whole. Preserve MEW's existing ownership and plan location. [MIT license](https://github.com/obra/superpowers/blob/main/LICENSE) inspected; source SHA unavailable, so no snapshot vendored. |
| [skills.sh planning-with-files listing](https://www.skills.sh/othmanadi/planning-with-files/planning-with-files), [actual SKILL.md](https://github.com/othmanadi/planning-with-files/blob/master/skills/planning-with-files/SKILL.md) | Separate task plan, findings and progress; one shared-plan owner with workers on assigned artifacts | Relevant sections inspected, including shell hooks and explicit session-history boundaries. No hooks, scripts or session-history access installed/activated; scripts/references not fully audited. [MIT license](https://github.com/othmanadi/planning-with-files/blob/master/LICENSE) inspected. Reported metadata version 3.23.0 is not a commit pin. Reuse the original concepts manually. |

The Microsoft framework and planning packages are knowledge references, not proof of integration. No outside code is copied in this contribution. For any later adoption, obtain an immutable commit/release and file digest, review dependencies and referenced scripts, preserve license notices and test compatibility before deployment. Skills.sh rankings and audits do not replace source review. Existing reviewed Cardano/Masumi source pins remain in INSTALLATION.md and COMPANY_KNOWLEDGE.md; do not update them merely to make a larger tool catalog.

YouTube knowledge intake stays governed by COMPANY_KNOWLEDGE.md: inaccessible transcripts are marked unavailable, never imagined. Source-backed contracts and observed live evidence take precedence over video descriptions. Missing model credentials remain an execution blocker; adding roles, databases or frameworks cannot solve that credential gate.

## Shipped fixed profiles

| Profile | Leads | Specialists | Total tasks | Delivered by the synthetic CLI |
| --- | --- | --- | --- | --- |
| discovery (default) | 6 | 7 | 13 | Evidence and decision brief workflow |
| release | 8 | 13 | 21 | Product/release review workflow |
| paid-readiness | 8 | 12 | 20 | Funding, quote-binding and recovery review workflow |
| full | 12 | 36 | 48 | Explicit full-company rehearsal |

```sh
npm run company:rehearse -- data/discovery.sqlite discovery
npm run company:rehearse -- data/release.sqlite release
npm run company:rehearse -- data/paid-readiness.sqlite paid-readiness
npm run company:rehearse -- data/full.sqlite full
```

These are synthetic advisory runs, not real deployment or paid-model execution.
The constructor `CompanyRuntime(path, {workflow})` selects a fixed graph. Its
default remains full for API compatibility; the CLI/UI default is discovery.
Existing full mission IDs, tasks and policy fingerprint remain compatible.
Another profile cannot reuse or reinterpret the same saved mission.

The runtime currently persists mission identity, supplied evidence, policy digest,
task states and advisory outputs. The richer work-package record described above
is an operating template; signed mandates, artifact digests, timestamps and real
provider billing evidence are not supplied by this synthetic company journal.

Verification: 83 tests pass, build passes, discovery completes 13 synthetic tasks,
and the previous full-company journal replays unchanged. No local Ollama
executable/server was found, so no credential-free local inference was claimed.
