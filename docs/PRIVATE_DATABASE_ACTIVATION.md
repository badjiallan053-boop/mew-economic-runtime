# Private database activation

The selected target is **mew** (`ndorfchuhciidfcltbzf`, NextGen, Sydney). The installed private schema and hosted isolation results are recorded in [the verification receipt](../research/integration/supabase-verification.json). Application login remains pending: that receipt records `mew_runtime` as **NOLOGIN**. A management connection and passing hosted SQL do not demonstrate the Node application's TLS connection or independent-worker locking.

The public Railway website continues to use its simulated SQLite store. This procedure prepares the separate loopback integration backend. It does not deploy a new service, enable models, provision a wallet, or sign a payment.

## Prepare private operator files

Choose an owned private parent directory outside this repository. The helper requires an existing mode-0700 parent, a new destination, and no symlink in the destination's ancestry. It refuses `/tmp` as a direct parent because it is shared; an owned private child beneath a real temporary path is suitable for tests. macOS `/tmp` and `/var` can be symlinks, so use a real absolute path when working there.

For example, after creating an owned `/Users/arslane/.mew-private` with mode 0700, run from this repository:

```sh
node scripts/integration-setup.mjs /Users/arslane/.mew-private/first-operator
```

The helper writes `integration-config.json` and `operator-token.txt`, both mode 0600, in a new mode-0700 directory. It prints paths and disabled-gate booleans only. The cryptographically random local bearer token is stored separately; its SHA-256 digest goes into the configuration. The enrollment expires 24 hours after generation and grants `read`, `create-objective`, and `evaluate-model`; payment preparation/reconciliation are omitted. Generation does not call a database or model. It leaves `PRIVATE_RUNTIME_PASSWORD` unchanged and payment address enrollment empty. Never paste the token, configuration contents, or a password into chat, command arguments or a browser console.

An existing destination is always rejected. To rotate, generate a new directory, revoke the old enrollment in the active trusted configuration, and restart the private process. A newly generated local file does not revoke an enrollment already loaded by a running process. Expired enrollments must be deliberately renewed with bounded expiry; do not silently extend a leaked token.

## Provision the existing role locally

The operator must configure a separate strong password through a trusted administrative database client. Do not use the project administrator password as the application's credential, and do not paste a password into literal SQL saved in dashboard history. PostgreSQL's interactive `psql` `\password` command avoids putting cleartext passwords into command history and SQL logging; use a verified TLS administrative connection configured locally, without credentials in arguments. Where `psql` is not installed, use a trusted database client with equivalent masked password handling. This project does not install or launch an administrative client.

Inspect the existing role first in that trusted session:

```sql
SELECT rolname, rolcanlogin, rolsuper, rolbypassrls,
       rolcreaterole, rolcreatedb,
       pg_has_role('mew_runtime', 'mew_backend', 'member') AS enrolled
FROM pg_roles WHERE rolname = 'mew_runtime';
```

Require exactly that role, no privileged flags and `enrolled=true`. Do not recreate it or grant ownership to resolve a login error. In the interactive client, set its password without recording cleartext:

```text
\password mew_runtime
```

Then, after reviewing the target and credential provisioning, enable login for that existing role:

```sql
ALTER ROLE mew_runtime LOGIN;
```

These are operator instructions for a deliberate remote change; **neither this helper nor this work executed them**. Recheck role metadata. If the role is unexpectedly privileged, stop and review memberships rather than letting application startup use it. The application additionally rejects superuser, BYPASSRLS, role creation, database creation and missing `mew_backend` membership.

## Configure the private driver and start

Copy the exact endpoint from Supabase's **Connect** panel. Direct IPv6 connections use `db.ndorfchuhciidfcltbzf.supabase.co` with user `mew_runtime`. For IPv4-only hosts, use the displayed session-pooler host and user `mew_runtime.ndorfchuhciidfcltbzf`; do not guess the regional pooler hostname. Update only the private configuration using a trusted editor/secret manager. Percent-encode password characters in the connection URL. A Supabase publishable or service API key is not a Postgres password.

