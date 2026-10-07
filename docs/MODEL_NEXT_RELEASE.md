# Model next release: review the latest answers, then freeze a customer holdout

Reviewed 8 October 2026. The next useful model step is a domain review of the
latest constrained answers. More papers or format fixes cannot establish answer
quality. The current 12/12 results mean exact annotated evidence was available
and each output met the strict contract. Semantic correctness, citation
entailment and customer efficacy remain unmeasured.

The existing review interface displayed only the earlier base and prompt-v2
runs. This contribution adds a separate review pack for the latest twelve
constrained outputs. It preserves the old experiments, source bytes, prompts
and benchmark. It performs no model call, training, wallet operation or upload.

## What the actual answers still get wrong

These are agent observations from preserved raw answers, not human grades or
an accuracy estimate. Each ID links back to the exact question and response in
`research/learning/frozen-0ab4d24bf6c71ab8/constrained-parent-responses.jsonl`.

| Case                    | Actual response excerpt                                                                                      | Missing or incorrect behavior                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `unknown-exposure-en`   | “consider the implications … potential for financial uncertainty”                                            | Generic advice omits the required retained exposure, original-effect reconciliation and prohibition on timeout release or redispatch.                                                                  |
| `unknown-exposure-fr`   | “Unagent must ensure that all payments are confirmed and settled”                                            | English answer to a French question; does not explain retaining the original unresolved commitment.                                                                                                    |
| `evidence-grounding-en` | “159 observations and 15 source calls … show that MEW's data and analysis improve customer research quality” | Collection counts do not establish comparative customer improvement. The criterion asks what evaluation and consented outcomes would support that claim.                                               |
| `evidence-grounding-fr` | “The data shows that MEW has improved the quality of client research”                                        | Unsupported improvement claim, expressed in English rather than French. Valid cited IDs do not establish entailment.                                                                                   |
| `rail-mismatch-fr`      | “No, an preprod transaction does not prove a mainnet revenue.”                                               | Directionally rejects the inference, but requested French is not followed; separate material correctness and language judgments are needed.                                                            |
| `event-opportunity-fr`  | “cannot orient a driver” and `docs/learning/events.mjs`                                                      | Mistranslates a pilot opportunity, states an incorrect absolute limitation and invents a document/link within the answer. Field-level citation validation cannot detect all invented prose references. |
| `training-rights-fr`    | Repeats the question about using a public message for training                                               | Fails to answer visibility versus reuse permission. A schema-valid question echo is not an appropriate abstention or useful answer.                                                                    |

Some other answers preserve useful boundaries, such as settlement not proving
delivery. They still need human review of completeness and all cited passages;
this document does not assign them PASS. All twelve remain unreviewed.

## The new runnable review

From the repository root, choose a **new** private output directory:

```sh
node scripts/model-semantic-review.mjs .local/model-review-2026-10-08
```

The directory is created with owner-only permissions, and files are 0600.
Existing directories/files are not overwritten. Open its `model-review.html` to
review the exact latest answers and supplied source snapshots. It provides six
separate judgments: material correctness, answer relevance, citation entailment,
requested language, appropriate answer/abstention and economic authority.
Compare each claim with the actual cited passage; visible source identity alone
does not settle the question. Gold case criteria are shown to the reviewer,
never added to the original model prompt.

Download annotations before closing the tab. The review is local and deliberately
download-only: no network, browser storage or hidden automatic submission. The
name and reviewer type are **self-declared**, and agent notes stay agent notes.
No authenticated human-review service is claimed.

Import downloaded notes into another new private output directory:

```sh
node scripts/model-semantic-review.mjs .local/model-review-import-2026-10-08 --notes /absolute/path/mew-semantic-review-notes.json
```

The tool validates exact pack/trace hashes, case identity, separate judgments,
bounded observations and reviewer type. It rejects duplicate or unknown cases,
changed snapshots, injected authority fields and claimed authenticated identity.
Notes are read as bounded regular files before parsing; symlinks are rejected
where the platform supports O_NOFOLLOW. The existing frozen corpus is validated
against its manifest, and decoding policy, schema, prompt/model/context receipts
and generation script must remain bound to the preserved run.

Output includes `model-review-pack.json`, a notes template, the self-contained
HTML and `model-review-readiness.json`. The measured prepared pack contains
**12 cases, 12 strict contracts and 12 exact annotated coverage checks**. With
no annotations, all **72 dimension judgments are unreviewed**. Semantic passes
are **null**, not zero accuracy. Even twelve imported self-declared all-pass
annotations keep the readiness verdict BLOCKED and all activation/training/
payment flags false. Annotation counts describe submitted notes, not verified
model performance. Local hashes prove byte integrity rather than human identity
or authenticated inference.

## What closes the real gates

1. **Domain review:** inspect this pack and identify unsupported claims,
   incomplete answers, wrong-language responses and inappropriate abstention.
   Record source spans and raw-response hashes. A separate trusted process must
   establish human reviewer identity and sign-off; this offline page cannot.
2. **Controlled improvement:** choose one measured failure to fix, preserve the
   baseline and change one experimental variable where feasible. Do not relabel
   the twelve development cases or repair answers to inflate format scores.
3. **Customer holdout:** preregister a narrow pilot, explicit release criteria,
   representative supported/unsupported/contradictory/injection cases and
   language strata. Use new human-reviewed scenario families. Translations and
   paraphrases stay in one lineage; benchmark families, judge calibration and
   training data must be disjoint from the customer holdout. No holdout currently
   exists, and this tool does not manufacture one.
4. **Provider evidence:** securely configure the private login/model allowance
   and run the existing durably fenced provider fixture when available. Retain
   raw per-case outputs, actual usage and full promotion provenance through a
   reviewed private trace adapter. The current aggregate fixture harness cannot
   substitute for this evidence, semantic review or the customer holdout.

Fine-tuning additionally needs genuinely reviewed, reuse-approved training
examples and a frozen base comparison. Public references, self-declared notes
and this development benchmark do not grant training permission. The deterministic
economic kernel remains authoritative regardless of eventual advisory quality.

## Verification and reference use

Eight focused tests passed for exact latest-context binding; substituted
benchmark/renderer/decoder/script rejection; null versus unreviewed semantics;
self-declared all-pass non-promotion; stale/forged/incomplete annotation rejection;
retained agent provenance; hostile-content rendering; and bounded regular-file
reads including symlink rejection. The existing model review remains intact.

The already-installed skills.sh `build-review-interface` source was reverified
against pinned `ai-evals-course/evals-skills` revision
`80d5f7b0127c7572ed9e9339937adbfd7240ffeb`. Full trace display, reference passages,
separate reviewer observations and safe rendering informed this original tool.
The download-only persistence choice is explicit; no upstream executable or
additional dependency was installed. Its Apache-2.0 provenance and the actual
source digest are recorded in
[model-next-sources.json](../research/activation/model-next-sources.json).
Existing `evaluate-rag`, `eval-audit` and `mew-live-model-evaluation` maintain the
distinction between retrieval, generation and calibrated judgment.

Browser visual/accessibility review is separate from these code checks. No
provider credentials, billing evidence, authenticated review, training or
production activation was created by this contribution.
