# Skills used and reusable instructions

## Approval escrow and actual model follow-up

Applied the already installed Cardano Foundation `write-validator`,
`review-contract` and `explain-eutxo` procedures with their bundled Aiken/testing
references. The earlier statement that no custom validator was built describes
that earlier contribution; this follow-up adds a standalone locally compiled
approval escrow. See [protocol boundaries](BLOCKCHAIN_PROTOCOL_RUNBOOK.md).
One contract engineer and one independent review subagent worked on it. The
reviewer found a caller-mutation race in the new read-only observer; the lead fixed
it and added a regression test. These local procedures did not authorize signing,
wallet access or deployment. No new remote skill installer was executed.

Integrated the pinned MIT `@scure/base` 2.0.0 package for checksum-valid address
encoding/decoding, preserving its license in the npm package. Installation uses
the lockfile with scripts disabled; adding a library does not certify the escrow.
The existing evidence procedures led to an actual local model run, whose strict
response contract failed on all twelve cases despite full evidence coverage.
See [raw generation results and limits](PARENT_MODEL_RESULTS.md).

The team reviewed [skills.sh documentation](https://skills.sh/docs) and the official skill sources rather than running arbitrary install scripts.

- [Anthropic frontend-design SKILL.md](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md): applied to visual hierarchy, subject-specific mission control layout, accessible controls, responsive design and critique by browser inspection.
- [Vercel React best practices SKILL.md](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md): reviewed as a skills.sh example; React-specific rules are inapplicable because this implementation uses dependency-free browser modules. General bundle restraint and independent I/O batching informed the build.
- [Local MEW engineering SKILL.md](../.agents/skills/mew-engineering/SKILL.md): task ownership, integer accounting, invariant tests, evidence boundaries, deployment checks and honest demo reporting.

AGENTS.md is the shared engineering contract. TEAM.md records the agents actually used. The model routing described in the founder brief is a future policy, not a record of models invoked during this build. External sources may change; their instructions do not authorize publishing secrets or running unrelated actions.

## 7 October contribution

- [Addy Osmani test-driven-development SKILL.md](https://github.com/addyosmani/agent-skills/blob/main/skills/test-driven-development/SKILL.md), discovered through [skills.sh](https://www.skills.sh/addyosmani/agent-skills/test-driven-development): read and applied to quote-boundary tests before adapter implementation. Tests assert persistent outcomes using real SQLite, not mocked call order. No remote skill installer was run.

## Orchestrator installation

Reviewed and installed the [official TOKEN2049 paid-agent SKILL.md](https://www.masumi.network/token2049/skill/SKILL.md). Its sign-in, evidence and recovery gates govern the future live path. Downloaded the full [Cardano Dev Skills](https://github.com/cardano-foundation/cardano-dev-skills) repository including bundled references, then linked skills locally without overwriting MEW's own skill. Reviewed `scaffold-project` and `explain-eutxo`; scaffold-project explicitly excludes modifying existing structures, so it was not used to restructure MEW. No custom validator is built here. CLI installation supplies the Sokosumi skill suite; reviewed the Sokosumi skill's authentication boundary.

See INSTALLATION.md for pinned tool/source versions. External skills are reference procedures, not payment or credential authorization. The orchestrator used one documentation subagent, which owned only OPERATING_SOP.md. All rehearsal agent roles remain deterministic fixtures.

The subsequent risk review used the installed Codex Security standard-scan SKILL.md with independent offline source reviewers and source-backed validation. Its three baseline findings were followed by failing regression tests and fixes. See [RED_TEAM.md](RED_TEAM.md) for coverage, remaining live gates and the explicit YouTube transcript limitation. Extra skills.sh listings were reviewed as knowledge references; no unreviewed installer was executed.

## Company hierarchy contribution

Company knowledge review selected existing TDD and Cardano procedures plus
reference-only Vercel interface guidelines. See COMPANY_KNOWLEDGE.md for verified
links, license limits and unavailable YouTube transcripts. The company runtime
loads three reviewed local skill texts (MEW engineering, company knowledge and
TDD for QA) as references; each specialist inherits its lead's selected skills.
No installer or third-party script runs. Runtime policy digests cover registry,
prompt and skill contents. Assigned references are not evidence of real inference.

## Design and interoperability procedures

Added original local `design-discovery` and `interoperability-review` SKILL.md
procedures. They guide host reviews: user needs, alternative designs, reversible
experiments, identity mappings, evidence provenance and authorization boundaries.
They are available to the engineering team; they are not automatically injected
into existing company provider contexts. This preserves existing journal policy
digests and avoids changing prior mission contracts. The interoperability review
used a documentation subagent and reviewed the actual Anthropic MCP-builder skill
through skills.sh; no upstream installer or scripts were executed. See
INTEROPERABILITY.md for source, licensing and version-pin limitations.

See AI_NATIVE_COMPANY_PLAN.md for the product, backend, security, frontend and
strategy candidate matrix. Added original company-product-delivery host procedure;
no automatic provider injection or third-party installation.

## Campaign contribution

Added original local campaign-acceptance and campaign-measurement procedures.
The implementation team used one campaign engineer, one skill/SOP designer and
one independent reviewer, coordinated by the lead. Review feedback corrected
bundle quantity, reset identity, initial checkpoint persistence and exact artifact
bindings. Fixtures remain deterministic; skill texts are not injected into model
contexts. Existing company mission policies are unchanged. All 96 repository
tests and the build passed for this contribution.

## Compact profile

The compact profile loads the new original handoff-review procedure, scoped to
five roles. It covers consumer validation and observable acceptance. See
COMPACT_TEAM.md for the actual skills.sh upstream review and adoption limits.
Legacy profiles do not load it, preserving their mission policy fingerprints.

## Durable operation review · 7 October 2026

Added original local `durable-operation-review` skill for atomic outbox/receipt commits, conflicting replay and retained UNKNOWN exposure. Reviewed skills.sh secure-code-review and data-engineer listings as references; full external secure-code-review retrieval was unavailable, so no third-party executable skill was installed. See DURABLE_OPERATIONS.md for inspected references and limitations.

## Production readiness

Added original local production-readiness procedure for accountable owners, credential lifecycle, incident coverage and evidence-based release gates. skills.sh incident-response listings were reference material; no third-party executable package was installed. The procedure grants no runtime privileges. See PRODUCTION_TEAM.md.

## Investor and partner demo

Added original partner-demo procedure using evidence classification from local perp-value-proof and reference-only skills.sh positioning-basics listing. Full upstream skill retrieval failed; no third-party package installed. Runtime registries and compact policy fingerprints are unchanged. See INVESTOR_PARTNER_DEMO.md.

## Company design studio

Added an original company-design-studio procedure after inspecting skills.sh frontend-design and upstream web-design-guidelines references. Two implementation roles and independent review were coordinated by root; no third-party packages or runtime privileges added. See WEBSITE_STUDIO.md.

## Product-led growth and writing

Created original mew-gtm and mew-product-writing skills with shared PRODUCT_MARKETING_CONTEXT.md and GTM_PLAYBOOK.md. Two implementation agents contributed website copy and GTM/skill authoring; root integrated the pilot planner and reviewed claims and rendered behavior. Both skill validators passed. The skills and workstream prompts are host-side guidance, not additions to the runtime role registry.

Reviewed [skills.sh copywriting](https://www.skills.sh/coreyhaines31/marketingskills/copywriting), [upstream copywriting](https://github.com/coreyhaines31/marketingskills/blob/main/skills/copywriting/SKILL.md) and [upstream free-tools](https://github.com/coreyhaines31/marketingskills/blob/main/skills/free-tools/SKILL.md). References informed audience context and a useful ungated planning tool. No installer, executable package, external conversion statistics or customer results were adopted. Sources are not version-pinned.

## Connected story and original algorithmic art

Applied local narrative-score and jury UI/UX review with two specialist agents. Inspected [Anthropic algorithmic-art instructions](https://github.com/anthropics/skills/blob/main/skills/algorithmic-art/SKILL.md) as a reference for original seeded art. Implemented a lightweight SVG field instead of the prescribed p5/template package to preserve the existing site architecture. No third-party executable skill installed. The repeated illustration explains retained capacity; it is not live telemetry. See STORY_JOURNEY.md. A [YouTube payment tutorial](https://www.youtube.com/watch?v=1r-F3FIONl8) was opened but its transcript was unavailable; no technical conclusions rely on unseen video content.

## Interaction and motion refinement

Applied local jury UI/UX and evidence-design guidance. Inspected skills.sh interaction-design and its upstream SKILL.md, Vercel Labs' view-transition demo and Chrome's cross-document specification guide. Implemented original native CSS/Web Animations enhancements; no external skill installer or animation framework added. See MOTION_DESIGN.md for treatments, evidence and limitations. Advisory/runtime agent registries are unchanged.

## Machine-learning evidence pipeline

Applied the local engineering procedure and data-analytics data-quality guidance. Inspected [skills.sh MLE workflow](https://www.skills.sh/affaan-m/ecc/mle-workflow) and its [upstream SKILL.md](https://github.com/affaan-m/ecc/blob/main/skills/mle-workflow/SKILL.md) as reference material for task definitions, baselines, split integrity and promotion gates. Implemented native Node tooling and a standard-library quality notebook; no third-party executable skill or ML framework installed. Public data remains untrusted context, and the export gate grants no training or payment authority. See ML_LEARNING_PIPELINE.md. References are not version-pinned.

## Dataset and model discovery

Extended the reference-only skills.sh MLE workflow into a fixed-source, revision-pinned catalog and an original local TF-IDF retrieval fit. Reviewed official dataset cards, Qwen model cards and MLX-LM LoRA guidance. No remote installers, dataset scripts or model-weight code were executed. See MODEL_DATA_SHORTLIST.md; language-model fine-tuning remains pending reviewed data and hardware feasibility.

## Social research committee

Applied reference-only skills.sh deep-research and MLE workflow with three actual review agents. Built strict advisory proposal validation and research-only social source exclusions; generated synthetic oracle fixtures using the existing deterministic core. No remote installers or scraped transcripts used. See SOCIAL_PROTOCOL_COMMITTEE.md.

## Independent data-science audit

A data-science reviewer audited task labels, lineage leakage, runtime-target fit, rights records and customer outcomes. Read skills.sh llm-evaluation and its upstream SKILL.md as reference guidance. Added a gap audit/resource map and 12 bilingual pending benchmark prompts; no trained model or approved labels claimed. See DATA_SCIENCE_GAP_AUDIT.md.

## Frozen local model experiment

Continued the reference-only skills.sh MLE/evaluation workflow with an independent data-science agent checking labels and exact source support. Installed an isolated MLX runtime for local development evaluation and selected a public Apache-2.0 Qwen 0.6B quantization after finding no existing local model. No remote model code or skill installer is required. Benchmark labels remain agent-reviewed, not human-approved training data. See FROZEN_MODEL_EXPERIMENT.md.

## Installed model reliability skills and focused agents

Installed `evaluate-rag` and `eval-audit` from [skills.sh](https://www.skills.sh/ai-evals-course/evals-skills/evaluate-rag), upstream `ai-evals-course/evals-skills` revision `80d5f7b0127c7572ed9e9339937adbfd7240ffeb`, into `.agents/skills`. Upstream files are unchanged; each includes Apache-2.0 license and provenance. No upstream executable scripts were installed or run. Added original `mew-model-reliability` skill and three reusable role prompts under `prompts/learning`. Skills are available for project discovery on the next turn and were read explicitly for this work.

Three actual Codex agents performed passage retrieval, strict answer-contract engineering and publisher/YouTube source review. New experimental answer validation is distinct from the existing seven-field company runtime contract; no production agent, payment or live-model settings were changed. See MODEL_RELIABILITY_RESOURCES.md and MODEL_RELIABILITY_TEAM.md.

## Expanded multilingual and post-training work

Installed `write-code-eval` and `build-review-interface` from upstream [Eval Skills](https://github.com/ai-evals-course/evals-skills) pinned at `80d5f7b0127c7572ed9e9339937adbfd7240ffeb`, and `embedding-strategies` from [wshobson/agents](https://github.com/wshobson/agents) pinned at `46891e7e60da0e52baf1050b7b6391b64e84c6d9`, discovered through skills.sh. Each project installation contains its unchanged upstream skill text, provenance/hash record and verified source license (Apache-2.0 for Eval Skills; MIT for embedding-strategies). No upstream executable scripts were installed or run. References remain untrusted guidance, not credential or publication authority.

Added original `mew-posttraining-research` using the local skill-creator procedure, and three host prompts for research, experiment design and independent review under `prompts/learning`. They point to the actual personalization planner and research catalog; no production role registration or automatic provider-prompt injection occurs. The skill supports isolated local evaluations and preserves affirmative reviewed-data gates rather than promising model improvement. See MULTILINGUAL_KNOWLEDGE_MAP.md and THINKING_MACHINES_RESEARCH.md for accessible primary sources, hosted-versus-local distinctions and unavailable video/PDF limits.

## Evidence coverage and repository integration

Applied installed embedding-strategies and created original `mew-evidence-coverage` after reviewing the skills.sh RAG listing and official LangChain RAG skill. Parent-document retrieval and ensemble source code informed an original dependency-free selector; existing Safetensors/Transformers libraries are directly integrated for artifact verification and rendered-token fit. See EVIDENCE_COVERAGE_EXPERIMENT.md for unchanged benchmark, 1/2/3-parent tradeoffs, YouTube transcript failure and actual adoption limits. One independent review subagent audited selection and cached receipt contracts; no new production runtime agents or live execution changes.

## Escrow and constrained-model follow-up

Reviewed the pinned MeshJS Cardano and Outlines skill files and public caption
segments recorded in `research/cardano/integration-research-provenance.json`.
Skill discovery informed transaction review and grammar-constrained generation;
actual APIs were verified against official versioned sources. No arbitrary skill
scripts were run, no training rights were inferred, and no model/financial
authority was enabled. See [reproduction and remaining gates](ESCROW_MODEL_NEXT_STEPS.md).

## TOKEN2049 presentation workflow

Applied the existing design-studio, jury UI/UX, evidence-design and PDF review skills. Reviewed Anthropic frontend-design, Vercel web-design-guidelines and the linked Web Interface Guidelines through skills.sh discovery at the revisions/hashes recorded in [the design research](TOKEN2049_DESIGN_RESEARCH.md). Public Webflow tutorial captions and the current GSD Core README informed responsive review and bounded ownership. No third-party skill installer, copied template executable or GSD command was run.

Three actual specialist agents handled source research, homepage engineering and a separate evidence/technical critique; the lead integrated the result and ran browser and regression checks. Used skill-creator guidance to add the original repository-local `skills/mew-presentation-review/SKILL.md`, readable explicitly rather than globally installed. It preserves actual-kernel decisions, simulation boundaries and separate execution statuses. See [the presenter guide](TOKEN2049_PRESENTER_GUIDE.md) and [the acceptance audit](TOKEN2049_SHOWCASE_AUDIT.md).

## Motion, discoverability and advisory education release

Continued the repository-local presentation-review and engineering procedures with three actual specialists: frontend motion, Stanford/public-API research and independent boundary review. Reused the previously reviewed skills.sh design/evaluation references; no additional installer or third-party executable was needed. Source learning is implemented through a bounded collector, immutable snapshots and the existing five-role/six-task company contract rather than adding model agents or economic privileges.

Two Stanford-linked public YouTube caption reviews produced short original notes with timestamp cues and digests. Four official course references and five pinned repository references inform retrieval, evaluation, provenance and uncertainty checks. Collection used Crossref, OpenAlex and Koios public endpoints; latest source availability is 12/13 because Crossref rate-limited one request. References grant no training rights or financial authority. See [the runnable workflow](STANFORD_AGENT_WORKFLOW.md) and [independent release review](LIVE_SHOWCASE_RELEASE_AUDIT.md).

## Private Supabase integration

Applied the repository-local engineering procedure and the installed Supabase
`supabase` and `supabase-postgres-best-practices` skills, including their RLS and
connection-pooling references. Checked current official Supabase changelog,
PostgreSQL 17 role behavior, node-postgres TLS/transaction documentation, OpenAI
structured outputs and the existing revision-pinned Masumi API. Used purpose-built
Supabase tools to apply the selected project's migration and verify hosted access
boundaries. Pinned pg 8.23.1 and test-only PGlite 0.5.8; installation scripts were
disabled and dependency auditing reported zero vulnerabilities.

No additional executable skill, production runtime agent or subagent was added.
No provider credential was collected, no model request performed and no payment
signed or broadcast. The database management connection and hosted RLS checks
are distinct from the still-unconfigured application login. See
[private integration setup](SUPABASE_MODEL_PAYMENTS.md).

## Activation specialist team and shared evidence

Used three actual Codex specialists: private database activation, model evaluation
and the resumed security reviewer assigned fresh payment work. The lead authored
an original coordinator skill and the deterministic advisory handoff verifier.
Four new repository-local skills preserve distinct file ownership, explicit
inputs/outputs and no economic or activation authority. Canonical skill-creator
validation passed, and the model specialist forward-tested the coordinator with
raw model evidence; grammar validity correctly did not authorize activation.

Supabase skills.sh guidance was reviewed at pinned upstream sources. Model work
retains an unchanged, licensed Apache-2.0 validate-evaluator reference and reviews
pinned Promptfoo/MLflow sources without installing their frameworks or services.
The payment lane used skills.sh TDD guidance and pinned official facilitator source.
Public Shreya Shankar captions were actually retrieved and paraphrased with time
cues; fresh Masumi captions remained unavailable. Raw captions stay ignored/local;
no training permission was inferred. Source manifests and adoption limits are in
research/activation. Skills are original MEW procedures with referenced material,
not additional deployed or paid runtime agents. PyYAML 6.0.2 was installed only in
an ignored isolated validation environment; no runtime dependency was added.

The work adds secure local enrollment scaffolding, bounded read-only preprod wallet
observations and artifact-bound advisory reviews. Model/provider calls, remote LOGIN,
funded wallet transactions, signing, independent audit and production activation
were not performed. See [team procedure](ACTIVATION_TEAM.md).

## Artistic motion studio

Three actual specialists handled original kinetic artwork, shared experience
motion and independent UI/UX/evidence review. The lead integrated and browser-tested
the site. Existing local perp-design-studio, perp-jury-uiux, perp-graphic-design
and perp-evidence-design skills informed review, adapted to MEW's own palette
and prototype boundaries. Reviewed skills.sh interaction-design, CSS motion
systems and motion-performance guidance; source provenance and adoption limits
are recorded in research/design/\*-sources.json. No remote installer, new animation
framework or runtime agents were added. Source/storyboard and rendered reviews
are documented in ARTISTIC_MOTION_REVIEW.md.
