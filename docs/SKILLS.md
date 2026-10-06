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
