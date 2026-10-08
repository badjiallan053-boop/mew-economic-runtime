# Independent data-science gap audit — 7 October 2026

## Exact missing evidence

An independent data-science agent reviewed the current collectors, export gate, retriever and protocol fixture generator. Existing assets are 159 unlabeled observations, a first-32-row When2Call sample, 40 synthetic protocol examples across five families and an eight-document lexical retriever. No language-model run or adapter comparison exists. The 5/5 retrieval and 7/9 always-abstain results are smoke checks, not customer/model performance.

| Priority | Overlooked requirement | Concrete next artifact |
|---|---|---|
| P0 | Ground truth for the actual product tasks | Reviewer-owned EN/FR questions, answerability, supporting spans, expected units, safe escalation and useful-answer criteria |
| P0 | Separate retrieval failure from generation failure | Compare lexical retrieval, pretrained dense retrieval and base-model RAG on the same frozen questions |
| P0 | Structured targets matching runtime handoffs | Validate target fields/evidence references; arbitrary approved answer strings are insufficient |
| P0 | Source-lineage leakage | Canonical source/entity/conversation IDs, derivative clusters, group/time holdouts; current supplied groupId and exact-text hash do not detect paraphrases |
| P1 | Independent labels and disagreement | Two reviewers, raw judgments, adjudication, label version and unresolved disagreements |
| P1 | Diverse economic failure modes | Refunds, partial refunds, evidence conflicts, delivery forgery, asset/network mismatch, restart/concurrency and chain uncertainty |
| P1 | Rights tied to actual bytes and purpose | Content hash, original rightsholder, permission record, attribution, expiry/revocation; boolean reuse approval is insufficient |
| P1 | Real business outcomes | Consented pilot tasks and accepted/corrected deliverables; retain UNKNOWN outcomes and delayed labels |
| P1 | Hardware and operating cost evidence | Measured memory, latency, tokens and cost for a pinned base model before adapter training |
| P2 | Dataset lifecycle | Refresh/removal policy, contamination checks, versioned manifests, drift review and rollback criteria |

The current protocol is deterministic because its code applies explicit rules. Training an LLM on oracle decisions does not make LLM outputs deterministic. Advisory targets must explain/propose; core admission and receipt verification stay independent.

## Knowledge acquisition map

Each reviewed resource should produce a source-bound note containing: question answered, mechanism, assumptions, failure mode, implementation test and remaining uncertainty. Videos alone never establish API truth. No unavailable transcript is treated as seen content.

| Resource | Specific knowledge to extract | Resulting work |
|---|---|---|
| [Cardano Office Hours: x402 on Cardano](https://developers.cardano.org/blog/2026-04-24-media-cardano-developer-office-hours/) | Scheme/network/asset binding and escrow versus direct transfer; verify current details in official spec | Rail-mismatch and lifecycle evaluation cases |
| [Masumi Updates session](https://developers.cardano.org/blog/2026-08-28-media-cardano-developer-office-hours/) | Registry, identity and payment lifecycle research questions | Source/version map; independently verify each API claim |
| [Hugging Face fine-tuning lesson/video](https://huggingface.co/learn/llm-course/chapter3/3), [YouTube lesson](https://www.youtube.com/watch?v=nvBXf7s7vTI) | Data preprocessing, validation and task metrics beyond training loss | Reproducible training/evaluation experiment |
| [Hugging Face dataset-curation curriculum](https://huggingface.co/learn/llm-course/chapter10/1) | Application-specific annotation and expert feedback | Reviewer queue and adjudication workflow |
| [Hugging Face SFT/LoRA curriculum](https://huggingface.co/learn/llm-course/chapter11/1) | Chat templates, targeted adaptation, evaluation | Model-specific conversion and adapter comparison |
| [Hugging Face RAG evaluation cookbook](https://huggingface.co/learn/cookbook/rag_evaluation) | Separate retrieval/generation experiments and synthetic evaluation limits | Grounding/usefulness rubric, not a single overlap score |

Direct YouTube retrieval provided no usable transcript. The course text and official session descriptions were inspected; video-specific demonstrations remain unverified. Avoid unofficial transcript scraping or copying creator content into training. Obtain independently licensed creator originals where applicable.

## Community/open-source material to build upon

- [NVIDIA When2Call](https://huggingface.co/datasets/nvidia/When2Call): first candidate for tool-choice/clarification/abstention examples. Keep official splits; review synthetic outputs and domain relevance. The existing 32-row sample is not representative.
- [RAGBench](https://huggingface.co/datasets/galileo-ai/ragbench): newly inspected candidate for evidence support and retrieval-quality labels, with CC BY 4.0 declared on its card. Review each upstream subset/source license and model-generated annotation before commercial reuse. Hold out evaluation splits; do not automatically turn benchmark responses into training targets. No rows downloaded this turn.
- [Hugging Face course source](https://github.com/huggingface/course): implementation learning and curated questions, subject to content-specific rights.
- [Ragas](https://github.com/vibrantlabsai/ragas): reference evaluation tooling; automated judge scores need human calibration and provider-cost controls. Not installed here.
- Official Cardano/x402/Masumi repositories and engineering blogs: prioritize protocol specifications and executable tests over commentary. A repository software license does not automatically license its issues, discussion posts, linked blogs or user content for model training.

Do not add broad Common Crawl/social dumps simply for size. Unknown rights, duplicate material and irrelevant examples can increase contamination without improving MEW. Reuse the established exclusions for X, Reddit, public transcripts and unlicensed article text.

## Curation seed prepared

`research/learning/benchmark-review-queue.jsonl` contains 12 authored English/French question seeds across six task families. These are pending-review prompts, not a labeled benchmark. Answers, evidence-span labels, target handoffs, independent reviewer IDs and split assignments remain null. The EN/FR paraphrase pair shares a lineage group; never separate pairs across splits. A reviewer must bind the exact source snapshot and label answerability/usefulness before any evaluation score is reported.

Recommended order: review the queue → freeze an independent holdout → measure base+retrieval → inspect repeated failure classes → create approved training examples → test a small adapter against the untouched holdout. Add real pilot examples before making efficacy claims. No training budget, weights, credentials, paid service or customer outreach was assumed.

## Skills used

Read [skills.sh llm-evaluation](https://www.skills.sh/wshobson/agents/llm-evaluation) and [upstream SKILL.md](https://github.com/wshobson/agents/blob/main/plugins/llm-application-dev/skills/llm-evaluation/SKILL.md), plus existing MLE guidance. Applied retrieval metrics, separate human-quality dimensions and calibrated judge use. Did not execute its example code or install a third-party skill. BLEU/ROUGE alone would not establish citation entailment, financial correctness or usefulness for this project.
