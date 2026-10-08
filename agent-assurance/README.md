# agent-assurance

Control and evidence layer between an AI agent's proposed purchase or trade and the payment systems that execute it. Deterministic JavaScript decides authority and exposure (no LLM approves spending); independently verified evidence moves state; a minimized evidence case can be exported to a broker or insurer, who make their own decisions.

Extracted from the MEW prototype, keeping only the infrastructure. See [docs/EXTRACTION_MAP.md](docs/EXTRACTION_MAP.md).

**Not implemented:** signing, custody, real payments, insurance binding, dispatch worker, delivery-receipt verification, tenant isolation. Hosted use is demo-only. Do not describe this as having moved real value.

## Run

Node 24+, no dependencies. The extraction was desk-reviewed but its tests have not been executed yet; run `npm test` first.

```sh
npm test
npm start   # simulated demo at http://127.0.0.1:3000/api/health
```

## What is here

- `src/core/mew.mjs`: reserve-before-dispatch kernel. Per-asset integer accounting, DEFER on unresolved equivalents, idempotent claims, unknown outcomes hold capacity.
- `src/core/evidence.mjs`: versioned, purpose-bound evidence case with source classes, digests, exposure by asset and missingness.
- `src/adapters/web2.mjs`: HMAC webhook verification and binding to the reservation.
- `src/adapters/cardano.mjs`: read-only Cardano preprod payment observation.
- `src/server/`: SQLite transactional journal and HTTP API: `/api/evaluate`, `/api/simulate`, `/api/objectives`, `/api/state`, `/api/evidence?objectiveId=&purpose=`, `/api/web2/webhook` and `/api/cardano/verify` (live mode).

## Docs

[Assurance contract](docs/ASSURANCE_CONTRACT.md) · [Chain decision](docs/CHAIN_DECISION.md) · [Market notes](docs/MARKET_NOTES.md) · [Kernel spec](SPEC.md) · [Agents used](docs/TEAM.md) · [Engineering contract](AGENTS.md)
