# Stanford-informed advisory workflow

Reviewed 8 October 2026, Asia/Singapore. MEW is not affiliated with Stanford, and no course enrollment, certificate or “AGI qualification” is claimed. Public course resources inform specific engineering checks. They do not establish model competence or financial authority.

## What was actually researched

| Official source | Relevant context | MEW consequence |
| --- | --- | --- |
| [CS251 Blockchain Technologies](https://cs251.stanford.edu/) and [public syllabus](https://cs251.stanford.edu/syllabus.html) | Wallets, consensus and blockchain software; Bitcoin and Ethereum are major case studies | Review key custody, rollback and uncertainty explicitly. Cardano-specific semantics still come from Aiken/Cardano sources. Current lecture recordings require course Canvas login; no bypass was attempted. |
| [CS229 Fall 2025](https://cs229.stanford.edu/index.html-fall25) | Dataset splits, evaluation metrics, error analysis, RAG/fine-tuning and safety | Separate development cases from an untouched customer holdout. Report evidence coverage, response shape, citation entailment, language quality and task utility separately. |
| [CS25 official recordings](https://web.stanford.edu/class/cs25/recordings/) | Public talks on retrieval, alignment and generalist agents | Use source-bound context and evaluate retrieval separately from generation. Agent feedback remains advisory and cannot change mandates or payment gates. |
| [CS336 current public course](https://cs336.stanford.edu/) | Evaluation, data filtering/deduplication and post-training | Build original small checks around documented failures before any adaptation. Course cloud-training configurations are not a requirement or a spending authorization for MEW. |

No invented Stanford AGI course is used. Public lecture access does not imply permission to publish captions, scrape private course systems or train on copyrighted teaching material.

Two videos linked directly by Stanford's CS25 index were reviewed through actual public English captions: [Retrieval Augmented Language Models](https://www.youtube.com/watch?v=mE7IDf2SmJg) and [Generalist Agents in Open-Ended Worlds](https://www.youtube.com/watch?v=wwQ1LQA3RCU). The first supplied 1,980 caption segments, with reviewed grounding/context cues at 6:32–8:55 and sparse/dense retrieval cues at 12:11–16:09. The second supplied 1,131 segments, with reviewed feedback-loop and bounded/open-ended task cues at 2:58–3:09 and 4:46–7:31. These are caption-based notes, not a claim that every frame was watched. Digests and short original notes are in `research/education/video-notes.json`; no complete captions, media or training examples are published.

## Verified repositories and public API boundaries

- [Stanford data assignment](https://github.com/stanford-cs336/assignment4-data/tree/0555bea66369872d912652debf10b115ca0688c8) at `0555bea66369872d912652debf10b115ca0688c8`: useful filtering/deduplication reference, with incomplete student implementation. Its README describes a large cloud training configuration; that configuration was not installed or executed.
- [Stanford alignment assignment](https://github.com/stanford-cs336/assignment5-alignment/tree/c2734a26308710949fe13226960a1e8cece94b7e) at `c2734a26308710949fe13226960a1e8cece94b7e`: useful test/objective structure, not a finished production agent. Training and safety adapters require implementation. Repository license was not asserted by the API and remains unknown here.
- [Crossref REST documentation repository](https://github.com/CrossRef/rest-api-doc/tree/00b1cc2c90e62d49c82f5381710590a6d9ca53ff) at `00b1cc2c90e62d49c82f5381710590a6d9ca53ff`: explicitly deprecated, so its README's [current API pointer](https://api.crossref.org/) must be used for integration maintenance. The collector verified real bounded `/works` responses with projected bibliographic fields; it downloads no papers or abstracts. Query results are discovery candidates, not supported research findings.
- [OpenAlex source](https://github.com/ourresearch/openalex/tree/312af8772356104fc80cb4597113a5ab7ce3b027) at `312af8772356104fc80cb4597113a5ab7ce3b027`, plus [current API documentation](https://help.openalex.org/api/): basic no-key public access is documented and a four-record projected request actually succeeded. Metadata is described as CC0; publisher full-text rights are separate. No key is collected, persisted or placed in a URL.
- [Koios artifacts](https://github.com/cardano-community/koios-artifacts/tree/2e2eb57933e1e2528de5ca36ee961759841cf389) at `2e2eb57933e1e2528de5ca36ee961759841cf389`: a real projected preprod network-tip request succeeded. Block height, slot and block time are aggregate observations. This request establishes no wallet funding, MEW transaction, settlement, receipt or delivery.

Registry fields distinguish metadata notes, repository/content rights and the explicit `trainingReuseApproved:false` gate. Open access or a software license cannot silently authorize model training on publisher content.

## Runnable data contract

Run `node scripts/collect-education.mjs` from the repository. The collector accepts no arbitrary URLs or credentials. It reads the reviewed local registry, makes at most thirteen sequential public requests, uses a 15-second per-request deadline and a 1 MiB response limit, rejects redirects/substituted responses and retains only explicit projected fields. Failed requests are recorded without copying provider exception text or response bodies. Course pages and README content are used for source identity/provenance; only MEW-owned short summaries are retained.

Each immutable run directory contains:

1. `records.jsonl`: at most thirty normalized records, with source identity, capture/availability time, event time, reference URL, title, summary, workflow role, rights gate and authority boundary.
2. `manifest.json`: exact request URL, request/retrieval timestamps, outcome, response digest/bytes, retrieval scope and record count. Failed sources remain visible.
3. `quality.json`: record, manifest and registry digests; counts; collection completion time; limitations; model, training and payment gates.
4. `advisory-input.json`: bounded context with only eligible records as of collection completion. Dynamic network evidence expires after ten minutes, discovery metadata after one day and educational references after thirty days. These are MEW review policies, not external source guarantees.

The pure `educationContext` helper re-evaluates event/availability times and freshness when consuming a snapshot. A historical webpage may display the old capture time, but must not label that observation as current network state. Year/month publication dates retain their precision; a default first day is for ordering, not a claim of exact publication day.

```json
{
  "schema": "mew.education-observation.v1",
  "id": "stable-source-and-observation-identity",
  "sourceId": "stanford-cs336",
  "title": "CS336: Language Modeling from Scratch",
  "referenceUrl": "https://cs336.stanford.edu/",
  "grain": "course_reference",
  "reviewStatus": "source-reviewed",
  "workflowRole": "data-quality-review",
  "authority": "advisory-only",
  "sourceTextUntrusted": true,
  "trainingEligible": false,
  "license": {"trainingReuseApproved": false}
}
```

This abbreviated example describes the interface, not a usable timestamped record. Full records also carry source response digests, timestamps, freshness and detailed license descriptions. Provider-supplied titles are untrusted data: display through text nodes/escaping and pass them only as evidence content, never prompts or commands.

## Integrate with the existing compact company

The existing compact team has five roles and six tasks. More course links do not require another swarm. The context adapter must validate the snapshot's digests, project to the existing `CompanyRuntime` evidence contract (`id`, `kind`, `content`, `source`) and remove collector-only fields such as `sourceId` from the top-level runtime evidence object. Preserve source IDs inside the bounded evidence content so reviewers can distinguish discovery metadata from implementation evidence. The runtime already rejects unknown top-level fields and unsupplied citation IDs.

| Existing role | Education-informed task | Required output and stop condition |
| --- | --- | --- |
| Scope coordinator | Identify a bounded task and its current failure; prohibit payment/activation changes | Exact mission/objective identity and measurable acceptance; abstain when no useful source exists |
| Evidence curator | Select current, relevant observations and distinguish reviewed notes from paper discovery | Supplied evidence IDs, grain, provenance, rights and omissions; title-only records cannot support findings |
| Builder proposal | Propose a minimal matched-context retrieval/evaluation improvement | Original implementation proposal, tests and no benchmark mutation or automatic training |
| Independent risk reviewer | Check grounding, temporal leakage, schema identity, rights and economic authority | Reject unbound claims, stale current-state assertions or training/payment authority |
| Independent adversarial reviewer | Inject contradictory titles, missing sources, invalid references and bilingual failure cases | Same proposal/original evidence, without the peer reviewer's judgment; cite concrete failures |
| Coordinator synthesis | Preserve disagreements and remaining blockers | Advisory recommendation and actual evidence; no majority vote can authorize activation |

Integration acceptance requires an **actual simulation-mode runtime rehearsal**, immutable mission replay and a deliberately invalid evidence-reference failure. A synthetic provider must identify itself as simulation. Such a run establishes contract/interoperability behavior, not real inference, model improvement, agent autonomy or payment execution. The implementation and its actual results are owned by the runtime integration work, separately from this collector.

## Apply this to the current 12/12 situation

Keep the frozen benchmark and original 0/12 unconstrained response-contract baseline. The constrained run's 12/12 contract checks measure shape, allowed evidence references and advisory authority. They do not prove the answer is supported, useful or correctly French. Label observed unsupported product assertions and language mixing as development failure categories. Do not turn them into human-reviewed scores.

Before adaptation: compare sparse/dense/parent retrieval under the same context budget; measure citation entailment per claim, abstention and target language; require original reviewed task labels and a separate customer holdout. Do not train on the benchmark, course captions or unreviewed public search results. A fine-tune proposal needs rights, baseline improvement evidence, model suitability and an explicit compute budget. Until those checks pass, model activation remains blocked.

Financial work continues separately through the existing unsigned escrow and durable lifecycle boundaries. Stanford blockchain concepts reinforce uncertainty and key-custody reviews; they do not replace fresh Cardano node evaluation, funded preprod setup, authenticated signer integration, fee reconciliation or independent contract audit. This educational pipeline sends no transaction and releases no exposure.

## Verification and limitations

`node --test tests/education-collector.test.mjs` passes four meaningful tests covering private-field rejection, malformed/future/duplicate metadata, legitimate multilingual title arrays, stale context, forbidden authority, immutable files, provider exception sanitization, substitutions and oversized bodies. These are fixture-based tests. Actual public collection is recorded separately in the run manifests.

An early collection retained eighteen records and one unavailable source because valid Crossref bilingual titles were rejected. The validator was corrected to accept one to four bounded title variants; the next historical snapshot, `2026-10-07T20-43-20-437Z`, contains twenty-two records from thirteen successful sources. A final collection with improved per-source retrieval timestamps, `2026-10-07T20-44-30-849Z`, contains eighteen records from twelve successful sources: Crossref's agent-safety query returned HTTP 429. Collection stopped rather than retrying the rate-limited source. Use the latest partial manifest honestly, or explicitly identify the earlier complete historical snapshot; do not mix their digests or imply the latest run was complete.

Neither failure artifacts nor old model responses were overwritten. Repository existence and readable course pages are not external endorsements. Discovered paper relevance/full text, customer outcomes, human semantic grading and training reuse remain pending.

## Implemented workflow and presentation integration

`src/company/education-context.mjs` validates exact record bytes, authority flags, bounded source counts, unique identities, event/availability times and source-specific freshness before projecting into the existing company evidence contract. A freshly retrieved old network block cannot become current evidence. Expired records remain historical in the library but leave new missions; the selection digest changes with the selected evidence.

Run `node scripts/education-rehearsal.mjs research/education/2026-10-07T20-44-30-849Z` for the actual compact six-task simulation, including both independent reviewers. Replay and adversarial input behavior are covered by five context tests; the collector has four tests and SEO generation has one. These ten tests are included in the **250/250 passing** regression suite. The rehearsal uses a clearly simulated provider, not live inference.

`node scripts/publish-education.mjs research/education/2026-10-07T20-44-30-849Z` publishes the selected 18-record historical archive. Follow with `node scripts/build-seo.mjs` and `node scripts/build.mjs`. The source count is 12/13, with the unavailable Crossref request retained in its manifest. The public library links through the homepage and company navigation; canonical metadata, sitemap, original social image and noindex workspace policy preserve the distinction between the product story and technical fixtures. Education commands run locally; the public hosted process serves the archive and does not schedule collection, training or company inference.
