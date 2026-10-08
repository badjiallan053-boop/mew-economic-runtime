---
name: mew-posttraining-research
description: Design source-backed local MEW adaptation experiments after observed retrieval or answer failures, with disjoint data and reviewed training gates.
---

# MEW post-training research

Use the observed frozen experiment and current personalization planner rather than a model vendor result as the task definition. Read `docs/THINKING_MACHINES_RESEARCH.md` for method selection and `scripts/plan-personalization.mjs` plus its learning module for the actual gate. Research sources never become training examples merely because they are public.

- Separate missing evidence from generation errors: multilingual retrieval and final passage coverage precede answer-weight tuning. Hold corpus context fixed when comparing base and adapter answers.
- Preserve base weights; record model/adapter hashes, tokenizer rendering, masked targets, truncation, runtime/device and sampling configuration. LoRA rank or learning-rate guidance from larger models is an experimental starting point, not a guarantee.
- Keep reviewed examples disjoint from frozen development families, including translations and paraphrases. Agent review cannot supply a human reviewer identity or reuse approval. A planner output is preparation, not authorization for cloud spending, uploads or deployment.
- Keep syntax, citation entailment, correctness, abstention and authority errors separate. A confidence score is not authenticated payment evidence. Every output remains advisory and preserves deterministic accounting.
- Use `prompts/learning/posttraining-researcher.md`, `posttraining-experimenter.md` and `posttraining-reviewer.md` for distinct artifact ownership when a team is requested. These host prompts do not register new runtime agents.

Deliver a reproducible experiment receipt, measured results and blockers. If the planner does not authorize training, finish the independently useful evaluation and report the actual unmet gate; do not fabricate approvals or train on held-out answers.
