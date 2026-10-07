# Model quality and preprod payment evidence

On 8 October 2026, two offline gaps were closed: variant-labelled model review
and inspection of signatures returned with an escrow transaction. Neither tool
is an activation mechanism. The existing 36 local generations remain preserved;
no new inference, fine-tuning, paid provider call, wallet signature or broadcast
was performed. The cryptographic tests use fresh ephemeral fixture keys only.

## Blinded review of the actual failures

From the repository root, prepare a fresh private directory whose parent exists:

```sh
npm run model:blind-review -- .local/my-blinded-review
```

The command first runs the existing strict artifact auditors, then compares the
saved baseline with the saved localized candidate. All twelve questions and
exact answers are retained. Case order is random; A/B positions are balanced
separately within English and French. The HTML contains exact supplied context,
review-only criteria and six judgments for each answer. It omits variant labels,
system prompts, model identity and the mapping. Answer style and familiarity
with previous outputs can still reveal identity; this is not perfect blinding.

Share **only blinded-review.html** with a reviewer. Keep private-mapping.json
private until notes are finalized. All generated files are owner-only. Download
notes before closing; if browser downloads are unavailable, the export action
also prepares copyable JSON. Navigation and copyable export were exercised in
the in-app browser with explicitly ungraded agent fixture notes. A native
download was attempted but not verified. Full inference inputs remain in the
original experiment audits for post-review investigation.

Import saved notes without regenerating or changing the original mapping:

```sh
npm run model:blind-review -- .local/my-blinded-review \
  --notes /absolute/path/mew-blinded-review-notes.json
```

Import rejects stale hashes, duplicate pairs, changed mappings and authority
fields. It reports self-declared judgments by variant and language; semantic
passes stay null and activation remains false even for all-pass notes. Names
are not authenticated. This tool therefore cannot supply the independent human
review or customer holdout currently missing.

The observed development failures remain unsupported customer-improvement
claims, wrong-language answers, omitted retained-exposure/reconciliation steps,
unhelpful generic advice and unjustified abstention. Confirm their boundaries
with a domain reviewer before assigning prevalence or building an LLM judge.
Preregister a rights-cleared customer task and new scenario families; keep
translations/paraphrases in one lineage, and keep that holdout out of prompts,
retrieval tuning, calibration and training. Release criteria must separately
cover material grounding, useful action, requested language and authority.

After error review, a model-capability comparison is more useful than another
prompt sweep on these known questions. The official
[Qwen3-4B-Instruct-2507 model card](https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507)
describes a non-thinking instruction model with multilingual improvements. It
is a candidate to measure, not evidence of MEW quality: no weights were
downloaded or run here. If selected, bind the complete model/tokenizer/template
and conversion provenance, verify local memory/token limits, preserve the
baseline and record actual outputs/cost. Do not silently replace the historical
runner or activate a larger model on the 250 MB Railway demo container.

## Completed agent domain review

The prepared comparison now has a completed
[agent domain review](../research/experiments/agent-domain-review-2026-10-08/README.md).
All twelve pairs have source-bound notes finalized before this review opened the
mapping. They diagnose unsupported customer-improvement claims, incomplete UNKNOWN
guidance, language failures and unjustified event-opportunity abstention. French
language compliance improves from 2/6 to 4/6 in the localized variant, without
establishing semantic usefulness. These are unauthenticated development annotations,
not human labels or customer accuracy; semantic passes remain null. Run the
included read-only verifier to reproduce the original trace bindings and counts.
The [single capability-comparison plan](../research/experiments/agent-domain-review-2026-10-08/next-experiment.md)
requires independent customer evaluation preparation before a release decision.
No new generation, training or activation occurred in this review.

## Inspect an externally signed transaction offline

The trusted operator supplies the original builder arguments and a full
transaction CBOR hex file. This tool accepts a full transaction, **not** the
witness-set-only return value of CIP-30 signTx; a reviewed external workflow must
assemble that transaction first. MEW does not call the wallet API.

```sh
npm run escrow:witness-review -- \
  /absolute/path/operator-args.json /absolute/path/transaction.cbor.hex
```

The command reads bounded regular files without following the final symlink,
rebuilds the existing unsigned draft, then checks:

