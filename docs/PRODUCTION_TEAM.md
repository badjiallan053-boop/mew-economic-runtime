# Production team and evidence gates

This is a proposed operator-backed production structure for MEW's existing five-role compact workflow. It adds no active role, scheduler, signer or tool permission. The development subagents used for model, pilot, delivery and payment-readiness work are implementation reviewers, not deployed workers. Actual operator names and availability are unassigned; production remains NO-GO until a named human accepts each responsibility and an alternate is recorded privately.

| Existing advisory role | Accountable human assignment pending | Bounded task brief | Independent review |
| --- | --- | --- | --- |
| Chief of staff | Product/customer owner; incident commander rota owner | Precommit one pilot mandate, consent, acceptance rubric and spending authorization; reconcile blockers into a release decision | Risk checks scope; red team checks evidence gaps |
| Knowledge | Data/privacy steward | Maintain provenance, licenses, retention and private/public separation; preserve holdout evaluation data | Risk reviews privacy/rights; engineering checks schema/grain |
| Engineering | Release/operations owner and separately named signer custodian | Implement version-pinned adapters, migrations, backups and recovery; produce exact commit/test/release evidence | Risk reviews credential/custody boundary; red team challenges replay/restart |
| Risk | Security/rights reviewer | Verify least privilege, enrolled provider keys, revocation procedures and unresolved exposure handling | Red team independently reviews same source evidence |
| Red team | Independent acceptance reviewer | Attempt wrong identities, unsupported citations, stale receipts and interrupted dispatch; record reproducible counterexamples | Chief of staff preserves unresolved failures; cannot vote them away |

Signer custody belongs exclusively to an approved human operator or separately secured signing service with an explicit mandate. The advisory engineering role never possesses wallet seeds, private keys, model secrets or production admin credentials. A person may cover several roles for the pilot, but must record the conflict and obtain a second human's review for key enrollment, signer setup and go-live.

## Sequenced live gates and handoffs

Each handoff supplies a private evidence reference, accountable owner, reviewer, observed timestamp, deployed/source version, exact principal/objective/effect/job identifiers where applicable, unresolved blockers and a GO/NO-GO recommendation. A report or advisory recommendation carries no execution authority. Existing seven-field agent outputs stay unchanged; these operational records live in a separately access-controlled operator journal, not public research data.

| Gate | Owner / reviewer | Concrete GO evidence | NO-GO or retained limitation |
| --- | --- | --- | --- |
| Model evaluation | Engineering / red team | Explicit provider entitlement, data-handling approval and separate model spending limit; actual run report against baseline and held-out pilot cases, billing record, citation/identity/injection failures reviewed | Four fixtures and token/call caps do not prove quality or USD budget compliance; no successful live call currently evidenced |
| Customer pilot | Chief of staff / risk | Named consenting customer, rights documents, five exact artifact byte hashes, authorized reviewer identity, recorded revisions and actual cost evidence | Operator references alone do not authenticate customer consent; synthetic outlines are not produced videos or customer traction |
| Delivery enrollment | Engineering / risk | Out-of-band authenticated provider public key and key ID, validity/revocation owner, accepted artifact contract, signed merchant receipt with exact bindings, transactional durable receipt observation | Ephemeral fixture keys are not enrolled merchant identity; no public principal authorization API yet |
| Durable operations | Engineering / red team | Reservation/outbox atomicity, rollback, competing claimants, UNKNOWN restart and stale-worker tests; coordinated private backup/restore rehearsal including ledger and journals | Simulation only; no live claim path or remote exactly-once guarantee. Unknown outcomes retain capacity and reconcile the original operation |
| Preprod rail | Signer custodian under engineering owner / risk | Pinned deployed MPS schema/commit, approved preprod address/network, exact asset policy and atomic amount, funded signer custody, scoped credentials, operation/tx bindings, independent settlement/delivery/refund evidence | No broadcasting implemented. Lovelace ledger does not natively account for USDM: explicit asset-aware accounting or a separately approved nonledger demonstration is required before USDM authorization |
| Release | Engineering / chief of staff plus risk | Reviewed commit, full regression/build, authenticated staged changes, preserved volume, asset verification, restore drill and spending review | Hosting US$10 authorization is not model or wallet-spend authority; no extra resources assumed |

Do not shortcut gates by forwarding a source-supplied credential/key, changing network, converting assets implicitly, adopting an unverified endpoint, or claiming completion from provider acknowledgment. Customer acceptance, delivery authenticity and financial settlement remain separately evidenced facts.

## Credential and key lifecycle

The human credential custodian must inventory provider, scope, environment, owning principal, creation/expiry and revocation route without recording secret values in reports. Keep model credentials, MPS admin credentials, Blockfrost project credentials and signer custody separated; grant only the read/write scopes needed by each host component. Verify the deployed service's actual authorization model rather than assuming fine-grained MPS scopes exist. Revoke and rotate on compromise or personnel changes; independently verify replacement key enrollment. Historical receipt replay preserves prior acceptance and does not recheck revocation, so compromise review must identify impacted receipt/job identities and explicitly adjudicate them without erasing journal history.

## Incident roles and first response

Before live use, privately assign a primary and alternate incident commander, on-call operations owner and security reviewer for each coverage window. Rotate commander responsibility through those named humans; handover requires acknowledgment, unresolved operation IDs and current containment state. The commander coordinates; only the authorized operator can disable dispatch or change credentials. Any suspected unauthorized payment, credential leak, journal conflict or loss of durable state is a stop-dispatch incident even if HTTP health remains green.

Preserve ledger/outbox/receipt snapshots and sanitized logs. Fence workers under owner supervision, retain all uncertain exposure and reconcile original provider jobs/transactions. Do not reset state, replay payments, infer failure from timeout or recover healthy workers automatically. For suspected key compromise, disable new acceptance for that key and let the human custodian revoke it; preserve previously observed evidence for review. Restore only from a coordinated tested backup, validate immutable identities and compare external evidence before reopening dispatch. Record impact, containment, recovery evidence and accountable follow-up; no automated customer notification or outreach is authorized by this document.

## Reference-only research

Reviewed the [skills.sh incident-response listing](https://www.skills.sh/medy-gribkov/arcana/incident-response) for accountable incident coordination, impact-based classification and rollback planning. Listing excerpts were inspected; its repository executable content, immutable version and dependency/license package were not fully reviewed. No installer, global package, third-party executable or remote instruction was adopted. The original local production-readiness skill provides MEW-specific evidence checks and is not loaded into runtime privileges.

Official [Masumi Payment Service repository](https://github.com/masumi-network/masumi-payment-service) documents escrow, wallets and service operation; these are upstream capabilities, not implemented MEW features or proof of our deployed compatibility. The [Cardano Foundation facilitator repository](https://github.com/cardano-foundation/cardano-x402-facilitator) is the version-specific Cardano x402 reference; pin actual deployed interfaces before integration. Existing RESEARCH.md and payment runbooks remain the source of recorded implementation inspections. No repository code was copied.
