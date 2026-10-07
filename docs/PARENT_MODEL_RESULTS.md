# Expanded-context generation result

Actual local base inference was performed on all twelve frozen EN/FR development
questions using the three-parent context policy. All annotated supporting passages
were present: **12/12**. Strict advisory response validation passed **0/12**. The
raw model outputs copy question/evidence structures, use markdown fences or omit
required fields. Increasing evidence coverage did not resolve model reliability.

This remains a development diagnostic on four source documents and six paired
question families, not a customer holdout or equal-budget retrieval comparison.
Semantic correctness and citation entailment have not been independently graded.
No adapter was trained, and no model was activated or uploaded.

## Reproduce the audit

```sh
npm run learning:parent-audit
```

Artifacts live in `research/learning/frozen-0ab4d24bf6c71ab8`:
`parent-base-responses.jsonl` preserves raw outputs and recorded timings;
`parent-model-audit.json` fingerprints the raw response file and records failures.
The audit verifies completeness, unique case identity, frozen benchmark digest,
context report digest, source ordering, prompt digest, input-token count, model
revision, generation cap and absence of an adapter. A strict schema-valid answer
would still not establish grounding or authorize activation. Receipts are trusted
local provenance, not publisher signatures or authenticated proof of inference.

The run used existing local Qwen3-0.6B 4-bit revision
`73e3e38d981303bc594367cd910ea6eb48349da8`, verified receipt-bound files, remote code
disabled, MLX local generation, temperature zero, seed 42 and a 512-token cap.
The actual renderer disabled thinking and verified prompt hashes and input token
counts against the prior token-fit artifact. No network inference or tools ran.
The experiment script refuses to overwrite an existing run. A new experiment must
use a separate output/receipt identity, not rewrite this diagnostic.

## Remaining model work

Select a suitable instruction model and supported constrained-generation backend;
evaluate against independent human-reviewed development and held-out questions.
Measure strict contract validity, answer grounding, abstention, languages, latency
and memory separately. Grammar constraints can enforce shape but cannot establish
truth or financial authority. Preserve raw failures before any repair analysis.

Prepare training examples only from separately authorized, disjoint sources and
human-approved labels. Do not fine-tune on these frozen questions or call synthetic
labels independent evaluation. Demonstrated shape/citation failures may guide the
training objective after a suitable baseline and approved dataset exist. Model
outputs remain advisory; deterministic MEW and human signing boundaries continue
to control any future monetary action.

## Subsequent constrained-decoding experiment

The same local weights and receipt-bound parent contexts now pass **12/12** strict
response-contract checks under Outlines 1.3.3. This separate run adds grammar
constraints, canonical source-subset choices and a 1,000-character answer limit;
it preserves the original **0/12** raw baseline. It does not demonstrate semantic
correctness. Unsupported product claims and mixed EN/FR answers remain visible,
and model activation/training authorization remain false. No adapter was trained.

Run `npm run learning:constrained-audit` to verify the new receipts. See the
[implementation and live gates](ESCROW_MODEL_NEXT_STEPS.md) and the separate
`constrained-parent-responses.jsonl`, `constrained-model-policy.json`, and
`constrained-parent-audit.json` in the frozen experiment directory.
