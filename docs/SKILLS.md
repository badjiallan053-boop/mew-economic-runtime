# Skills used and reusable instructions

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
