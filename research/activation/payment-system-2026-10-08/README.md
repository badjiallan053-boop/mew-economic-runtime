# Payment-system verification: 8 October 2026

The existing ADA approval-escrow smart contract is now connected to durable private
closing preparation and offline external-witness assembly. The original validator,
blueprint and address were retained. This is internal engineering verification,
not an independent contract audit or funded preprod test.

Actual completed checks:

- **405/405** application regression tests passed, including new closing scopes,
  original-cell derivation, receipt/artifact matching, immutable replay, input-lock
  rollback, UNKNOWN retention, stale reconciliation fencing, block inconsistency
  and file-backed local PostgreSQL engine close/reopen.
- **49/49** actual Aiken spend-handler tests passed with warnings denied; the contract
  rebuilt to the same pinned blueprint SHA-256. No new contract was substituted.
- The application build passed.
- Both acceptance and cancellation ran through the local SQL/CBOR rehearsal.
  `local-rehearsal.json` is explicitly synthetic, with mocked provider observations
  and no wallet, model or network request. A final rerun matched its bytes.
- The witness assembly CLI was exercised with a fresh ephemeral fixture key and
  returned a complete, unchanged-body cryptographic review. Input/output directories
  were mode 0700 and files mode 0600. Fixture key material was not written; the private
  arguments and signatures remain ignored under `.local`.
- Oversized, redirected, foreign-origin and malformed streamed provider responses
  failed closed. Older test mocks were updated to real streamed Response fixtures;
  no unbounded transport fallback was added.

A further integrity issue was addressed: escrow delivery enrollment/acceptance now
requires the original artifact commitment, so another signed artifact cannot satisfy
that escrow objective. Closing independently rejects an inconsistent legacy delivery
flag/contract. Generic non-escrow delivery contracts retain their existing behavior.

`verification.json` binds relevant implementation/contract bytes and test/rehearsal
reports. `aiken-check.json` is the actual compiler test output. `sources.json` records
the official references and reused CSL 15.0.3 interface; no runtime dependency was
added. Original source packs and prior audit artifacts were not rewritten.

Run from the repository root:

```sh
npm run payment:lifecycle-rehearse
npm test
npm run build
```

The protocol, private API bodies, explicit scopes, key-witness assembly and remaining
activation evidence are in [PAYMENT_SYSTEM.md](../../../docs/PAYMENT_SYSTEM.md).

No live database connection, actual wallet signing, broadcast, native-token payment,
model activation or deployment occurred. Fixture signatures do not establish custody.
PGlite does not prove hosted multi-client contention or crash recovery. Escrow return
does not refund spent fees or establish safe aggregate allowance release: all economic
exposure and input locks remain held. Live custody, funds, exact-body script evaluation,
commercial cancellation rules and independent audit remain separate prerequisites.
