# Local model evaluation audit

Applied the pinned eval-audit skill to the preserved base and prompt-v2 responses, frozen labels, retrieval results and new strict-output audit. This is agent review, not a human calibration exercise.

## Evaluator design

### Semantic correctness is not represented by JSON success
**Status:** Problem exists.
Prompt-v2's sole schema-valid answer, event-opportunity-fr, makes a wrong substantive claim. The strict validator now separates syntax, references and authority and never returns semantic success.
**Fix:** Review answer relevance and citation entailment against supplied passages; preserve semanticPasses as null until that review is recorded. Never derive promotion from parsing alone.

## Error analysis

### French retrieval and exact-passage selection remain inadequate
**Status:** Problem exists.
Source hits remain English6/6 and French2/6. Paragraph BM25 selects exact supporting passages for only4/12; it is not a replacement for the original retrieval baseline. The original base run additionally lost one needed passage through prefix truncation.
**Fix:** Compare a multilingual retrieval candidate under a matched source snapshot, top-k and context budget, then test model generation separately. Gold labels must not influence ranking.

## Human review process

### Agent review is not approved training evidence
**Status:** Problem exists.
The twelve labels and model critique are agent-reviewed development work. Stored JSON traces are inspectable but no domain-expert annotation interface or authenticated human approvals were exercised.
**Fix:** Provide full question/context/response traces to genuine domain reviewers and record their identities and decisions separately. Keep the benchmark excluded from training.

## Labeled data

### Development sample is too small for customer claims
**Status:** Problem exists.
Twelve paired-language questions cover only six scenario families; repeated runs are not independent samples. No customer holdout or consented outcome evidence is present.
**Fix:** Collect fresh approved pilot scenarios with disjoint lineages and affirmative reuse decisions; do not call a translated sibling a new held-out family.

## Judge validation

### Human calibration of semantic judging is absent
**Status:** Cannot determine.
No calibrated production semantic judge was exercised. Independent agent criticism is useful diagnosis but cannot establish reliable TPR/TNR against human labels.
**Fix:** If an automated semantic judge is later proposed, validate each failure-specific decision against separated human-reviewed examples before deployment.

## Pipeline hygiene

### Stored-run fingerprints do not attest actual inference inputs
**Status:** Problem exists.
The audit checks frozen-case identity, stored source ordering and legacy token-cap/adapter settings. It does not independently attest model execution or actual prompt/context bytes. Original prompt-v2 changed several conditions together.
**Fix:** Capture complete model/prompt/context identities at generation time for future runs, preserve raw artifacts, and isolate experimental variables. Do not backfill missing attestations as observed facts.
