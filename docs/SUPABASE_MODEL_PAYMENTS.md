# Private Supabase, model and payment integration

Target verified 8 October 2026: **mew**, project `ndorfchuhciidfcltbzf`, NextGen organization `zmyixaggruyupoyhpkkm`, Sydney, PostgreSQL 17. The separate PerpParrot and hackathon projects were not modified. The public Railway website continues to use its explicitly synthetic SQLite database.

## What is connected and what remains pending

The reviewed `mew_private_integration` migration is installed in the selected Supabase project. Its four tables have forced RLS; neither `anon` nor `authenticated` can read them. Supabase security advisors returned no findings. Hosted SQL exercised principal isolation, rejected ownership reassignment and denied anonymous access. Those fixtures and a temporary administrator role-switch grant were rolled back; a subsequent count found zero saved ledgers, evaluations and payments.

The application driver and loopback private API are implemented and tested locally. **A direct application database login is not yet configured.** `mew_runtime` was created NOLOGIN, without a password; this intentionally requires private credential provisioning before a Node process connects. No secret was fetched or put into browser assets. `mew_backend` supplies only schema usage and the required table grants, with no DELETE, ownership or DDL privileges.

Real model evaluation uses the existing OpenAI Responses transport and original compact-company system prompts, but model credentials are still pending. A run reserves its durable attempt before contacting the provider. Its four synthetic evaluation cases use at most four calls and 512 output tokens per call, with a 64 KiB input cap. One evaluation is permitted per principal by the shipped host configuration. Completed, RUNNING and UNKNOWN run IDs cannot call the provider again after restart. Count/token bounds are not a dollar spending guarantee; configure a provider project spend cap and check the selected model's price before enabling usage.

Payment integration persists an unsigned **Cardano preprod ADA approval-escrow funding draft**, the full amount/fee/collateral exposure and globally unique input locks in one transaction. It reuses the existing deterministic kernel, address enrollment, intent validator, CSL builder and Blockfrost observer. A timeout retains exposure. Reconciliation uses the locally computed transaction hash; changed block observations require review. Funding observation does not claim seller settlement, delivery, refund or absolute finality. Nothing signs or broadcasts.

Masumi connectivity supports the reviewed MPS health and authenticated preprod purchase **GET** endpoints. The pinned source is `5fccf58b0f30873085b59ee540c67b4ae8433cd0`; health alone cannot prove deployment version or authenticated access. Private purchase contents are not returned. **Masumi tUSDM purchases/withdrawals are not enabled:** the current economic kernel accounts in lovelace and cannot silently reinterpret native-token units. Existing native-token receipt verification remains a separate boundary.

## Provision the private database credential

Use Supabase's SQL editor or your secure administrative database client locally to provision a strong, separate password and enable LOGIN for the existing `mew_runtime` role. Do not use the administrative `postgres` connection in the application: startup rejects privileged and non-enrolled roles. Never paste the password into chat, source, command arguments or screenshots. No role should receive membership in a database owner or BYPASSRLS role.

Get the endpoint from Supabase **Connect**. For a persistent IPv6 backend, use the direct endpoint with user `mew_runtime`. On an IPv4-only host, use the displayed session-pooler host with user `mew_runtime.ndorfchuhciidfcltbzf`; do not derive the pooler hostname from the region. The adapter supports the configured Supabase host, ports 5432/6543 and certificate verification; URI SSL options cannot disable validation. If the project needs its downloaded CA certificate, supply the PEM as `postgres.ca` in the private configuration. Do not set `rejectUnauthorized:false`.

Copy `deploy/integration-config.example.json` into an owner-only directory outside source control. Set the private file to mode 0600 and its directory to 0700. Replace the connection placeholder, enroll a high-entropy bearer token by its SHA-256 digest, set a bounded expiry and choose explicit actions. Keep the token itself in a separate owner-only local file or secret manager. The example intentionally fails startup until configured.

To prepare payments, enroll the operator principal's **public preprod address** and a provider ID/address in `paymentPolicy`. The principal comes from the token policy, never a request body. Enrollment is bound to the persisted ledger policy digest; changing it requires a reviewed migration, not an automatic update. No wallet key or seed is accepted. Creating an objective is a trusted operator mandate action; source articles and models cannot approve it.

## Start and verify

Provide secrets through a local secret manager or private environment, without printing them:

