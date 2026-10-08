# Bounded education and research context

This directory holds MEW-owned notes and explicit metadata projections from reviewed public sources. It contains no full course text, raw captions, paper full text, wallet addresses, keys, author profiles or automatic training examples.

`registry.json` is the reviewed source policy. `video-notes.json` records actual caption access and short original timestamped notes. Timestamped directories are immutable collections; inspect their `quality.json` and `manifest.json` before using any evidence. Counts describe records and source retrievals, not competence, adoption, payment activity or research entailment.

Run the original collector with `node scripts/collect-education.mjs`; run its fixture-based negative checks with `node --test tests/education-collector.test.mjs`. No arbitrary source URL or credential argument is accepted. No installer or model training is triggered. The compact company adapter must consume records only as source-bound advisory evidence, with training, payment and activation disabled.

See [the workflow documentation](../../docs/STANFORD_AGENT_WORKFLOW.md) for source links, licenses, content limits, freshness and current quality gates. Historical network-tip snapshots must retain capture time and cannot stand in for a current or merchant-specific verification.

Latest captured run: `2026-10-07T20-44-30-849Z` (8 October 04:44 Singapore), eighteen records, twelve successful sources and one Crossref HTTP 429. The earlier `2026-10-07T20-43-20-437Z` run has twenty-two records and thirteen successful sources. Their manifests describe separate observations; counts cannot be added as unique papers or current coverage.
