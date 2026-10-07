# Public ecosystem research dataset

Collected 7 October 2026. Run `node scripts/collect-ecosystem.mjs`, then `node scripts/ecosystem-rehearsal.mjs` from the repository root. Collection requires Internet access. No credentials are used. Fixed source URLs, no redirects, 20-second timeout and a 1 MiB response limit bound retrieval. Failed sources remain visible in manifest.json; the collector never substitutes fixtures.

This snapshot contains 54 API records and five manually curated primary-source announcements. It is a small evidence catalog, not an exhaustive news feed, training corpus or customer-demand study. Full articles are not redistributed. The announcements were reviewed independently; the collection script does not automatically refresh them.

## Data scientist framework

1. Question: which integrations could improve a paid, bounded marketing/clipping workflow?
2. Units: network tip, country-year, repository snapshot and publisher announcement remain separate. No join or growth inference is valid merely because records share dates.
3. Provenance: manifest records endpoint, retrieval time, response hash and success/failure. records.jsonl contains normalized API observations. news.json contains original summaries and issuer-claim labels. The response hash is provenance metadata, not independently verified authenticity; raw responses are not archived.
4. Cleaning: reject malformed chain tips and out-of-range percentages; exclude null indicator observations; enforce unique IDs. Nulls never become zero. Repository licenses may remain unknown. Source failures and historical lag must be reviewed before using evidence.
5. Evaluation: test malformed inputs and missing data. Collect repeated snapshots before estimating activity trends. Acquire real customer labels before predictive modeling. Never infer Masumi payment volume from Cardano tip height.
6. Model boundary: model-input.json exposes 59 evidence records to the existing compact workflow. rehearsal-result.json uses simulatedProvider; it verifies orchestration and reference transport only. No live model was called, trained or shown to improve strategy.

## Dictionary

- network_tip: key network/blockHeight; integer height/absoluteSlot, blockTime from Koios. Mainnet and preprod are separate networks. Tips are perishable and do not verify a payment.
- country_year: key country/year; IT.NET.USER.ZS is Internet use as percent of population, World Bank historical context. Not individual behavior, ad conversion, clipping demand or market size.
- repository_snapshot: repository identifier, last push date, archived status, declared license and untrusted description. Activity does not prove reliability or compatibility.
- publisher_announcement: publication date, primary URL, original brief summary, publisher_claim classification. Public announcements do not establish MEW partnership or licensed dataset access.

## Product and partnership hypotheses

Prioritize one instrumented five-clip pilot before expanding the agent team. Measure accepted deliverables, revision count, time to approval, duplicate spend avoided and cost per accepted deliverable. Keep marketing conversion claims separate until customers supply attributable outcomes.

GWI/Sokosumi is a potential audience-brief input. Validate commercial access, allowed derived-data use, identity verification and per-job pricing before procurement. There is no GWI dataset included here. Compare its incremental value against a customer-supplied brief in a controlled pilot.

Sokosumi-MCP can be investigated as a distribution and service-discovery boundary. Map each remote job ID to MEW's immutable effect ID; preserve UNKNOWN status across timeout, authenticate receipts and require approval for external paid dispatch. Repository metadata alone does not validate its API contract.

n8n can connect approved Web2 briefs and delivery tools. A durable MEW reservation store must remain authoritative across webhook retries; workflow memory is not a financial ledger. Start with a read-only or simulated connector and measure replay behavior before enabling writes.

Koios is useful for independent public chain observations, not a replacement for the existing bound receipt verifier. Before adding a second verifier, validate exact recipient/asset amounts, transaction ownership binding, rollback policy and cross-provider disagreement.

World Bank indicators support country context only. The missing commercially useful data is first-party: customer briefs, explicit content rights, labeled clip acceptance, revision history and verified payment/delivery outcomes. Collect it with customer permission and retention limits. This is more valuable than indiscriminately expanding news ingestion.

## Skill references

Applied the installed data-analytics analyze-data-quality skill. Also reviewed the skills.sh exploratory-data-analysis listing at https://www.skills.sh/aj-geddes/useful-ai-prompts/exploratory-data-analysis as reference material. No unreviewed installer or third-party executable was run; no external skill grants authority over secrets, spending or publication.

## Expanded snapshot and integration · 7 October 2026

The ten fixed API sources now include nine country contexts (USA, GBR, SGP, FRA, DEU, ARE, IND, BRA, NGA) and seven repository references. Countries are illustrative contexts, not a ranking of target markets. Five original news summaries include two recent publisher analyses; legal and security statistics in those analyses are not promoted to verified facts. Full articles are not copied.

Validation now rejects incomplete indicator pagination, malformed country/year keys, unexpected indicator identifiers, invalid chain timestamps and repository identity mismatches. quality.json reports excluded null counts. This remains a bounded snapshot: there is no arbitrary URL crawler, no address-level profiling and no automated newsletter or paid data scraping.

Run `npm run research:collect`, `npm run research:rehearse`, then `npm run research:publish`. The publisher produces public/research-snapshot.json and /research.html displays it read-only using text nodes. The existing Docker image already copies public assets, so deployment needs no additional database, worker, credentials or scheduled jobs. Update the snapshot offline before deploying; the public server never starts collection or inference. Collection writes several files sequentially: use one operator and do not publish during collection. Atomic versioned snapshot promotion and scheduled refresh remain future work.

Reviewed https://www.skills.sh/olehsvyrydov/ai-development-team/data-engineer for quality/freshness and idempotent-pipeline ideas. Reference only; its separate workflow gates and tools were not installed or invoked.

Additional product experiment: export a dispute packet linking mandate, reserved effect, remote job ID, payment observations, artifact hash and acceptance decision. This packet is evidence for an operator; it is not a legal guarantee or an authenticated receipt unless signatures are actually verified. A settlement integration should preserve unresolved capacity on ambiguity.
