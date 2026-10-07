# Risk review and deployment gates

7 October 2026. Static review baseline: `77e7bb7`. This is a prototype assurance record, not proof that all risks are covered. No wallet signer, payment executor or live LLM committee exists in this runtime.

Three medium-severity findings were confirmed against the baseline and corrected with regression tests:

| Failure | Enforcing change | Regression evidence |
| --- | --- | --- |
| Public demo can grow decisions/objectives/claims indefinitely | Each runtime/rehearsal snapshot is capped at 2 MiB in demo; synchronous transaction rolls back beyond budget. Shared demo API quota is 120 requests/minute; health is exempt. | Repeated evaluations reach the cap; original reservation remains intact. HTTP quota returns 429 with Retry-After. |
| Recipient-owned change counted as payment | ADA verifier requires inputs and outputs, subtracts recipient input lovelace, and compares exact net receipt with reserved amount. | Self-funded change rejected; actual payment plus change accepted; missing input evidence rejected. |
| Simulated ledger reopened as live | Immutable mode stored in SQLite; incompatible startup fails. Populated unclassified legacy databases cannot start live. | Demo/live reopen refusal; original simulated state preserved; legacy adoption refusal. |

The cap is an admission boundary, not automatic pruning. No unresolved financial record is deleted to make space. Live snapshots have a 64 MiB ceiling; reaching it stops mutations and requires operator intervention. This prototype is not suitable for continuous live reconciliation without capacity monitoring and a migration to a proper journal. The quota is shared across visitors and resets when the process restarts; an attacker can consume it. It reduces request cost but is not an edge DDoS defense. SQLite/WAL file size and host resources must also be monitored. Separate demo/live database paths are required; there is no automatic promotion or migration of simulated history.

Existing and added tests cover competing reservations, restart/retry, immutable effect/claim contracts, unknown payment/delivery, full refunds, regressive transitions, replay, forged live observations, cross-origin JSON requests, token identity and full seller net receipt, quote substitution, wrong owner/rail, malformed chain evidence, transaction reuse under concurrent reconciliation, rollback on asynchronous transaction callbacks, and 1,000 seeded adversarial retry/unknown-claim operations. Provider fixtures are synthetic. The randomized test checks accounting invariants, not model behavior or real-chain finality.

The subsequent [Cardano integration](CARDANO_INTEGRATION.md) implements persisted operator-attested attribution and read-only connectivity. Reconciliation now requires a saved hash. Cryptographic signer/mission ownership, external dispatch, fee reservation and reorg recovery remain pending.

## Remaining gates, in execution order

| Gate | Required implementation / proof | Current state |
| --- | --- | --- |
| Hosting | Build Docker image; configure one replica, durable volume, TLS, private operator access, edge limits; verify backup restore and restart | Prior Railway simulation deployed with a durable volume; US$10 total submission cap approved. Private-repository source access now blocks deploying latest commit; restore/edge protection checks remain pending. |
| Durable dispatch | Store immutable mandate, normalized accepted quote/resource/digest, operation ID, expiry, fee allowance and submitted transaction hash atomically; lease/outbox; recover crash after submission without another spend | Not implemented; no dispatcher exists |
| Evidence provenance | Reconcile only authenticated operation/Task withdrawal hash; authenticated artifact/manifest digest, mission ID and delivery criteria | Net receipt is necessary but does not establish payer identity, mission ownership or delivery |
| Chain lifecycle | Handle provider outages, rollbacks/reorgs, delayed indexing, partial refunds and failed submissions; unknown keeps exposure | Confirmation policy exists; reorg lifecycle not implemented |
| Identity | Per-principal authorization, scoped signer/service credentials, rotation and revocation; don't expose global operator token to browsers | Single trusted operator token only |
| Paid worker | Actual Sokosumi/eve Task worker and MPS schema/version integration; timeout/cancel/retry and laptop-offline proof | CLI/source installed; real worker, credentials and funding pending |
| Model safety | Independent Role/Risk/Red-Team contexts; schema enforcement, numeric-only candidate frame, provenance-backed retrieval, abstention, adversarial prompt-injection/evidence-substitution tests using the actual configured models | Rehearsal roles are fixtures; no claim of model red-team coverage |
| Quality | OOS evidence and leakage/survivorship checks for any trading use; delivery acceptance evaluates usefulness independently of payment | No trading executor added to MEW |
| Supply chain | Pin external sources, review SKILL.md before enabling tools, audit runtime dependencies and provenance; no install instruction grants authority | Ignored third-party dependency implementations excluded from static audit |

MPS needs its own PostgreSQL and encrypted wallet storage. MEW currently uses SQLite; multiple independent replicas cannot coordinate reservations. Blockfrost is the fixed preprod evidence provider. Sokosumi/eve need operator authentication and entitled model credentials. A vector database is not required for this demo: start with versioned source records and exact evidence links, then add retrieval only when measured needs justify it. Every external source is untrusted data; it cannot expand tool/payment authority.

## Knowledge provenance

The installed MEW engineering and TOKEN2049 SKILL.md procedures preserve accounting and recovery boundaries. The [skills.sh TDD entry](https://www.skills.sh/addyosmani/agent-skills/test-driven-development) and its reviewed upstream source informed failing regression tests before fixes. The [Codex Security skill listing](https://www.skills.sh/openai/plugins/threat-model) matches the installed plugin used for the source-backed audit. No arbitrary skill installer or offensive remote scanner was run.

The official [x402 Office Hours article](https://developers.cardano.org/blog/2026-04-24-media-cardano-developer-office-hours/) describes v2/protocol integration; its [YouTube recording](https://www.youtube.com/watch?v=5yhdNPAn8BA) was opened and transcript export returned unavailable. The official [Masumi Updates article](https://developers.cardano.org/blog/2026-08-28-media-cardano-developer-office-hours/) identifies Smart Contract V2, Hydra and Veridian certification as ecosystem topics; its [recording](https://www.youtube.com/watch?v=mCH4xWJ89Vc) also has no obtainable transcript. These are research leads, not implementations or verified features in MEW. No video transcript or time-stamped knowledge extraction is claimed.

The inspected [Cardano x402 demo](https://github.com/cardano-foundation/x402-cardano-demo) supplies operation-binding examples, but its in-memory map is insufficient for crash recovery. The inspected [official paid-agent branch](https://github.com/masumi-network/demo-agent-token2049/tree/live-demo-name-finder) supplies durable pending stages and receipt handling. MEW's full configured net receipt rule deliberately exceeds a merely positive seller receipt check. See LIVE_DEPLOYMENT.md for pinned revisions and source paths.

For the hackathon jury, demonstrate reservation, uncertainty, duplicate blocking, verified result binding and recovery separately. Clearly mark fixture evidence. Real-chain proof requires the authenticated Task, submitted transaction and independent expected seller receipt; ecosystem videos and a successful local test suite are not substitutes.
