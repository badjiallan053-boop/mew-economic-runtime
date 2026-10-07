# Independent security follow-up

Reviewed source at `4204e0102baa4e6ef43cee8879c03312dc07dd93`, 7 October 2026.
Scope: HTTP routes, SQLite persistence, company execution and handoffs, campaign
fixtures, and Cardano/token observation. This is a read-only review, not a complete
audit or live penetration test. No source changes or external execution occurred.
Local engineering and interoperability review skills guided the review. No
third-party installer, model, or video transcript was used.

## Findings and trust assumptions

No new remotely demonstrated financial bypass was identified in this scope.
The following observed boundaries would become material risks if the prototype
were exposed as a customer service without further controls.

| Priority | Observed boundary | Concrete failure path | Acceptance gate |
| --- | --- | --- | --- |
| Before customer workloads | `server.mjs` authenticates one shared operator token; objective principal is supplied by the caller | Any holder can read all ledger state and create/evaluate another principal's mandate | Authenticate named actors and derive principal server-side; deny cross-principal reads and mutations in tests |
| Before public customer demo | Public demo state and request quota are shared; reset routes are public | One visitor resets another visitor's campaign or consumes the shared minute quota | Clearly retain shared-rehearsal behavior, or isolate bounded demo sessions; test concurrent visitors and quota fairness |
| Before paid inference | `CompanyRuntime` aborts and journals UNKNOWN on timeout; provider receives an AbortSignal | A provider that ignores cancellation can keep computing or billing after local timeout | Vendor request ID, provider-enforced cost/token ceiling, billing reconciliation, and no retry until uncertain request is resolved |
| Before support access | HTTP catch returns non-observer `error.message` | SQLite, filesystem, or validation details can be returned to the caller; observer secrets are already masked | Stable public error codes with correlation IDs; redact private details in restricted logs; inject storage and malformed-input failures |
| Before customer acceptance | Handoff digest verifies an expected digest and catalog, but explicitly does not authenticate producer or customer | An untrusted source supplying both envelope and expected digest can manufacture apparent integrity | Authenticate provenance separately, bind actor/audience/artifact version, and test substitution and cross-customer denial |
| Before live delivery | Campaign rights and accepted outline artifacts are synthetic | Copying fixture approval booleans into a future live flow would wrongly equate fixtures with rights or acceptance | Separate live receipt schema and verifier; authenticated customer acceptance of exact bytes; expiry/revision and rights gates |
| Before availability promises | Snapshot storage is bounded, but backups, restore drills, and monitoring are not established here | Process success does not protect against lost volume, corruption, or an exhausted decision journal | SQLite-consistent backup, isolated restore drill, capacity alerts, and measured recovery objective |

The public demo has no wallet authority. These availability observations do not
establish loss of customer funds. The live bearer boundary is explicitly trusted
operator access, not an existing multi-tenant security claim.

## Properties preserved in reviewed code

- Reservation mutation and persistence remain synchronous inside BEGIN IMMEDIATE
  before returning authorization. Same effect identity cannot authorize another
  spend; uncertainty does not release capacity.
- Campaign identity and expected stage reject stale reset/advance requests;
  campaign storage rejects live ledger mode. Exact synthetic artifact binding is
  checked before synthetic settlement.
- Company task invocation journals RUNNING before awaiting its provider. Invalid
  output becomes UNKNOWN and automatic retry is disabled. Advisory outputs cannot
  carry extra payment authority fields.
- Cardano observers use the fixed preprod Blockfrost origin with redirect rejection;
  settlement matches a persisted operator-attested operation. Chain confirmation
  does not prove payer identity, mandate ownership, customer satisfaction, or
  irreversible finality.
- Native-token verification remains outside integer-lovelace kernel accounting.
  Its task/payment attribution depends on authenticated upstream bindings.
- Reviewed campaign/company rendering uses text nodes rather than inserting
  supplied content through innerHTML.

## How a mature team should sequence work

1. Restore least-privilege Railway access to this one private repository and verify
   the deployed commit. Do not make the repository public to bypass authorization.
2. Publish a narrow service contract: one owned-media campaign, explicit revision
   count, authenticated customer acceptance, and independent settlement evidence.
3. Add the identity and data-isolation boundary before accepting customer media.
4. Introduce one constrained inference adapter and measure quality and cost against
   a single-agent baseline. Adding agent count does not prove independence or value.
5. Exercise timeout, crash, duplicate notification, billing ambiguity and backup
   restoration before connecting any paid worker or publishing adapter.
6. Gate rollout on an evidence checklist: deployed revision, denied cross-customer
   calls, acceptance provenance, bounded vendor cost, recovery drill, and a useful
   deliverable accepted by a real pilot customer.

Existing tests were inspected, not rerun by this reviewer. The parent should report
its actual test and deployment results independently. Protocol documentation and
local skills are reference procedures, not authority to access credentials, pay,
publish, or grant unrelated application access.
