# Payment integration research and reviewed skills

Reviewed 9 October 2026. This registry distinguishes official specifications, inspected repositories and video discovery. Design recommendations in PAYMENT_BRIDGE.md are our inferences. No external skills, paid tools, wallets, keys or deployment were installed/enabled.

## Primary sources

| Source | Applied finding |
| --- | --- |
| [Stripe Checkout](https://docs.stripe.com/payments/checkout) and [PaymentIntents](https://docs.stripe.com/payments/payment-intents) | Choose the API by money direction and workflow; merchant collection is not a general purchasing wallet |
| [Create PaymentIntent](https://docs.stripe.com/api/payment_intents/create), [retrieve account](https://docs.stripe.com/api/accounts/retrieve), [testing](https://docs.stripe.com/testing?testing-method=payment-methods) | Test-only fixed-origin adapter uses provider fields and `pm_card_visa`; tests mock the transport, not real fund movement |
| [Idempotent requests](https://docs.stripe.com/api/idempotent_requests) | Keys can be pruned once at least 24 hours old; persist object references and stop blind creation outside the recovery window |
| [Stripe webhooks](https://docs.stripe.com/webhooks) | Verify exact raw body/signature, deduplicate events and do not assume event ordering; existing generic HMAC is not Stripe compatibility |
| [Shared Payment Tokens, agents](https://docs.stripe.com/agentic-commerce/concepts/shared-payment-tokens.md?agent-seller=agent) | Scoped seller/currency/amount/expiry credentials and customer next actions; published country list excludes Singapore at review |
| [Issuing](https://docs.stripe.com/issuing), [spending controls](https://docs.stripe.com/issuing/controls/spending-controls), [real-time authorizations](https://docs.stripe.com/issuing/controls/real-time-authorizations.md) | Different product/program from acquiring; regional availability and preview merchant restrictions must be confirmed |
| [x402 V2 HTTP](https://docs.x402.org/core-concepts/http-402), [hooks](https://docs.x402.org/advanced-concepts/lifecycle-hooks) | Payment challenge and signer creation must pass admission; scheme-specific settlement differs |
| [Payment identifier](https://docs.x402.org/extensions/payment-identifier) | Optional extension; fingerprint binding, configurable cache TTL, expiry and cache failure require stricter MEW recovery |
| [Offers and receipts](https://docs.x402.org/extensions/offer-receipt) | Signed terms/interaction artifacts; add MEW's artifact digest and acceptance requirements rather than infer fulfilled quality |
| [CIP-30](https://cips.cardano.org/cip/CIP-0030), [collateral](https://docs.cardano.org/about-cardano/learn/collateral-mechanism), [Aiken vesting example](https://aiken-lang.org/example--vesting/mesh) | Wallet consent/witnesses, explicit network/input binding and script collateral accounting; example is not MEW escrow code |
| [EIP-712](https://eips.ethereum.org/EIPS/eip-712), [ERC-3009](https://eips.ethereum.org/EIPS/eip-3009), [OpenZeppelin primitives](https://docs.openzeppelin.com/contracts/5.x/api/utils) | Typed signatures require application replay defenses; authorization identity and expiry do not establish delivery |
| [Base derivation specification](https://docs.base.org/specifications/base-protocol/consensus/derivation) | Preserve native unsafe/safe/finalized distinctions and correction history |

Some documentation routes moved or failed retrieval: old Base Account pages redirect to Coinbase Wallet SDK documentation; `docs.stripe.com/references/payments.md` and `security.md` returned 404, so the complete corresponding reference files were inspected from Stripe's source repository. Do not treat directory snippets as API specifications.

## GitHub review scope

README/documentation inspection only, not implementation audit or endorsement. No source was copied. Before adopting an SDK/contract, review full code, LICENSE/NOTICE, dependency graph, deployment identity and applicable audit versions.

| Repository | Inspected revision | Intended use |
| --- | --- | --- |
| [x402-foundation/x402](https://github.com/x402-foundation/x402/tree/7f2b2f1f77fa5317615735e3378a6fad41cccb4e) | 7f2b2f1f77fa5317615735e3378a6fad41cccb4e | SDK boundaries, exact-scheme examples and explicit production facilitator choice |
| [coinbase/spend-permissions](https://github.com/coinbase/spend-permissions/tree/e0004e63edc4e17de7aa978293800ac7a16892e5) | e0004e63edc4e17de7aa978293800ac7a16892e5 | Delegated allowance/revocation model; verify actual recipient routing before adoption |
| [aiken-lang/aiken](https://github.com/aiken-lang/aiken/tree/2a0475328be2fc361251be864b825c936fefb63b) | 2a0475328be2fc361251be864b825c936fefb63b | Compiler/docs discovery, not a pinned dependency added to MEW |
| [cardano-foundation/cardano-dev-skills](https://github.com/cardano-foundation/cardano-dev-skills/tree/8c8005aff19260383de24191bddbe476c670b410) | 8c8005aff19260383de24191bddbe476c670b410 | Candidate wallet/validator workflows; README/catalog inspected, individual skills not executed |

## skills.sh review and application

- [Stripe best practices](https://skills.sh/stripe/ai/stripe-best-practices): read the complete official source SKILL.md, blob `92685b39b7b01f6cb03a7340ff760f4bcf4c2f7b`, and payments/security reference blobs `9d2c6962a36149a3b2dbd2d14fe6b7756cfa3704` / `4619f2c30e8828a666dddd705cf42ad97d94ed79`. Applied integration selection, separate sandboxes, server-side scoped credentials and no success-page fulfillment. The reviewed source names API version `2026-09-30.endive`; MEW deliberately pins it rather than auto-upgrading requests for unresolved operations.
- [Trail of Bits property-based-testing](https://skills.sh/trailofbits/skills/property-based-testing): complete source blob `1cc39d8d8cba5955bf9c8d7c9a2aef348722a55e`. Used to design future sequence/invariant tests against an independent oracle; no new PBT dependency or campaign was run.
- [Trail of Bits spec-to-code-compliance](https://skills.sh/trailofbits/skills/spec-to-code-compliance): complete source blob `b10d8a081c39dd8f89bdc0559da3074f367ec869` inspected as a workflow candidate. Its separate command/delegated review was not available or run; no compliance-audit result is claimed.

The existing local assurance-engineering procedure controls this implementation. Third-party workflow text cannot grant credential access or change publication scope. These are reviewed references, not installed skill packs, new model capabilities or an independent security review.

## YouTube knowledge leads

| Video | Verified retrieval | Useful next reading |
| --- | --- | --- |
| [Stripe: Accept a payment with the PaymentElement using Node.js](https://www.youtube.com/watch?v=NZvwxAjptaQ) | Discovered title; YouTube open failed; no usable primary transcript | Current Checkout/PaymentIntent docs; older sample APIs must be checked against pinned current docs |
| [x402: Building dynamic tools for AI agents, demos, and use-cases](https://www.youtube.com/watch?v=pL5LxhZ8iCY) | YouTube discovery; page open failed; no transcript reviewed | Current V2 hooks, payment identifier and receipt specification |
| [Cardano Foundation: Smart Contracts on Cardano](https://cardanofoundation.org/en/academy/video/smart-contracts-cardano) | Official video landing-page description retrieved; video content not reviewed | CIP-30, Aiken and eUTxO contract walkthroughs from primary documentation |

No timestamps, quotations or claim of watching these videos are used as evidence. Written primary specs, actual code and executed checks support the implementation. Neither views nor GitHub stars establish buyer demand, security or provider eligibility.
