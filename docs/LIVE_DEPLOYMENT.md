# Live deployment handoff and implementation references

7 October 2026. Real hosting and real payments are separate milestones.

## Railway rollout

The owner approved up to US$10 total for this submission on 7 October. Only the
new MEW services in `survival-alpha-prod` were changed; its existing app and
database were left intact.

- `mew-demo`: service `b0d1b572-6582-453e-a176-af5c857e1c8b`, 100 MB persistent
  `/data` volume, one Singapore replica, 0.25 vCPU / 0.25 GB memory limits.
- Dedicated MPS `Postgres`: service `bfadf5cd-6867-4a73-b0d0-b30f0c8c21ae`,
  PostgreSQL 18, 500 MB persistent volume, one Singapore replica, 0.25 vCPU /
  0.5 GB memory limits. Verified online, no public domain or TCP proxy. No MPS
  migrations, wallet seed or worker connection have been performed.

The first two demo builds failed Dockerfile validation before runtime logs.
Removed the Docker `VOLUME` instruction, retaining Railway's attached volume,
then deployed full commit `659b36d35a05cf9229becaeb4b4276c280282e85`.
Container copies runtime files only; secrets and `.local` are excluded, and
entrypoint drops privileges after preparing `/data`. Simulation mode is explicit.

Verified hosted simulation: https://mew-demo-production.up.railway.app/rehearsal.html.
Health, page and rehearsal endpoint checks passed. A synthetic reservation was
saved at rehearsal stage 2, redeployed as `21320afc-0cdd-426b-b5f1-85475ceab442`,
and the full saved rehearsal state matched after the new deployment succeeded.
The rehearsal was then reset for judges. This proves hosted fixture persistence,
not a live blockchain payment. Local verification: 66 tests passed; build passed.

Resource limits are applied but are not a dollar spending cap. Check incremental
Railway usage against the approved US$10 budget; avoid extra replicas and idle
payment/model services. Do not alter workspace-wide settings affecting unrelated
apps. Railway rejected the deprecated config-file update; healthcheck, Dockerfile
path and region were configured through the service API instead.

## References that actually match the desired behavior

