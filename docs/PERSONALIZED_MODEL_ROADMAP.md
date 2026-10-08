# Personalized model: reproducible local path

This contribution prepares an experiment and review pipeline. No adapter has been trained or promoted. The current plan contains zero independently human-approved examples; both `trainingAuthorized` and `fineTuningReady` remain false. The deployed company runtime, monetary accounting and live-payment settings are unchanged.

## Evidence from actual runs

On the same frozen 12-question EN/FR development benchmark and 58 paragraphs, top-3 multilingual MiniLM retrieval found the relevant source for 10/12 questions: English 5/6 and French 5/6. Paragraph BM25 found 8/12: English 6/6 and French 2/6. Exact supporting-passage coverage remains 4/12 in both approaches. This is a French source-retrieval improvement with an English regression, not evidence of better final answers. Fourteen of 58 chunks exceeded the encoder's 128-token limit. Keep the baseline; investigate chunk boundaries and context construction before promoting this candidate.

Canonical ranking inputs are independently regenerated from frozen sources before model metadata requests or inference. The negative receipt records rejection of an altered valid source slice. Model revision, tokenizer/pooling, truncation and runtime are saved alongside rankings. These twelve repeatedly used agent-labeled cases are development diagnostics, not a customer holdout.

## Working procedures

From the repository root with Node 24 and the isolated local Python runtime:

```sh
node scripts/prepare-multilingual-contexts.mjs research/learning/frozen-0ab4d24bf6c71ab8
.local/ml-venv/bin/python scripts/evaluate-multilingual-retrieval.py --benchmark research/learning/frozen-0ab4d24bf6c71ab8 --node /absolute/path/to/node --run-id new-experiment
node scripts/build-model-review.mjs
node scripts/plan-personalization.mjs
```

The multilingual run reads a pinned public encoder from Hugging Face and runs locally. Dependencies are recorded in the snapshot's `multilingual-runtime-requirements.txt`; large models remain in ignored `.local/`. The review page can be opened directly as a local file or served on loopback. It displays 24 actual base/prompt-v2 traces with raw answers, errors and supplied context. Pass/fail/defer notes and reviewer name persist locally. Names are self-declared and exports do not authenticate a review or approve training. Automated UI labels were removed after verification; no artificial human labels entered the training plan. Browser showed a successful download notice, but the browser tool did not return its saved file path, so filesystem export verification remains limited.

For an organization profile and separately collected examples, run:

```sh
node scripts/plan-personalization.mjs profile.json reviewed-examples.jsonl
```

The planner writes `research/learning/personalization-plan.json`. It validates the profile, receipt and benchmark, rejects known benchmark IDs, question matches and lineage groups, and prepares a candidate local MLX LoRA configuration. It does not start training. Declare scope, approved vocabulary, languages and context sources explicitly. Exact checks cannot detect every semantic paraphrase; manual split review is still necessary. Consent and reviewer declarations need authentication before use. Validate actual model files against the receipt before any future run.

## Gates for an actual personalized adapter

1. Collect independent pilot questions and grounded corrected demonstrations, with authenticated reviewer decisions, data reuse consent and tenant ownership. Review conflicting labels rather than resolving them by agent majority.
2. Separate entire source/question/translation families into train, validation and a fresh untouched holdout. Existing development questions remain excluded from training.
3. Fix retrieval omissions and verify visible evidence. Test unanswerable queries and contradictory context as well as ordinary EN/FR requests.
4. Inspect actual model target modules and MLX renderer; verify prompt masking, token budget and memory before a small local SFT/LoRA experiment. Candidate rank, scale, learning rate and iteration count are starting hypotheses, not validated optimal settings.
5. Compare the untouched base and adapter on identical context. Measure correctness, citation entailment, serialization, abstention and authority violations separately. Preserve raw failures and reversible checkpoints.
6. Consider DPO only with valid same-context preference pairs and a verified compatible implementation. Hosted Tinker or distillation require their own credentials, data-transfer scope and compute budget; no such jobs ran.

## Team and handoffs

Five actual Codex specialists contributed multilingual retrieval, review-interface implementation, primary-source research, personalization planning and independent review. Reusable prompts in `prompts/learning/posttraining-*.md` define three ongoing roles: researcher returns provenance and testable hypotheses; experimenter returns immutable configs and measured receipts; independent reviewer audits leakage, authority and promotion claims. These prompts are engineering guidance, not new autonomous production agents. The original `mew-posttraining-research` skill and three pinned upstream skills support these handoffs without altering runtime role registrations.

Research decisions and access limits: [Thinking Machines](THINKING_MACHINES_RESEARCH.md), [multilingual knowledge](MULTILINGUAL_KNOWLEDGE_MAP.md), [independent review](MULTILINGUAL_REDTEAM.md), and [skill provenance](SKILLS.md).
