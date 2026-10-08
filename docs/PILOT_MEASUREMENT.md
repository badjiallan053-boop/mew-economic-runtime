# Private pilot measurement import

This tool imports an observed pilot record. It creates no customer, media, invoice or participation evidence. All tests use generated keys and labeled fixture bytes. No outreach, provider call or publication occurs.

```sh
node scripts/pilot-measurement.mjs CONTRACT.json EVIDENCE.json RECEIPT.json MANIFEST.json PUBLIC_KEY.pem MEASUREMENTS.json CLIP_1 CLIP_2
```

List every actual clip path explicitly in manifest order. No manifest filename is opened automatically. Inputs must be bounded local regular files; final-component symlinks, FIFOs, directories, changed files and private-key PEMs are rejected. Parent directories must be trusted. JSON/manifest limits are 64 KiB, keys 16 KiB, individual media 8 MiB and combined media 32 MiB. Larger media needs a separately reviewed import path; do not substitute an outline for video to pass a gate.

Exit 0 means MEASUREMENT_RECORD_COMPLETE, 1 means BLOCKED evidence and 2 means malformed import. The report always has customerSuccessVerified, activationAllowed, publishingAllowed and paymentAuthority false. It reports measurement completeness, not business success, signed customer consent or live readiness. Output contains summarized measurements and gate notes, not customer references, file paths, content or keys. Treat even the summary as private and avoid committing captured stdout.

## Exact evidence and real files

Reuse the immutable contract, consent/rights/customer acceptance evidence and Ed25519 envelope from CUSTOMER_NEXT_RELEASE.md. The contract's expected artifact digest and signed receipt must bind the exact MANIFEST bytes. The customer's recorded acceptance must reference that manifest digest/version and the original clip count/revision cap. Preserve original bytes; formatting changes invalidate the receipt. The existing receipt freshness policy still applies; import while valid, or obtain an independently approved historical-evidence workflow. The tool does not reinterpret expired receipts as current proof.

MANIFEST contains exactly:

- schema: `mew.pilot-deliverables.v1`.
- sourceId and artifactVersion: match the frozen customer contract.
- clips: 1–100 unique entries with exactly id, sha256 and byteLength.

The tool hashes each supplied local file and checks manifest identity, bytes and lengths. A missing/changed file blocks completeness. Hash verification does not inspect video duration, crop, captions, likeness, music, brand claims or format usability. Those require actual media inspection and recorded acceptance by the authorized owner. Rights and consent references remain operator attestations; an approved JSON value is not legal verification or independently authenticated permission.

MEASUREMENTS contains exactly cost, usage, startedAtMs, completedAtMs. Cost and usage may be null, but missing invoice cost blocks completeness. Start/end are integer epoch milliseconds; completion cannot precede start or exceed import time. They are imported observation timestamps, not a trusted remote clock.

Cost contains exactly currency, minorUnitExponent, amountMinor, authority, evidenceRef, provider, jobId. Use the actual invoice's currency, exponent and nonnegative safe-integer amount. Authority must be `OPERATOR_ATTESTED_INVOICE`; provider/job must match the saved contract. Currency is a 3–6 letter uppercase identifier, and exponent is 0–12. These are report metadata only: no ledger admission, payment confirmation, exchange rate or ADA/native-token conversion occurs. The referenced invoice still needs human authenticity/reconciliation review. Estimates, rate-card calculations and usage multiplied by price do not count as invoiced cost.

Usage is optional and contains exactly provider, jobId, unit, quantity and evidenceRef. Quantity is a nonnegative safe integer under the declared unit. It is reported as OPERATOR_IMPORTED_PROVIDER_USAGE, separately from invoiced money. Preserve original billing/usage exports privately; do not relabel synthetic model counts as observed usage.

## Customer holdout and withdrawal

Keep consenting customer media and outcomes separate from synthetic regression fixtures, research benchmark and model development examples. Freeze the rubric before evaluating the pilot. Do not tune prompts against holdout answers and then present the same customer result as independent validation. Any reuse for training, demonstrations or public case studies requires separately recorded scope; participation alone supplies none.

Before intake, record a responsible customer contact, acceptance owner, retention deadline, withdrawal channel and authorized custodian. Do not place names or private evidence paths in public research. On withdrawal, stop new processing and publication, record the request privately, identify authorized copies and derived artifacts, and have the custodian carry out approved deletion/retention decisions, including applicable provider/object-storage copies and backups. This importer performs no deletion and does not guarantee removal from external systems. Keep only an authorized minimal audit record as agreed; do not reset financial or receipt journals to pretend historical obligations disappeared.

The next customer decision uses actual accepted artifacts, revisions, elapsed time and invoiced cost, with unresolved rights or invoice questions visible. Repeat demand, campaign engagement, paid conversion and willingness to pay require additional observed evidence. A complete imported record establishes none of those automatically.
