---
name: mew-blinded-model-review
description: Prepare and inspect blinded EN/FR comparisons of MEW's preserved model outputs, then identify error-driven experiments without treating development notes as activation evidence.
---

Read docs/MODEL_PAYMENT_UNBLOCKING.md and AGENTS.md. Use `npm run model:blind-review -- <fresh-private-directory>` for the currently audited baseline/localized pair. It runs no inference and preserves the original files. Review exact answer claims against all supplied passages, requested language, useful action and abstention, independently of format validity.

Share only blinded-review.html with the reviewer. Keep private-mapping.json away until notes are finalized. Answer positions are balanced separately within EN/FR; case order is randomized. This masks labels and prompts, not answer style or previous familiarity. Full inference traces remain available in the preserved audit tools after review.

Import downloaded notes with `npm run model:blind-review -- <prepared-directory> --notes /absolute/notes.json`. A hash establishes bytes, not reviewer identity. Keep all self-declared human and agent judgments separate from authenticated review. Missing judgments and semantic scores remain unmeasured. Even all-pass notes never activate anything.

Use the installed error-discovery skill for a requested interactive human error-analysis session. Its human feedback loop is not replaced by agent-generated labels. Document unsupported outcome claims, wrong language, omissions and unjustified abstention as candidate failure modes until humans confirm them. The inspected walkthrough and source pins are in research/activation/unblocking-sources.json.

Do not sweep more prompts on the same twelve families to claim generalization. Preregister a representative, rights-cleared customer task and lineage-disjoint holdout outside model prompts, retrieval tuning and training. Compare one relevant change or a suitable model with bounded actual cost and unchanged baseline. Use judgy only after independent human calibration exists; no such calibration currently exists. No paid call, training or deployment follows from preparing this review.
