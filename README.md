# MEW · Machine Economic Workflow

MEW prevents individually valid agent actions from composing into an invalid economic outcome. It tracks objective capacity and economic exposure, reserves before dispatch, and defers duplicate purchases while evidence remains unresolved.

[Open the demo](https://badjiallan053-boop.github.io/mew-economic-runtime/) · [Open the presentation](https://badjiallan053-boop.github.io/mew-economic-runtime/presentation.html) · [90-second runbook](DEMO_RUNBOOK.md)

## Run locally

Requires Node.js 24 or newer. No dependencies, installation step, wallet or API key is needed for the demo.

```sh
npm test
npm start
# Open http://127.0.0.1:3000
```

Use **Run the demo**: Alpha is reserved; payment settles with unknown delivery; Beta is deferred; Alpha's delivery satisfies the objective. Without the guard, 0.55 + 0.49 = 1.04 ADA and two equivalent purchases exceed a one-report, one-ADA mandate. With MEW, exposure stays at 0.55 ADA.

## Implemented

- Deterministic objective/effect kernel, immutable identities, idempotent evidence, safe retries, full refunds and read-only simulation.
- SQLite transactions persist reservations before ALLOW, serialize concurrent proposals and survive server restart.
- Responsive mission dashboard, counterfactual comparison, economic trace, budget editor and five-slide presentation.
- Read-only Cardano preprod verifier checks recipient, lovelace amount, transaction identity and confirmation depth using Blockfrost.
- Automated kernel, adapter and HTTP integration tests; CI and GitHub Pages workflow; Docker deployment.
- Actual engineering team ownership and reusable local SKILL.md instructions.

## API

`GET /api/health`, `GET /api/state`, `POST /api/objectives`, `POST /api/evaluate`, `POST /api/simulate`, `POST /api/observe` (demo only), `POST /api/demo/reset` (demo only), `POST /api/cardano/verify` (authenticated live evidence only).

```sh
curl -X POST http://127.0.0.1:3000/api/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"objectiveId":"mission-report","proposedEffect":{"id":"alpha","semanticKey":"report-v1","provider":"Alpha","type":"payment","amount":550000,"agent":"agent-a"}}'
```

The returned `decision` is ALLOW, DEFER or DENY, with a reason, safe next action and position. ALLOW is a single dispatch authorization. Replaying that effect never authorizes a second dispatch. The runtime does not execute the external payment; integrations must durably couple dispatch and reconciliation.

## Deployment and boundaries

GitHub Pages hosts a **browser simulation** with no backend or durable database. The local/server deployment uses SQLite. Both scenarios label synthetic claims. No payment signing, wallet custody, live submitted transaction or Masumi escrow execution is claimed.

Live evidence mode requires a server-side Blockfrost preprod key and a Bearer token at least 32 characters long. It rejects arbitrary JSON claims. The dashboard is built for demo mode; live mode is accessed by authenticated API clients. The verifier establishes on-chain recipient/amount evidence; signed objective binding, authenticated merchant delivery, custody, multi-tenant authorization, finality/reorg handling and production reconciliation remain future work.

Read [DEPLOYMENT.md](DEPLOYMENT.md), [SPEC.md](SPEC.md), [RESEARCH.md](RESEARCH.md), [TEAM.md](TEAM.md) and [skill sources](docs/SKILLS.md). Presentation date: October 8, 2026, Singapore.
