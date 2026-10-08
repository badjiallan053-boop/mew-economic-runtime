# Budgeted evidence coverage experiment

The frozen corpus and all twelve gold labels are unchanged. Research is ingested into a separate reference catalog, not inserted into the evidence corpus or used as benchmark answers. Complete selected parent documents now contain every annotated supporting passage for 12/12 development cases (EN 6/6, FR 6/6). This uses more context than three paragraphs; paragraph retrieval's original 4/12 result remains preserved.

| Selection | All annotated passages present | Mean returned UTF-16 units | Maximum |
| --- | --- | --- | --- |
| Hybrid ranking, one complete parent | 9/12 | 5,278.75 | 7,407 |
| Hybrid ranking, two complete parents | 11/12 | 9,987.5 | 14,079 |
| Hybrid ranking, three complete parents | 12/12 | 11,196 | 17,775 |

Selection combines cached local multilingual dense top-three hits and fresh lexical top-three hits through reciprocal-rank fusion, deduplicating source votes within each ranking. Whole sources are fetched only after ranking. This is a parent-context method suited to the current tiny four-document corpus. It is not a proven scalable retrieval policy or an equal-budget comparison. The configuration was selected after inspecting development failures, so independent customer questions remain necessary.

Every hit binds canonical source bytes, hash and offsets. Canonical input is regenerated from the frozen benchmark; altered input, extra dense hits or duplicate case IDs fail before context assembly. Selected parents that exceed the configured 20,000-unit budget are omitted whole rather than silently truncated. Source IDs, omitted parents and complete selected contexts are saved.

The actual local Qwen tokenizer renders the system prompt, question and evidence, with thinking disabled and no truncation. Across 36 combinations, the largest input is 3,596 tokens; adding a 512-token output reserve fits the 8,192-token experiment policy. This is prompt fit, not a GPU-memory, latency or answer-correctness measurement. No generation or fine-tuning ran in this experiment.

## Reproduce

```sh
node scripts/evaluate-parent-context.mjs research/learning/frozen-0ab4d24bf6c71ab8
.local/ml-venv/bin/python scripts/verify-local-model.py
.local/ml-venv/bin/python scripts/check-parent-context-budget.py
node --test tests/parent-context.test.mjs
.local/ml-venv/bin/python tests/local-model-integrity.test.py
```

The evaluator consumes the preserved canonical dense experiment, so no network or encoder rerun is required. It hashes that receipt for reproducibility; local receipts are not cryptographically authenticated third-party evidence. The token check requires the ignored local model files and isolated Python runtime. All ten receipt-bound model files are hashed before tokenizer loading; Safetensors inspection finds 704 tensors and 168 attention weight entries without executing weights or allocating their full tensor values. Matching trusted hashes establishes artifact identity, not factual model quality.

## Research and repository transfers

- [Anthropic Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval): written methods motivate hybrid ranking and preserving context. MEW does not run its hosted contextualizer or transfer its published performance claims.
- [Lost in the Middle](https://arxiv.org/abs/2307.03172): abstract reviewed; motivates checking whether the generator actually uses longer contexts. No full-paper review or answer-quality improvement is claimed.
- [LangChain parent retriever and ensemble implementations](https://github.com/langchain-ai/langchain): parent/child separation and rank-fusion are implementation references. MEW implements its own small contract-bound selector; no LangChain package or copied source is vendored.
- [Safetensors](https://github.com/safetensors/safetensors): its already-installed, version-recorded Python library is directly integrated for local weight metadata inspection. [Transformers](https://github.com/huggingface/transformers) is directly used for the installed local chat-template/tokenizer path, with local-only files and remote code disabled. These are concrete library integrations rather than claims of an entire framework migration.
- [skills.sh RAG listing](https://www.skills.sh/giuseppe-trisciuoglio/developer-kit/rag) and [official LangChain RAG skill](https://github.com/langchain-ai/langchain-skills/blob/main/config/skills/langchain-rag/SKILL.md): reviewed for ingestion/split/retrieve/generate boundaries. The original local `mew-evidence-coverage` skill turns observed failures into a reproducible MEW procedure; no remote installer or cloud API dependencies were introduced.
- Publisher-linked [LlamaIndex embedding tutorial](https://www.youtube.com/watch?v=2c64G-iDJKQ): page opened and transcript export attempted; no transcript was available. Unseen spoken content remains excluded.

## What remains overlooked until measured

Complete context cannot establish that the 0.6B generator uses it correctly. Next evaluate the unchanged base model with these contexts, then grade correctness, citations, abstention and authority separately. Add fresh customer holdout families, unsupported questions, contradictory/stale versions and larger distractor corpora. Investigate narrower sentence/section parents and reranking to reduce cost while preserving coverage. A high similarity score or a 12/12 development coverage result never authorizes payments, deployment or training on the benchmark.

Independent review: [PARENT_CONTEXT_REVIEW.md](PARENT_CONTEXT_REVIEW.md). Current artifacts are isolated experimental tools; production company contracts and monetary logic are unchanged.
