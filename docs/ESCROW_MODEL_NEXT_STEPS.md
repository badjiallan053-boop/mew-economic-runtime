# Escrow and model readiness: implemented follow-up

## What changed

The local model now passes **12/12 strict response-contract checks** with the
same verified Qwen3-0.6B weights and receipt-bound three-parent contexts. The
original unconstrained **0/12** run is preserved. Outlines 1.3.3 constrains the
JSON shape, source-reference choices and advisory authority field. This is a
separate decoding-policy experiment: answers are limited to 1,000 characters,
with a 512-token generation cap. It is not a fine-tuning improvement or an
independent customer evaluation.

Grounding and language quality still block activation. An English answer turns
source-collection counts into a claim that customer research improved; several
French answers mix languages or fail to answer the question. Valid JSON and
references to supplied sources do not establish entailment. These observations
are developer diagnostics, not human labels or semantic scores. No adapter was
trained and no model/payment authority was enabled.

Unsigned funding, acceptance and cancellation transactions now serialize with
Cardano Serialization Library 15.0.3. The builder checks the compiled Plutus V3
identity, inline datum, full recipient address, ADA-only inputs, minimum output
ADA, fee budgets, explicit collateral, value conservation, script-data hash,
required signers and CBOR round trips. It does not select wallet inputs, sign,
submit or authorize a transaction. Supplied UTxOs and parameters remain trusted
operator inputs requiring fresh independent verification.

A private `EscrowStore` reserves the complete lifecycle budget and journal in one
SQLite transaction. It pins enrolled public addresses, the prepared transaction
hash and input locks. Funding observation binds the exact script output; only
one closing action can follow. Unknown submission survives restart. Changed or
unavailable saved observations quarantine the operation without overwriting its
original binding. Acceptance/cancellation observations do not prove delivery or
release fees, collateral or budget. The complete reserved exposure stays held
until a separate authorized reconciliation procedure is implemented.

Backup validation now checks escrow policy presence, economic bindings, CBOR
transaction hashes, actual input locks, plan-bound datum/payout/signers/redeemer/script witness,
phases, observations and funded output
references. Restore remains isolated and cannot resume spending. A separate AI reviewer found two backup gaps: missing journal/lock inspection,
and failure to compare stored transaction semantics with the intent. Both were
fixed and covered by tampering regressions. This is local library integration,
not an authenticated hosted worker or public signing route.

Final local verification: 240 application tests, 49 Aiken tests and four model
artifact-integrity tests pass; the website build succeeds. Compiled transaction
checks pass four positive and four missing-approval negative cases. Remote CI
status and any hosted deployment must be verified separately.

## Reproduce without keys or network transactions

Use Node 24 from the repository root:

```sh
npm ci --ignore-scripts
npm test
npm run build
npm run escrow:rehearse
npm run learning:constrained-audit
python3 scripts/install-aiken-local.py
npm run escrow:evaluate-fixtures
```

The rehearsal uses explicitly synthetic addresses/UTxOs and historical protocol
parameters. It exercises a real unsigned CBOR draft, restart and isolated backup
restore. It never submits anything. The parameter fixture was collected from
public preprod Koios endpoints; its capture time is preserved and it cannot be
used as fresh signing evidence. Tests deliberately use its recorded time.

The compiled-script evaluation exercises four acceptance/cancellation transactions
with both input sort orders and rejects four missing-approval variants. It
measures execution costs, rebuilds with a 10% fixture budget margin, then evaluates
the final transaction again. Aiken's simulator uses its built-in cost model;
these results are phase-two fixture checks, not current node protocol acceptance,
signature verification or confirmation of existing UTxOs. Provider evaluation of
the exact final transaction remains required before funded use.

To construct a review-only draft from operator-supplied inputs:

```sh
npm run escrow:build -- /absolute/path/transaction-inputs.json
```

The JSON must contain exactly `intent`, `action`, `inputs`, `feeAddress`,
`collateral`, `escrowInput`, `parameters`, and `executionUnits`. Use the field
shapes in `tests/helpers/escrow-fixture.mjs` and the builder tests as examples,
replacing synthetic values with independently verified public chain records.
Parameters must explicitly identify preprod magic 1 and be at most ten minutes
old. Testnet address encoding alone cannot distinguish preview from preprod.
Closing requires the exact persisted funding output/datum and a separate fee
address from the payout address. Selected collateral is fully exposed; there is
no collateral-return output. A caller-supplied execution budget is not evaluation
proof. Every draft explicitly returns signing and dispatch disabled.

## Operator sequence for the remaining live gates

