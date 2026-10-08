# Customer pilot acceptance checkpoint

This release adds an offline check, not customer onboarding, real media production or a delivery endpoint. Run privately:

```sh
node scripts/pilot-readiness.mjs CONTRACT.json EVIDENCE.json RECEIPT.json ARTIFACT PUBLIC_KEY.pem
```

The five explicit local files must be operator-owned regular files. The checker rejects final-component symlinks, directories, FIFOs, oversized inputs and observed file changes while reading. Parent directories must be trusted; this is not a sandbox against a hostile filesystem owner. The key file must contain only a PUBLIC KEY PEM, never a private key. Keep customer records outside public research and version control. The public key must come from out-of-band enrollment; never accept a key supplied with a receipt. This tool reads a public key only, signs nothing and writes no evidence. Exit 0 means offline checks passed, 1 means blocked evidence, 2 means malformed input. No outcome permits activation.

## Contract and evidence

CONTRACT contains exactly `schema`, `expected`, `sourceId`, `artifactVersion`, `clipCount`, `revisionLimit`, `permittedUse`, `acceptanceOwner`. Schema is `mew.customer-pilot.v1`; use is `internal-review`, `organic` or `paid-advertising`. Expected contains exactly `keyId`, `principal`, `objectiveId`, `effectId`, `provider`, `jobId`, `artifactSha256`, matching the existing delivery verifier's saved contract. Version and clip count are positive integers; revision limit is 0–20. Select these values before delivery; do not derive trusted expected identity or digest from receipt input.

EVIDENCE optionally contains `consent`, `rights`, `acceptance`; missing entries are BLOCKED:

- consent: principal, sourceId, permittedUse, evidenceRef.
- rights: sourceId, permittedUse and content/music/likeness, each with status APPROVED and evidenceRef. A “not applicable” determination still needs its reviewer reference; public availability is insufficient.
- acceptance: principal, owner, sourceId, artifactSha256, artifactVersion, clipCount, revision, decision ACCEPT, evidenceRef. Revision must fit the original limit. Exact bytes must match the trusted digest.

References are operator attestations. They are reported ATTESTED, never authenticated customer consent. Media quality, legal scope and actual clip count require inspection of the referenced records and rendered media; this checker cannot establish those facts from JSON declarations.

RECEIPT uses the unchanged `mew-delivery-v1` envelope documented in AUTHENTICATED_DELIVERY.md. Existing `verifyDeliveryReceipt` verifies Ed25519 identity, immutable principal/objective/effect/provider/job bindings, exact artifact bytes and freshness. VERIFIED here means cryptographic receipt validation under the supplied pretrusted key. The tool deliberately does not persist replay identity or mutate delivery status.

## Reuse before expansion

The SQLite private lane already has OperationStore reservation/outbox and atomic receipt/ledger updates, OperatorService principal ownership and enrolled-key policy, and private operator HTTP. Use that path for a separately authorized receipt acceptance after the customer evidence review. The simulation worker rejects live dispatch; a provider acknowledgment alone is not authenticated delivery. OFFLINE_CHECKS_PASSED does not prove the operator key remains active; OperatorService must enforce enrollment validity and revocation at acceptance time.

The newer PostgreSQL integration store and host do not implement the equivalent delivery-contract/receipt transaction. Do not copy a SQLite delivery transition into PostgreSQL or issue a second economic mandate there. A production port needs one principal-scoped transaction validating the original effect and saved artifact contract, unique provider/job/receipt replay constraints, enrolled-key revocation, and crash/rollback/RLS tests. That is a separate integration, not completed by this tool.

The remaining actual pilot inputs are a consenting customer, source permissions covering intended channels, a frozen media rubric, authorized acceptance owner, real private artifacts and a registered provider capable of signing the existing receipt format. Support, retention and recourse ownership must be settled before private records are retained. No outreach was sent; no external provider or paid job was invoked.

## Research used

[Discovery process](https://www.skills.sh/deanpeters/product-manager-skills/discovery-process) supplies reference-only discovery framing. Its listing was inspected; no immutable package, dependency or license review and no installation was performed. Customer evidence must be observed rather than manufactured to fill these fields. [Node crypto documentation](https://nodejs.org/api/crypto.html) supports signature-verification interfaces; implementation reuses MEW's existing verifier instead of adopting third-party code.
