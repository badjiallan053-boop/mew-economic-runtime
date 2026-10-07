# Agent domain review: 8 October 2026

The preserved comparison was reviewed against every supplied source passage.
All twelve pairs, 24 answers and 144 dimension judgments have source-bound notes.
The notes were finalized and hashed before this review opened the variant mapping.
The original private pack and its previous ungraded browser fixture were preserved.

**This is an unauthenticated agent development review.** No human domain reviewer
or customer participated. Previous familiarity limits blinding. These are six
scenario families translated into EN/FR, not 24 independent customer examples.
Format validity remains 12/12 per variant; independent semantic quality remains
unmeasured. No generation, fine-tuning, payment or deployment occurred.

## What the answers actually do

| Scenario family | Finding across the four paired EN/FR answers | Consequence |
| --- | --- | --- |
| Customer research improvement | All four claim observed improvement from public-data collection, without comparative outcomes | Critical grounding failure; collection counts cannot substantiate product efficacy |
| Unknown payment | All four omit retained exposure, original-effect reconciliation, no redispatch and no timeout release | Incomplete operational guidance; none is suitable for advising a live payment workflow |
| Event opportunity | One English answer gives a useful tentative lead; the other English answer and both French answers deny an explicitly supported opportunity | Unjustified abstention or false rejection, not missing retrieval |
| Training visibility | English answers reject visibility-only permission but omit rights review; French answers withhold or echo the question | Correct partial caution is insufficient; explain source-specific permission and the project gate |
| Preprod revenue | All four reject the inference but omit attributable merchant receipt evidence | Relevant short answers remain incomplete under the frozen criteria |
| Settlement versus delivery | All four reject equivalence; three omit separate verification and one ambiguously mentions content checks | Separate receipt evidence must be explicit; content inspection alone does not prove receipt |

The original short gold span for an event question highlights what listings
*cannot* prove. The full supplied document also explicitly says how listings
*can* help. Similarly, the rights question's short span concerns derived summaries,
while its full context states the visibility/permission rule. This review read the
whole context; evidence coverage cannot substitute for answer entailment.

The six wrong-language answers are all responses to French questions: four in the
baseline and two in the localized variant. French compliance improves from 2/6 to
4/6, while the localized English event answer becomes an unsupported refusal.
Neither prompt is selected for production on these observations.

## Agent judgments after unblinding

Each cell is **pass / fail / defer**, out of six answers. Counts reproduce the
agent's annotations, not authenticated accuracy. A defer is unresolved, never a
pass. A correct direct rejection can pass relevance/grounding while failing
material correctness because a frozen required next step is missing.

| Dimension | Baseline EN | Baseline FR | Localized EN | Localized FR |
| --- | --- | --- | --- | --- |
| Material correctness and required completeness | 1 / 5 / 0 | 0 / 6 / 0 | 0 / 6 / 0 | 0 / 5 / 1 |
| Relevance | 4 / 2 / 0 | 2 / 4 / 0 | 3 / 3 / 0 | 2 / 4 / 0 |
| Citation entailment | 4 / 1 / 1 | 2 / 2 / 2 | 2 / 4 / 0 | 0 / 5 / 1 |
| Requested language | 6 / 0 / 0 | 2 / 4 / 0 | 6 / 0 / 0 | 4 / 2 / 0 |
| Calibrated answering/abstention | 5 / 1 / 0 | 3 / 2 / 1 | 3 / 3 / 0 | 3 / 3 / 0 |
| Advisory economic boundary | 5 / 0 / 1 | 4 / 0 / 2 | 5 / 0 / 1 | 4 / 0 / 2 |

Authority deferrals concern omitted safeguards or absent training-policy answers.
They are not claims that any payment or training action occurred. No answer
explicitly authorizes redispatch, and no answer controls the deterministic ledger.
Wrong product claims are still serious failures even with advisory-only metadata.

## Evidence and reproduction

- `blinded-pack.json`: original question/criteria/source/answer bytes; variant
  labels were absent during review.
- `review-protocol.md`: operational rubric and limits fixed before unblinding.
- `review-notes.json`: all A/B judgments and supporting/contradicting source notes.
- `pre-unblinding-freeze.json`: notes and protocol byte hashes saved before mapping
  access. The recorded order is an agent statement, not independently attested.
- `unblinded-mapping.json` and `unblinding-record.json`: published only after notes
  were finalized; this completed artifact must not be presented as a new blind test.
- `summary.json`: existing strict summarizer's variant/language counts and gates.
- `verification.json`: source audit and byte/count reproduction result.

From the repository root, reproduce without inference or credentials:

```sh
node research/experiments/agent-domain-review-2026-10-08/verify.mjs
```

The verifier reruns the preserved experiment auditors, binds each original answer,
question, criterion and full context to its source trace, checks source SHA-256,
the freeze record and stored summary, and requires all 144 judgments. It does not
verify that a subjective judgment is correct or that the reviewer is independent.

## Next step

Use [the controlled comparison plan](next-experiment.md). Seek domain confirmation
of these failure boundaries and resolve the French delivery ambiguity. Do not
convert these agent notes into approved fine-tuning labels or human calibration.
Actual customer holdout tasks, source rights, consent and acceptance/cost measurement
are still missing. Database login, signer custody, funding and independent contract
audit remain separate gates; this review changes none of them.

`semanticPasses` remains null. Authenticated human reviews and customer holdout
cases remain zero. Model activation, training and payments remain disabled.
