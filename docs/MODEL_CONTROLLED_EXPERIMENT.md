# One prompt change, with real local inference

On 8 October 2026, MEW ran 24 new local generations: the unchanged baseline
system prompt and one candidate prompt, each on the same twelve frozen EN/FR
development cases. Both runs produced 12/12 valid advisory JSON contracts with
12/12 annotated supporting evidence supplied. **Semantic improvement remains
unmeasured and activation remains blocked.** These are previously inspected
development questions, not fresh customer cases.

The existing Qwen3-0.6B 4-bit model was loaded from verified local weights at
revision `73e3e38d981303bc594367cd910ea6eb48349da8`. No model was downloaded,
trained or activated; no paid provider call, wallet signature or broadcast ran.
The sandbox did not expose Metal, so the authorized offline runner used local
GPU access. The old benchmark, labels, prompts and response files were preserved.

## What changed and what stayed fixed

Only `systemPrompt` changed. The candidate asks for a direct answer in the
question's language, supports each material claim with supplied evidence,
distinguishes collection counts from customer outcomes, and requests required
validation when an outcome is not established. It inserts neither case IDs nor
gold answers. Its formulation was informed by known development failures, so it
cannot count as an unseen test.

Source bytes, retrieval order, three-parent context policy, exact chat template,
no-thinking renderer, output schema, weights, package versions, temperature zero
and 512-token output ceiling stayed fixed. Seed 42 was reset before each variant.
Baseline ran first, candidate second: this is one paired development run, with
no randomized ordering or repeated-run uncertainty measurement. The fresh
baseline's twelve exact response strings match the historical constrained run.

The largest baseline request used 3,596 tokens and candidate used 3,705, both
within the 8,192-token context limit including the 512-token output reserve.
Output totals were 906 and 784 tokens respectively. Saved generation elapsed
times exclude model loading and grammar compilation; they are not end-to-end
latency, billing or product-value measures.

## The remaining failures are concrete

These are agent observations, not authenticated human grades:

- `evidence-grounding-en`: baseline said 159 observations and 15 source calls
  showed improved research quality. Candidate says no supporting evidence is
  provided. That removes an unsupported assertion but still fails to describe
  the comparative, human-reviewed validation requested by the question.
- `unknown-exposure-en`: candidate says to verify payment terms, but omits
  retained exposure, reconciling the original effect and preventing duplicate
  spending while confirmation is unknown.
- `event-opportunity-en`: candidate makes an overly strong claim that no pilot
  opportunity is supported without observing the event. Public listings can
  guide qualified discovery while attendance and demand remain unproved.
- `event-opportunity-fr`: candidate renders the pilot as a driver and answers
  in English. Five of six candidate French cases remain visibly English or
  mixed-language; only `settlement-delivery-fr` is wholly French. This count is
  an agent's qualitative inspection, not a validated language score.

The exact old/new answers and observations are in
`research/experiments/prompt-grounding-language-2026-10-08/agent-observations.json`.
Do not promote this candidate merely because it stops one unsupported claim.
The observed omissions and language failures still matter to customers.

## Second candidate: localized instructions reveal a tradeoff

A separately bound follow-up ran twelve additional local generations in
`research/experiments/prompt-localized-action-v2-2026-10-08`, reusing the saved,
validated baseline for comparison. English/French system instructions are selected
only by each question's existing language metadata. They ask for a direct sourced
answer and the justified next action, without case IDs, gold criteria or answer
keys. Weights, sources, renderer, constraints, temperature and seed stay fixed.
The first preflight caught saved JSON key order differing from original renderer
order before any generation. The failed attempt was preserved locally, and the
corrected fresh run reconstructs the exact original input field order.

The localized run still passes 12/12 format checks and supplies 12/12 annotated
evidence. Agent inspection finds four of six French answers wholly French,
compared with one of six in candidate1; this is not a validated language score.
**Grounding regressed:** both customer-quality cases again claim collection counts
demonstrate customer improvement. Unknown-payment handling remains generic;
the event answer unnecessarily abstains or says a listing cannot guide a pilot;
the French training-rights answer repeats the question and invents missing evidence.
Better language alone does not justify promotion. Both candidates remain blocked,
with semantic scores null, zero authenticated human reviews and no customer holdout.

Inspect and review candidate2 without further inference:

```sh
node scripts/model-experiment-localized-audit.mjs \
  research/experiments/prompt-localized-action-v2-2026-10-08 \
  .local/localized-review-next
node --test tests/model-experiment.test.mjs tests/model-experiment-localized.test.mjs
```

The resulting `localized-review.html` exposes the full localized request, exact
source context and six independent review dimensions. After downloading notes,
rerun with a fresh output directory and `--notes /absolute/path/to/notes.json`.
Pack-bound self-declared labels still cannot establish reviewer identity or activate
anything. Twelve additional generations are reproducible with the existing model:

