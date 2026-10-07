# Focused model reliability team

Three reusable roles are defined in `prompts/learning`: retrieval engineer, answer-contract engineer, and reliability reviewer/research steward. The lead coordinates file ownership, reproduction and final integration. These prompts preserve the existing seven-field runtime contract; the experimental three-field answer fixture is isolated. The production registry has not been expanded.

The roles exchange immutable source/benchmark identities, experiment configuration, raw traces and supplied evidence references through the existing host contract. The reviewer checks actual traces independently before seeing peer conclusions. Skills cannot confer signing, spending, publication or human-approval authority.

Installed project skills are revision-pinned `evaluate-rag`, `eval-audit`, and original `mew-model-reliability`. Read the upstream license/provenance alongside the installed files. No paid dependencies, model weights or credentials enter Git.

This iteration implements a strict output checker and a paragraph BM25 experiment. The unchanged source-hit rate is 8/12 (English6/6, French2/6); exact passage coverage is 4/12. This does not justify replacing the document baseline. Chunk coverage and document hit rates have different units and cannot be conflated. Source offsets refer to JavaScript UTF-16 code units.

Run `node scripts/evaluate-chunk-retrieval.mjs research/learning/frozen-0ab4d24bf6c71ab8` for passage selection and `node scripts/audit-advisory-runs.mjs research/learning/frozen-0ab4d24bf6c71ab8` to recheck preserved local responses using the stricter validator. The audit output is exclusive-write; preserve previous results instead of overwriting them. Neither script invokes a language model or authorizes promotion.

Next model experiments should compare a genuinely multilingual retriever on the same snapshot, then a supported constrained-generation backend. Direct Outlines/MLX compatibility is unverified. The current Qwen0.6B model remains unsuitable for deployment. Separately approved, disjoint human-reviewed examples remain required for fine-tuning. The twelve existing questions are a development benchmark, not an independent customer holdout.

Independent forward-review confirmed that neither the chunk candidate nor the current model merits promotion. The run audit validates case completeness, source ordering and legacy generation-cap/adapter settings; it fingerprints stored responses, not independently attested inference. Missing prompt/model/context attestations are not backfilled as observed facts. Upstream advice about tolerating irrelevant context is a heuristic; noise can harm answer quality.
