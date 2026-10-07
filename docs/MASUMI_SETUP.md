# Real collection setup

This integration is read-only. Its tests use synthetic receipts. It does not
create a Task, dispatch a model, fund escrow, submit results or withdraw funds.
Use the pinned official paid-task worker described in LIVE_DEPLOYMENT.md for
that lifecycle, preserving durable pending stages before every external write.

1. Sign in locally: `node scripts/tools.mjs sokosumi --preprod auth login`, then
   `node scripts/tools.mjs sokosumi --preprod auth whoami --json`.
2. Inventory existing Vendor/Coworker registrations before creating any. Give
   the worker its scoped Coworker runtime key, not your account OAuth token.
3. Configure the dedicated MPS PostgreSQL connection through a Railway private
   variable reference. Preserve an encryption key of at least 32 characters and
   encrypted wallet backups. The database provisioned on 7 October is empty:
   it has not been migrated, seeded or connected to a payment worker.
4. In the pinned MPS source, run `pnpm prisma:migrate` before `pnpm prisma:seed`.
   Review any failed migrations manually. Suppress seed output because generated
   wallet mnemonics may be printed. Store generated wallet material privately.
   Configure Blockfrost **Preprod**, fund the actual registered wallet and verify
   its balance. Workspace credits do not fund Cardano escrow.
5. Configure model access, prove one actual model response, then use the official
   worker to create a paid Task and wait for confirmed escrow. Save exact result
   bytes and the deployed hash rule before submission. Complete the Task and
   wait for ordinary confirmed seller withdrawal. An uncertain write is inspected
   and reconciled; it is never automatically retried.
6. Save trusted payment terms to a private contract JSON file with `taskId`,
   `blockchainIdentifier`, `agentIdentifier`, `walletId`, `sellerAddress`,
   `smartContractAddress`, `unit`, `expectedAmount`, `network: "Preprod"` and
   `paymentSourceType: "Web3CardanoV2"`. Do not derive these from browser input
   or replace them with values from the transaction you are trying to verify.
7. Configure `SOKOSUMI_COWORKER_API_KEY`, `MPS_URL`, `MPS_API_TOKEN` and
   `BLOCKFROST_PROJECT_ID` privately, then run:

   ```sh
   node scripts/masumi-collection.mjs /private/path/contract.json
   ```

Exit 0 means authenticated Task/MPS bindings and the full net Cardano seller
receipt passed; exit 2 means pending collection; exit 1 means unconfigured or
unverified. Nothing is signed or broadcast. The CLI uses fixed Sokosumi and
Blockfrost preprod origins, redirects are rejected, and provider errors omit
payloads and credentials. MPS must use HTTPS or local loopback HTTP.

Masumi dispenser tUSDM unit:
`16a55b2a349361ff88c03788f93e1e966e5d689605d044fef722ddde0014df10745553444d`.
For 1 tUSDM the expected atomic amount is `1000000`; verify the actual signed
terms. A token symbol alone is insufficient. Disputed withdrawals are rejected
by this first integration. Collection proof does not prove result quality and
does not enter native tokens into MEW's lovelace accounting.

Before submission, retain sanitized Task ID, withdrawal hash, verified receipt,
hosted demo URL, deployed commit, and the required recording/presentation.
Do not describe simulation screenshots as a completed paid job.

## One consolidated live check

After login, run `npm run live:preflight`. To load an existing private config
without printing its contents, use Node 24 directly:

```sh
node --env-file=/private/path/mew.env scripts/live-preflight.mjs
```

The command is read-only. It checks the deployed demo, local account login and
credential presence; if Blockfrost is configured it checks preprod connectivity.
It deliberately exits 1 until live execution is independently proven.
CONFIGURED_UNTESTED is not a valid model response, registered wallet or paid job.
Model proof, MPS readiness, wallet funding and seller receipt still require the
separate ordered checkpoints above. No raw CLI account response or secret is
printed. No new worker, account, migration or payment is created by preflight.
