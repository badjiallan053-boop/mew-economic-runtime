# Security and contract coherence review

7 October 2026. Reviewed the campaign, company handoff, HTTP observation and
persistence boundaries following ebaf697. This is a scoped code review, not a
complete audit, penetration test or proof of production readiness.

## Confirmed and corrected

| Finding | Scope / severity | Fix | Verification |
| --- | --- | --- | --- |
| HTTP API returned raw observer exception text | Medium: an upstream exception could contain credentials or private provider details; authenticated operator route | src/server/server.mjs:16 wraps connection and settlement observers with a fixed safe error, preserving uncertainty | Injected secret-bearing failures are not returned; no claims admitted and full reservation retained |
| Handoff export did not recheck stored task ownership or strict output fields | Low, integrity hardening: export requires a trusted snapshot; not a demonstrated remote exploit | src/company/handoff.mjs:20 rejects changed task owner, unknown task and extra/missing output fields before constructing a packet | Changed agent and injected verified field rejected; valid exports unchanged |

Both new regressions failed before fixes. After fixes, all 98 repository tests
passed. The existing advisory envelope remains unsigned; trusted expected digest
and identities are still necessary. Valid schema is not proof of factual truth.
No real credential leak was observed; the disclosure was reproduced with a fixture.

## Connected boundaries reviewed

Campaign fixtures use a separate bounded SQLite table; transaction commits precede
response, and campaign identity plus stage prevents stale reset/advance races.
First load persists its identity. Live authenticated routes reject campaign
fixtures. Main economic ledger is unchanged by rehearsal. Source rights are
synthetic, provisional metrics cannot release reservations, and the exact
outline artifact must match acceptance before synthetic settlement.

Company provider contexts remain isolated from tools and credentials. Existing
skill/prompt policy digests remain unchanged. Handoff checks do not create payment
or delivery authority. Read-only chain observers require saved operation bindings;
provider failure neither releases exposure nor causes dispatch. These are tested
application properties, not an assertion that every deployment boundary is secure.

## Remaining integration gates

1. Customer identity and resource ownership before exposing real multi-customer
   mission/artifact routes; current live API is one trusted operator boundary.
2. Authenticated rights, producer and customer acceptance records; fixture approval
   booleans must never become live evidence. Digests require trusted provenance.
3. A configured read-only model adapter with provider billing limits, measured
   quality and adversarial source/evidence tests before any autonomy expansion.
4. Durable outbox, external request IDs and recovery for any future paid worker.
   Never reinterpret timeout as failure or retry uncertain external effects.
5. SQLite-consistent backups and restore drills, capacity monitoring and edge
   protection; the demo quota is shared and process-local.
6. Typed asset/fee accounting before adding USDM/fiat campaigns. Existing kernel
   remains integer lovelace; no token-to-ADA conversion is introduced.
7. Railway GitHub authorization for the private repository before deploying this
   revision. The previous deployment does not include these fixes.

No new paid resources, signing, media generation, ad spending or external
publication occurred. Source deployment and live setup remain separate gates.
