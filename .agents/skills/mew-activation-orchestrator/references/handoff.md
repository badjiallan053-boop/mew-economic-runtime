# Shared handoff

The validator is `src/integration/activation-evidence.mjs`; local report files are
`research/activation/{database,model,payment}-handoff.json`.

- `schema`: `mew.activation-evidence.v1`.
- `lane`: `database`, `model`, `payment` or `audit`.
- `verdict`: `PASS`, `BLOCKED` or `UNKNOWN`.
- `observedAt`: UTC ISO timestamp with milliseconds, e.g. `2026-10-08T00:00:00.000Z`.
- `claims`: 1–30 objects with exact `id`, `status`, `artifact`, `note`.
  `artifact` is null or exact `{path, sha256}`; PASS requires a digest-bound file.
  Files use public repository-relative research/docs/source/test/contract paths;
  private files, hidden paths, absolute paths, traversal and symlinks are rejected.
- `blockers`: 0–30 exact `{id, owner, nextAction, evidenceRequired}` objects.
- `authority`: exact `{modelActivation:false, paymentSigning:false,
  paymentBroadcast:false, productionDeployment:false}`.

No PASS verdict may contain a blocker or unpassed claim. All fields are bounded;
extra fields and repeated IDs are rejected. The verifier reads up to 2 MiB per
artifact and requires a review refreshed within seven days by default. Its
callback is a trusted local reader, never a model-selected remote fetcher.

An intact evidence file can contain a failed experiment. A stale report is
UNKNOWN; it does not revoke or release any economic reservation. The coordinator
must inspect the content and scope. Source manifests are separate from measured
model or blockchain receipts.