The driver verifies certificates. If required, download the selected project's CA through its trusted connection settings and supply its PEM in `postgres.ca`. Never disable certificate verification or weaken URL validation to make a connection pass. The connection pool has at most two clients. Total connections across workers must fit the project's limits; do not expand infrastructure to perform this check.

Provide model and blockchain secrets separately through private process environment only when their relevant checks are authorized and configured. Database startup needs none of them. Then run:

```sh
node scripts/integration-host.mjs /Users/arslane/.mew-private/first-operator/integration-config.json
```

The host binds `127.0.0.1:3046`; it is not a browser frontend API. Existing `integration:preflight` checks an environment-provided dedicated connection; its URI environment variable must be supplied by a local secret manager without logging. The host additionally supports the private configuration's CA. Record a sanitized startup/result receipt, never the connection string or private token.

For payment work later, the enrolled principal and provider **public preprod addresses** must be reviewed before adding payment scopes. Changing an established payment-policy digest requires a reviewed transition. Database readiness cannot authorize that change, model activation, signing or broadcast.

## Prove hosted isolation, contention and restart behavior

Keep all real provider secrets absent for these tests. Use two independent Node clients/processes against the dedicated runtime login and synthetic operator mandates, never customer money. Record only synthetic IDs, decision outcomes, quantities and sanitized accounting states. Reserve before any external action; the following checks must perform no provider calls or signing:

| Check | Required observed outcome |
| --- | --- |
| TLS and role startup | Real Node connection to selected project, enrolled unprivileged role, verified certificate |
| Principal isolation | Synthetic principal A cannot read or overwrite B through its transaction-local context; `anon` and `authenticated` have no schema/table access |
| Same-principal contention | Hold A's ledger lock on client 1; client 2 cannot complete a mutation of A until commit/rollback; a different principal does not depend on that row lock |
| Replay | Two clients request one economic effect; only the first reserves, replay defers, and persisted exposure is counted once |
| Global funding-input conflict | If unsigned preprod preparation is tested with reviewed synthetic inputs, conflicting principals cannot claim the same input; the rejected transaction leaves no reservation or operation |
| Crash before commit | Kill the isolated worker before commit; its uncommitted rows/reservation disappear and no external action occurred |
| Crash after commit | Restart after commit; reservation and operation remain, replay cannot create a second spend |
| Unknown model attempt | A durably recorded RUNNING/UNKNOWN attempt remains fenced after restart and cannot call a provider again |
| Context reuse | Reuse a pooled connection across A/B transactions and verify transaction-local settings never leak across commits |

The current PGlite tests run through a serialized engine connection and cannot certify these real two-client outcomes. Some funding/model cases already have local failure-path tests, but actual hosted execution remains pending until credentials exist. No new concurrency pass is claimed by this guide.

Use a separate reviewed test principal and identify every synthetic artifact. The runtime has no DELETE grant: do not broaden it to clean up. An administrator can approve targeted cleanup or intentionally retain labeled evidence. Never bulk-delete live ledgers. Close both clients and restore the private process to its desired state.

If an outcome is uncertain, retain reservations and mark the lane UNKNOWN/BLOCKED. A failed connection needs diagnosis of endpoint, role, TLS or credential provisioning; it is not evidence that a payment failed. Do not add automatic financial retries.

## References adopted

Official [Supabase roles](https://supabase.com/docs/guides/database/postgres/roles) and [connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres) inform role separation and endpoint choice. [PostgreSQL 17 psql](https://www.postgresql.org/docs/17/app-psql.html) documents masked password handling. [node-postgres transaction guidance](https://node-postgres.com/features/transactions) establishes the same-client transaction boundary. The [Supabase skill on skills.sh](https://skills.sh/supabase/agent-skills/supabase-postgres-best-practices) is pinned and hashed in [database sources](../research/activation/database-sources.json); it informed the original local activation skill. No third-party skill code was installed or executed. The local skill validator used pinned PyYAML 6.0.2 in an ignored tooling directory; no application runtime dependency was added.
