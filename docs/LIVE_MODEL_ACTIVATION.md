# MEW model activation: measured progress and remaining proof

Reviewed 8 October 2026. The current model lane is **blocked for production**.
This procedure supports a controlled advisory evaluation; it never enables
financial authority. Payment and audit lanes must produce their own evidence.

The current code already has real-provider transport, authenticated private
routes and a durable attempt budget. Access to that transport is separate from
proving that the answers are useful, grounded and safe for a pilot.

| Experiment                                       | Observed evidence                                                                                                                        | What it does not establish                                                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Four private synthetic first-task fixtures       | Runtime contracts and expected ACCEPT/REJECT/ABSTAIN checks; provider not called in this work                                            | Complete six-task compact workflow, semantics, billing or customer value                                                         |
| Six-task CLI compact workflow                    | Separate opt-in fixture harness exists                                                                                                   | Durable private attempt budget or customer holdout; do not bypass the private fence with this CLI                    |
| Frozen twelve-question benchmark                 | Six paired EN/FR development families, agent-reviewed labels, SHA-256 `0ab4d24bf6c71ab886456cc74eaa760b4674bc44a19d27cb21da34b11cd2d738` | Human-approved labels or independent test data                                                                       |
| Expanded parent context, same local base weights | 12/12 exact annotated evidence coverage; 0/12 strict output contracts                                                                    | Correct answers from available evidence                                                                              |
| Later Outlines-constrained local decoding        | 12/12 strict output contracts and 12/12 annotated evidence coverage                                                                      | Semantic correctness, citation entailment or requested-language fidelity; all twelve semantic reviews remain pending |
| Customer pilot holdout                           | Not present                                                                                                                              | No customer efficacy or generalization result can be claimed                                                         |

The latest constrained run is a real improvement in serialization. The raw
`evidence-grounding-en` response nevertheless claims that collection counts
prove improved customer research quality; `rail-mismatch-fr` answers in English.
These are agent-observed failures, not human grades. A new decoder cannot remove
these failures by making its JSON valid. See the preserved
[constrained audit](../research/learning/frozen-0ab4d24bf6c71ab8/constrained-parent-audit.json)
and [raw responses](../research/learning/frozen-0ab4d24bf6c71ab8/constrained-parent-responses.jsonl).

## Runnable work now, without credentials or new services

From the repository root, inspect the actual artifacts and reproduce code checks:

```sh
node .agents/skills/mew-live-model-evaluation/scripts/inspect-evidence.mjs
node --test tests/model-evaluation.test.mjs tests/parent-model-audit.test.mjs tests/model-review.test.mjs tests/integration.test.mjs
node scripts/evaluate-model.mjs
```

The first command reads and binds frozen artifacts without rewriting them or
running inference. Its output is a `mew.activation-evidence.v1` blocked handoff.
The last command is the deterministic all-abstain baseline, not a real model.
Scripts which generate frozen experiment files deliberately refuse overwrites;
do not rerun local generation into existing run paths. Create a versioned new
experiment when changing a model, prompt, renderer, schema or decoder.

Use the original
[model-evaluation skill](../.agents/skills/mew-live-model-evaluation/SKILL.md)
and [evaluator system prompt](../prompts/activation/model-evaluator.md). The prompt
is an offline reviewer instruction; it is not wired into the existing provider
or runtime contracts.

## First private provider attempt

Follow [the private integration setup](SUPABASE_MODEL_PAYMENTS.md) for the
dedicated `mew_runtime` login and owner-only configuration. The role is currently
NOLOGIN until securely provisioned. Keep provider keys outside the public Railway
service, frontend, repository and chat. Configure an explicit model ID,
`OPENAI_API_KEY` and `MEW_APPROVE_MODEL_USAGE=yes` locally, with an operator-reviewed
provider project budget. The historical US$10 deployment allowance is a shared
cap, not permission to exhaust it on model calls; allocate an explicit remaining
model allowance and use provider enforcement rather than token estimates alone.

Start `node scripts/integration-host.mjs /absolute/private/config.json`. The host
binds to 127.0.0.1. Call authenticated POST `/integration/model/evaluate` with
exact body `{ "id": "first-evaluation" }` through the existing enrolled bearer
policy. Prefer a trusted local HTTP client or secret-aware API tool that loads
the token from a private file; do not put its value in command arguments or
copied logs. The shipped private path permits one run per principal, at most
four calls, 512 output tokens per call and 64 KiB input per case.

RUNNING, COMPLETE and UNKNOWN runs cannot request the provider again. A timeout
does not prove the call was unbilled. Inspect the saved run and reconcile usage
before any separately reviewed new experiment; changing the ID is not a retry
policy. `scripts/evaluate-model.mjs --live` lacks the private durable fence and
is therefore not the activation path recommended here.

This step remains unavailable without actual local credential configuration.
No provider call was made during this research and skill-building task.

## Promotion evidence missing from the current harness

