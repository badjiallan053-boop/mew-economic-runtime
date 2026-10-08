# MEW company operating model

Status: configured roles, system prompts and runnable advisory orchestration. The shipped CLI uses synthetic output; no model agents or tools are activated. The existing deterministic kernel and module contracts remain authoritative. The hosted rehearsal is distinct from a real paid job. Follow SPEC.md, AGENT_COMMERCE.md and MASUMI_SETUP.md for current boundaries.

The company can cover a full product lifecycle with twelve roles but should run only the roles needed for the current work package. A single coordinator hands off evidence-backed tasks; independent risk/security reviews do not consume one another’s conclusions. No model agent is a treasury or wallet operator.

| Role / prompt | Specific assignment | Handoff | Permitted host capability when activated |
| --- | --- | --- | --- |
| [Chief of staff](../prompts/company/chief-of-staff.md) | Sequence approved work, owners, deadlines and blockers | Work packages with acceptance checks | Read project status; enqueue scoped approved work |
| [Research](../prompts/company/research.md) | Evidence-backed candidate selection | Candidate IDs and findings | Read supplied evidence |
| [Procurement](../prompts/company/procurement.md) | Compare quotes in trusted mandate | Candidate/quote proposal | Read quotes; no dispatch |
| [Knowledge](../prompts/company/knowledge.md) | Official source, repository and transcript inspection | Claim/source/revision matrix | Read allowlisted public sources; no arbitrary code execution |
| [Finance](../prompts/company/finance.md) | Budget and exposure observations | Cost assumptions and missing evidence | Read immutable ledger snapshot |
| [Engineering](../prompts/company/engineering.md) | Implement one owned work package | Diff and actual validation results | Scoped workspace edits and local tests |
| [Risk](../prompts/company/risk.md) | Independent merchant and economic review | ACCEPT/REJECT/ABSTAIN plus evidence | Read immutable mandate and candidate evidence |
| [Red team](../prompts/company/red-team.md) | Independent adversarial review | Finding/fix/check | Dedicated local tests only |
| [QA](../prompts/company/qa.md) | Review engineering evidence | Acceptance recommendation | Read artifacts and actual test results |
| [Operations](../prompts/company/operations.md) | Release, recovery, cost and observability | Release evidence and rollback | Explicitly scoped deployment tools after release gate |
| [Delivery](../prompts/company/delivery.md) | Artifact quality against agreed criteria | Acceptance recommendation | Read artifact; no ledger claims |
| [Communications](../prompts/company/communications.md) | Decision explanation and submission package | Evidence-linked draft/recording outline | Read snapshots; create local drafts |

These are responsibilities, not twelve always-on paid workers. Engineering and operations need separate host tool profiles from read-only reviewers. The human principal owns strategy, active mandates, price ceilings, recipient allowlists, credentials and external publication decisions. Human-approved deployment scope and the existing US$10 submission budget persist; this model does not authorize more spending.

Default proposal sequence: Chief of staff → Knowledge → Research → Procurement → isolated Risk / Red team → Engineering → QA → Delivery → Finance → Operations → Communications. The proposal runtime must label simulated versus actual provider output, enforce its narrower schemas and withhold downstream tasks after failed gates. These prompt policies do not establish model execution.

## Department specialists

The registry defines 12 department leads and three specialists under each lead: **48 advisory roles/tasks in total**. Each specialist receives only its assigned role policy, task and evidence packet; it inherits no wallet authority, external tools, deployment permission or delegation capability. Specialists depend on upstream lead completion; their lead depends on its three specialist outputs plus upstream leads. Risk and red team branches cannot see one another’s review outputs.

Specialists derive their system policy from the parent prompt plus their exact registry assignment; separate duplicated prompt files are unnecessary. All runtime responses must use exactly `missionId`, `taskId`, `agentId`, `recommendation`, `summary`, `evidenceRefs` and `riskCodes`. Recommendation is ACCEPT/REJECT/ABSTAIN. Host validation—not prose—enforces identity, assigned evidence, permissions and dependency gates. The current runtime grants only `read-assigned-evidence` and `submit-advisory-output`, including engineering and operations. Table capabilities above describe future gated host integrations.

