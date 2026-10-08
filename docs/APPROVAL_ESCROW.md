# Explicit acceptance escrow prototype

`contracts/approval-escrow` is a standalone Plutus V3 Aiken spending validator for **one individual ADA job cell**. It is compiled and locally tested, and has not been deployed, funded, signed or broadcast. It does not replace Masumi, implement a global mandate, or let model output approve money. MEW's existing reservation/accounting contracts remain unchanged.

The offline planner, fee/collateral budget, protocol identity binding, read-only
re-observation helper and remaining preprod gates are described in
[BLOCKCHAIN_PROTOCOL_RUNBOOK.md](BLOCKCHAIN_PROTOCOL_RUNBOOK.md).

The existing contract is now connected to private durable closing preparation and
external key-witness assembly; see [PAYMENT_SYSTEM.md](PAYMENT_SYSTEM.md). Its source,
compiled blueprint and address are unchanged. Local checks and simulated lifecycle
observations do not satisfy the funded preprod or independent-audit requirements.

The two terminal actions consume the escrow input once. `Accept` requires both the principal and provider payment keys in the transaction's required signatories, an exact match to the precommitted artifact digest, and a single payout of every locked lovelace to the provider's full address. `Cancel` requires the principal's required signature and pays every locked lovelace to the principal's full address. Cancellation is available immediately; there is no time-based automatic release.

## Immutable datum and action encoding

The datum is constructor 0 with these fields **in this order**. The generated CIP-0057 blueprint in `contracts/approval-escrow/plutus.json` is the serialization contract; human-readable JSON is not an on-chain datum.

| Field | Encoding and restriction |
| --- | --- |
| `version` | Integer `1` |
| `principal` | Aiken `Address`; 28-byte payment verification-key hash and complete optional staking credential |
| `provider` | Same address representation, with a different payment key from the principal |
| `objective_digest` | Exactly 32 bytes |
| `effect_digest` | Exactly 32 bytes |
| `artifact_digest` | Exactly 32 bytes |

The byte-array fields contain raw digest bytes, not a 64-character hexadecimal string. Address payment credentials use constructor 0 for a verification key and constructor 1 for a script. The address itself is constructor 0 with payment credential and optional staking credential. A staking key/script hash must be 28 bytes; pointer components must be nonnegative. Preserve the complete staking part when encoding and comparing addresses. Network ID is not present in Aiken's ledger address representation; the off-chain encoder must reject a network mismatch before any signing.

`Accept` is constructor 0 with one raw 32-byte artifact digest field. `Cancel` is constructor 1 with no fields. The constructor indices are part of the frozen prototype contract and changing them requires new source, blueprint, script hash and compatibility review.

Commitments are opaque hashes on chain. The validator checks their byte lengths and compares the acceptance artifact commitment; it does not infer a semantic objective, verify the report's quality, or prove a hash represents an independently reviewed model result. Agree on a versioned, domain-separated canonical encoding off chain, bind it to the reservation and selected funding UTxO, and display that exact datum and artifact in the principal's signing review. An acceptance digest must be known **before this cell is funded**; an unknown future artifact needs a separately designed transition protocol.

## Transaction constraints

1. Resolve the own input by the actual spend output reference. There must be exactly one matching input. It must carry a script payment credential and an inline datum which decodes to, and exactly equals, the handler datum.
2. Consume exactly **one payment-script input in the entire transaction**, including script inputs with another hash or a different staking credential. This intentionally excludes batch settlement and composition with another spending validator.
3. The entire transaction's consumed inputs and outputs must be ADA only. Minting and withdrawals are forbidden. Script reference inputs are not consumed and cannot provide payout authorization.
4. The escrow input must hold positive integer lovelace. There must be no output with its payment-script hash, even under a changed staking credential. Both actions are terminal.
5. There must be exactly one output to the selected recipient's **complete address**, containing exactly the input's locked lovelace. Split payouts, a substituted staking part, and fee deductions from this amount fail.
6. No consumed input may belong to that complete recipient address. Otherwise recipient-owned change could satisfy the payout without delivering the full net locked amount. Fee funding must use another address; the guard is address-specific, not an assertion about aggregate balances across addresses controlled by the same key.
7. `Accept` includes both principal and provider payment-key hashes as required signers and the exact artifact digest. `Cancel` includes the principal payment-key hash. Key-input witnesses alone must not be assumed to populate the script-visible required signatories.

Example transaction shape: a 5,000,000-lovelace escrow input plus a 1,000,000-lovelace ADA-only key input from another address; one 5,000,000-lovelace recipient output, 800,000 lovelace of change and 200,000 lovelace of fees. These numbers are test fixtures, not fee or minimum-UTxO estimates. Derive actual fees, script execution budget and minimum outputs from the selected preprod ledger parameters.

## Authentication and recovery limits

The ledger binds the spending validator to its actual input. Explicit signatures bind acceptance/cancellation to the datum's parties. Anyone can nevertheless create a look-alike UTxO at this script address carrying repeated objective/effect commitments. The script **does not authenticate the original funding transaction, enforce uniqueness of a job digest across cells, or reserve a global budget**. Only use the exact funding output reference attested by the persisted MEW reservation; do not identify a job by scanning for a matching datum. A thread token/shared authenticated state would be a different protocol requiring its own uniqueness proof and review.

Principal cancellation is unilateral: the principal may cancel after the provider does work. This prototype provides explicit approval custody, not trustless compensation, arbitration or a delivery SLA. A provider cannot claim without principal approval. A principal with a lost signing key cannot cancel. There is no admin recovery key. Funding with an invalid datum, native assets, or an amount below the ledger's spendable-output requirements can permanently strand value. Validate all these conditions before funding; a spending validator cannot prevent an arbitrary sender from depositing incompatible funds.

Local handler tests do not validate transaction balancing, collateral, script-data hash, protocol limits, actual wallet signatures or preprod inclusion. A third-party audit, measured serialized transaction evaluation, isolated preprod funding, verified reconciliation and a principal-approved signing process remain prerequisites to enabling live funds. Never treat benchmark coverage or an LLM verdict as a release signature.

## Reproduce local verification

Use the verified official Aiken `v1.1.23+8949565` executable and the pinned stdlib `v2.1.0` dependency in `aiken.toml`/`aiken.lock`:

```sh
cd contracts/approval-escrow
../../.local/aiken/aiken-aarch64-apple-darwin/aiken check --deny
../../.local/aiken/aiken-aarch64-apple-darwin/aiken build --deny
```

There are 49 local spend-handler unit tests: valid acceptance/cancellation, supported staking forms, both required signatures, artifact binding and lengths, version/address validation, fabricated/missing/hashed/malformed datum, own-reference resolution, full payout address, exact value, duplicate/split payout, recipient-owned change, script batching across hashes/staking credentials, native assets, minting, withdrawal and terminal continuation. The tests call the actual validator handler with complete transaction records built from the stdlib placeholder; they are not a separate JavaScript imitation of the validator. `test-results.json` contains the actual Aiken result and execution counts. The compiled `plutus.json` omits traces, and `verification.json` binds the compiler, source hashes, test report and blueprint to this local run.

The source uses stdlib directly, without another contract framework. Design guidance came from the read-only Cardano validator skill's boolean-toggle test method and official [Aiken validators](https://aiken-lang.org/language-tour/validators), [Cardano address encoding](https://github.com/cardano-foundation/CIPs/tree/master/CIP-0019), and [Plutus blueprint specification](https://github.com/cardano-foundation/CIPs/tree/master/CIP-0057). The project is independent of Masumi's payment validator and its externally managed state.
