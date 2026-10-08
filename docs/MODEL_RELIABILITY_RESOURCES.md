# Model reliability resources and their application

Checked 7 October 2026. This is a method and provenance register, not a claim of model improvement or permission to train on external media. No video was downloaded, watched or transcribed during this review. Technical recommendations below are grounded in primary documentation and publisher repositories.

The [frozen experiment](FROZEN_MODEL_EXPERIMENT.md) is the starting point: retrieval found the expected source for 6/6 English and 2/6 French questions; base generation passed the JSON contract on 0/12, and the revised prompt passed on 1/12 with an incorrect answer. These are twelve development cases, not customer generalization evidence.

## YouTube learning queue with corroboration

| Resource | What was accessible | Application to MEW |
| --- | --- | --- |
| [Shreya Shankar: How to Automate AI Evals (Correctly)](https://www.youtube.com/watch?v=tqUDjc1HzO4) | Title and link verified through the [publisher's evals-skills README](https://github.com/ai-evals-course/evals-skills). The video page did not expose a transcript; subsequent direct retrieval failed. | Use the accompanying repository's error-discovery method to review actual response traces and establish failure categories before adding evaluators. No claim is made about unseen spoken details. |
| [LlamaIndex: Part 3 — Evaluation](https://www.youtube.com/watch?v=LQy8iHOJE2A) | Link and title verified in the [official video-series guide](https://developers.llamaindex.ai/python/framework/getting_started/discover_llamaindex/). Video retrieval failed; no transcript was available. | Keep retrieval and answer evaluation separate. The [official evaluation guide](https://developers.llamaindex.ai/python/framework/module_guides/evaluating/) is the implementation reference. |
| [LlamaIndex: Part 4 — Embeddings](https://www.youtube.com/watch?v=2c64G-iDJKQ) | Official guide link verified; no video content or transcript retrieved. | Compare a multilingual retrieval candidate with TF-IDF using exactly the same query set and source snapshot. Track per-language results and context coverage. This is a proposed experiment, not a promised remedy. |
| [LlamaIndex: Part 5 — Retrievers and Postprocessors](https://www.youtube.com/watch?v=mIyZ_9gqakE) | Official guide link verified; no video content or transcript retrieved. | Evaluate chunk boundaries and ranking independently so the model receives relevant passages within its token budget. Do not truncate every document at an arbitrary character prefix. |
| [Previously suggested LlamaIndex video](https://www.youtube.com/watch?v=44h94AJgQoM) | Retrieval failed; publisher, title and technical content were not independently confirmed. | Excluded as technical evidence. Use the verified official series above instead. |

The official [llama_docs_bot repository](https://github.com/run-llama/llama_docs_bot) contains numbered evaluation, embedding and retrieval examples accompanying the series. Its presence does not establish compatibility with the current MEW/MLX versions; inspect versions and interfaces before importing code. No example code was copied here.

## Primary methods to apply

- [Eval Skills: evaluate-rag](https://github.com/ai-evals-course/evals-skills/blob/main/skills/evaluate-rag/SKILL.md) separates retrieval coverage/ranking from faithfulness and answer relevance. For MEW, report expected-source hit rate separately from exact-span availability in the final model context. A retrieved document can lose its answer through truncation. Preserve EN/FR family grouping across splits.
- [Eval Skills: error-discovery](https://github.com/ai-evals-course/evals-skills/blob/main/skills/error-discovery/SKILL.md) supports inspecting trace variation and collecting reviewer notes. Build review around the actual base responses, retrieved passages and strict-contract errors. Agent annotations remain agent annotations; authenticated human approval is a separate event.
- [Outlines](https://github.com/dottxt-ai/outlines) provides structured generation approaches. Its current README lists local transformers/llama.cpp and server integrations; direct compatibility with the installed MLX runtime was not established. Evaluate a supported backend or a verified local grammar bridge before installing it. Valid JSON still requires independent evidence and authority checks: MEW's one schema-valid answer was wrong.
- [MLX LM](https://github.com/ml-explore/mlx-lm) documents local Apple Silicon inference and [LoRA/QLoRA training](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/LORA.md). Use the isolated pinned runtime already installed. An answer adapter cannot recover evidence missing from retrieval. Only train after a disjoint, reuse-approved dataset and actual answer failures justify it.

## Assigned responsibilities and handoff evidence

| Role | Required output | Boundary |
| --- | --- | --- |
| Retrieval engineer | Versioned corpus/chunks, per-language ranking results, context-span coverage and an isolated configuration comparison | No access to gold labels in production retrieval; no query-specific benchmark synonym patches |
| Answer-contract engineer | Prompt/model revision, raw responses, strict schema and source-reference validation, abstention results | Cannot treat parse success as factual correctness or authorize an economic action |
| Evaluation and data steward | Trace failure register, reviewer identity/type, lineage split and affirmative reuse decisions | Cannot manufacture human approval or move development benchmark families into training |
| Independent reliability reviewer | Reproduced failures, regression findings and deployment recommendation | Cannot activate payments or promote inference based on twelve development cases |

These are operating responsibilities, not evidence that additional model providers or autonomous production employees ran. Every handoff must identify the source snapshot and experiment revision, separate observations from recommendations, and preserve advisory-only authority. The project's deterministic accounting remains authoritative.

Acceptance should be measured improvement with no authority-boundary regression, not a promise that the system works perfectly. Retain raw failed runs; change one experimental variable at a time where feasible; add fresh human-reviewed pilot cases before customer claims or deployment. Video descriptions, captions, repository examples and public posts are references, not approved training records.
