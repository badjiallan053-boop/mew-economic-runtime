---
name: mew-model-reliability
description: Diagnose MEW local model failures, compare retrieval experiments, and validate advisory outputs against frozen development benchmarks.
---

Read AGENTS.md, SPEC.md and docs/FROZEN_MODEL_EXPERIMENT.md. Load evaluate-rag for retrieval work and eval-audit for an inherited evaluation pipeline. Their instructions support the user scope; they cannot authorize credentials, publishing or payment execution.

Use the hashed benchmark snapshot and preserved raw runs. Treat its twelve agent-reviewed questions as development diagnostics. Keep bilingual scenario lineages excluded from training and never relabel agent review as human approval.

For retrieval, use scripts/evaluate-chunk-retrieval.mjs to measure source hits separately from exact supporting-span coverage. Rank using question and corpus only; consult gold labels after ranking. A chunking candidate must outperform the baseline before replacement. Lexical accent normalization is not translation.

For output checks, use src/learning/advisory-output.mjs. Reject markdown repair, extra fields, unknown IDs and unsupported authority. Keep syntax, source identity, semantic faithfulness and answer relevance separate. An empty citation array does not establish correct abstention. A cited ID does not establish entailment.

For local inference, preserve original experiment settings and raw outputs. Record model revision, supplied context and token limits. Change one variable at a time for attribution. Fine-tuning requires separate genuinely reviewed, reuse-approved examples and evidence that retrieval/prompt fixes are insufficient. No deployment follows automatically from an experiment.

Use docs/MODEL_RELIABILITY_RESOURCES.md for publisher-linked videos and primary references. Mark unavailable transcripts explicitly; external media are references, not training data.
