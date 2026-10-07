# Preprod payment activation evidence

The offline `escrow:witness-review` tool now verifies supplied transaction
signatures against a freshly rebuilt exact draft; see
docs/MODEL_PAYMENT_UNBLOCKING.md. It is not a signer, submitter or activation gate.

The private integration prepares unsigned ADA escrow funding drafts and records full exposure. It does not sign, broadcast or implement a native-token ledger. The funded-wallet, closing and independent-audit gates remain open. This review is internal engineering work, not an independent contract audit.

## Read-only wallet observation

With an already configured server-side BLOCKFROST_PROJECT_ID, run:

```sh
node scripts/preprod-wallet-check.mjs PUBLIC_ENROLLED_ADDR_TEST_ADDRESS
```

This makes GET requests only to the fixed official preprod Blockfrost origin: latest block, current epoch parameters and up to five address UTxO pages of 100 entries. Each response is capped at 256 KiB and has a ten-second request timeout. An incomplete page set, duplicate outpoint, mismatched owner, malformed amount, changed tip or block older than ten minutes fails closed. It returns exact decimal-string asset totals and public UTxO identifiers. It never emits credentials, selects inputs, converts token values into lovelace, updates reservation state or sets activationReady=true. Provider 404/unavailable remains an observation failure, not evidence of a zero balance. Address data is public but may link identities; retain it privately unless sharing is explicitly intended.

This helper is intentionally separate from prepareFunding. No HTTP wallet endpoint or new service authority is installed. A quiet tip across reads is not an atomic ledger snapshot; a competing transaction can consume an input afterward. Re-observe selected outpoints immediately before external signing and enforce existing global locks on the checked-out PostgreSQL transaction. Do not treat wallet totals as spendable: datum/reference-script UTxOs, foreign tokens, collateral, fee budgets and minimum change/output constraints require transaction-specific selection.

## Gates and concrete evidence

| Gate | Existing evidence | Still required |
|---|---|---|
| Ownership/network | Enrolled public address, strict testnet address decoding | Authorized external wallet control evidence; correct preprod project/node context. Testnet bytes do not distinguish preview. |
| Inputs/parameters | Builder checks supplied snapshot age; read-only helper checks provider context | Match selected exact outpoints/quantities to fresh provider evidence; confirm unspent and lock state before signing. Parameter labels are not oracle proof. |
| Total exposure | Private reservation includes principal, funding fee, closing fee and collateral allowance | Final balanced transaction fee, minimum script output/change and phase-2 collateral under live protocol parameters. Fee constants alone are not a final fee. |
| Funding | Unsigned CBOR/hash and fixture tests | Authorized external signing, exact submitted hash, confirmed operation-bound funding output/datum and preserved durable exposure. |
| Closing | Local accept/cancel CBOR and resolved UPLC fixtures | Real funded escrow accept and cancel cases; measured execution units/live cost models; collateral, fee source, signer and redeemer index checks. |
| Delivery | Advisory review and stored artifact digest | Authenticated merchant/task receipt bound to the exact operation and accepted deliverable; payment is not delivery. |
| Resilience | Kernel/private-store failure tests | Funded preprod restart, pending/unknown, rollback and conflicting evidence reconciliation; no automatic unlock or second spend. |
| Independent audit | Internal source review and tests | Named independent qualified assessor, exact source/blueprint commit and digests, scope, unresolved findings, remediation/retest and explicit opinion. |

## ADA versus Masumi tokens

The private MEW accounting and this escrow contract use integer lovelace. Masumi native-token payment must have a separate policy/asset-name unit, string atomic amount, lifecycle, authenticated terms and accounting lane. A token balance or matching display symbol proves none of these. Retain separate ADA funding for fees, collateral and minimum UTxO. MPS read-only health or purchase connectivity is not an implemented purchase/withdrawal connector. Do not send native tokens through the existing ADA effect amount or imply a conversion.

The pinned Masumi OpenAPI contract is recorded in src/adapters/masumi-contract.mjs. The current Cardano facilitator reference distinguishes verification from submission: a false verification result may use HTTP 200; settlement_pending with a transaction hash may mean the transaction was already broadcast. Reconcile the same operation and keep its exposure. Its SDK-compatible offline tests are not proof that MEW has executed live payments.

## Reviewer handoff and research

Use .agents/skills/mew-preprod-payment-review/SKILL.md and prompts/activation/payment-reviewer.md. The mew.activation-evidence.v1 handoff binds PASS claims to local artifact hashes; it never elevates byte integrity to financial readiness. research/activation/payment-handoff.json records the actual local fixtures and outstanding blockers. research/activation/payment-sources.json records source pins, skills.sh guidance and YouTube retrieval status. No new video transcript was obtainable in this review; existing caption provenance is a prior-context record, not a claim that this reviewer watched the video.
