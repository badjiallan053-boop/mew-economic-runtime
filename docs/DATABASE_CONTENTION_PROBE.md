# Private database contention and recovery probe

The reviewed additive delivery migration is installed in selected Supabase project `ndorfchuhciidfcltbzf`. Fresh management catalog observation confirms exactly six private tables, forced principal RLS, no browser access and no UPDATE authority on delivery journals. `mew_runtime` remains NOLOGIN; a management connector is not an authenticated Node application connection.

After the approved operator provisions private runtime access, use:

```sh
npm run integration:contention -- /absolute/private/integration-config.json --write-probe
```

The second argument explicitly enables synthetic writes. Run against an approved staging database, with the reviewed schema and verified TLS configuration. No model, wallet or provider is called. Each invocation generates a new random probe principal plus a peer. Synthetic records are retained: runtime has no DELETE privilege, and the tool never expands it. A failed run reports its probe identity if created; inspect its state before deciding on any later test. Never use customer mandates as probes or auto retry an uncertain mutation.

The tool checks two simultaneously held server transactions have distinct backend PIDs. A held principal ledger lock then waits for the competing session's observed `Lock` wait in `pg_stat_activity` before allowing either test to finish. Missing visibility or no observed lock wait blocks the test rather than claiming contention. Two different proposals compete for one quantity and a 100-lovelace accounting cap; exactly one 60-lovelace synthetic reservation may be admitted. These numbers are ledger fixtures, not valid Cardano outputs.

Further checks deliberately roll back an objective mutation, disconnect an open transaction after an uncommitted update, and discard a successful COMMIT response using an explicitly labeled wrapper. Uncertain connections are destroyed. A reopened store must retain reservation/UNKNOWN state and defer identical authorization replay. The RLS check uses a separately created and verified peer principal, so isolation cannot pass vacuously on an empty database. After closing the pool, the CLI opens a new verified connection and checks the persisted state again.

A successful result establishes only these observed checks against the configured runtime. A discarded COMMIT response is controlled injection, not a real network-fault experiment. Reconnecting is not crashing the database process or restoring a backup. Provider-job delivery concurrency, database failover, actual lost packets, database restart and restoration still need separate staging exercises. No hosted runtime probe ran during this contribution because private credentials remain pending; local tests reject the single-session PGlite engine rather than labeling it multi-client proof.

[PostgreSQL locking documentation](https://www.postgresql.org/docs/current/explicit-locking.html) explains transaction lock lifetime and contention. The pinned Supabase skill's RLS, short-transaction and lock-order guidance informs the review. Its illustrative payment-before-database-update example is unsuitable for MEW: MEW always persists economic reservation **before** external dispatch. The probe deliberately holds a lock to test contention; normal operation never performs remote work under that lock.