```sh
.local/ml-venv/bin/python scripts/model-experiment-localized.py \
  research/experiments/prompt-localized-action-replication
```

Preserve `model-experiment-localized-prompts.json` and both completed runner
versions: their exact bytes are bound in receipts. Further prompt sweeps on these
known questions would inflate development confidence; independent human error
review and an appropriately capable model comparison are the next useful steps.

## Inspect the evidence without another model call

The new experiment directory contains exact request JSON, rendered prompts,
response JSONL, verified weight receipt, package versions, policy and completion
hashes. `audit.json` binds them and remains BLOCKED. Its invocation markers and
token counts are local runner receipts; hashes prove byte identity, not genuine
inference or reviewer identity. The integrity object's `weightsExecuted:false`
describes the preflight inspection before the subsequent recorded inference.

From the repository root, use a fresh review directory:

```sh
node scripts/model-experiment-audit.mjs \
  research/experiments/prompt-grounding-language-2026-10-08 \
  .local/prompt-review-next
```

This produces separate baseline/candidate review pages and packs with full
source context, exact system/user/rendered input and six judgments: correctness,
relevance, citation entailment, language, abstention and economic authority.
Gold criteria appear only in the review pane. Requests contain only the actual
question and evidence. The inspector rejects leaked gold fields, changed sources,
extra renderer changes, changed code/model/schema, duplicates and incomplete runs.

Open each generated `*-review.html`, inspect the source passages, enter a
self-declared reviewer name and download annotations before closing the tab.
No annotations are stored automatically or transmitted. Import candidate notes
with another fresh output directory:

```sh
node scripts/model-experiment-audit.mjs \
  research/experiments/prompt-grounding-language-2026-10-08 \
  .local/prompt-review-annotated \
  --notes candidate /absolute/path/to/mew-semantic-review-notes.json
```

Pack/trace identities, note size and schema are checked. Self-declared annotations
remain development notes, with zero authenticated human reviews and no semantic
promotion score, even if every supplied judgment says pass. Separate pages expose
variant identity; blinded, randomized comparison is a future review improvement.

To reproduce the same two variants using the **existing** local model, select a
fresh child of `research/experiments`; old directories cannot be overwritten:

```sh
.local/ml-venv/bin/python scripts/model-experiment-local.py \
  research/experiments/prompt-grounding-language-replication
node --test tests/model-experiment.test.mjs
```

This runner intentionally has no provider fallback, download or training path.
Keep its bytes and the completed experiment policy unchanged. A future changed
prompt/decoder requires a separately versioned experiment and fresh receipts.

## What the team should do next

1. A domain reviewer inspects both traces and identifies material omissions and
   unsupported claims; distinguish that reviewer's actual identity from these
   agent notes. Preserve the raw failures.
2. Agree a customer task and preregister the rubric, success threshold and review
   method. Create new scenarios disjoint by lineage from these twelve families;
   keep them out of prompts, retrieval tuning and training. No customer holdout
   currently exists.
3. Compare a suitable existing model or a separately approved budgeted provider
   run with complete model/prompt/data traces. A small quantized model that keeps
   missing explicit language instructions should not be assumed fixed by more
   prompt prose. Credentials, cost control and durable private-provider run fences
   are a separate lane.
4. Activate only through an independently reviewed release process after those
   gates, authenticated delivery and production boundaries are satisfied. This
   research tooling never grants activation, training or payment authority.

## Sources actually consulted

The [Stanford CME295 2025 official syllabus](https://cme295.stanford.edu/syllabus/2025/)
links [Lecture 8: LLM evaluation](https://www.youtube.com/watch?v=8fNP4N46RRo).
We retrieved 2,191 English auto-caption segments, and read relevant sections;
we did not watch the video. Around 49:10–50:45 it recommends comparing automated
judgments with human ratings; around 106:00–108:50 it discusses benchmark
contamination and task-specific interpretation. Auto-captions can be inaccurate.
The 2026 evaluation lecture is future/unavailable, so this explicitly uses 2025.

The [pinned CS336 evaluation lecture source](https://github.com/stanford-cs336/spring2025-lectures/blob/b98b08a98d9d47a69bbdcb4e96a58aa48ee4d13b/lecture_12.py)
was read as text and not executed. Its relevant principle is to define the actual
goal a benchmark should measure. No course implementation was copied.

The existing [build-review-interface skill](https://skills.sh/ai-evals-course/evals-skills/build-review-interface)
was checked against its pinned upstream GitHub bytes at
`80d5f7b0127c7572ed9e9339937adbfd7240ffeb`. It informed a full-trace, structured
review UI, with MEW's explicit download-only persistence and no authority grants.
No new framework was installed. MIT/Harvard videos were not consumed in this lane.
Source hashes, access levels and adoption limits are in the experiment's
`sources.json`. Public caption access does not authorize model training.
