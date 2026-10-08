# Engineering team

This build uses coordinated Codex agents within one task. Model names in the founder brief describe a proposed future routing policy. Grok, Kimi, Claude and Hermes have not been invoked by this build and no credentials or token-spend claims are fabricated.

| Owner | Responsibility | Reviewable output |
| --- | --- | --- |
| Lead Codex agent | Architecture, API integration, deployment and acceptance | Runnable repository, release checks, deployment status |
| Frontend Codex agent | Objective dashboard, counterfactual forks, timeline and presentation | Static browser UI |
| Core/backend Codex agent | Deterministic decisions, reservations, database and tests | Accounting kernel and persistence |
| Integration/research Codex agent | Rail verification, official source research, documentation | Cardano adapter tests, research and demo script |

Future work can be assigned by file ownership and an explicit acceptance condition. All engineers read AGENTS.md and SPEC.md, preserve integer accounting, label simulated evidence, and report actual tests. Integration changes require a review of the trusted API boundary. Source discovery follows the skills.sh convention; the local reusable procedure is `.agents/skills/mew-engineering/SKILL.md`.

## Company agent hierarchy contribution

Three Codex development subagents were used: company_design owned the company
operating model and 12 prompts; skill_research owned the knowledge guide and local
knowledge skill; company_risk performed a read-only runtime security review. The
lead implemented runtime, registry, tests, UI and deployment integration. The
12 leads and 36 specialists in the product are configured advisory roles; their
rehearsal uses synthetic output, not 48 independently executed model agents.
