# SQLite backup and isolated recovery drill

Run `node scripts/backup-rehearsal.mjs`. It creates only temporary synthetic
databases, reserves 800,000 lovelace, marks a simulated worker UNKNOWN, makes a
SQLite online backup, restores it into another isolated temporary database and
checks that exposure and operation status survived. It deletes its temporary
files and never opens existing project data, contacts a provider or dispatches.

The implementation uses Node 24's `node:sqlite` online `backup()` API. This
captures a coherent committed database including WAL changes. It does not copy
an open `.sqlite` file while ignoring its WAL. Node's API overwrites its target,
so MEW instead backs up to a private staging directory, validates it, and publishes
using an exclusive hard link. Existing destinations and symlinks are not replaced.
The backup file has owner-only permissions. Destination parent directories are
trusted operator configuration and must already exist on a hard-link-capable
filesystem. No portable remote-object backup transport is implemented.

`inspectBackup` checks SQLite integrity and foreign keys, ledger mode and runtime
presence, objective exposure, and existing operation-to-effect bindings. The
returned positions and statuses are observations. Integrity does not establish
truth, freshness, receipt signature validity or authority to release exposure.
The SHA-256 manifest detects changed bytes only when retained through a trusted
channel; it is neither a signature nor a customer acceptance receipt. Do not
accept uploaded untrusted SQLite databases through these operator functions.

`restoreDrill` opens the source read-only, creates a temporary isolated copy through
SQLite's backup API and returns a report. It exposes no writable restored database
or worker token and removes the copy. `activationAllowed`, `dispatchAllowed`,
`retrySpendAllowed` and `releaseExposureAllowed` stay false, including for READY
operations. A successful drill cannot activate a worker or financial store.

## Active recovery gates

This implementation is a rehearsal and operator backup primitive, not a production
failover manager. A financial timeout retains capacity. DISPATCHING/UNKNOWN must
be reconciled against the original provider operation; never clear a reservation
or create a replacement spend because a backup was restored.

An older backup may contain READY while an external request was dispatched after
the snapshot. It may omit entire operations, receipts, settlement or refunds.
Opening it directly in a normal writable OperationStore could therefore make
stale state actionable. The isolated drill deliberately does not do that.

Before any active restoration:

1. Stop and fence every old writer, worker and deployment; a second independent
   SQLite store does not coordinate budget with the first one.
2. Verify manifest provenance and timestamp, deployed schema/code version, recovery
   point, and all operation identifiers recorded outside the lost database.
3. Compare provider jobs, submission identifiers, chain receipts, accepted artifact
   contracts and historical signed receipts with the restored snapshot. Keep
   unresolved work occupied and prevent READY work from auto-dispatching.
4. Recover missing post-backup events through authenticated evidence and reviewed
   transactions. Conflicting or missing evidence requires operator resolution.
5. Re-enroll trusted key configuration separately; a SQLite backup does not contain
   an approved signer configuration or prove key provenance.
6. Approve one replacement writer only after reconciliation, retain the previous
   image read-only, and record the recovery decision and evidence.

Remaining operational work: scheduled encrypted offsite backups, retention and
access policies, filesystem crash-durability testing, disk/capacity alerts, restore
authorization, documented RPO/RTO, and an automated activation quarantine. A
synthetic drill does not prove those controls exist on Railway.

## Verification and source

Three targeted tests passed on Node `v24.19.0`: open-WAL UNKNOWN/reservation
recovery; READY snapshot isolation despite later source changes; overwrite,
corruption and digest rejection. The synthetic CLI also completed with integrity
`ok`, exposure retained and activation forbidden. No live store was restored.

Version-specific authority: [Node v24.19.0 SQLite documentation](https://github.com/nodejs/node/blob/v24.19.0/doc/api/sqlite.md)
documents `backup(sourceDb, path)`, target overwrite, online operation and read-only
DatabaseSync connections. This is the runtime actually exercised. The direct
Node documentation site was unavailable to the reader; official GitHub source
documentation was inspected instead.