- exact original body and auxiliary bytes, true validity flag and signed size;
- the signed-size linear fee floor and unchanged decoded non-key witness content;
- only expected payment/required signer hashes, no repeated signing key or bootstrap witness;
- every supplied Ed25519 signature against the original body hash;
- missing required keys explicitly, including partial accept signatures.

CSL's JSON bridge normalizes witness-set tags, so both non-key sets are normalized
equally for content comparison. Raw body bytes are compared directly because
they define the signing hash. A completed cryptographic check still returns
signingAllowed=false, dispatchAllowed=false and paymentsEnabled=false. The tool
neither calls a provider nor updates the durable ledger or locks.

This is ADA escrow only. Native tUSDM accounting remains a separate in-memory
prototype without durable lifecycle integration. The full token policy/name,
exact atomic token amounts and separate ADA fees/collateral cannot be replaced
by a symbol or workspace credit.

Before any real signing/submission workflow, obtain approved external custody,
review payer/provider/fee-sponsor authority and debit caps, verify preprod node
context, re-observe and lock selected outpoints, and evaluate scripts against
the exact final body/current parameters. Testnet address bytes alone do not
distinguish preprod from preview. Operator input snapshots do not prove funds,
unspent inputs, current fee/slot acceptance or signer enrollment.

Commission an independent contract audit against the exact sources,
plutus.json, aiken.toml/aiken.lock and artifact digests, covering authority,
datum/redeemer substitutions, accept/cancel flows, fee/collateral/minimum-output
conservation, multi-asset exclusion and durable UNKNOWN/replay/rollback behavior.
The assessor must record findings and remediation evidence. Subsequently run
funded preprod funding/accept/cancel/refund lifecycle checks and independent chain
observations. Settlement and authenticated delivery stay separate. Retain
reservations and locks on uncertainty; no timeout permits replacement spending.

## Skill and handoff ownership

| Role | Project skill | Concrete output | Remaining external evidence |
| --- | --- | --- | --- |
| Model quality engineer | mew-blinded-model-review; error-discovery for an interactive human session | Immutable paired review pack, source-bound failure notes and a single controlled next experiment | Authenticated domain review and lineage-disjoint customer holdout |
| Payment integration engineer | mew-external-signer-review; mew-preprod-payment-review | Exact-body cryptographic review, missing-key report and original-operation reconciliation evidence | Custodian approval, funds, live lifecycle and independent audit |
| Release reviewer | mew-activation-orchestrator | Artifact-backed handoff with separate model/database/payment gates | Verified evidence for each proposed activation lane |

These are runnable engineering procedures, not claims that remote runtime agents
or independent auditors executed. No subagents ran in this contribution. The
installed error-discovery skill is available on the next turn; its interactive
human session was not invoked or simulated. Three skill frontmatters validated.

## Research used and deliberately excluded

The [skills.sh error-discovery bundle](https://skills.sh/ai-evals-course/evals-skills/error-discovery)
was installed at a pinned revision with license and hashes. Its human error
discovery approach informed the new review workflow; upstream auto-save/server
design was not copied into MEW's offline export boundary.
The publisher links [Shreya/Hamel's walkthrough](https://www.youtube.com/watch?v=tqUDjc1HzO4).
Its 331 English caption segments were retrieved; relevant sections about human
criteria, trace review and repeated error analysis were inspected. The video was
not watched and captions were not committed or used as training data.

The newly inspected pinned
[Cardano x402 verification reference](https://github.com/cardano-foundation/cardano-x402-facilitator/blob/97add9f8446630355d77f86c3d040c56e15ca5e4/docs/verification.md)
informed the unchanged-body and supplied-witness checks. Its payment rail,
submission and ordinary-transfer verification cannot replace MEW's escrow
contract evaluation or durable economic admission.
[judgy](https://github.com/ai-evals-course/judgy/tree/e6cd4fe96a0c843441c648e85d7be95d2ee81762)
was inspected for judge-calibration requirements; it was not installed or run,
because no independent human calibration labels exist. Existing CSL 15.0.3 was
reused; no new runtime dependency was introduced. Official Aiken testing and
MLX-LM references were inspected without replacing the compiled contract or
existing local inference environment. Pins/access limits are recorded in
research/activation/unblocking-sources.json.
