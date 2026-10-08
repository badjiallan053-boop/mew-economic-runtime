# Extraction from MEW (commit b994198)

| MEW item | Here | Notes |
| --- | --- | --- |
| `src/core/mew.mjs` accounting kernel | kept (`src/core/mew.mjs`) | Added `asset` on objectives/effects (default `lovelace`, mismatch is DENY), configurable trusted rails (adds `web2`), options preserved across `simulate` |
| `src/adapters/cardano.mjs` | kept | Added lovelace-only guard |
| `src/server/*`, SQLite store | kept | Env vars renamed `ASSURANCE_*`; added `/api/evidence`, `/api/web2/webhook` (live mode only) |
| Tests | kept, extended | `web2.test.mjs`, `evidence.test.mjs`, two server tests |
| New | `src/adapters/web2.mjs`, `src/core/evidence.mjs`, docs | Webhook HMAC + binding; evidence-case export; contract, chain decision, market notes |
| Dashboard, counterfactual UI, 5-slide presentation, Pages workflow, demo runbook, RESEARCH.md (Masumi-centred pitch) | **left in MEW** | Product demo and pitch, not insurance infrastructure |
| `AGENTS.md`, engineering SKILL.md, TEAM.md, SKILLS.md | adapted | Contract now rail-neutral and asset-aware |

**Gap between the contract and the code.** The contract document refers to an authenticated delivery receipt path, Postgres, an operating-ecosystem map and an insurance doc. None exist in the MEW commit this was extracted from, so none are claimed here. Delivery claims still come from a source labelled `merchant` with a client-supplied `verified` flag; the server never produces them. Treat delivery verification as unimplemented.