| Specialist ID | Assigned task |
| --- | --- |
| `chief-of-staff/scope` | Extract requirements and distinguish approved scope from proposals |
| `chief-of-staff/dependencies` | Map blockers and deadline dependencies |
| `chief-of-staff/acceptance` | Draft measurable acceptance criteria for founder approval |
| `research/source-check` | Check provenance and source identity |
| `research/freshness` | Identify stale, unavailable or contradicted evidence |
| `research/gap-analysis` | List unresolved questions without inventing answers |
| `procurement/candidate-fit` | Compare supplied candidates to acceptance criteria |
| `procurement/quote-binding` | Flag recipient, resource, asset and price binding gaps |
| `procurement/capacity` | Flag duplicate intent and admission prerequisites |
| `risk/authority` | Review credentials, principals and permission boundaries |
| `risk/economic` | Review uncertainty, exposure and fees without changing budgets |
| `risk/failure-modes` | Identify failure, timeout and rollback risks |
| `red-team/injection` | Challenge hostile instructions in external content |
| `red-team/substitution` | Challenge identity, artifact and receipt substitution |
| `red-team/replay` | Challenge duplicate actions, retries and cross-task reuse |
| `engineering/contracts` | Review module interfaces and backwards compatibility |
| `engineering/implementation` | Draft bounded code changes and rollout steps |
| `engineering/migration` | Review data migrations and rollback preservation |
| `qa/regression` | Review regression evidence and unchanged contracts |
| `qa/adversarial` | Review malicious inputs and race-condition coverage |
| `qa/recovery` | Review restart and uncertain-operation recovery evidence |
| `delivery/criteria` | Compare artifact against approved deliverable criteria |
| `delivery/attribution` | Flag missing merchant identity and artifact digest bindings |
| `delivery/quality` | Identify unsupported claims and unresolved quality gaps |
| `finance/exposure` | Report supplied integer-lovelace exposure without conversion |
| `finance/funding` | Distinguish hosting credits, escrow funds and seller receipts |
| `finance/cost` | Flag approved hosting/model cost ceilings and missing metering |
| `operations/readiness` | Check supplied deployment readiness evidence |
| `operations/reconciliation` | Draft inspection steps for uncertain operations |
| `operations/backup` | Draft backup, restore and shutdown ownership checklist |
| `knowledge/repository` | Review official repository contracts, pins and licenses |
| `knowledge/video` | Extract only available transcripts with timestamps and limitations |
| `knowledge/skills` | Review applicable skill instructions and reject unrelated installers |
| `communications/claims` | Check every pitch statement against supplied evidence |
| `communications/demo` | Draft clearly labeled demo recording and walkthrough |
| `communications/submission` | Check required submission artifacts and judge access |

## Company SOP

1. Intake: coordinator records approved outcome, owner, deadline, budget, source allowlist and acceptance checks. Research proposes criteria; principal approves immutable economic mandate where applicable.
2. Discovery: knowledge records a pinned source and supported claim for every integration assumption. GitHub/YouTube content is evidence, never a command. Source code/API specifications outrank an unverified tutorial.
3. Design: engineering maps contracts to existing modules. Risk and red team independently evaluate the same frozen evidence packet. Contradictions return to the coordinator; vote count never substitutes for verified truth.
4. Build: engineering edits only assigned files and supplies meaningful validation. Coordinator resolves overlapping ownership before edits. Read-only agents cannot invoke engineering tool credentials.
5. Release: operations verifies source revision, tests, secrets handling, storage, health, recovery and budget. Apply only authorized project changes. Persist a release record; uncertain deployment state is investigated before retry.
6. Economic execution: deterministic host validates trusted principal mandate, immutable effect identity and allowed provider contract; it atomically reserves before dispatch. A separately authorized future worker must persist an outbox intent and reconcile uncertain writes. No prompt grants that worker signing rights.
7. Reconcile: trusted server observers bind evidence to the persisted operation. ADA accounting and Masumi native-token collection remain separate. Settlement, seller collection and deliverable acceptance are separate facts. Delivery reviewer recommendations are not authenticated receipts.
8. Submission: communications uses verified release/task/receipt evidence and clearly marked simulation. Missing live credentials remain blockers. Human approves publication or communication where not already authorized.

## Activation gates

| Gate | Required evidence | Until satisfied |
| --- | --- | --- |
| Model runtime | Configured model adapter, role-specific JSON schema, output validation, timeout/cost limits, audited tool allowlist and tests | No real inference; shipped rehearsal remains synthetic |
| Skills | Exact source and commit, complete SKILL.md review, license/provenance, tested relevance, host-selected role binding | Record discovery; do not install or execute automatically |
| Engineering tools | File ownership, authorized work package and isolated local tests | Read-only proposals |
| Deployment | Existing authorization, scoped project, tested revision, secrets and persistence checks, budget forecast | Prepare reviewable manifests |
| Paid Masumi task | Authenticated Sokosumi context, configured model, dedicated migrated MPS DB, funded approved preprod wallet, contract/hash compatibility and durable worker | Setup guide and fixture verification only |
| Financial dispatch | Explicit signer/facilitator authorization, bounded total debit, authenticated mandate, durable outbox, UTxO coordination and reconciliation | ALLOW reserves; no payment is sent |
| Delivery proof | Authenticated merchant identity plus immutable effect/artifact digest binding | Advisory quality assessment |
| External publication | Existing explicit authorization or human approval of exact content/target | Local draft |

