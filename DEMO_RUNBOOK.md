# MEW presentation — 8 October 2026, Singapore

## Before presenting

Run `npm test`, then `npm start` from the repository and open the local URL printed by the server. Use the deployed GitHub Pages demo when available; keep the local server as backup. The browser demo must visibly say simulation. No wallet or private key is needed. Reset the scenario before each rehearsal. Keep the README and test output available for technical questions. For controlled pacing use “1 · Reserve Alpha”, “2 · Settle + timeout”, “3 · Attempt Beta” and “4 · Verify delivery” in order. “Run the demo” executes the scenario automatically; “Open presentation” opens the pitch view.

## 90-second script

**0–15 seconds:** “Two agents can make individually reasonable payments and still break your goal. I asked for one report with a budget of one ADA.” Point to quantity 1 and budget 1 ADA.

**15–35 seconds:** Run the scenario. “Alpha costs 0.55 ADA. Payment settles, but delivery is unknown. A second agent sees Beta at 0.49 ADA and retries through a different provider.” Point to the naive fork: 1.04 ADA exposure and two equivalent purchases. “That exceeds the budget by 0.04 ADA and exceeds the one-report mandate.”

**35–60 seconds:** Point to MEW's DEFER. “MEW remembers the first commitment. It atomically reserves objective capacity before an agent dispatches an action. A timeout preserves that exposure. The safe next step is to reconcile Alpha.”

**60–75 seconds:** Reconcile delivery using the demo control. “The receipt satisfies the objective. We spent 0.55 ADA once; Beta is no longer needed.” Show the trace and SATISFIED state.

**75–90 seconds:** “The demo uses labeled fixtures. Behind it are a deterministic accounting engine, durable server state, tests, and a read-only Cardano preprod verifier. The verifier checks actual transaction outputs and confirmations; payment execution and Masumi escrow are the next integration steps.”

## Judge answers

- **Where is the AI?** Agents propose actions; deterministic MEW logic evaluates them. Codex agents built this prototype.
- **Is this live money?** No. The interactive scenario is simulation. A configured server verifier can read existing preprod settlements; we have not claimed a live submitted payment.
- **How is it different from x402?** x402 establishes a payment interaction; MEW accounts for prior commitments across agents sharing an objective.
- **Can an agent retry?** It can retrieve evidence or resume the original operation. It cannot treat an existing authorization as permission to dispatch again.
- **Does it work across currencies?** This build intentionally accounts in lovelace only.
- **How do you identify equivalent purchases?** A principal precommits a semantic key. This prototype trusts that mapping.

## Failure and fallback

If a verifier is offline, retain the reservation and show pending reconciliation; do not declare settlement or authorize a duplicate. If the public site is unavailable, present the local demo and tests. If no preprod transaction is verified, say so and demonstrate the adapter's fixture tests. Never present a mock transaction hash as a real explorer transaction.
