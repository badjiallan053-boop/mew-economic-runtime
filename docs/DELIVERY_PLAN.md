# MEW delivery plan

Updated 7 October 2026. This is the sequenced backlog and ownership map; OPERATING_SOP.md owns procedures, SPEC.md owns economic invariants and LIVE_DEPLOYMENT.md owns observed release evidence. Existing implementation remains five advisory roles, six compact tasks and deterministic spending decisions.

| Order | Outcome | Accountable role | Dependency and acceptance evidence |
| --- | --- | --- | --- |
| 1 | One reviewed hosted release | Engineering + risk | All tests/build pass, correct commit deployed, HTTP asset hashes match checkout; existing SQLite volume retained; demo labels visible |
| 2 | Reproducible evidence intake | Knowledge | Fixed public sources, validation/quality report, original news summaries, no cross-grain joins; promote complete snapshots only |
| 3 | Measured model quality | Engineering + independent red team | Entitled provider configured privately; compare real outputs to baseline on fixed inputs; test false citations, injected source text, malformed responses and abstention; cost ceiling required |
| 4 | Five-clip customer pilot | Coordinator + risk | Customer permission and content rights recorded, budget/quantity immutable, accepted artifacts and revisions measured, attributable outcome labels; no outreach automated by this plan |
| 5 | One authenticated external job | Engineering | Exact deployed provider schema checked; signed delivery receipts; persisted job/effect identity and UNKNOWN reconciliation after timeout/restart; simulation first |
| 6 | One verified preprod payment lifecycle | Engineering + risk | Funded approved signer, scoped MPS credentials and migrations, durable executor, exact asset/amount/seller binding; settlement and delivery independently verified |
| 7 | Commercial product decision | Coordinator | Pilot comparison of customer-only brief versus licensed audience input; report cost/accepted artifact, acceptance rate, latency and duplicate spend prevented; do not infer demand from Internet penetration |

## Interoperability contract

Each adapter must carry objectiveId, principal, semanticKey, immutable effectId and provider jobId without replacing identities during retry. Use integer atomic monetary units and explicit network/asset identifiers. Source text and agent proposals carry no financial authority. Receipts must bind exact artifact hash and operation before they establish delivery. An unknown payment outcome retains capacity; the original operation is reconciled rather than repeated.

Keep three storage domains separate: economic SQLite, advisory mission journal and any future MPS PostgreSQL. A public research snapshot contains no customer briefs, credentials or wallet seeds. Customer pilot records need separate access control and a retention policy; public /research.html must never become a private-data dashboard.

## Release procedure

1. Review working-tree changes, run `npm test` and `npm run build`.
2. Push the authorized branch. Inspect Railway's staged changes; apply only the intended MEW service release. Keep the persistent volume, replica count and resource limits.
3. Wait for successful deployment, then run `npm run deploy:verify`. This compares hosted assets to checkout hashes and checks simulation/payment boundaries. It does not alter hosted state.
4. Record deployed commit and deployment ID in LIVE_DEPLOYMENT.md. If deployment fails, inspect logs and preserve the previously healthy deployment; do not enable models or payments to fix a static rollout.
5. Track cumulative incremental hosting usage against the owner's US$10 authorization. The resource limit is not a billing cap. No extra worker, replica or database is required for research publication.

The source is pinned to a reviewed commit. Git pushes alone do not update it. A later release requires an explicit source update and verification, which prevents unrelated work from automatically reaching the demo.

## Remaining engineering gaps

Research collection currently writes multiple files sequentially. Next data change should add a versioned staging directory, atomic promotion and a last-good snapshot policy before scheduling automatic refresh. Current data is a small snapshot, not continuous monitoring or a customer-demand model.

Live model inference, deployed authenticated delivery, external job dispatch and signing remain unavailable. Local model and delivery libraries are implemented. The roadmap does not count them as completed. Repository announcements guide hypotheses; they are not verified compatibility, security results or partnerships.

## Durable foundation follow-up

OperationStore now atomically stores reservations with outbox rows and verified delivery receipts with delivery transitions. A simulation worker tests timeout and stale-worker fencing; live dispatch is rejected. Durable local receipt replay is implemented, while public API authentication, real provider enrollment, signer integration, deployed Masumi compatibility verification and actual network reconciliation remain pending. Run `npm run durable:rehearse` and read DURABLE_OPERATIONS.md before integrating a live executor.

## Private production foundations

Scoped operator authorization, coherent SQLite backup/restore rehearsal and a pinned Masumi contract manifest are implemented and tested as private library boundaries. They do not enable public operator routes or live dispatch. Assign named human owners using PRODUCTION_TEAM.md, authenticate provider key enrollment, reconcile restored operations, and verify the actual deployed Masumi release before enabling writes. Official YouTube context was located, but transcript extraction was unavailable; no unseen video statements are implementation evidence.

Latest verified assessment and shortest pilot path: [NEXT_PILOT.md](NEXT_PILOT.md).
