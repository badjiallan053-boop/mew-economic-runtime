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

## Marketing campaign rehearsal

Open `/campaign.html` through `npm start`. Three synthetic scenarios exercise
source rights, independent reviews, competing commitments, provisional metrics
and exact five-outline artifact acceptance. SQLite persists the shared demo
checkpoint; replaced/stale requests cannot advance it. No videos, model calls,
analytics, publishing or payments are executed. See [campaign design](docs/MARKETING_CAMPAIGN.md).

## Implemented

- Deterministic objective/effect kernel, immutable identities, idempotent evidence, safe retries, full refunds and read-only simulation.
- SQLite transactions persist reservations before ALLOW, serialize concurrent proposals and survive server restart.
- Responsive mission dashboard, counterfactual comparison, economic trace, budget editor and five-slide presentation.
- Read-only Cardano preprod connectivity and verifier check net recipient lovelace, transaction identity and confirmation depth using Blockfrost; immutable operator-attested operation records bind reconciliation to saved hashes.
- Automated kernel, adapter and HTTP integration tests; CI and GitHub Pages workflow; Docker deployment.
- Actual engineering team ownership and reusable local SKILL.md instructions.

## API

`GET /api/health`, `GET /api/state`, `POST /api/objectives`, `POST /api/evaluate`, `POST /api/simulate`, `POST /api/observe` (demo only), `POST /api/demo/reset` (demo only). Authenticated live evidence adds `GET /api/cardano/status`, `GET/POST /api/cardano/operations`, and `POST /api/cardano/verify`, which now requires a saved operation. See [Cardano setup and Cursor handoff](docs/CARDANO_INTEGRATION.md).

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

### Agent and x402 contribution

See [agent architecture, system prompts and Origins demo](docs/AGENT_COMMERCE.md). The new `src/adapters/x402.mjs` exports a strict quote-to-reservation boundary using the existing SQLite transaction. It accepts only explicit x402 v2 exact preprod/lovelace direct transfers bound to a trusted mandate. It is not exposed as a public API and does not sign or dispatch payments. The later Cardano integration preserves the demo and adds mandatory operation attribution to live reconciliation.

### Complete local commerce rehearsal

Run the Node server and open `/rehearsal.html`. Seven persistent checkpoints show synthetic supplier research, strict x402 quote admission, uncertain delivery, duplicate-purchase prevention, artifact binding, and a separate illustrative 1-test-USDM seller Task/receipt. Missing-evidence and substituted-recipient scenarios stop safely. All roles are fixtures; no model or funds are connected. Export the evidence journal from the page or run `node scripts/rehearsal.mjs`.

[Installation and verified state](docs/INSTALLATION.md) · [Full operating SOP and connector/database plan](docs/OPERATING_SOP.md). PostgreSQL is needed for future MPS, while MEW keeps its own SQLite ledger. Live sign-in, model credentials and wallet funding remain pending.

Read-only authenticated Masumi collection verification is runnable with
`npm run masumi:collection -- /private/path/contract.json`. See
[Masumi setup](docs/MASUMI_SETUP.md) and [verified deployment state](docs/LIVE_DEPLOYMENT.md).
Live paid execution still requires credentials, funded wallets and the paid worker.

## Company agent setup

The [company operating model](docs/COMPANY_AGENTS.md) defines 12 department leads
and 36 specialist subagents. Open `/company.html` through the MEW server.
Run `npm run company:rehearse` for a durable **synthetic** 13-task discovery
workflow. Explicit release, paid-readiness and full profiles are documented in
[coherent company operations](docs/COHERENT_OPERATIONS.md).
The advisory runtime loads scoped prompts and reviewed local skill references,
validates outputs, blocks uncertain retries and leaves economic contracts intact.
See [knowledge and skills provenance](docs/COMPANY_KNOWLEDGE.md). Real inference
and live external actions remain configuration and activation milestones.


## Compact company team

`npm run company:rehearse` now defaults to five roles across six synthetic tasks.
See [compact team and prompt boundaries](docs/COMPACT_TEAM.md). Existing profiles
remain selectable explicitly; saved legacy missions are not migrated.

## Delivery priorities and release checks

See [DELIVERY_PLAN.md](docs/DELIVERY_PLAN.md) for ordered outcomes, accountable roles and evidence gates. `npm run deploy:verify` checks the existing hosted demo against the checkout without making changes. Public ecosystem evidence is presented at `/research.html`; model processing remains simulated.

## Evaluation, pilot, delivery and payment workstreams

[WORKSTREAM_AGENTS.md](docs/WORKSTREAM_AGENTS.md) maps specialist responsibilities and focused review subtasks to four runnable implementation boundaries. `npm run model:evaluate` runs the conservative fixture baseline; `npm run pilot:rehearse` records five synthetic outlines; `npm run payment:plan` reports offline payment blockers. Authenticated delivery is a tested Ed25519 library with durable replay enforcement available through the private OperationStore. Live model calls and payment dispatch are not enabled.

## Durable receipt and outbox foundation

`npm run durable:rehearse` exercises reservation/outbox atomicity, timeout/reopen and signed synthetic delivery with durable replay. [DURABLE_OPERATIONS.md](docs/DURABLE_OPERATIONS.md) describes the trusted library boundary and production gaps. Public HTTP routes and live payment dispatch remain unchanged.

## Production ownership and private operations

[PRODUCTION_TEAM.md](docs/PRODUCTION_TEAM.md) assigns the five compact roles to accountable human responsibilities, independent reviews and incident coverage. Named humans remain unassigned. [OPERATOR_AUTHORIZATION.md](docs/OPERATOR_AUTHORIZATION.md) documents scoped principal authorization and pre-enrolled provider keys; this private library is not exposed through the public demo.

`npm run backup:rehearse` verifies coherent SQLite recovery without activating restored workers. [BACKUP_RECOVERY.md](docs/BACKUP_RECOVERY.md) covers reconciliation before reopening operations. [MASUMI_CONTRACT_PIN.md](docs/MASUMI_CONTRACT_PIN.md) records the pinned upstream API and its compatibility limits. No live model, signer or payment worker is enabled by these additions.

The private operator host is runnable with `npm run operator:start -- /absolute/private/operator.json /absolute/private/economic.sqlite`. It requires an already provisioned live ledger, binds loopback only, and refuses insecure files. See OPERATOR_AUTHORIZATION.md for provisioning, deployment and credential boundaries.
