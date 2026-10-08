# One controlled capability comparison

Status: planned, not run. No model weights downloaded, provider called, training
authorized or live activation performed. This document narrows the next experiment;
it is not an executable authorization to spend or upload data.

## Hypothesis and fixed comparison

The current small model can produce valid JSON but fails to use supplied evidence
for useful, complete EN/FR answers. A more capable instruction model may address
that gap without fine-tuning. Test the previously identified
[Qwen3-4B-Instruct-2507 candidate](https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507)
against the preserved Qwen3-0.6B baseline. No outcome is assumed from its model card.

Use one frozen prompt/content policy and the same available-as-of evidence, token
budget and JSON contract. Bind the current baseline request policy and its hash
before running anything. A different tokenizer/chat template is a required part
of model configuration and must be recorded, rather than called an identical input
byte stream. Inspect and pin weights, tokenizer, conversion revision, quantization
and inference runtime; report their effects and local hardware limits. Never run
the larger model in the 250 MB Railway demo container or silently replace its
runtime. Any additional output constraint needed for a candidate is another
experimental change and must be declared before generation.

The twelve known development cases are diagnostic only. Keep their existing
baseline answers immutable. Do not choose prompts, thresholds or training examples
using a customer holdout. Do not interpret this agent review as a superiority test.

## Required independent evaluation preparation

A consenting pilot owner and domain reviewer define a representative actual task,
then freeze separate evaluation lineages before comparison. Record source rights,
observation cutoffs, customer consent, expected artifact and acceptance/cost goals.
The pilot's task is not invented here: neither a consenting customer nor their
project reference exists. This preparation remains a gate, not completed work.

Include answerable normal tasks alongside incomplete evidence, conflicting sources,
stale sources, source instructions, payment uncertainty, authenticated-delivery
questions and network/asset confusion. Include EN/FR customer needs where real.
Group translations, paraphrases and shared underlying records in one lineage;
review entity, source and temporal overlap. Keep the independent holdout outside
prompts, retrieval tuning, training and LLM-judge calibration. Freeze sufficient
task coverage and uncertainty reporting with the reviewer before any output is seen;
do not invent a statistically justified sample size from twelve known questions.

Human review must identify substantive claims and necessary next steps, check each
against cited full passages, distinguish useful action from indiscriminate refusal,
and assess language and actual authority boundaries. Use the same frozen rubric on
both variants. Resolve disagreements and record authentic reviewer evidence; a
self-declared name or content hash alone is not identity verification. Calibrate
any automated judge on separate human-reviewed data before using it for decisions.

## Bounded run and release decision

Record actual model identity, rendered input, context truncation/omissions, raw
output, output validation, tokens, latency, memory and measured cost per task.
Use the existing durable RUNNING/UNKNOWN/replay boundary for paid/provider runs;
never automatically retry an uncertain charge. Local trials also need token,
wall-time and memory caps fixed before execution. The approved $10 Railway hosting
cap is not a model/training spending allowance. No paid run is prepared here.

Compare grounding, required completeness, relevance, language and calibrated
abstention independently of JSON validity, stratified by task and language.
Prespecify an actual customer-usefulness gain, permissible uncertainty and cost
limit with the pilot owner; do not select these thresholds after seeing answers.
Require no observed economic-authority violations, no unsupported revenue/efficacy
claims, no grounding regression and no unresolved safety deferrals in the release
set. These checks on a finite sample are not a guarantee of zero future errors.

If the candidate still fails, human reviewers curate rights-cleared behavioral
targets from demonstrated development failures. Fine-tune on those reviewed targets
only after a training budget/rights decision, keeping the customer holdout untouched.
Retrieval supplies current facts; do not train changing public counts into a model
or manufacture useful answers with a deterministic postprocessor.

Any promotion remains a separate artifact-backed decision. Model quality cannot
enable payment custody, funding, database login or contract approval. Payments and
live model activation remain disabled throughout this planned comparison.
