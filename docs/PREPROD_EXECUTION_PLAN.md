# Preprod operation planning

`node scripts/payment-plan.mjs` runs a synthetic, offline example. It does not
read credentials, connect to providers, reserve capacity, sign or send a payment.
The example recipient is deliberately not a usable wallet. Exit success means
the example was validated, not that live execution is ready.

`validatePaymentPlan` accepts one exact versioned contract with stable operation,
objective, principal, semantic key and effect identifiers. All contracts require
`cardano:preprod`. ADA uses positive safe integer lovelace with an explicit
exposure ceiling. Native tokens use a raw hexadecimal policy/asset unit and a
positive integer atomic-amount string; a human label such as USDM is rejected.
Masumi token terms include saved Task, blockchain, agent, wallet, contract and
Cardano V2 payment-source bindings. No token amount enters the lovelace kernel.

Supplying a trusted saved contract rejects any changed term. The canonical SHA-256
fingerprint tolerates object-key ordering but is not a signature or authority.
This module has no persistence: the caller must keep immutable terms in trusted
durable storage. It checks address shape only, not Bech32 checksums, network
address encoding, UTxO sufficiency or actual ledger validity. A future signer
must independently verify those conditions.

Every validated plan remains BLOCKED. Presence of identifiers does not prove
registration, funds, credentials, approval or settlement. The implementation
cannot be unlocked by boolean readiness flags. Its blockers require:

1. Authenticated operator and mandate ownership.
2. Durable economic reservation and outbox before any external dispatch.
3. Approved signer, funded wallet, exact asset configuration and deployment/API pin.
4. Fee and minimum-UTxO review using real transaction parameters.
5. Authenticated acceptance and separate settlement/collection verification.
6. A separate native-token ledger before USDM spending; no implicit conversion.

`paymentRecovery` maps timeout or uncertain outcomes to UNKNOWN and forbids
automatic spending retries and exposure release. It only describes recovery; it
does not mutate a journal. Reconcile the original externally bound operation
through the existing read-only verifier. No offline SETTLED flag is accepted.

## Sources inspected

- [Official Masumi Payment Service repository](https://github.com/masumi-network/masumi-payment-service): escrow, wallet management, operational configuration and observability. Source inspection does not imply MEW has deployed this service.
- [Masumi payment lifecycle](https://www.masumi.network/dev/masumi/core-concepts/payments): payment and dispute lifecycle context; lifecycle timeouts do not justify treating MEW uncertainty as a failed spend.
- [Cardano Masumi integration context](https://developers.cardano.org/docs/build/integrate/ai-agents/masumi/): ecosystem components and framework integration. Marketing claims are not evidence that MEW has on-chain identities or logged decisions.

The attempted minimum-UTxO documentation URL was unavailable. This planner does
not calculate a minimum or assume the synthetic amount is sufficient. The
existing RESEARCH.md records prepared MPS source pin
`d569a338ca54d5be7441564770d75ebf89b71f12`; current mutable GitHub main was used
only for contextual inspection, not as a new executable dependency.

Five targeted tests cover strict fields, network/asset/amount rejection,
immutable terms, native-token separation and uncertain recovery. The runnable
CLI completed with BLOCKED and UNKNOWN outputs; no real transaction was tested.
