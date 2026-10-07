# Cardano protocol: implementation and remaining live gates

## Verified local state

The repository now contains a compiled individual ADA approval escrow, an offline
intent planner and a read-only transaction/block re-observation helper. They are
standalone boundaries, with no signer, transaction broadcaster or public payment
route. Existing MEW reservation, persistence and Masumi contracts are unchanged.
Preprod connectivity currently reports `NOT_CONFIGURED`; no on-chain deployment
or lifecycle transaction has occurred. Model/payment activation remains disabled.

| Boundary | Implemented | Authority and limits |
| --- | --- | --- |
| MEW kernel | Existing transactional reservation/outbox libraries | Preserves objective capacity and integer exposure; escrow lifecycle wiring is pending |
| Offline escrow planner | Strict addresses, commitments, fee/collateral cap, compiled script binding, Plutus data JSON | Produces reviewable intent only; no CBOR, balance, signature or reservation |
| Aiken spending validator | Explicit acceptance or principal cancellation; exact full-address ADA payout | Controls one funded cell; does not enforce a global budget, job uniqueness or artifact quality |
| Read-only block observer | Compares a trusted saved transaction/block binding against preprod indexer responses | Signals review or unknown; never authorizes settlement, retry or exposure release |
| Masumi adapter | Existing independently pinned read-only boundaries | This escrow is not a replacement for MPS or its managed state |

Acceptance requires both the principal and provider payment keys as required
signers and the artifact digest committed before funding. Cancellation requires
the principal and is available immediately. The provider therefore has no
guarantee of compensation for work completed before acceptance. This design fits
explicit approval custody for an already identified artifact, not trustless
arbitration or payment for an unknown future output. See [full constraints](APPROVAL_ESCROW.md).

## Reproduce and prepare an offline plan

Run from the repository root with Node 24 and Python 3.12 or newer:

```sh
npm ci --ignore-scripts
npm test
npm run build
python3 scripts/install-aiken-local.py
```

The installer downloads only the official Aiken `v1.1.23` archive, verifies its
pinned SHA-256, rejects archive links/devices and extracts inside ignored `.local`.
It supports macOS arm64 and Linux x86_64; it does not install globally. On macOS:

```sh
cd contracts/approval-escrow
../../.local/aiken/aiken-aarch64-apple-darwin/aiken check --deny
../../.local/aiken/aiken-aarch64-apple-darwin/aiken build --deny
```

On Linux use `aiken-x86_64-unknown-linux-musl` instead. CI includes that path but
the remote workflow result must be checked after pushing. The stdlib version is
locked to `v2.1.0`; a version tag is not an immutable source commit. Release review
must verify its resolved source and the compiled blueprint against the checked-in
receipt before signing. Local tests bind source/artifact hashes and recursively
check planner constructors against the compiled blueprint. They do not test CBOR
serialization, transaction balancing or ledger evaluation.

Prepare a JSON file with exactly these fields; address placeholders must be
replaced with checksum-valid testnet key-payment base or enterprise addresses:

```json
{
  "network": "cardano:preprod",
  "objectiveId": "pilot-report",
  "effectId": "escrow-pilot-1",
  "semanticKey": "accepted-report-v1",
  "principalAddress": "<principal addr_test address>",
  "providerAddress": "<different provider addr_test address>",
  "artifactSha256": "<64 lowercase hexadecimal characters>",
  "nonceHex": "<fresh random 32-byte nonce as 64 lowercase hexadecimal characters>",
  "amountLovelace": 3000000,
  "fundingFeeBudgetLovelace": 250000,
  "closingFeeBudgetLovelace": 250000,
  "collateralExposureLovelace": 500000,
  "maxExposureLovelace": 5000000,
  "minimumOutputLovelace": 2000000
}
```

All amounts are positive safe integer lovelace. These figures are illustrative,
not estimated fees or ledger minimums. `minimumOutputLovelace` is a supplied bound,
not a calculation. Fees and collateral must be budgeted separately from the full
recipient payout; the planner rejects total exposure above the supplied cap.
The cap itself is not authenticated human authorization.

```sh
npm run escrow:plan -- /absolute/path/intent.json
```

