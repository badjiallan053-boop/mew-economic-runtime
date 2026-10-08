# Cardano preprod integration

The server integrates read-only Blockfrost preprod connectivity, durable operator-attested transaction attribution and verified recipient-payment observations. An observation is not settlement finality and does not change accounting status or release exposure. It does not sign, build, broadcast or retry transactions. MPS escrow and native-token Task collection remain separate, unimplemented workflows. No wallet key is required by this service.

## Configure privately

Create a private environment file outside the repository containing:

```dotenv
HOST=127.0.0.1
PORT=3038
MEW_DEMO_MODE=false
MEW_DB_PATH=/absolute/private/path/mew-live.sqlite
MEW_API_TOKEN=<long-random-operator-token>
BLOCKFROST_PROJECT_ID=<your-preprod-project-id>
```

Use Node 24 `--env-file=/absolute/private/path/mew.env`; files are not loaded automatically. Use a fresh live database. Reopening a demo database live or promoting populated legacy state is rejected.

```sh
node --env-file=/absolute/private/path/mew.env scripts/cardano-preflight.mjs
node --env-file=/absolute/private/path/mew.env src/server/server.mjs
```

Preflight returns credential-safe JSON and exit code 0 only when the fixed preprod provider reports healthy and valid latest-block data. Missing credentials returns `NOT_CONFIGURED`; upstream failure returns `PROVIDER_UNAVAILABLE`. Connected means read access to an indexer, not wallet funding, signer readiness or successful payment. The API status is protected by the existing operator Bearer token.

## Operator API sequence

All endpoints below require live evidence mode and the operator token. Keep it outside browser storage.

1. `POST /api/objectives` creates the trusted mandate using the existing contract.
2. `POST /api/evaluate` reserves the proposed effect. Its immutable contract must include a positive integer lovelace `amount`, `type:"payment"` and `recipientAddress` on preprod.
3. Obtain the transaction identity and submission reference from the authorized external signer/operation record. This prototype supplies no signer. Before any real dispatch integration, authorize minimum UTxO, fees, inputs and all outputs under the principal's full spending mandate.
4. `POST /api/cardano/operations` records that association:

```json
{"id":"operation-1","effectId":"effect-1","txHash":"<64-hex-transaction-hash>","submissionRef":"<trusted-signer-operation-reference>"}
```

The id, effect and hash are immutable and transaction hash is unique across operations. Identical replay returns the saved record. Registration does not claim the transaction was submitted, paid or delivered. `submissionRef` is an operator assertion, not a verified signature or an external Task lookup. Never register a merchant-supplied hash without checking the trusted signer record.

5. `POST /api/cardano/verify` with `{"effectId":"effect-1"}` observes the saved hash. Optional `txHash` must exactly match it. Unbound effects or substituted hashes return 409 before provider access. Evidence includes operation ID and the operator-asserted submission reference; it is not signer attestation.
6. `GET /api/cardano/operations` lists attribution records. `GET /api/cardano/status` probes connectivity. `GET /api/state` retains the existing accounting contract.

The verifier checks hash, transaction validity, recipient's exact net ADA receipt (outputs minus recipient inputs) and configured confirmation depth. It returns `payment.observed`, explicitly marks payer attribution unverified, transaction binding operator-attested, settlement finality unestablished, and exposure release forbidden. The kernel records the evidence while keeping the reservation held. Provider failure, under-confirmation or conflicting evidence also leaves the reservation occupied. A recipient payment does not prove delivery. Retrying a recorded observation returns the original persisted record without fetching a fresh confirmation count; concurrent reconciliation also reuses the first committed observation. This provides idempotence, not automatic reorg detection. A dedicated rollback-aware revalidator and approved signer/body binding are required before any settlement event can be recognized.

## Tests and limits

Synthetic provider fixtures test fixed-origin credentials, malformed/unavailable evidence, full net receipt, operation restart, immutable attribution, duplicate hash, substitution, uncertain reconciliation, idempotence and conflicting adapter evidence. No real credentials, signer or transaction were available during implementation; no real-chain verification is claimed.

Persistent attribution closes the arbitrary-hash reconciliation interface. The read-only verifier does not cryptographically establish the payer or bind all transaction body fields to the approved mandate. `submissionRef` is an operator assertion; do not treat this lane as authorization to release funds or perform a customer payment. A safe transaction path needs an approved external signer attestation over exact body bytes, required inputs/outputs/assets, durable outbox and independently verified delivery. Production also needs per-principal authorization, validated full Bech32 addresses, capacity monitoring, backups and chain rollback handling. Current address admission is a preprod-prefix guard, not a complete address/network-magic validator. Preview and preprod both use testnet addresses; use the fixed preprod provider and a preprod signer.

The endpoints follow the [official Blockfrost OpenAPI](https://github.com/blockfrost/openapi/blob/master/openapi.yaml): `/health`, `/blocks/latest`, `/txs/{hash}` and `/txs/{hash}/utxos`, with `project_id` credentials and fixed `https://cardano-preprod.blockfrost.io/api/v0` origin. Redirects are rejected and requests have a ten-second timeout. This is a direct ADA reconciliation lane; don't use it to assert Masumi escrow settlement or tUSDM receipt.

## Cursor handoff

Open this same repository directory in Cursor; Codex and Cursor share files and the Git branch, not account credentials or chat memory. `.cursor/rules/mew.mdc` supplies accounting rules and this handoff. `.cursorignore` excludes local credentials/runtime data from indexing; it is not a substitute for filesystem/tool authorization. Avoid simultaneous edits to the same files. Sign in to Cursor with your own account if required. No MCP credentials or wallet permissions are copied into Cursor.
