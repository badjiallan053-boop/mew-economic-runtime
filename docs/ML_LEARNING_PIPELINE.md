# Public evidence and model-learning pipeline

## Target and current status

Improve MEW's source-grounded advisory research and pilot planning: produce useful conclusions with citations, distinguish observations from assumptions, and abstain when evidence cannot support a claim. Financial admission, signing, settlement and capacity decisions remain deterministic. This pipeline grants no runtime privileges.

The 7 October 2026 collection contains **159 observations**: 112 article-day view counts, five repository snapshots, ten sampled blocks and 32 sampled transactions. All 15 source calls succeeded in the latest run. No verified merchant payments, reviewed supervised labels or trained language model exist in this dataset. Raw responses, SHA-256 hashes, query parameters, collection times and failure records are retained locally in the repository. No model upload or training call occurs.

## Reproduce

Run from the repository root with Node 24 or newer:

```sh
npm run learning:collect
npm run learning:analyze -- research/learning/2026-10-07T13-13-06-688Z
npm run learning:evaluate -- research/learning/2026-10-07T13-13-06-688Z
npm run learning:export -- reviewed-labels.jsonl /tmp/mew-reviewed-export
```

Collection writes a new exclusive timestamp directory; it never replaces a previous snapshot. Analysis verifies the normalized-record hash. The quality notebook additionally verifies every retained raw response against its manifest. Export requires human-approved labels, affirmative reuse review, source provenance, available-as-of evidence, bounded payloads and three nonempty group-separated splits. Export is a review artifact, not authorization to train. Pending label queues intentionally fail export.

## Data contracts and sampling

| Fact table | Grain | Uses | Limits |
|---|---|---|---|
| Attention | English Wikipedia article/day | Research-topic attention | User-category requests, not unique people, leads or demand; 28 closed UTC days, ending two days before collection |
| Developer ecosystem | Repository/collection time | Integration ecosystem context | Stars/forks are snapshots, not adoption or growth; no descriptions sent to the model |
| Cardano blocks | Network/block | Recent chain context | Latest five-block convenience sample per network, not daily/network totals |
| Transactions | Network/transaction | Fee context and integration research | At most 20 transactions per network from those blocks; public outputs include change and cannot establish MEW revenue |

Mainnet and preprod remain separate. Lovelace is a canonical integer string and calculations use BigInt; values never pass through floating-point money arithmetic. Transaction responses are projected to hashes, height, timestamp, fee and total output. Wallet addresses, datum, scripts and transaction metadata are not retained. The deployed Koios response currently lacks the optional contract-validity field; its value remains null. Even a true validity field would not prove customer fulfillment.

Every observation has eventAt and availableAt. A historical event collected today cannot enter yesterday's prediction. Runtime context is capped at 60 evidence records, selected round-robin by source URL; omitted records are disclosed. This selection is not representative. Different-grain datasets are not joined to manufacture correlations. Public source payloads are untrusted evidence, never instructions or payment authority. API errors produce explicit unavailable source records.

Public availability does not settle training reuse rights. All observations start with reuseReview pending, trainingEligible false and label null. Review source terms, retention and intended redistribution before approving a training example. GitHub's repository license field concerns repository contents and does not automatically license every API field.

## Baseline and next experiment

The current evaluation exercises nine authored verdict scenarios through MEW's existing runtime. Its deterministic always-abstain baseline passes seven and fails two useful-answer cases. This measures contract/verdict behavior only: no language model was invoked, and factual correctness, citation entailment and customer value remain unmeasured. Treat 7/9 as a baseline failure mode, not model accuracy.

1. Freeze these scenarios and expand a reviewer-owned evaluation set with normal useful tasks, conflicting sources, prompt injection, stale evidence, preprod/mainnet confusion and unsupported revenue claims.
2. Supply a configured provider/model locally and evaluate a base model with retrieved, bounded public context. Record exact model ID, prompt version, dataset hash, source cutoff, token usage, latency and cost. Do not mutate the existing execution path.
3. Human reviewers grade usefulness, citation entailment, factual grounding, calibrated abstention and authority boundaries. A useful answer must not evade the task by always abstaining. Never use stars, pageviews or transaction outputs as success labels.
4. Collect consented pilot outcomes: artifact acceptance, required corrections and delivery evidence. Verified merchant receipts are a separate payment fact table, not a supervised quality label. Keep customer identifiers out of model prompts and use restricted storage for private data.
5. Only if base-model retrieval leaves repeatable behavioral failures, curate task/answer examples in label-queue format. Use independent entity groups and a later time holdout; avoid paraphrase/template leakage and record reviewer disagreements. The exporter checks supplied group IDs, not their semantic correctness: independent review must verify grouping and temporal holdout design.
6. Compare base+retrieval against tuned+retrieval on the frozen holdout. Promotion requires no authority violations, no unsupported merchant-payment claims, no grounding regression, and a measured usefulness gain within an approved model budget. Existing fail-closed payment controls still apply.

Fine-tune behavior, not rapidly changing public numbers. Retrieval supplies current facts. Do not train on synthetic answers merely because another model generated them, and do not upload the pending queue. No training budget or credentials are assumed by these scripts.

## Operational gaps

Scheduled collection, retries/backoff, source retention, private customer instrumentation, model credentials, a reviewed training license policy, held-out human labels, model-specific export validation and a funded training budget remain pending. This is a runnable offline research/learning tool, not a production data warehouse or a deployed training service. The website and payment configuration were not changed by this contribution.

## Inspected guidance

- [skills.sh MLE workflow](https://www.skills.sh/affaan-m/ecc/mle-workflow) and [upstream procedure](https://github.com/affaan-m/ecc/blob/main/skills/mle-workflow/SKILL.md): task definition, baseline, leakage-aware splits and promotion gates; reference only, no executable package installed.
- [Koios artifacts](https://github.com/cardano-community/koios-artifacts): bounded block/transaction endpoints and schema projection, checked against actual deployed responses.
- [Wikimedia pageview definitions](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/concepts/page-views.html): request-count interpretation and bot classification limits.