1. Create or select an external wallet that supports **Cardano preprod**, verify
   network magic 1 and record only its public signing addresses. Fund it with
   test ADA through the official faucet. Keep seeds and private keys in the
   wallet; never put them in this repository, model prompts or application.
   Obtain separate principal/provider approvals and a suitable fee address.
2. Configure a preprod Blockfrost project locally. Use the existing private
   configuration path/secret manager; do not paste credentials into chat or
   commit them. Read current protocol parameters, selected ADA-only UTxOs and
   tip from trusted providers, and independently verify the funded addresses.
3. Enroll public party identities through an authenticated operator boundary.
   The private coordinator constructor is not an enrollment API. Allocate a
   separate live database and durable volume; freeze competing writers and
   reconcile all reserved inputs. Prototype input locks never expire or release
   automatically, including when the transaction validity interval expires.
4. Commission an external contract audit. Review immediate principal
   cancellation, full-address payout/change restrictions, budget/fee handling,
   datum commitments, signer approvals and compiled artifact identity. The
   separate AI code review performed here is not that audit. An artifact digest
   committed before funding does not verify quality or guarantee provider pay.
5. Add trusted evaluation and human transaction review outside model control.
   Evaluate the exact balanced draft against current preprod parameters/UTxOs,
   rebuild with the returned execution units, then re-evaluate the final hash.
   A stale draft may require a new reviewed operation/reconciliation; never
   replace a journalled hash after an uncertain submission. This implementation
   intentionally offers no automatic replacement or retry path.
6. Only after those gates, implement a restricted external signer integration
   and idempotent broadcaster, independently inspect the exact datum, recipient,
   approval keys and maximum lifecycle exposure, then perform the first funded
   lifecycle. Save chain receipt bindings, restart and re-observe them. Reconcile
   actual fees/collateral and any refund separately before releasing capacity.
   No step in this list has already signed or broadcast a transaction.

Official setup references: [preprod environment and genesis](https://book.world.dev.cardano.org/environments/preprod/),
[Cardano testnet faucet](https://docs.cardano.org/cardano-testnets/tools/faucet),
[Blockfrost documentation](https://docs.blockfrost.io/).

## Model gates and the next experiment

Keep the frozen twelve cases immutable and excluded from training. Recruit human
reviewers to label answer support, correct abstention and EN/FR fidelity, and
create a disjoint customer holdout. Evaluate a suitable instruction model with
this same constrained output policy before choosing training. Train only on
separately authorized, human-approved examples of demonstrated failures. Record
model revision, source rights, raw outputs, decoding policy and evaluation split.
Promotion requires grounding, language, abstention, latency and memory checks;
format validity alone must never activate a model or grant financial authority.

The observed Apple Silicon Python 3.12 package versions are captured in
`research/learning/constrained-runtime-requirements.txt`; this is an environment
record, not a cross-platform lock. The generation script refuses to overwrite
the recorded experiment. A new experiment must use a separate artifact identity.

Actual raw outputs and hashes: `research/learning/frozen-0ab4d24bf6c71ab8/`.
Compiled fixture checks: `research/cardano/escrow-uplc-evaluation.json`.
Skill/package/caption provenance: `research/cardano/integration-research-provenance.json`.

## Skills and video context used

Reviewed selected skills from skills.sh discovery at pinned GitHub revisions:
[MeshJS Cardano](https://github.com/flux-point-studios/cardano-agent-skills/blob/727e02f3f7849b06a3e112dffe1c901840e1da51/skills/meshjs-cardano/SKILL.md)
and [Outlines](https://github.com/orchestra-research/ai-research-skills/blob/773a52944ba4747a18bd4ae9ade53fff041adcbc/16-prompt-engineering/outlines/SKILL.md).
Selected files were reviewed locally; their scripts/dependency bundles were not
blindly installed. Older skill examples were checked against current official
APIs. Existing Cardano Foundation transaction/review procedures also informed the
work. MEW uses CSL directly for the prototype transaction boundary.

Public captions were actually retrieved for the
[Aiken developer interview](https://www.youtube.com/watch?v=JWmvVJz_X1M&t=613s)
(transaction-context evaluation discussion, 10:13–12:24) and a
[local llama.cpp guide](https://www.youtube.com/watch?v=EPYsP-l6z2s&t=2112s)
(structured-output discussion, 35:12–37:15). They provided context; the implementation
uses [official Outlines APIs](https://dottxt-ai.github.io/outlines/latest/api_reference/),
[CSL](https://github.com/Emurgo/cardano-serialization-lib),
and [pinned Aiken simulator source](https://github.com/aiken-lang/aiken/blob/v1.1.23/crates/aiken/src/cmd/tx/simulate.rs).
No captions were committed as training data, and public availability does not
establish redistribution or training rights.
