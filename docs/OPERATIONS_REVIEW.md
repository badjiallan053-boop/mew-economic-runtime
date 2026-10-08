# Operations readiness review

7 October 2026. Scope: source review of deployment, CI, persistence and operational
boundaries. No hosting configuration, credentials, backup schedules or resources
were changed. A mature team's next investment is reproducibility and recovery,
not increasing the number of agent roles.

## Evidence versus requirements

| Priority | Observed property | Missing acceptance evidence | Owner |
| --- | --- | --- | --- |
| P0 deployment | Previous release records show a working single Railway replica; private-source access subsequently failed | Grant Railway access to only this private repository, deploy the selected commit, verify active revision and hosted campaign/interoperability endpoints | Founder + Operations |
| P0 recovery | SQLite WAL and immediate transactions persist reservation and immutable operation bindings | Consistent backup, restore into isolated storage, integrity check and proof that unresolved reservations/operation mappings survive; production must remain paused during restore reconciliation | Operations + Finance reviewer |
| P0 external effects | Existing adapters observe rather than sign or dispatch payment | Durable outbox, upstream reconciliation and operator ownership of ambiguous jobs before paid worker activation; restoring an old journal must never authorize duplicate external spend | Engineering + Risk |
| P1 build | CI runs repository tests and static build; image uses an explicit file allowlist and drops runtime privileges | Build the actual image and exercise HTTP routes/required runtime files against a fresh disposable volume; static file copying alone cannot prove runtime readiness | QA + Operations |
| P1 supply chain | No npm application dependencies are currently declared | Pin reviewed container digest, Node version and CI action revisions, with an update procedure; moving tags currently prevent exact rebuild guarantees | Engineering |
| P1 availability | `/api/health` returns mode and disabled payments after startup | Separate liveness from bounded readiness checking storage; alert on read/write failure, disk pressure and repeated provider uncertainty without disclosing private mission data | Operations |
| P1 costs | Existing deployment limits and US$10 submission authorization are documented | Actual usage and shutdown owner; CPU/memory limits are not a guaranteed dollar cap | Finance + Founder |
| P2 customer scale | One ledger store and separate company/MPS stores reduce accidental mixing | Tenant identity, per-mission access, retention, support response process and tested migration/rollback policy before shared customer use | Product + Engineering |

## Deployment procedure

The owner's GitHub installation selection and Railway's connected account are
different from local Git credentials. Successful push does not grant Railway
private-source access. In GitHub account settings, review Installed GitHub Apps,
configure the existing Railway installation and add `mew-economic-runtime` to its
selected repositories. Retain its existing repository selections; do not select
all repositories simply to fix one deployment. Confirm the intended account in
Railway, source branch and exact revision before retrying. Preserve private
visibility. These are operational instructions, not evidence the grant occurred.
[GitHub installation review](https://docs.github.com/en/apps/using-github-apps/reviewing-and-modifying-installed-github-apps).

The lead's current UI inspection found no Railway app installed for
`badjiallan053-boop`; the Railway account page did not expose usable controls.
Reconnect GitHub from the intended Railway account and install its app with this
selected repository, then verify the installation and retry deployment. No
successful access grant is recorded. A missing installation cannot be repaired
by merely changing local Git credentials.

Release checks should identify the deployed revision separately from HTTP 200,
exercise campaign stage progression and replay in simulation, and verify that
live-mode fixture routes remain denied. Rollback means restoring a compatible
application image; it must not silently roll the economic journal backwards.
Existing `.github/workflows/ci.yml` verifies source tests; it does not currently
test the Docker image. `scripts/build.mjs` copies static artifacts and is not a
compiler or dependency/runtime integration check.

## Restore drill before paid operation

1. Agree recovery-point and recovery-time targets with the operator. These targets
   are requirements to choose, not already measured service guarantees.
2. Obtain a consistent SQLite backup using a supported online backup mechanism
   or a quiesced service; copying only the main WAL-mode file while writes occur
   can omit committed state. Include company journals and future worker/outbox
   state; preserve MPS storage and encryption-key recovery separately.
3. Restore into isolated storage with external dispatch disabled. Check database
   integrity, mode classification, objectives, exposure, unresolved effects,
   operation hashes and immutable contracts. Exercise identical authorization
   replay and terminal observation replay against fixtures.
4. Reconcile any external actions newer than the backup with authoritative
   providers. An old local snapshot cannot prove an external payment did not
   happen. Ambiguity retains exposure and blocks dispatch.
5. Record backup identity, revision, restore duration and reconciliation outcome;
   only then approve cutover. Do not overwrite the original journal during a drill.

Railway supports volume backups, including SQLite-backed volumes; availability
does not prove a schedule is enabled or a restore has succeeded. No backup
configuration or restoration was verified in this review.
[Railway backups](https://docs.railway.com/volumes/backups).

## Skills and knowledge limits

The local MEW engineering skill was read and applied: independent ownership,
durable accounting and honest proof boundaries. The skills.sh
[deploy-app listing](https://www.skills.sh/shipshitdev/skills/deploy-app) was found,
but its actual upstream SKILL.md could not be retrieved; it is a discovery
candidate, not an applied or installed skill. No installer ran. Official Railway
documentation pages returned unsupported Markdown to the web reader; indexed
official backup excerpts support the limited platform claim above.

Existing research records link official Cardano/Masumi YouTube sessions but report
unavailable transcripts. No video was watched or reverse engineered in this
review. For production decisions, exact source interfaces, failure tests and
observed recovery evidence take precedence over video descriptions.
