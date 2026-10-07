# Public showcase release audit

Reviewed 8 October 2026, Asia/Singapore, by the multilingual red-team subagent. This is a read-only AI technical review of the public presentation release. It is not a professional contract audit, verification of fresh chain state, or approval to activate payments or models. No browser tab, credential, external service or deployment was operated by this reviewer.

## Reviewed boundaries

Read AGENTS.md, SPEC.md, the public server, private operator HTTP boundary, Dockerfile and ignore rules, Railway configuration/example environment, CI/Pages workflows, deployment verifier, deployment documentation and current homepage controller. The public process serves `public/` and the intentionally exposed `src/core/` browser kernel. Lexical path containment rejects traversal. No private operator or escrow signing/dispatch routes are mounted there. Application credentials are not browser assets; `.local`, environment files and data directories are excluded from the image context. Runtime drops privileges after preparing the persistent data directory.

Public health reports demo/live evidence mode, SQLite persistence and `paymentsEnabled: false`, without credentials or principal records. Health is process-level evidence, not a readiness certificate or proof of a funded lifecycle. Public demonstration API mutations operate on shared synthetic state and have a bounded shared quota, body limit, JSON requirement and cross-origin mutation check. The ephemeral homepage demonstration does not call those APIs. A client can exhaust the shared fixture quota; the static homepage simulation remains independent of it. Do not populate the public demo database with private customer work.

Live-evidence API routes require a server-side bearer token; arbitrary observation/reset fixtures are rejected there. The separate private operator service derives principal ownership from its enrolled authorization policy, checks caller scope and forbids browser origins. Deploy it separately with its own database and access boundary if needed; publication of this homepage does not authorize that deployment. None of these mechanisms is a model wallet or payment dispatcher.

## Executed checks

Ran the existing public-server and operator-HTTP suites against loopback-only temporary/memory fixtures: **19/19 tests passed**. These exercise authorization, principal impersonation rejection, browser origins, payload limits, quota behavior, economic reservation races, restart persistence, unknown exposure and live-mode fixture rejection. The initial sandbox run could not listen on loopback (`EPERM`); the approved loopback run passed. No external/private data transmission occurred.

Source inspection found no HTML-injection/evaluation sinks in the public JavaScript searched. Homepage controller rendering uses `textContent`, actual kernel state and fail-closed disabled controls on execution failure. This is limited source/test evidence, not a penetration test or captured production traffic.

## Concrete release verification request

The initial release-verifier dependency gap is resolved in source. The verifier now includes the browser kernel, local fonts, knowledge assets, robots, sitemap and social image; it compares local/hosted bytes and checks security headers, demo health, workspace noindex and crawler asset MIME. XML/text MIME, duplicate metadata and the noindex/crawl conflict are fixed in the server and SEO generator. This reviewer has not run the production verifier; the lead owns hosted verification and deployment receipts.

The main Railway public origin supports root-absolute links/imports. The GitHub Pages workflow may deploy under a repository subpath, where `/core/mew.mjs` and other root-absolute links do not address the uploaded application. Treat project-subpath Pages and `file://` as unsupported presentation destinations until base-path behavior is tested or fixed. This does not prevent the reviewed Railway release and is not a secret exposure.

## Gates and pending evidence

Keep the existing explicitly synthetic Railway service, resource limits and separate `/data` volume. Confirm actual service mode and deployment hashes after rollout; source configuration and historical receipts do not prove current runtime settings. Resource limits do not enforce the previously approved US$10 spending cap. Do not create new model/payment workers or billable services through this release.

Model format coverage remains distinct from grounding and language quality. Fresh customer outcomes, permission-approved training, authenticated delivery, funded preprod payment evidence, exact transaction ledger acceptance and the external professional audit remain separate pending work. Runtime screen-reader, OS reduced-motion, zoom and production network tracing are not claimed by this audit.

## Final motion and metadata source review

Reviewed the new homepage motion/controller and metadata. Decorative motion responds to actual local kernel phase, never advances an economic action, and cancels or pauses on explicit pause, reduced-motion preference, document visibility and artwork intersection. Offscreen result animation is skipped. No API/storage/wallet operation was introduced. These are source guarantees reviewed here, not fresh browser OS-preference tests.

Canonical and social URLs identify the existing Railway public origin. Structured data describes a free `WebPage` prototype with models and payments disabled; it claims no customer performance, partnership or professional audit. Verified the local social image is a 1200×630 PNG and home/index bytes match. The image briefly did not exist during concurrent authoring; it is now present, closing that release dependency issue locally.

Reviewed the proposed SEO generator and sent narrow corrections to the lead: serve robots as text/plain and sitemap as XML; avoid duplicate description tags; and distinguish crawler exclusions from security controls. Public workspace pages remain public synthetic pages regardless of noindex/robots directives. If previously indexed workspace URLs must disappear, allowing crawlers to see noindex is preferable to blocking their fetch. Actual generated pages, final dependency verification and hosted hashes remain the lead's release checks.


## Final education integration review

Reviewed bounded collection, mission conversion, simulated six-task rehearsal, static education publication, metadata generation and final server headers. **8/8 education collector/context tests passed locally**, using injected public-source fixtures and an in-memory company runtime; no external request or model inference was performed. The actual public snapshot contains 18 observations from 12 of 13 requested sources. One retrieval was unavailable (HTTP 429); completeness is explicitly false. SHA binding proves selected bytes and the mission identity changes when selected evidence changes. It does not authenticate publisher claims, endorse sources or establish training rights.

Archived publication retains historical observations and labels the network tip historical rather than current payment evidence. New mission selection filters expired observations, preserves untrusted source text inside evidence, keeps a separate fixed policy brief and forbids training, model activation and payments. Existing compact role/task contracts are reused; the rehearsal provider is explicitly simulated. No live financial dispatcher is added.

Both narrow robustness findings sent to the lead are now resolved and independently rechecked in source:

1. Mission conversion validates finite event and availability timestamps at or before snapshot asOf. Network-tip source freshness uses block event time as well as availability; future events and newly fetched stale blocks are rejected or excluded. Identity checks reject duplicates across archived records, including expired records.
2. Quality schema and source counts are validated before publication: counts must be bounded nonnegative safe integers. The previous HTML scalar interpolation path cannot accept the malformed string count fixture.

Reran **9/9 education collector/context tests and 1/1 SEO test**, all passing. These cover future event/availability, stale network blocks, malformed source-count metadata and final SEO asset boundaries. No further material finding remains within this narrowly reviewed integration scope.

These are local source findings, not fresh hosted deployment evidence. Models remain simulated; training, paid jobs, signer dispatch, fresh ledger acceptance and external professional contract audit remain gated.