`evaluateProvider` stores contract validity, decision, latency and aggregate
counts. It does **not** retain each raw advisory response, rendered context,
provider request ID, returned model identity, token usage or cost. The private
run contract binds model alias, company policy digest and fixture digest but not
the harness code hash, output schema hash or full context renderer version.
That is sufficient for its bounded fixture purpose, not a complete promotion
receipt. Add a reviewed trace adapter before claiming real evaluation proof;
preserve raw provider output privately with retention/access policy, and publish
only sanitized hashes and counts. Do not log keys or real customer payloads.

For a new experiment, freeze the following before any candidate calls:

| Bound item               | Required receipt                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Code and dependencies    | Git revision plus lockfile and harness hashes; dirty-file hashes if applicable                                |
| Model                    | Immutable weight/API snapshot where supported; returned model identity and documented uncertainty for aliases |
| Prompt and context       | Exact prompt/renderer/tokenizer hashes; per-case ordered source IDs, content hashes and token fit             |
| Data and output contract | Dataset/lineage/source-snapshot hash and exact output-schema hash                                             |
| Run controls             | Seed/settings where supported, call/token/time limits, durable run ID and allowed cost                        |
| Results                  | Raw output hashes, errors, latency, actual provider usage and private billing evidence                        |
| Review                   | Rubric version, authenticated human reviewer, supplied passages and per-case judgments                        |

Hashes establish byte identity. They do not authenticate inference, establish
reviewer consent or prove semantic truth.

## Smallest credible semantic and customer evaluation

Have a domain human review the existing twelve constrained responses against
the full traces. Grade material correctness, answer relevance, citation
entailment, appropriate abstention and requested language separately. Record
unsupported statements, economic-authority confusion and source contradictions
as named failures. Do not promote missing judgments to PASS. Existing agent
notes can prioritize work; they cannot supply human approval.

Next freeze new pilot families for one narrow product: e.g. evidence-backed
clipping-pilot recommendations with no publishing or payments. Include supported
requests, missing evidence, contradictory mandates, source injection and EN/FR
variants. Keep all variants of a scenario in one lineage. New product holdout
must be separate from prompt-development examples, judge-calibration examples,
fine-tuning data and the frozen twelve-case benchmark. Precommit release
criteria, language strata, latency/cost limits and critical authority failures
with the pilot owner before seeing candidate outputs. Small samples provide
limited confidence; report denominators and uncertainty rather than general
performance claims.

Use deterministic code for schema, exact IDs and authority boundaries. If an LLM
judge is introduced, calibrate it against domain-human Pass/Fail labels on
separate splits. Report false passes and false fails with confusion-matrix
denominators. The pinned `validate-evaluator` procedure suggests separate
few-shot/dev/test splits and TPR/TNR; its suggested thresholds are not a MEW
policy. A judge cannot approve itself or sign a release.

Fine-tuning comes only after measured semantic failures persist despite context
and prompt fixes. It additionally requires genuinely human-reviewed,
reuse-approved training records, no benchmark-family leakage and a frozen base
comparison. Public papers, captions and repository examples are learning
references, not automatically training-approved samples. No adapter was trained
by this work.

## Sources adopted and deliberately limited

The [source register](../research/activation/model-sources.json) pins inspected
repository files, licenses and source access. Existing `eval-audit` and
`evaluate-rag` skills already come from `ai-evals-course/evals-skills`. The new
MEW skill contains a reviewed, unchanged Apache-2.0 `validate-evaluator`
reference and original project-specific guidance.

The publisher-linked [Shreya Shankar video](https://www.youtube.com/watch?v=tqUDjc1HzO4)
now has retrieved English captions: 331 segments, SHA-256 recorded, raw captions
kept locally and excluded from training. At about 02:40–03:20 it separates
analyzing failures, measuring them and improving the product; around
08:20–11:10 it uses AI to organize trace-review interfaces while humans annotate
and refine failure categories. MEW applies that method to the preserved failed
responses, rather than granting evaluator authority from aggregate scores.
These are bounded paraphrases of retrieved captions, not claims to have watched
the video or permission to reproduce its transcript.

[Promptfoo](https://github.com/promptfoo/promptfoo/tree/2dbf3ecc75966e6d924c2c9dde5bcbd5c0cd2d2f)
is a useful candidate for a later local comparison matrix and regression
assertions. Its pinned LICENSE is MIT, but its SECURITY.md treats configs,
assertions, providers and referenced scripts as trusted executable content;
do not expose its local viewer as a production service or import unreviewed
prompt packs. No dependency was installed or eval data uploaded.

[MLflow's official skills](https://github.com/mlflow/skills/tree/c55c66586a35f7e3f2a377bfc462ef9791fbc3f4)
offer trace-linked dataset/scorer tracking. Their workflow prescribes MLflow
APIs and a tracking setup; importing that skill verbatim would replace the
existing evaluator and introduce another data service. Its Apache-2.0 skill is
reviewed as an optional trace-adapter reference, not installed or claimed live.
Framework adoption should solve a measured gap, preserve privacy and fit the
remaining budget.
