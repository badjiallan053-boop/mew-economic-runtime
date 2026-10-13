# Standards interoperability — MEW, AP2, ERC-8183, x402 and MPP
Research date 2026-10-14. Non-production implementation design.

## Critical new research

The original MEW idea cannot claim to be the first to introduce signed human intent or verifiable service delivery. These are already addressed by other standards and systems.

- Google AP2 uses cryptographically verifiable open and closed mandates for delegated agent payments: https://github.com/google-agentic-commerce/AP2/blob/main/docs/index.md
- Google AP2 authorization binds a delegated intent to a particular transaction and verifier: https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/agent_authorization.md
- x402 version 2 standardizes HTTP/MCP/A2A-native payment negotiation, scheme-specific verification and settlement; it excludes client-side budget management: https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md
- Stripe/Tempo MPP adds another machine-payments standard, so a business needs transport-agnostic payment intent rather than x402-only plumbing: https://stripe.com/blog/machine-payments-protocol
- ERC-8183 is a DRAFT Ethereum job-escrow standard with provider delivery and independent evaluator decisions, partial settlement, rejection and refund paths: https://eips.ethereum.org/EIPS/eip-8183 ; reference: https://github.com/erc-8183/base-contracts
- Virtuals ACP is an implementation of a multi-agent job/pay/evaluation flow, with extensive claimed production history: https://os.virtuals.io/acp/overview

## MEW role after standards discovery

Not: signed mandates (AP2), agent-wallet controls (Veridex/Hedera), multi-source atomic settlement (Quikt), trusted job escrow (ERC-8183), or a generic financial execution harness (Aomi).

Proposed: independently reconcile a principal's **multi-objective commitment portfolio**, where separate agent jobs and payments from multiple protocols compete for shared budgets, deadlines, deliverable capacities and substitutions. Existing standards become evidence providers.

Do not assert that none of these providers support cross-objective consistency; run equivalent test scenarios against actual deployments/SDKs before any exclusivity claims.

## Minimal canonical contract (research schema, NOT implemented)

{
  "mandate": {
    "principalId": "human-or-org",
    "mandateVersion": 1,
    "objectiveId": "quarterly-research",
    "outcome": {
      "deliverableType": "verified-market-report",
      "subject": "Q3 pricing",
      "quantity": 1,
      "qualityPolicyId": "review-approved-v1",
      "freshUntil": "2026-10-31T00:00:00Z",
      "substitutions": "approval-required"
    },
    "maxAggregateExposure": {"asset":"eip155:8453/erc20:token-id","minorUnits":"100000000"},
    "validUntil": "2026-10-31T00:00:00Z",
    "authorizedActors": ["agent-a","agent-b"]
  },
  "proposal": {
    "effectId": "payment-attempt-1",
    "objectiveId": "quarterly-research",
    "merchantId": "known-provider",
    "resourceDigest": "sha256:...",
    "quoteDigest": "sha256:...",
    "network": "eip155:8453",
    "assetId": "eip155:8453/erc20:token-id",
    "maxPaymentMinorUnits": "45000000",
    "expiresAt": "2026-10-20T00:00:00Z"
  },
  "evidence": {
    "paymentProtocol": "x402-or-mpp-or-erc8183",
    "settlementProof": "adapter-specific",
    "deliveryProof": "authenticated-merchant-or-evaluator",
    "verifiedOutcome": "requires-policy-verifier"
  }
}

The JSON above is conceptual. Do not interpret a claimed digest as a verified cryptographic binding; a production system needs canonical serialization, trusted signing, identities, revocation, challenge/nonce binding and end-to-end authorization checks. In particular do not reuse the toy ADA 0.55 payment as a real Cardano output.

## Research-to-development contracts

1. Principal approves an immutable structured outcome; agents cannot silently redefine objective equivalence.
2. Capture an AP2 mandate or equivalent signed authorization where applicable, without assuming AP2 is supported by every wallet.
3. Reserve across objectives using a shared transactional store before releasing any payment authorization.
4. Bind the exact resource, merchant, quote, amount, asset, beneficiary, expiration and transaction payload presented to the signer.
5. One external rail adapter executes and returns typed evidence. Protocol-specific statuses are not assumed to mean 'delivered.'
6. Independently verify settlement proof, then merchant/evaluator acceptance proof, and update objective quantity and budget.
7. If evidence is missing: DEFER / RECONCILE; do not mark success or automatically release capacity.
8. Provide safe cancellation, dispute and refund paths with verified releases. No arbitrary LLM decides monetary state transitions.

## Differentiating experiments

E1: Two individually valid AP2 closed checkout mandates draw on one human-approved aggregate outcome cap.
E2: One ERC-8183 job and one x402 API purchase deliver equivalent research to different agents, while prior delivery proof remains unknown.
E3: One job is 'completed' by evaluator, yet deliverable freshness fails stricter principal-defined acceptance policy.
E4: Two payment rails report different finality stages; an agent retries before definitive reconciliation.
E5: Structured work is legitimately distinct despite high textual similarity: MEW must abstain, not block indiscriminately.

Test against plain protocol baselines and at least one third-party runtime. Publish negative cases and false denials.

## Commercial differentiation test

If users already rely on a single app, wallet or escrow protocol, MEW may be unnecessary. Focus on teams coordinating two or more independent agent runtimes, merchant systems or settlement protocols, where no single provider naturally owns the organization-wide outcome ledger.

This is a research direction, not proof of buyer demand.
