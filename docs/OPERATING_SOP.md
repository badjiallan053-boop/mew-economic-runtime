# MEW operating SOP — local demo to paid Cardano evidence

Updated 7 October 2026. This procedure uses the [official TOKEN2049 agent guide](https://www.masumi.network/token2049), the [Cardano AI development curriculum](https://developers.cardano.org/docs/developers/curriculum/start-building/ai-assisted-development/) and [Masumi's dispenser](https://dispenser.masumi.network/). Check the deployed services and installed CLI help before issuing writes: a repository revision is not proof of a hosted API contract.

The participant chose to finish the local demo first; live setup is pending. This document is a procedure, not a record that accounts, wallets, databases, models or deployments have already been configured. A local rehearsal proves accounting behavior; a real model turn, Coworker execution and seller collection require separate evidence.

## 1. Operating roles and authority

The orchestrator keeps one checkpoint journal, assigns independent work and verifies prerequisites. Research and risk agents propose a report and uncertainties. MEW alone reserves the principal's capacity deterministically. A payment executor sends only a persisted authorized operation. A reconciler observes its original identifiers. A delivery reviewer binds the exact output to that operation. One executor owns each Task and wallet operation; multiple reasoning agents do not imply multiple payment executors.

Keep the existing Node runtime and SQLite kernel. Eve is a separate optional live agent runtime, not a migration requirement for the MEW dashboard. The current local role outputs are fixtures: do not label them model inference.

## 2. Databases and asset boundaries

| Store | Required for | Owner and deployment | Contents / authority | Acceptance checkpoint |
| --- | --- | --- | --- | --- |
| MEW SQLite (`MEW_DB_PATH`) | Local/full MEW backend | One MEW service; durable file/volume | Objective contracts, reserved effects, observations; atomic evaluation and persistence | Restart retains reservations; competing purchase stays DEFER |
| Dedicated PostgreSQL 13+ (16 recommended for local container) | Masumi Payment Service (MPS) only | MPS; private network and persistent volume | MPS migrations, encrypted wallets, registrations and payment lifecycle | Migration success, health success, source and wallet inspection |
| Private Task/payment journal | Live executor and recovery | One executor; durable storage | Task/effect/quote/payment IDs, deadlines, exact result bytes, receipt status | Restart reconciles same operation instead of submitting twice |
| Sokosumi managed records | Coworker and Task execution | Sokosumi; account/runtime credentials | Vendor, Coworker, access grants, Tasks, credits | Correct account and independent access checks |
| Artifact storage | Published demo/report evidence | Local files initially; private persistent storage when hosted | Exact UTF-8 result, source provenance, sanitized proof bundle | Hash and bytes survive restart; no secrets in public artifacts |

A PostgreSQL instance is not needed to run MEW's local simulation. Do not replace SQLite with PostgreSQL merely to match MPS. Production multi-instance MEW would require a shared transactional reservation implementation and tested locking; separate SQLite files cannot coordinate.

**ADA and USDM are distinct ledgers.** MEW's current kernel and direct x402 adapter account in integer lovelace. The seller paid-Task rehearsal uses `1000000` atomic test-USDM units (1 test USDM), separately. Its test asset unit from the event guide is `16a55b2a349361ff88c03788f93e1e966e5d689605d044fef722ddde0014df10745553444d`. Verify the live source before using it. Never sum token units with lovelace, infer a conversion or report workspace credits as wallet funds. Transaction fees, collateral and minimum UTxO require an explicit ADA allowance beyond business quote principal.

## 3. Connector plan

| Connector | Purpose | Required private configuration | What proves it works |
| --- | --- | --- | --- |
| Model provider / optional eve | Produce the real deliverable | Entitled model, documented endpoint, provider credential | Small real turn through the exact launch environment |
| Sokosumi account CLI | Create/read personal Tasks and manage owned records | Participant OAuth login | `whoami` matches intended account |
| Sokosumi Coworker runtime | Pick up and complete assigned Tasks | Coworker key; Coworker/Vendor/Workspace IDs | Real Task starts and completes with saved result |
| MPS runtime | Fresh signed terms, escrow lifecycle and seller collection | Scoped `ReadAndPay` token; actual source/registration/seller configuration | Escrow and result submission plus confirmed seller receipt |
| MPS admin | Initial migration, wallets, registration/key setup | Separate admin key; private dashboard | Confirmed registration and scoped runtime key created |
| Blockfrost Preprod | MPS chain access and independent read-only checks | MPS `BLOCKFROST_API_KEY_PREPROD`; MEW `BLOCKFROST_PROJECT_ID` | Actual transaction/outputs, correct recipient/asset/amount and confirmation policy |
| Dispenser | Human-approved test funding | Actual public Preprod wallet address and participant's private verification flow | Chain balance queried after funding |
| Masumi registry | Discoverable paid agent identity | Funded seller; valid real endpoint descriptor | `RegistrationConfirmed`, returned agent/source IDs |
| Event Workspace | Judge access to same Coworker | Existing Vendor/Coworker; event membership and grants | Coworker access plus runtime access and Task eligibility |
| Hosting (optional Vercel/Railway or equivalent) | Availability without laptop | Runtime-only secrets, persistent worker/MPS/database | New Task and collection with laptop offline |
| GitHub / skills.sh / YouTube | Code, reviewed procedures and contextual research | Public read access normally enough | Recorded source revision / reviewed skill; transcript provenance if available |

Do not connect Gmail, Slack, CRM, Supabase, a vector database or a generic browser automation service for this bounded supplier-report demo unless its actual input requires them. Those connectors add credential and provenance surfaces without proving the economic guard. skills.sh procedures inform engineering; they do not authorize external writes or expose credentials. Video descriptions are context, not evidence of unseen transcript content or API behavior.

## 4. Checkpoint journal

Keep a private, ignored record outside public submission artifacts. Record state, last verified time and next action; retain error history separately. Save repository revision, runtime versions, service ports and process owners. Include account identity, Vendor/Coworker/workspace/access IDs, execution Task ID, payment Task ID, registration ID, source index, seller public address, asset, amount, signed deadlines, exact result path/hash, payment/collection IDs, receipt verification and hosted URLs. Use `PENDING`, `VERIFIED`, `FAILED` or `UNKNOWN`; no inferred success. Never store keys or mnemonics in this record.

Acceptance gates:

1. **LOCAL_VERIFIED:** tests/build pass and complete labeled rehearsal, including failure scenarios.
2. **MODEL_VERIFIED:** real small turn succeeds; source/input/result saved.
3. **COWORKER_VERIFIED:** same registered Coworker completes execution-only Task.
4. **PAYMENT_PENDING:** fresh terms saved and original payment lifecycle tracked.
5. **SELLER_RECEIPT_VERIFIED:** independent collection evidence binds intended seller and net test USDM.
6. **HOSTED_VERIFIED:** laptop-off execution and payment pass.
7. **EVENT_READY:** Coworker/event runtime grants, eligibility, credits and submission artifacts checked.

## 5. Local demo first

From the MEW checkout, use Node 24 or newer:

```sh
node --version
npm test
npm run build
npm start
```

Open the server's printed URL. Follow the rehearsal controls exposed by this revision. Verify missing evidence causes abstention; a wrong recipient is rejected; settled payment plus delivery timeout retains objective exposure; the competing purchase is deferred; delivery satisfies the objective without a second purchase. The seller fixture must still display simulated collection and pending live setup, with no invented explorer hash.

Record test output and the revision. Read `DEMO_RUNBOOK.md` for the concise presentation and `DEPLOYMENT.md` for database persistence. Static Pages is a browser simulation, not a hosted payment worker. Retain the exact existing API contracts during adapter work.

## 6. Live identity and model checkpoint

Check existing processes, installed CLI versions and records before creation. Use the current official guide and each exact command's help. A typical account check is:

```sh
sokosumi --version
sokosumi --preprod auth whoami --json
sokosumi --preprod workspaces list --personal --json
sokosumi --preprod workspaces list --json
sokosumi --preprod vendors me --json
sokosumi --preprod coworkers list --scope owned --json
```

If no CLI exists, install the official `@masumi_network/sokosumi` package through the reviewed setup procedure; save the installed version. The participant signs in with their account at `https://preprod.sokosumi.com/signup` / CLI login. Confirm organization membership before self-service Vendor creation; reuse an administered Vendor and Coworker. Personal Coworker access and runtime Vendor Workspace access are separate. A registration does not start a worker.

Configure the Coworker key using the official private-file/vault flow only after the actual ID is known. Ignore `.env.local` first; use mode `0600`; suppress credential-bearing output. Never replace runtime credentials with account OAuth or admin credentials. Preserve working provider configuration. If adopting eve for a new agent, inspect its current quickstart, initialize a separate project, save its lockfile and test a small turn before connecting payment. Sokosumi credits do not fund model calls.

Run one execution-only personal Task using the documented CLI. Pause the automatic executor for a manual rehearsal. Save exact UTF-8 result bytes before completion. Resolve `grant_required` with the owner and retry the same Task; do not create duplicate Tasks or bypass grants. Record completion as execution proof only.

## 7. MPS database and wallet setup

Use a dedicated MPS checkout at a recorded revision, Node 24 and its required pnpm version (the inspected event guide specifies 10.30.2). Inspect its current lockfile and `.env.example`. Choose existing private PostgreSQL with a dedicated user/database, or PostgreSQL 16 in a loopback-bound container with a named volume. Wait for database readiness before installing locked dependencies, generating Prisma, migrating, then seeding. Never migrate an unrelated/shared database.

MPS private configuration includes `DATABASE_URL`, preserved `ENCRYPTION_KEY`, separate `ADMIN_KEY`, authorized Preprod Blockfrost key, `PORT=3012`, `SEED_ONLY_IF_EMPTY=true` and `AUTO_WITHDRAW_PAYMENTS=true`. Mainnet settings stay empty. Preserve existing wallets and encryption key on resume. For a new node use the guide's V2 Preprod defaults; do not introduce copied contract overrides. Remove the V2 collection-address override rather than setting an empty string. Verify default seller `collectionAddress` is null.

Seed output can contain wallet mnemonics. Suppress stdout and stderr, inspect exit status, and report safe status only. Do not reseed blindly after failure. Build MPS frontend before starting its dashboard/background payment jobs.

```sh
curl --fail http://127.0.0.1:3012/api/v1/health
curl --fail http://127.0.0.1:3012/api-docs -o mps-openapi.json
```

Expected health is `status: "success"` and `data.status: "ok"`. Read this deployed OpenAPI before constructing payment requests. Healthy HTTP does not prove funded wallets or registration. Sign into the private admin dashboard outside the coding-agent transcript and inspect V2 source and public wallet information.

Request dispenser funding using **the actual generated public seller address**, Cardano Preprod and measured shortfall. Seller needs test ADA for registration/collateral/fees; do not invent a fixed sufficient ADA balance. Local purchasing-wallet ADA and test USDM are needed only for an optional direct buyer rehearsal. In a normal Sokosumi paid Task, Core funds buyer escrow after charging workspace credits. Verify balances after the participant says funded; never request their verification code, seed phrase or key in chat.

## 8. Register and bind the paid worker

Implement and test the real agent endpoint before registering it. `Standard` requires `apiBaseUrl`; `OpenApi` requires `openApiSpecUrl`; `X402` requires `x402ResourcesUrl`. A polling Coworker worker does not automatically serve an agent API. Never register MPS's URL as the agent's URL.

Use `Preprod`, `Web3CardanoV2` and the actual seeded source address. The guide's supported payment-source pricing object is `{"pricingType":"Dynamic"}`. Verify its current schema; do not invent `AgentPricing` fields. Wait for `RegistrationConfirmed`. Save returned agent identifier, source index, policy/contract identifiers, seller verification key and address. These differ from Vendor/Coworker IDs.

Create a scoped MPS runtime token with `ReadAndPay`, Preprod and the intended selling wallet. MPS uses the `token` header; Coworker uses its separate runtime credential. Check usage limits. Worker configuration must bind actual IDs, network, seller, token unit and quote amount. Obtain terms fresh; preserve every signed field. Do not strip non-null signed overrides to fix compatibility: correct defaults and request new terms.

This paid USDM route is distinct from MEW's current direct ADA x402 admission route. A full paid-worker connector and independent USDM verifier remain implementation gates until tested. Never route USDM through the lovelace kernel or advertise the existing lovelace verifier as seller-USDM proof.

## 9. Paid Task and proof sequence

1. Create a separate paid Task under the same Coworker after execution-only success. Check personal test credits in the active workspace (Stripe test mode where applicable).
2. Reserve any governed MEW objective atomically before dispatch. Save effect, Task and intended purchase contracts. There must be one active executor.
3. Request fresh signed seller terms and persist input hash, buyer nonce, amount/asset, registration and deadlines unchanged.
4. Submit documented `masumiPayment` through the Task event flow with the Coworker credential. Persist identifiers immediately and wait for confirmed escrow funding.
5. Execute the agent. Save exact result bytes. Derive hashes using the route's Masumi canonical rules, not an assumed plain SHA256. Test escaping, quotes, backslashes and newlines.
6. Submit the corresponding result hash to MPS, then complete Sokosumi Task. Neither completion, credit debit nor `PURCHASED` proves seller receipt.
7. Keep worker, MPS and database alive across unlock/collection delays. Collect when eligible; inspect original payment if requests time out.
8. Independently read the confirmed collection transaction and intended seller's net test USDM. Validate network, asset, amount, recipient and evidence policy; do not mistake change outputs or unrelated deposits for payment. Save actual hash/explorer link and observation details. Report pending if proof is incomplete.

The guide documents the lifecycle, not an exactly-once API guarantee. A journal and single executor reduce duplicates but do not eliminate the crash window between an external submission and its local acknowledgement; reconcile on-chain/service evidence before any retry.

## 10. Recovery rules

| Situation | Required next action | Capacity / evidence rule |
| --- | --- | --- |
| Quote, payment or registration write times out | Read existing operation by saved identifiers; retain signed terms | UNKNOWN retains reservation; do not create replacements |
| Settled payment, missing result | Resume original delivery/reconciliation | Settlement does not free quantity |
| Duplicate effect/Task attempt | Check immutable contract and original status | Authorization replay never permits another spend |
| Wrong recipient/asset/amount | Reject evidence; inspect original reservation | No settlement claim from partial or unrelated evidence |
| Signature error | Keep exact terms and error; check live schemas with payment team | Never edit a signed field |
| Worker crash/redeploy | Restore journal, check old process stopped, reconcile incomplete work | One active executor; same Task/payment/wallet |
| Database restart | Reuse volumes and MPS encryption key | Do not reseed or create alternate wallets |
| Full verified refund or unpaid verified failure | Apply evidence through trusted server boundary | Only verified permitted transitions restore capacity |
| Event access pending/denied | Ask relevant owner; recheck same access record | No duplicate Coworker or credential bypass |
| Provider/Blockfrost outage | Keep pending state and record tested endpoint/error | Absence is not financial failure proof |

## 11. Hosting, event and submission

Local completion comes first. Before provisioning billed hosting, review the concrete deployment/cost plan with the participant. The official guide proposes eve on Vercel and persistent worker/MPS/PostgreSQL on Railway; equivalent hosts are valid. Disable serverless sleeping for persistent worker/MPS, configure restart policy, private DB connectivity and durable journals. A hosted worker cannot call the laptop's `127.0.0.1`. Inject scoped secrets at runtime; never bake wallet configuration into an image.

Stop local executor before hosted executor starts. For an existing MPS migration, stop worker and MPS before final database copy, restore with the original encryption key, then keep old node stopped. Verify restart and a new Task plus seller collection with laptop offline.

Join the event through the official guide with the same account and connect the **existing** Coworker. The inspected guide names event organization `01a109d1-32a9-71a3-a0e3-658b2a7987cd` and slug `token2049-origins-hackathon-2026-nws2r7`; confirm them before use. Coworker access, runtime access, `taskSeatEligible`, credits and running worker require separate checks. Event commands must not mix personal and organization scope.

Consult [Masumi submission checklist](https://www.masumi.network/token2049/submission) and [BuilderBase rules](https://builderbase.com/event/token2049-origins-hackathon#rules). Record actual Task IDs, results, seller collection transaction and net receipt evidence. Prepare repository/run instructions, hosted availability, slides and demo recording according to the current submission rules. The inspected guide requires recording embedded in presentation rather than live stage demo or external video link. Review public files/history for secrets and private records before publication. If live setup is still pending, submit a clearly identified prototype only where permitted; never manufacture payment proof.

## 12. Completion report

Report revision, actual installed tool/skill versions, actual test result, local URL and demo scenarios. Separately list verified model/Coworker/payment/hosting/event milestones with their non-secret evidence IDs. List unresolved prerequisites and exact next human action. Do not combine passing tests, registration and receipt into one claim of readiness.
