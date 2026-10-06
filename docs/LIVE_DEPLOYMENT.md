# Live deployment handoff and implementation references

7 October 2026. Real hosting and real payments are separate milestones.

## Prepared Railway change

Authenticated Railway inventory found `survival-alpha-prod`, with an unrelated `deepagents` app and its database. Neither was modified. A separate `mew-demo` service and 100 MB `mew-demo-data` volume mounted at `/data` are staged, not provisioned. Source is MEW's `feat/cardano-agent-boundaries`, pinned to the tested deployment commit. Mode is explicitly simulation; no wallet, model or Blockfrost credential is attached. Railway healthcheck configuration is in `railway.toml`.

Container copies only runtime files. `.local`, environment files, downloaded dependencies, wallet databases and skill downloads are excluded. The entrypoint fixes ownership of the mounted data directory and drops to the node user. Docker is unavailable locally, so the image has not been built here; Railway build logs must confirm it before any deployment claim. Node tests and build pass locally.

The connector rejected resource/region tuning on the not-yet-created service with `Service Instance not found`. Those settings are not staged. Confirm the effective service region, one replica and resource limits after creation, before public access. Do not describe CPU/memory limits as a guaranteed dollar spending cap. Railway usage is billed; owner approval of an allowed budget is pending. The public demo shares one SQLite state and permits resets; it never controls wallets.

After approval: re-read the environment patch (commit applies every staged change), verify all changes are still MEW-only, apply it, follow actual build/deployment status, check health and rehearsal endpoints, create a demo domain, and verify persistence across restart. Record the URL and deployed commit. If build fails, preserve logs and repair the source; never declare success from a triggered deploy.

## References that actually match the desired behavior

| Source | Inspected behavior | Reuse boundary |
| --- | --- | --- |
| [Official Cardano x402 demo](https://github.com/cardano-foundation/x402-cardano-demo), 6481c9aea1bc36c45c0d872fc1f3a3414c108e8f | `server/src/paymentOperations.ts` binds transaction to operation; `masumi/README.md` describes MIP-003 and x402 escrow with later collection | Add persistent admission before payment dispatch; its in-memory operation map alone does not survive restart |
| [Official TOKEN2049 live implementation](https://github.com/masumi-network/demo-agent-token2049/tree/live-demo-name-finder), ff35ea7 | `paid-task.mjs` saves pending stages; `client.mjs` calls eve sessions; `settlement.mjs` checks receipt/withdrawal/net seller output | Use as worker reference; replace team-name instructions with procurement criteria and preserve credentials/runtime isolation |
| [Masumi Payment Service](https://github.com/masumi-network/masumi-payment-service), d569a338ca54d5be7441564770d75ebf89b71f12 | Dedicated encrypted wallet database, scoped payment API and lifecycle | Separate PostgreSQL service; exact deployed API and signed fields must be checked before writes |
| [eve deployment guide](https://github.com/vercel/eve/blob/main/docs/guides/deployment/vercel.mdx) | Separate hosted agent runtime | Hosting eve alone does not deploy the Task worker or MPS |
| [Cardano x402 facilitator](https://github.com/cardano-foundation/cardano-x402-facilitator) | v2 exact, network/asset/amount admission and broadcast/reconciliation | Protocol verification does not establish user's objective satisfaction |

The live template's receipt helper accepts net token value greater than zero. MEW's new `verifyTokenReceipt` requires the full configured atomic amount, validates transaction identity, token unit and confirmation depth, and subtracts seller input value from seller outputs. It is read-only and not wired to a paid worker yet. Callers must first bind the withdrawal hash to the authenticated Task/MPS receipt. No foreign asset is inserted into MEW's lovelace kernel.

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

Current gates pending: hosting budget approval, model access, Sokosumi sign-in, payment configuration/funding, live worker implementation and verified collection. Publishing the simulation does not complete these gates.
