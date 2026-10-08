# MEW dataset and model shortlist — 7 October 2026

## What is built and what is proposed

Collected revision-pinned metadata for six datasets and two model candidates. A bounded When2Call sample collector is provided for review. Fitted an actual local TF-IDF retrieval model on eight MEW-owned project documents; it returns source IDs and corpus hashes, and returns no result for absent vocabulary. This is corpus-fitted lexical retrieval, not language-model fine-tuning. It is an offline tool and does not change the deployed application.

The retriever found the expected document in its top three results on five of five authored smoke queries. These queries were not used to fit vocabulary/IDF, but their author knew the corpus. The result is not an independent customer benchmark, answer-quality score or production-readiness claim. Query paraphrases, French queries, hard negatives and customer evaluation remain needed.

## Dataset priorities

| Candidate | Declared license/access | MEW use | Decision |
|---|---|---|---|
| [NVIDIA When2Call](https://huggingface.co/datasets/nvidia/When2Call) | CC BY 4.0; ungated | When to call a tool, ask for missing inputs or abstain | First external candidate; synthetic labels need MEW domain review, attribution and privacy checks |
| [Salesforce xLAM/APIGen](https://huggingface.co/datasets/Salesforce/xlam-function-calling-60k) | CC BY 4.0; gated acknowledgment | Tool arguments and schema correctness | Secondary; user must accept publisher conditions; never bypass gate |
| [UltraFeedback binarized](https://huggingface.co/datasets/HuggingFaceH4/ultrafeedback_binarized) | MIT declared | Preference-learning experiments | Lower priority: generic, model-scored preferences are not MEW ground truth |
| [FiQA](https://huggingface.co/datasets/vibrantlabsai/fiqa) | CC BY-SA 4.0 | Financial retrieval evaluation | Separate attribution/share-alike review; not current Cardano payment evidence |
| [FinanceBench](https://huggingface.co/datasets/PatronusAI/financebench) | CC BY-NC 4.0 | Financial evidence benchmark | Exclude from commercial training unless separately licensed; commercial evaluation rights also need review |
| [SciFact](https://huggingface.co/datasets/allenai/scifact) | CC BY-NC 2.0 | Claim/evidence research | Exclude from commercial training unless separately licensed; no arbitrary loading script executed |

The catalog records publisher license declarations, exact Git revisions, gate status and hashes of metadata responses. This is not a blanket legal approval for upstream source material. The tool does not download model weights or auto-approve dataset reuse. Some datasets are general-purpose and may not outperform MEW-specific examples.

When2Call's published splits include 15,000 SFT examples, 9,000 preference examples and separate evaluation data. Do not concatenate training and test splits. Its tool descriptions/messages are untrusted strings: their presence never installs connectors, executes commands or permits spending. A first-32-row sample is for schema and domain inspection, not a representative training/evaluation set. Synthetic examples may contain credential-like values or personal scenarios; review/redact before export or public redistribution. No source text is deployed into the runtime.

## Model priorities

1. [Qwen3-Embedding-0.6B](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B), Apache 2.0: compare pretrained dense retrieval against the fitted lexical baseline using a held-out query set. Do not tune embeddings before showing retrieval failures. Publisher documentation describes multilingual retrieval, which is relevant to our English/French workflow; this has not been measured on MEW.
2. [Qwen3-4B-Instruct-2507](https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507), Apache 2.0: candidate advisory model for structured handoffs and source-grounded summaries. Compare its base behavior first. Four billion parameters alone do not establish local memory/latency feasibility; inspect available memory and benchmark bounded contexts before loading or training. Model weights were not downloaded and no Qwen inference was run.

Use separate retrieval and answer-generation experiments. Keep financial authorization in code. A learned model must never replace exact money arithmetic, identity binding, signature checks, retries or retained UNKNOWN exposure.

## Reproduce completed work

```sh
npm run learning:hunt
npm run learning:retrieve
node scripts/sample-tool-data.mjs
```

`learning:hunt` collects metadata only from a fixed publisher allowlist with time and byte caps and exclusive output directories. `learning:retrieve` fits the eight-document corpus, writes model.json and evaluation.json and uses no external ML framework or provider. `sample-tool-data` reads at most 2 MiB of a pinned When2Call training file, retains its first 32 complete rows and hashes only those retained bytes. It never evaluates source code or tool calls. All tools operate offline except the explicit collectors.

## Language-model training experiment, pending

Start with MEW reviewer-owned examples: research summaries, conflicting evidence, numerical unit errors, missing credentials, duplicate objectives, preprod/mainnet confusion, request clarification and safe structured handoffs. Use the existing reviewed-export gate. Keep customer data private and consented. Add external tool-use examples only after schema conversion, domain screening and source-specific review; do not blindly relabel a generic tool-call answer as spending authority.

Freeze group-separated train/validation/test sets and a later-time customer holdout. Record prompt/model revisions, dataset hashes, seed, adapter parameters, peak memory, token count, duration and hardware. No exact mixing ratio or epoch count is justified yet; test a small MEW-only adapter before adding external data. Evaluate grounding, useful task completion, calibrated abstention and authority violations rather than only training loss.

For Apple Silicon, [MLX-LM's official LoRA guide](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/LORA.md) is a candidate local training workflow. Compatibility and memory are still untested. It expects train.jsonl, optional valid.jsonl and test.jsonl; our generic reviewed exporter names validation.jsonl, so an explicit reviewed conversion to valid.jsonl is needed. Pin an evaluated local model revision and a tested MLX package version. Example command template, **not executed**:

```sh
mlx_lm.lora --model /path/to/reviewed-local-model --train --data /path/to/reviewed-mlx-data --iters 100 --mask-prompt --adapter-path /path/to/new-adapter
```

The 100 iterations are a smoke-experiment cap, not a chosen production schedule. First compare base+retrieval against tuned+retrieval on untouched labels. Promote only if usefulness improves with no grounding/authority regression and within a separately approved training budget. No cloud GPU resources, paid inference or model uploads are created here. The existing Railway hosting allowance is not a model-training budget.

## Remaining high-value data

The strongest proprietary dataset will be consented MEW pilot tasks, accepted/corrected deliverables, reviewer rationales and real tool failures. Public popularity and chain metadata lack these labels. Maintain separate payment receipts and delivery acceptance facts. Add versioned official Masumi/Cardano documentation as retrieval evidence only after checking content rights; code licenses do not automatically license documentation. A generic open dataset cannot supply proof of MEW customer revenue.

## Skills guidance

Applied [skills.sh MLE workflow](https://www.skills.sh/affaan-m/ecc/mle-workflow) and its upstream SKILL.md for baseline-first experimentation, data contracts, split integrity and promotion gates. No remote skill installer or executable dataset-loading script was run. The current contribution owns scripts/hunt-models.mjs, scripts/sample-tool-data.mjs, scripts/train-retrieval.mjs, src/learning/retrieval.mjs, tests/retrieval.test.mjs and research/model-hunt. Acceptance: collected pinned metadata, reproducible local fit, meaningful abstention/identity tests and existing suite/build passing.