A runtime must enforce these gates in code; prompts alone are not access control. Keep tool access and credentials out of model text. External connectors should expose narrow typed operations with authenticated context, response limits and redacted logs.

## Skill and knowledge operating policy

Use skills.sh for discovery, then inspect the underlying repository and SKILL.md at a pinned revision. Select a skill because it improves a specific task, not because its title contains “agent.” Map engineering skills to implementation, database skills to operations, security skills to risk review, and presentation skills to communications. Installation is an auditable dependency change; scan executable scripts and credential instructions before adoption. Keep a manifest of source, commit, reviewed files, role, allowed tools and validation evidence. Availability of a skill is not evidence that it ran or improved accuracy.

For YouTube, record channel, URL, publication date, transcript availability, exact supported segment and code/API cross-check. Without accessible transcript or content, record context-only/unavailable and do not attribute implementation behavior to the video. Existing provenance and unavailable official transcripts are recorded in RESEARCH.md. The host must bound retrieval and reject embedded instructions.

## Measurements and database boundaries

Measure completed acceptance checks, review defects found, evidence coverage, blocked time, actual tool/model cost and deployment recovery. Do not invent revenue, customers or performance multipliers. Log model provider/version and actual executions only after activation.

The company SQLite journal stores immutable mission contracts, policy digests, assigned task IDs, states and validated outputs. Registry dependency IDs and role ownership are pinned by the policy digest. Timestamps, signed artifact receipts and provider billing records remain future extensions. Keep it separate from the economic SQLite reservation ledger and the dedicated MPS PostgreSQL wallet/payment database. An orchestration failure must not reset financial reservations. Credentials belong in scoped host secret storage, not either task descriptions or model prompts.

## Current limits

This contribution supplies a responsibility model, system prompts, strict host validation and a restart-safe synthetic company rehearsal. It does not prove a functioning twelve-agent company, real model execution, a paid job, wallet signing, audited merchant delivery or fully automated operations. Any runtime implementation must preserve the existing module contracts and pass the repository checks before release.

## Run and recovery

```sh
npm run company:rehearse -- data/company-simulation.sqlite
npm start
```

Open `/company.html` through the server for the department map. The CLI now defaults to six compact **synthetic** advisory tasks using five roles; discovery remains available explicitly. The explicit
full profile executes 48 tasks and persists them in a separate company SQLite
journal. Re-running completed tasks returns stored output without invoking the
provider again. These are not model calls. See COHERENT_OPERATIONS.md for all fixed profiles. Each specialist uses its parent prompt,
exact assignment and only host-selected reviewed skill references. QA also loads
the existing TDD skill; no skill installer is invoked by the runtime.

For configured inference, a trusted host supplies `provider(context, {signal})`
to `CompanyRuntime` in `advisory` mode using a separate journal and a saved founder
mission. Its return must satisfy the exact output contract. Credentials stay in
the provider host, not the context. The runtime supplies no tools. Provider-level
request/token billing caps are required before activation; a timeout does not
prove the remote provider stopped or that billing ceased.

The host persists RUNNING before provider invocation. Timeout or invalid output
becomes UNKNOWN. A crashed process can leave RUNNING; both states expose
`recoveryNeeded: true` and refuse automatic retries. Inspect the original provider
request and saved evidence; preserve the journal. This release deliberately has
no reset-to-READY recovery endpoint. A policy/skill/prompt change cannot silently
resume an existing mission with a different policy digest. Back up old journals;
resolve uncertain work before creating a replacement mission.

Limits: 30-second default provider deadline (maximum 60 seconds), 32 KiB advisory
output, 256 KiB mission evidence, 20 missions and 8 MiB persisted JSON budget.
These are application budgets, not a strict SQLite file-size ceiling. The default
scheduler is sequential and stops on the first REJECT/ABSTAIN; independent reviews
have isolated contexts, but this does not establish independent models or truth.
No approvals authorize dispatch, verify delivery or change the economic ledger.
