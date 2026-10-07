---
name: mew-evidence-coverage
description: Diagnose missing supporting passages and evaluate budgeted hybrid parent-context selection against frozen MEW development evidence.
---

# Evidence coverage experiments

Read docs/EVIDENCE_COVERAGE_EXPERIMENT.md and the frozen benchmark verifier. Use existing embedding-strategies and evaluate-rag procedures where relevant. Primary research and skills.sh listings guide hypotheses; external papers never change local benchmark truth or become training-approved text.

Keep ranking inputs limited to query, exact source bytes and valid metadata. Gold spans may only score already-selected contexts. Record source and receipt hashes; reject noncanonical chunks and stale offsets. Keep translations in a shared lineage and report development-set adaptation.

Compare paragraph retrieval separately from parent expansion. For parent contexts use src/learning/parent-context.mjs; budget whole sources without silent truncation. Measure 1/2/3-parent coverage, average/max context size and actual rendered local-tokenizer input plus output reserve. A 12/12 expanded-context score is not 12/12 top-three paragraph accuracy, answer correctness or customer generalization.

Before promotion, test unsupported queries, contradictory sources, large corpora and fresh holdout families. Score factual answers and citation entailment separately. Models remain advisory; evidence selection never authorizes spending. Do not alter live runtime contracts to improve development scores.

Preserve every baseline and failed configuration. Save reproducible configuration/receipt and source-access limits, including unavailable YouTube transcripts. No training on benchmark answers and no invented reviewer consent.