The plan binds the checked-in blueprint and script hash
`b4f05c52f35ff19f653540cd9e3f4cd36ee420ad894ad503ab2039c7`, includes the
corresponding testnet enterprise script address, and emits `dispatchAllowed:false`.
It rejects mainnet and script-payment recipient addresses. Testnet encoding alone
cannot distinguish preview from preprod; configure and verify preprod network
magic independently. Preserve the complete staking credential in datum/payout
encoding. Any script/blueprint change invalidates the planner's fixed protocol
binding and requires a reviewed version change.

## Required before the first funded preprod lifecycle

1. Enroll named principal/provider humans and their signing addresses. Configure
   Blockfrost credentials locally and an external preprod signer; keep keys and
   seeds outside Git, the browser, model contexts and this server. Confirm network
   magic and obtain test funds. No such wallet setup is currently available.
2. Build a trusted coordinator which atomically reserves escrow, funding/closing
   fees and collateral exposure in MEW, records a durable funding outbox, and
   attests the exact resulting transaction output reference. Do not reuse the
   direct-transfer settlement amount as proof of total escrow lifecycle costs.
   Ambiguous funding retains exposure; a scan for matching hashes cannot authorize
   a replacement transaction. Repeated datum commitments are possible on chain.
3. Implement and independently test the transaction builder: CIP-19 address to
   datum encoding, CBOR round trips, actual minimum UTxO, fresh protocol parameters,
   Plutus V3 execution budget, script-data hash, separate ADA-only fee inputs,
   collateral accounting and required signers. No recipient-address input may be
   consumed in the closing transaction. Transaction selection may need a separate
   fee address even when controlled by a permitted signer.
4. Show the principal the exact script identity, datum, full recipient address,
   artifact digest and maximum lifecycle exposure. Review the actual serialized
   transaction before signing. LLM output cannot supply approval or alter it.
   Obtain independent contract/security review before funded use.
5. Rehearse isolated preprod funding, rejection cases, acceptance, cancellation,
   provider failure, restart and reconciliation. Persist immutable block/hash and
   output-reference evidence after independent verification. Separate principal
   artifact acceptance from payment observation and delivery evidence.
6. Add durable periodic re-observation and an operator quarantine path. A changed,
   missing or underconfirmed observation retains exposure and triggers review;
   it does not establish a refund, permit retry or automatically reverse a prior
   journal. Test this lifecycle end to end before enabling a worker.

These steps require implementation and external setup, not a change to a demo
flag. Mainnet is outside this prototype's release state.

## Read-only re-observation

Only use an independently verified, persisted observation:

```json
{
  "network": "cardano:preprod",
  "txHash": "<64 lowercase hex>",
  "blockHash": "<64 lowercase hex>",
  "blockHeight": 123
}
```

```sh
npm run cardano:observe -- /absolute/path/persisted-observation.json
```

Supply `BLOCKFROST_PROJECT_ID` through local private configuration. The CLI never
prints credentials. It queries only the fixed preprod origin with redirects
disabled. Default depth is three blocks. `STILL_OBSERVED` means only the indexer
currently reports the same transaction/block binding at sufficient depth; it is
not absolute finality, payer identity, artifact acceptance or refund proof.
`UNKNOWN` and `REVIEW_REQUIRED` block automatic dispatch. Every outcome prohibits
exposure release, automatic retry and a settlement claim. The helper snapshots
caller-owned fields before awaiting I/O and rejects unsafe confirmation counts.

This is not wired into existing settlement handlers. The current operation store
must gain a trusted immutable block binding and lifecycle integration before
periodic checks can protect a live worker. Never treat this standalone helper as
a complete production rollback solution.

## Source and review record

Used the installed Cardano Foundation `write-validator`, `review-contract` and
`explain-eutxo` procedures. One contract engineer implemented the validator; an
independent reviewer inspected the contract/planner and then re-observation. A
caller-mutation race found in the observer was fixed and covered by a regression
test. No signing or external monetary action occurred.

Primary references: [Aiken compiler release](https://github.com/aiken-lang/aiken/releases/tag/v1.1.23),
[Aiken validators](https://aiken-lang.org/language-tour/validators),
[CIP-19 addresses](https://github.com/cardano-foundation/CIPs/tree/master/CIP-0019),
[CIP-57 blueprint](https://github.com/cardano-foundation/CIPs/tree/master/CIP-0057),
[scure-base](https://github.com/paulmillr/scure-base),
[Blockfrost API](https://docs.blockfrost.io/).
