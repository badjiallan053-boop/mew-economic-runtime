# Deploying MEW

## GitHub Pages presentation demo

In repository Settings → Pages, choose GitHub Actions as the build source. The Pages workflow runs tests, builds dist/ including the identical browser-compatible kernel, and publishes the dashboard and presentation. It intentionally does not run a backend. Each browser session has isolated in-memory simulated state; refresh resets the static scenario.

## Full backend and database

Run Node 24: `npm start`. SQLite defaults to data/mew.sqlite. Set MEW_DB_PATH to a durable writable volume for hosting. Run a single service using that shared SQLite file. Multiple services on independent files cannot coordinate reservations. SQLite's transaction holds the snapshot read, evaluation and persisted reservation together. This is a prototype snapshot database, not an event-sourced production ledger.

```sh
docker build -t mew .
docker run --rm -p 3000:3000 -v mew-data:/data mew
```

This serves the simulated dashboard and persistent API. A public demo server lets viewers reset shared simulated data; it must never control a wallet. Prefer the isolated Pages demo for presenting.

## Verified preprod evidence

Configure server-side environment variables MEW_DEMO_MODE=false, MEW_API_TOKEN (at least 32 characters), BLOCKFROST_PROJECT_ID and MEW_DB_PATH. Keep secrets outside Git. Start with `node --env-file=.env src/server/server.mjs` after editing an ignored .env copied from .env.example. Live mode disables synthetic observations and resets. Send `Authorization: Bearer ...` for every API operation except health.

Create a trusted objective, then reserve an effect with immutable recipientAddress and positive integer lovelace amount. POST `{ "effectId": "your-effect", "txHash": "64-hex-character-hash" }` to /api/cardano/verify. The verifier checks existing settlement; it does not send transactions. A transaction may settle only one effect in this database. The configured operator must establish that transaction belongs to the intended mission; cryptographic mandate/transaction binding is not implemented. Cardano minimum output requirements may require a larger funded transaction than the 0.55 ADA UI fixture.

No hosted backend has been provisioned by the GitHub Pages deployment. Use an existing container host with a durable volume, TLS and private access for live evidence experiments. Production additionally requires authentication per principal, receipts, audit history, migrations, backups and robust external dispatch/reconciliation.
