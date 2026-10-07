# Independent parent-context review

Reviewed 7 October 2026 by the multilingual red-team subagent. Scope: `src/learning/parent-context.mjs`, its evaluator and tests, and the generated frozen-development report. No model inference, training or deployment was performed by this reviewer.

## Verified result and its meaning

Whole-parent context assembly covers all annotated evidence for 9/12 cases with one parent, 11/12 with two parents, and 12/12 with three parents. The three-parent configuration returns a mean of 11,196 UTF-16 code units and a maximum of 17,775, within the configured 20,000-unit cap. Both languages have complete annotated evidence coverage in that configuration.

This is an expanded-context coverage result on a four-document development corpus. It is not a like-for-like improvement over top-three paragraph retrieval's 4/12 exact-span hits. More text is returned, whole documents replace paragraphs, and dense and lexical rankings are fused. It does not establish answer correctness, citation entailment, production latency, model token fit or customer efficacy. Configurations were inspected on development failures; a fresh holdout remains necessary.

## Selection, binding and budget

Selection accepts only source text and ranked hits; gold benchmark labels are consulted after contexts are assembled. Each hit must match its source hash and exact UTF-16 slice before accepting its parent. Duplicate children do not add multiple votes for one source within the same ranking list. Complete parents are returned without silent truncation; oversized selected parents are recorded as omitted.

The policy first considers the highest-ranked `maxParents` sources, then skips those that exceed the budget. It does not backfill from lower-ranked sources. This is predictable current behavior, but future callers should not assume the function maximizes the number of parents that fit. Character budget also excludes question text, prompt wrappers and special tokens; full rendered-prompt token fit requires its separate check.

## Verified receipt hardening

The original cached-receipt parser gap has been resolved. The evaluator regenerates canonical chunks and questions from the verified frozen benchmark, checks complete ranking-input structure and its digest, requires unique case identities and exactly three unique dense result IDs per case, and compares each result with its canonical chunk fields. An independent temporary-fixture exercise added a fourth cached hit; the evaluator rejected it before context assembly. Cached local files remain trusted experiment inputs, not authenticated external evidence.

## Token fit

The local Qwen tokenizer was used to render the actual advisory system prompt, question and expanded contexts without truncation or remote code. All 36 parent-count/case combinations fit the configured 8,192-token policy; the maximum is 3,596 input tokens plus 512 reserved output tokens. The token-fit artifact binds the parent report and local tokenizer-file hashes. This checks prompt size only: no answer was generated, no memory feasibility or throughput guarantee was established, and answer quality remains unmeasured.

The benchmark-question binding gap is resolved: the token-fit script checks raw benchmark SHA against its manifest and parent report before reading questions, and compares source-snapshot identities. It also verifies each receipt-listed local model file before loading the tokenizer with local-only and remote-code-disabled settings. The new integrity verifier checks receipt-bound file hashes and inspects Safetensors metadata without executing weights. Receipt hashes remain trusted local provenance, not a publisher signature.

## Verification

All five targeted parent-context tests and four Python integrity tests passed after the final hardening. Independent artifact checks confirmed `usedChars` equals the sum of returned source lengths, stays within `maxChars`, and respects `maxParents` for every case in all three configurations. The fourth-hit tamper exercise passed; the 36 token-fit rows bind the current parent report and respect their reserved-output budget. No gold-based selection or monetary authority change was found. No equal-budget retrieval superiority or improved model answer quality is claimed.