- `MEW_SUPABASE_DATABASE_URL` and `MEW_SUPABASE_PROJECT_REF` for the read-only preflight.
- `OPENAI_API_KEY`, an explicit `MEW_EVAL_MODEL` supporting strict structured output and `MEW_APPROVE_MODEL_USAGE=yes` for fixture evaluation only.
- `BLOCKFROST_PROJECT_ID` scoped to **preprod** for read-only chain observation.
- `MPS_API_BASE` ending `/api/v1/` on the enrolled Railway MPS service and `MPS_API_TOKEN` for the bounded read-only MPS probe.

Run `npm run integration:preflight`, then `npm run integration:start -- /absolute/private/config.json`. The host listens only on **127.0.0.1:3046** by default. Use a secure machine-to-machine client with the enrolled bearer token; do not put the token in a browser console or URL. Browser origins and unencoded/oversized bodies are rejected. This process is separate from the public Railway demo and is not automatically deployed by a website push.

| Method and route | Contract / behavior |
| --- | --- |
| GET `/integration/status` | Database startup boundary; actual configured read-only Cardano/MPS probes; model configuration distinct from evaluation/activation |
| POST `/integration/objective` | Exact `id, semanticKey, quantity, maxExposure, description`; principal derived server-side |
| GET `/integration/position?id=...` | Principal-scoped accounting |
| POST `/integration/model/evaluate` | Exact `{ "id": "first-evaluation" }`; four synthetic cases, original prompts, no payment tools |
| POST `/integration/payment/prepare` | Exact `operationId, providerId, args`; args use the existing `buildEscrowDraft` funding contract |
| GET `/integration/payment?id=...` | Persisted contract and unsigned CBOR for external review |
| POST `/integration/payment/unknown` | Exact operationId; retain the original exposure and inputs |
| POST `/integration/payment/reconcile` | Exact operationId; Blockfrost looks up the stored draft hash, never a caller's verified flag |

Funding args must carry fresh `preprod-observed` parameters, exact ADA-only UTxOs owned by the enrolled principal and sufficient fees/minimum UTxO. The builder's kind marker is **not an independent attestation**: an operator must obtain/review this data through the actual preprod provider before considering a wallet submission. Historical fixture values are rejected by the private payment store. The contract blueprint must remain at its pinned digest. An approved external wallet/signer, funded preprod test, exact closing lifecycle and independent contract audit remain required; this release provides no signing or submission route.

After the real model fixture run, review each response's grounding, abstention, language quality and the separate customer holdout. Four-case format/decision checks do not promote a model. Production activation remains blocked by the existing semantic gates, regardless of this adapter's database status.

## Verification limits and source references

All **260 automated tests passed**, and the standalone site build succeeded.
The dedicated integration cases cover PostgreSQL RLS, reservation/input-lock
rollback, funding observations and rollback review, durable model replay/failure,
strict TLS configuration, bearer scopes and the private HTTP boundary. No real
provider call or wallet transaction was part of those tests. The deployed migration
is `20261007213113_mew_private_integration`; sanitized hosted results and the
bootstrap digest are recorded in
[the verification record](../research/integration/supabase-verification.json).

The local integration tests execute actual PostgreSQL SQL and RLS in pinned PGlite 0.5.8. They exercise atomic rollback, shared input conflicts, immutable mandates, uncertain/funded/changed chain observations, replay, durable model budgets and private authorization. PGlite uses one serialized connection; it does not establish real multi-instance lock behavior. Before deploying a multi-worker private backend, run two independent clients against the selected Supabase database and verify race outcomes and crash recovery. Hosted RLS probes are separately recorded above; they do not prove Node TLS connectivity, wallet funding or model credentials.

Current official references: [Supabase Postgres connection methods](https://supabase.com/docs/guides/database/connecting-to-postgres), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [node-postgres transactions](https://node-postgres.com/features/transactions), [verified TLS](https://node-postgres.com/features/ssl), [OpenAI structured output](https://developers.openai.com/api/docs/guides/structured-outputs), and [pinned Masumi API](https://github.com/masumi-network/masumi-payment-service/blob/5fccf58b0f30873085b59ee540c67b4ae8433cd0/src/utils/generator/swagger-generator/openapi-docs.json). The current Supabase changelog and September PostgreSQL minor-release notes were checked; this bootstrap adds none of the affected extensions/operators. No additional paid Supabase project, worker or Railway resource was created.