| Source | Inspected behavior | Reuse boundary |
| --- | --- | --- |
| [Official Cardano x402 demo](https://github.com/cardano-foundation/x402-cardano-demo), 6481c9aea1bc36c45c0d872fc1f3a3414c108e8f | `server/src/paymentOperations.ts` binds transaction to operation; `masumi/README.md` describes MIP-003 and x402 escrow with later collection | Add persistent admission before payment dispatch; its in-memory operation map alone does not survive restart |
| [Official TOKEN2049 live implementation](https://github.com/masumi-network/demo-agent-token2049/tree/live-demo-name-finder), ff35ea7 | `paid-task.mjs` saves pending stages; `client.mjs` calls eve sessions; `settlement.mjs` checks receipt/withdrawal/net seller output | Use as worker reference; replace team-name instructions with procurement criteria and preserve credentials/runtime isolation |
| [Masumi Payment Service](https://github.com/masumi-network/masumi-payment-service), d569a338ca54d5be7441564770d75ebf89b71f12 | Dedicated encrypted wallet database, scoped payment API and lifecycle | Separate PostgreSQL service; exact deployed API and signed fields must be checked before writes |
| [eve deployment guide](https://github.com/vercel/eve/blob/main/docs/guides/deployment/vercel.mdx) | Separate hosted agent runtime | Hosting eve alone does not deploy the Task worker or MPS |
| [Cardano x402 facilitator](https://github.com/cardano-foundation/cardano-x402-facilitator) | v2 exact, network/asset/amount admission and broadcast/reconciliation | Protocol verification does not establish user's objective satisfaction |

The live template's receipt helper accepts net token value greater than zero. MEW's new `verifyTokenReceipt` requires the full configured atomic amount, validates transaction identity, token unit and confirmation depth, and subtracts seller input value from seller outputs. The read-only `verifyMasumiCollection` bridge now binds trusted saved terms to the authenticated Task receipt and confirmed MPS ordinary withdrawal before invoking chain verification. See [MASUMI_SETUP.md](MASUMI_SETUP.md) for the runnable CLI. It is not a paid-task worker and has only been exercised with synthetic provider fixtures. No foreign asset is inserted into MEW's lovelace kernel.

Two assets named tUSDM exist in the inspected x402 demo. The ordinary token payment route defaults to a different policy from Masumi dispenser tUSDM. Configure the complete policy/asset-name unit, not a symbol. The demo documents policy `16a55b2a…` for Masumi. Do not silently substitute token policies or treat escrow lock as seller collection.

## YouTube knowledge sources

- [x402 on Cardano — official Office Hours](https://www.youtube.com/watch?v=5yhdNPAn8BA), linked from the [official developer article](https://developers.cardano.org/blog/2026-04-24-media-cardano-developer-office-hours/): v2/protocol context. No transcript obtained.
- [Masumi Updates: AI Agents, Payments & Infrastructure on Cardano](https://www.youtube.com/watch?v=mCH4xWJ89Vc), linked from the [official developer article](https://developers.cardano.org/blog/2026-08-28-media-cardano-developer-office-hours/): ecosystem context. Browser page inspected; transcript export explicitly returned no transcript.

These videos are context, not implementation evidence. Source code above is the reproducible implementation reference. Search for the October 6 x402 Office Hours announcement found the event but did not establish a verified recording URL; none is invented.

## Gates before a real paid job

1. Deploy and verify the isolated demo; authenticate Sokosumi using the intended account.
2. Configure entitled model credentials privately. Prove one actual eve session and quality-check its result.
3. Reuse/create Vendor and Coworker after inventory, permissions and grant checks.
4. Configure dedicated MPS PostgreSQL and Blockfrost Preprod; migrate/seed safely and preserve encryption keys. Fund the actual seller address and verify balance.
5. Implement the worker against the deployed schema with durable pending operations. No automatic replay of uncertain payment or model submissions.
6. Run the real Task, escrow lock, exact result/hash submission and collection sequence. Independently verify the full expected net seller receipt.
7. Prove a new Task works with the laptop offline, then record deployed endpoints and sanitized evidence.

Current gates pending: model access, Sokosumi sign-in, payment configuration/funding, live worker implementation and verified collection. Publishing the simulation does not complete these gates.

## Company hierarchy release · 7 October 2026

Deployed commit `38da4f9e0bf67d23d0f0b83f0184d29876f754b3` to the existing
MEW service; deployment `075b3460-8dee-416a-973e-f3ef7bbe67f6` succeeded. No new
billed services or model workers were created. Hosted company map:
https://mew-demo-production.up.railway.app/company.html.

Verified HTTP health, company page/script and registry: 12 leads, 36 specialists,
48 assigned tasks, `modelExecution: NOT_CONFIGURED`, payments disabled. Company
runtime tests and existing regression suite: 77 passing. Local synthetic CLI
completed all 48 advisory tasks; replay returned identical persisted output.
Browser visual rendering was not inspected in this contribution.

The image explicitly includes only the reviewed company prompts, three skill
files and local rehearsal CLI. The API exposes the read-only registry; it does
not start providers, load credentials or dispatch company tasks. Company task
SQLite is separate from economic SQLite and the MPS PostgreSQL service.
Read COMPANY_AGENTS.md for configuration gates and interrupted-task recovery.

## Focused operating workflows · 7 October 2026

Deployed `bdbd2af9d0584bcf880dd9686a6bd100762f452b`; Railway deployment
`ded356cd-d7c4-40df-a2a1-d100a97fbd7f` succeeded. The hosted registry and
company page/script return discovery (13 tasks), release (21), paid-readiness
(20) and explicit full (48). The UI/CLI default is discovery.
No new services were created; models remain NOT_CONFIGURED and payments disabled.
83 tests pass; build passes; local discovery completed synthetic tasks and the
previous full journal replay was unchanged. Visual browser rendering was not
inspected. See COHERENT_OPERATIONS.md for ownership and knowledge references.

## Ecosystem research release · 7 October 2026

Code commit `0d01ce71e4643d6ec3bca46bfda22cfc88527845` adds a bounded public-source snapshot and read-only `/research.html`. Ten API sources succeeded: 54 normalized observations plus five original summaries of publisher announcements/analyses. 102 regression tests and build passed; local health, page, script and snapshot endpoints passed. The 59-record compact handoff used simulatedProvider; no live model, wallet or payment worker ran.

A staged connect of this exact commit to existing mew-demo failed: Railway reported repository not found or not accessible. Hosted health remained HTTP 200, demo mode with payments disabled; `/research.html` returned 404. The new research page is therefore not deployed. No additional services or resources were created.

Owner action: in GitHub installed applications, grant Railway access to private `badjiallan053-boop/mew-economic-runtime`, using the same owner account as the Railway GitHub connection. Reconnect the source and pin the desired reviewed branch commit; inspect pending environment changes before deploying. After success, verify `/api/health`, `/research.html`, `/research-snapshot.json` and SQLite persistence. Existing US$10 total authorization remains the budget; resource limits do not enforce a dollar cap. Do not enable live payment or model execution as part of this static research rollout.

## Railway access restored and research hosted · 7 October 2026

GitHub UI now shows Railway App installation `168824511` on the intended account. Its installed access was already enabled; no permissions were changed by this contribution. The connector successfully staged the source at full commit `ee44f94cf02ea3a0899893e6adc79b87f7aff287`. Inspection showed exactly one pending change, the MEW demo commit, before applying it.

Deployment `b5e9d110-74f3-475f-a174-45a58e74dbb4` succeeded. Read-only verification checked health and SHA-256 equality against the checkout for company HTML/JS, campaign HTML, research HTML/JS and public snapshot JSON. Browser inspection confirmed 54 API records, ten successful sources and explicit simulated-model labels at https://mew-demo-production.up.railway.app/research.html. Health returned demo mode, SQLite and payments disabled. No new billed service, replica or database was added; the existing /data volume remained configured. This release did not perform a fresh post-redeploy state persistence experiment or payment/model execution.

The prior repository-access blocker is resolved. Source remains pinned: future pushes do not automatically deploy. `npm run deploy:verify` repeats read-only asset checks. docs/DELIVERY_PLAN.md now defines the ordered backlog, owners, acceptance evidence and deployment procedure. All 102 tests and build passed for this follow-up.

## Unified website and company studio hosted · 7 October 2026 (SGT)

Existing mew-demo was updated to commit `06a2cfaff95ba8acab3808e5cf2d0157170f30e1`. Railway deployment `eb2fde68-37fd-49e3-8f26-6b1d490e92e9` succeeded; environment reports one healthy replica, no pending changes or service issues. The staged patch contained only its source commit. Existing /data volume, Singapore region, replica and resource limits were preserved; no new paid service was created.

Homepage: https://mew-demo-production.up.railway.app/ . Internal demonstration studio: https://mew-demo-production.up.railway.app/design-studio.html . Independent security reviewer found no blocker for public deterministic demo release; 150 tests and build passed. Expanded verification matched 22 asset byte hashes, including homepage, studio, design studio, shell and artwork. Initial health request timed out during rollout; a separate post-rollout check passed: demo mode, SQLite, payments disabled.

Browser inspection confirmed hosted homepage and shared-data warning. A synthetic default brief was saved through the studio UI; an independent subsequent HTTP read returned revision1, five critique records and NEEDS_HUMAN_REVIEW. This proves a hosted save/read, not persistence through a second redeployment. No private data, real model call, merchant job or payment ran. Git pushes remain separate from this pinned deployed source.

Release context inspected: official https://docs.railway.com/volumes and https://github.com/railwayapp/railway-skills ; skills.sh https://www.skills.sh/vstorm-co/production-stack-skills/production-check listing was reference-only, no package installed. Located https://www.youtube.com/watch?v=oitx514tQgk (DevOps Directive, 2024); transcript export returned unavailable. No technical conclusions were attributed to unseen video content; deployment behavior was checked against current official docs and executable evidence.
