# MEW next release: from demo to evidence-backed pilot

Audited 8 October 2026. The live Railway release is bf30ef8: a hosted synthetic
website with original motion, deterministic admission and public evidence. The
changes in this contribution improve private tooling; they are not a deployed
private service, a useful-model result, customer traction or a payment.

## Observed state and what this release closes

| Area                 | Observed foundation                                                                                                                         | New work                                                                                                              | Required next evidence                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Website              | Live synthetic site; 54 hosted asset/header checks from the prior release                                                                   | Public site unchanged                                                                                                 | Customer comprehension, workflow interest and an agreed pilot outcome                                                                           |
| Model                | Latest constrained local run has 12/12 format checks; this development set is not a customer holdout                                        | Latest-response semantic review pack, exact context/trace binding and dimension-specific annotations                  | Independent correctness/grounding/language review, a lineage-disjoint customer holdout and actual provider/billing evidence                     |
| Private database     | Fresh management catalog confirms four tables, exact principal policies, forced RLS and denied browser-role access; runtime remains NOLOGIN | Startup/preflight now inspect role, grants and exact RLS policies; catalog tampering blocks startup                   | Deliberately provisioned runtime login, real Node verified-TLS connection and independent-client contention/restart proof                       |
| Recovery             | Existing transactional reservation and input locks                                                                                          | Destroy uncertain pooled clients on ambiguous BEGIN/COMMIT or failed rollback; no retry                               | Hosted lost-response/restart and backup/restore exercises                                                                                       |
| Customer/delivery    | Private SQLite lane has Ed25519 verification and transactional receipt/replay persistence                                                   | Bounded offline pilot acceptance checker reuses that verifier and distinguishes attestations from verified signatures | Consenting customer, rights, exact real artifacts, authenticated acceptance and enrolled merchant key                                           |
| PostgreSQL delivery  | New private ledger and unsigned funding lifecycle exist                                                                                     | The missing port is explicitly documented                                                                             | One principal-scoped receipt/ledger transaction, unique job/receipt identity, revocation and crash/RLS tests                                    |
| Cardano/Masumi       | Unsigned ADA funding and read-only observations exist; no signing/broadcast                                                                 | Recovery hardening and explicit rail/audit gates                                                                      | Approved external signer, funded preprod ADA lifecycle, independent compiled-contract/closing audit and exact-asset settlement/collection proof |
| Ownership/operations | Proposed compact five-role advisory structure                                                                                               | Three specialist implementation lanes and an independent review, without more runtime roles                           | Named customer/release/security owners, alternates, incident handover and retention/recourse procedure                                          |

Fresh management catalog evidence is in
`research/activation/database-next-observation.json`. The selected project's
security advisor returned no notices at this observation; that is not a complete
security audit. The local process preflight still has no database, model,
Blockfrost or MPS configuration. This describes this process, not every location
on the computer. No credential, LOGIN grant or provider call was performed.

## Fastest sequence

1. **Review meaning before training.** Generate the latest semantic pack with
   `npm run model:semantic-review -- .local/semantic-review-run-01`. Inspect raw
   answer and exact context; export self-declared annotations, then rerun into a
   new directory with `--notes /absolute/private/notes.json`. Even unanimous
   annotations carry no activation authority. Correct demonstrated failures and
   evaluate against a separate customer holdout before any training decision.
2. **Choose one customer workflow.** Precommit one deliverable, its owner,
   acceptance rubric, source rights and actual cost measure. For the creator
   path, use `npm run pilot:readiness -- CONTRACT EVIDENCE RECEIPT ARTIFACT PUBLIC_KEY`
   after the records exist. It cannot render clips, authenticate consent or
   record acceptance. Keep customer records private; do not manufacture evidence
   to fill required fields. Report purchasing and clip procurement are separate
   mandates, not interchangeable proof.
3. **Establish private persistence.** Follow PRIVATE_DATABASE_ACTIVATION.md for
   masked credential provisioning and the dedicated role. Run
   `npm run integration:preflight`, then the separate loopback host with its
   private config. The new guard rejects broadened grants/policies before listen.
   It intentionally checks selected role/grant/RLS boundaries, not every index,
   constraint or security-definer function. Verify two real clients and recovery
   before treating this as a deployable economic backend.
4. **Join delivery to the same journal.** Reuse the existing verifier, expected
   artifact contract and key enrollment in a reviewed PostgreSQL receipt port.
   Persist receipt identity and ledger transition atomically. A separately
   checked SQLite receipt cannot close a PostgreSQL reservation.
5. **Rehearse one funded preprod lifecycle.** Only after signer custody and an
   independent audit are established, bind reservation to the exact approved
   transaction and separately verify funding, delivery, collection and refund
   behavior. Masumi tUSDM and ADA fees are separate assets; the current lovelace
   ledger must reject native-token admission until asset-aware accounting exists.

The existing US$10 hosting cap is not a model-usage or wallet-spend budget. These
steps create no paid resources, sign transactions or authorize customer outreach.
Installing more frameworks, scraping more sources or adding agent roles will not
supply missing acceptance, credential, quality or settlement evidence.

## Team and review

Actual specialists: model evaluation, payment/recovery and customer acceptance.
The coordinator implemented and hosted-checked database boundary inspection and
integrated the commands. The payment reviewer independently checked the database
and pilot changes; malformed catalog handling was improved after that review.
Skills.sh references are recorded per lane in research/activation. They inform
original procedures; no unreviewed installer, new framework or deployed worker
was added. Detailed lane outputs: MODEL_NEXT_RELEASE.md, CUSTOMER_NEXT_RELEASE.md
and PAYMENT_NEXT_RELEASE.md.

## Verification for this contribution

317 automated tests passed with zero failures; the standalone build passed.
New coverage includes twelve database-boundary checks, five connection-recovery
cases, six offline pilot/CLI checks and eight semantic-review cases. No live model
call, customer artifact production, remote runtime login, receipt persistence or
wallet transaction was performed. This contribution is published to the existing
feature branch; the public Railway source remains pinned to the artistic demo.
