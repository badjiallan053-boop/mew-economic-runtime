# Skills used and reusable instructions

The team reviewed [skills.sh documentation](https://skills.sh/docs) and the official skill sources rather than running arbitrary install scripts.

- [Anthropic frontend-design SKILL.md](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md): applied to visual hierarchy, subject-specific mission control layout, accessible controls, responsive design and critique by browser inspection.
- [Vercel React best practices SKILL.md](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md): reviewed as a skills.sh example; React-specific rules are inapplicable because this implementation uses dependency-free browser modules. General bundle restraint and independent I/O batching informed the build.
- [Local Assurance engineering SKILL.md](../.agents/skills/assurance-engineering/SKILL.md): task ownership, integer accounting, invariant tests, evidence boundaries, deployment checks and honest demo reporting.

AGENTS.md is the shared engineering contract. docs/TEAM.md records the agents actually used. The model routing described in the founder brief is a future policy, not a record of models invoked during this build. External sources may change; their instructions do not authorize publishing secrets or running unrelated actions.
