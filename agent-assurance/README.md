# agent-assurance

Control and evidence layer between an AI agent's proposed purchase or trade and the payment systems that execute it. Deterministic JavaScript decides authority and exposure (no LLM approves spending); independently verified evidence moves state; a minimized evidence case can be exported to a broker or insurer, who make their own decisions.

Extracted from the MEW prototype, keeping only the infrastructure. See [docs/EXTRACTION_MAP.md](docs/EXTRACTION_MAP.md).

**Implemented locally:** atomic reservation/outbox, fenced worker and an independent persisted provider simulator. Every simulator observation is synthetic.

**Not implemented:** signing, custody, real provider dispatch/payments, insurance binding, signed delivery verification, tenant isolation. Hosted use is demo-only. Do not describe this as having moved real value.

## Run

Node 24+, no external dependencies. Run from this directory:

```sh
npm test
npm start   # simulated demo at http://127.0.0.1:3000/api/health
npm run assurance -- --out ./artifacts/assurance
npm run assurance:verify -- ./artifacts/assurance/report.json
```

The assurance runner evaluates 15 frozen scenarios in guarded, unguarded and deny-all modes. The guarded result is 14/15: the deliberate bypass must fail coverage. Zero eligible objectives displays N/A, and unsupported controls remain NOT_IMPLEMENTED. See the [90-second runbook](docs/runbooks/ASSURANCE_DEMO.md). These are deterministic regression results, not insurance or production loss estimates.

## What is here

- `src/core/mew.mjs`: reserve-before-dispatch kernel. Per-asset integer accounting, DEFER on unresolved equivalents, idempotent claims, unknown outcomes hold capacity.
- `src/core/evidence.mjs`: versioned, purpose-bound evidence case with source classes, digests, exposure by asset and missingness.
- `src/adapters/web2.mjs`: HMAC webhook verification and binding to the reservation.
- `src/adapters/cardano.mjs`: read-only Cardano preprod payment observation.
- `src/server/`: SQLite transactional journal and HTTP API: `/api/evaluate`, `/api/simulate`, `/api/objectives`, `/api/state`, `/api/evidence?objectiveId=&purpose=`, `/api/web2/webhook` and `/api/cardano/verify` (live mode).

- `src/dispatch/`: simulator-only worker with bounded retries, reconciliation and stale-write fencing.
- `src/adapters/sandbox-provider.mjs`: independent SQLite receiver ledger and durable matching-request deduplication.
- `src/eval/`: frozen schedules, receiver-based oracle, minimized JSON/HTML and strict report verification.

## Docs

[Assurance contract](docs/ASSURANCE_CONTRACT.md) · [Chain decision](docs/CHAIN_DECISION.md) · [Market notes](docs/MARKET_NOTES.md) · [Kernel spec](SPEC.md) · [Agents used](docs/TEAM.md) · [Engineering contract](AGENTS.md)
