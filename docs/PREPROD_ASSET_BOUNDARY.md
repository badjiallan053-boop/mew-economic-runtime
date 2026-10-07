# Preprod asset-aware accounting boundary

`src/integration/asset-mandate.mjs` is a separate deterministic, **in-memory accounting prototype** for ADA plus explicitly enrolled Cardano native assets. It does not modify the existing lovelace kernel, PostgreSQL reservation store, escrow contract, MPS connector or HTTP endpoints. No native-token payment execution is enabled. ALLOW means this prototype reserved accounting capacity; every result explicitly retains `dispatchAllowed:false`.

## Exact contract

An immutable mandate has exactly:

```js
{
  schema: 'mew.asset-mandate.v1',
  network: 'cardano:preprod',
  principal: 'payer', objectiveId: 'report', semanticKey: 'one-report',
  quantity: 1,
  maxAdaOverheadAtomic: '6000000',
  caps: [
    {asset: {kind: 'lovelace'}, maxAtomic: '10000000'},
    {asset: {
      kind: 'native',
      policyId: '16a55b2a349361ff88c03788f93e1e966e5d689605d044fef722ddde',
      assetNameHex: '0014df10745553444d'
    }, maxAtomic: '1000000'}
  ]
}
```

The example unit is currently listed by [official Masumi preprod identity/pricing documentation](https://www.masumi.network/dev/masumi/documentation/technical-documentation/agent-identity-nft). It is an illustrative operator enrollment, not a claim that this wallet holds the asset, that a live quote accepts it, or that its policy is independently verified. Recheck the deployed MPS version and authenticated terms before any future purchase. Display symbols do not establish asset identity, and stale mainnet examples are not imported.

A reservation request has exactly `id`, `principal`, `objectiveId`, `semanticKey`, `providerId`, `network`, `asset`, `amountAtomic`, `adaOverheadAtomic`. The amount is positive; overhead may be zero. All amounts and caps are canonical decimal strings with at most 30 digits, parsed with BigInt. Numeric JSON, bigint input, signs, fractions, leading zeroes, exponents and larger inputs are rejected. This is the prototype's bounded arithmetic policy, not a claim that every admitted value is ledger-serializable or economically meaningful. A future transaction builder must enforce actual ledger value and serialization limits.

Assets are either exactly `{kind:'lovelace'}` or exactly `{kind:'native',policyId,assetNameHex}`. The policy is 56 lowercase hex characters; the name is even-length lowercase hex of 0–32 bytes. Empty names are valid. Native identity is the full concatenation; neither a token symbol nor a CIP-14 display fingerprint is admitted. One ADA cap is mandatory, up to eight distinct asset caps are supported, quantity is 1–100, and the explicit overhead subcap cannot exceed the total ADA cap.

## Independent caps and retained uncertainty

For a native-token purchase, the token principal consumes only its exact native cap, while `adaOverheadAtomic` independently consumes the lovelace cap and ADA-overhead subcap. For an ADA purchase, its principal plus overhead consume the same lovelace cap, while overhead also consumes its subcap. There is no exchange rate or common total across tokens; spare ADA cannot compensate for exceeded token capacity, and spare tokens cannot compensate for insufficient ADA overhead.

The host must conservatively populate overhead from actual fees, minimum outputs/change and collateral/execution risk. This library does not estimate them, select funding/collateral UTxOs or prove funds exist. A supplied zero overhead is an accounting input, not a fee-free chain transaction certificate. Multiple enrolled assets remain independently capped across reservations, and every reservation consumes objective quantity.

Exact reservation replay returns DEFER. Reusing its ID with another provider, asset, amount or mandate identity returns DENY. UNKNOWN changes no quantity or asset exposure. There is deliberately **no release, refund, settlement or delivery API**: no native-token trusted rail-evidence adapter exists here. Timeout, model output and a caller-provided verified flag cannot restore capacity. Future release must first implement an authenticated operation-bound native-asset lifecycle, preserve spent ADA fees separately and distinguish returned principal from nonrefundable overhead.

## Snapshot and integration boundary

`snapshot()` produces JSON-compatible cloned mandate/reservation data; `AssetMandate.restore(snapshot)` reconstructs every reservation through the same budget/identity checks. Duplicate reservations, over-cap data and fabricated terminal statuses are rejected. Caller mutations cannot change private runtime state. Restoration checks structural/accounting invariants, not snapshot provenance: an attacker able to replace the entire snapshot can erase history or change the mandate. Store snapshots only in an authenticated transactionally coordinated ledger with integrity/revision checks.

This prototype has no persistence, principal authentication, outbox, concurrency across processes, wallet control or dispatch authority. Before live integration, version the private SQL contract; bind the exact accepted quote/network/full unit, principal/objective/effect/provider/job and all ADA overhead components; atomically commit asset reservation, immutable operation/outbox and globally unique input locks; verify restart/contention/replay; connect an explicitly approved external signer only after independent audit. Never translate this snapshot into the old kernel's lovelace `amount` field.

## Research and verification

The [official Cardano native-token reference](https://developers.cardano.org/docs/build/smart-contracts/lessons/theory/native-tokens/) establishes complete policy/name identity, integer asset quantities and ADA overhead obligations. The pinned Masumi API adapter remains at commit `5fccf58b0f30873085b59ee540c67b4ae8433cd0`, raw SHA256 `4e1372584ae025b9b83cecf5253a028bbe5bbd2018489ac66f735386f565e950`; its existing local evidence is `research/contracts/masumi-5fccf58.json`. That pin establishes a reviewed source interface, not a deployed matching node. Existing MPS connectivity is read-only; this accounting primitive is not an implementation of its purchase/withdrawal protocol.

[MIT OCW Blockchain and Money study questions](https://ocw.mit.edu/courses/15-s12-blockchain-and-money-fall-2018/pages/study-questions/) provide conceptual UTxO and settlement/counterparty-risk context. Their Bitcoin/course questions do not specify Cardano API behavior, demonstrate MEW efficacy or supply an audit. No course video was watched or transcript extracted by this workstream. [skills.sh test-driven-development guidance](https://www.skills.sh/addyosmani/agent-skills/test-driven-development) informed meaningful failing-first tests; no external executable skill package was installed.

```sh
node --test tests/asset-mandate.test.mjs
```

Twelve tests cover independent caps, ADA overhead, unsupported policy/name, replay/identity, retained UNKNOWN after restoration, large exact amounts, malformed integers, snapshot mutation/forgery, duplicate caps, mainnet exclusion, three asset caps and empty names. These tests establish prototype arithmetic/accounting behavior, not a funded payment or durable production ledger.
