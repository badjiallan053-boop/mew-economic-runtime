# MEW 2.0: Outcome Assurance — Competitive Intelligence + Design RFC

Date: 2026-10-14. Status: research, experimental read-only diagnostic, NOT production-ready payment enforcement.

The MEW decision engine and public Railway deployment remain unchanged on this research branch. NO third-party source code has been copied.

## Executive decision

Do not position MEW as another agent wallet, a generic policy engine, a new x402 rail or a Sui atomic payment bundle. These are populated spaces. Test a narrower hypothesis: independently auditable **shared commercial objective consistency across concurrent agents, separately authorized payment attempts, merchants and incomplete delivery evidence**.

Do not claim uniqueness: Aomi Labs has explicitly advanced an overlapping execution-harness thesis. Differentiation must be measured.

## Competitor research (first-party documentation)

| Project | Verified design claims | What MEW should adopt / avoid | Source |
| --- | --- | --- | --- |
| x402 v2 | Payment requests, settlement schemes and security considerations; client-side budgets outside core standard | Build an adapter above x402; bind the exact authorized resource, quote and amount | https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md |
| Veridex | Agent wallet SDK, policies, x402, identity, multiple chains, audit | Partner with wallets; do not duplicate signing and per-agent spend limits | https://github.com/Veridex-Protocol/agentic-payments |
| Quikt on Sui | Sui PTB all-or-nothing atomic multi-source payments and receipt commitments | Optional atomic-bundle adapter; MEW owns asynchronous multi-operation objective consistency | https://github.com/kite-builds/argus |
| WAP3 | Sui describes unified agent intent, verification, payment and audit pipeline | Beware thesis overlap | https://www.sui.io/blog/btcfi-payments-fellowship-on-sui |
| MandateGuard / Agent Spend Policy Engine | Budgets, limits, service allowlists and approval requirements on Algorand x402 | These are table stakes, not novel IP | https://algorand.co/blog/ai-agents-that-pay-real-x402-applications-built-on-algorand |
| AgentPay | Agent cost visibility, tool-routing and budget receipts | Optimization may follow deterministic safety, but is not our initial wedge | https://github.com/romudille-bit/agentpay |
| Hedera Agent Accounts | Programmable noncustodial, individual agent-spending rules; phased rollout | Keep key custody and signatures with a wallet | https://hedera.com/blog/introducing-hedera-agent-accounts/ |
| NEAR Intents | Intent-oriented cross-chain settlement and agent ecosystem | Integrate for execution; don't mistake asset settlement for verified service fulfillment | https://www.near.org/roadmap-history |
| Aomi Labs | End-to-end execution-harness thesis covering authorization, retries and outcome verification | Direct adjacency; specialize and benchmark objective consistency | https://aomi.dev/research/execution-harnesses-agentic-payments |
| PayBench | Simulated payment safety evaluations and caveats | Complement with outcome-level scenarios and independent real-world validation | https://paybench.org/ |

Additional research:
- x402 implementation flaw classes: cross-resource substitution, concurrency races, allowance overdrafts — https://arxiv.org/abs/2605.30998
- A402 binding payment to actual service execution — https://arxiv.org/abs/2603.01179
- IMF separation of intent, deterministic authorization, settlement — https://www.elibrary.imf.org/view/journals/068/2026/004/article-A001-en.xml

These sources describe published products and research. They are not independent assurance certifications.

## Verified MEW baseline

The existing kernel handles a single lovelace currency; principal-provided semanticKey; per-objective quantity and budget; durable SQLite single-service reservations; deterministic ALLOW/DEFER/DENY; replay-resistant claim IDs; Cardano read-only preprod verification and browser synthetic demo.

It does not yet demonstrate: chain payment dispatch, signed merchant delivery proof, principal-level aggregate caps across separate objectives, verified semantic equivalence across differently keyed tasks, production multi-tenancy or cross-asset accounting.

## Ten overlooked problem classes

1. **Aggregate budget bypass.** Two separately valid mandates under one principal can collectively overspend an aggregate cap; MEW currently only enforces per-objective caps. New audit demonstrates the gap (not prevention).
2. **Semantic aliasing.** Distinct semantic keys may identify the same deliverable. Structured human-attested outcome identity and defer-on-uncertainty are needed; LLM guesses must never be authoritative for payments.
3. **Delivery receipt replay.** A blockchain hash proves funds moved, not that the requested data was delivered or that one receipt hasn't been reused across several fulfillments.
4. **Quote substitution.** Bind exact authorized principal, network, merchant, resource, quote, amount, currency, expiry and beneficiary to the payload sent to an independent signer. Hashes alone are not signatures.
5. **Permanent pending states.** Unknown delivery must retain exposure, but no-release-forever is a denial-of-service problem. Need durable transaction identity, reconciliation polls, operator override with proof and verified release/refund.
6. **Multiple assets and hidden fees.** ADA lovelace cannot be summed with USDC, USD or gas. Use typed asset identifiers, integer minor units, explicit FX and maximum total spend including fees.
7. **Partial and substitutable outcomes.** Real business tasks need optional and required deliverables, dependencies, freshness and minimum acceptable quality, not just one-report/one-payment.
8. **Cross-instance concurrency.** One SQLite file serializes one service; multi-replica deployments need a shared database or a distributed coordination design.
9. **False refusals.** A system that denies all spending cannot fail economically, but creates no value. Measure successful objectives, false denial rate, resolution time and total cost alongside loss prevention.
10. **Commercial moat and distribution.** Other teams already offer authorization and receipt verification. Prove buyer pain and real SDK adoption before expanding into trading, treasury or regulated custody.

## Proposed minimal architecture

- **Human-issued Outcome Mandate**: immutable goal, deliverable specs, actor, deadline, substitution policy, global and local limits.
- **Trusted overlap service**: exact structural equivalence if strongly grounded, otherwise ABSTAIN / human review. No autonomous semantic-authority escalation.
- **Atomic reservation store**: enforce both objective and global caps transactionally.
- **Payment adapter boundary**: principal-approved request is byte-for-byte bound to external payment execution; no raw MEW wallet keys.
- **Durable dispatch outbox**: once-only dispatch attempts with transaction hash, uncertain-status recovery and safe retry.
- **Receipt reconciliation**: separate transfer finality, merchant evidence, verified fulfillment, refund and dispute.
- **Read-only outcome auditor and replay benchmark**: explainable exceptions and evidence bundles for reviewers.

MEW core should stay chain-agnostic. Start with one actual testnet integration and an x402 wrapper; use Sui/NEAR integrations only if customer demand justifies them.

## Experimental code in this branch

- src/core/outcome-audit.mjs: read-only, deterministic post-hoc analysis of separate objectives under a caller-supplied aggregate cap; human-attested equivalence labels; duplicate caller-supplied receipt identifiers; missing request-binding metadata.
- tests/outcome-audit.test.mjs: safe synthetic demonstrations of uncovered gaps and snapshot immutability.

IMPORTANT: these diagnostics DO NOT authorize payments, verify a quote or signature, prove duplicate semantic outcomes, implement shared atomic caps or change public demo behavior. Never wire them into live signing or payment dispatch without redesign and security review.

## Next benchmark: measurable comparisons, not marketing claims

B1 Current MEW blocks two same-key effects under one objective.
B2 Differently keyed but equivalent objectives require review.
B3 Independent objectives under a global cap cannot overspend.
B4 A settled payment with unknown delivery does not authorize duplicate spending.
B5 Paid-but-wrong or stale deliverable does not satisfy the goal.
B6 One delivery receipt cannot satisfy two effects without explicit approved reuse.
B7 A changed quote requires renewed principal authorization.
B8 Proven failed dispatch can be safely released without a double-spend.
B9 Currency or fee changes conservatively preserve a global mandate.
B10 Two legitimately different tasks with similar names are NOT both blocked.

Compare four baselines: current MEW; a simple wallet cap; an x402 rail alone; and a human operator. Metrics: safety failures, false denials, verified missions completed, unresolved funds time, evidence completeness, developer integration time. An unrun experiment is not a result.

## Recommended four-week sequence

Week 1: public-demo isolation, benchmark corpus, precise immutable mandate schema.
Week 2: true transactional principal-global cap + quote binding + independent signing boundary.
Week 3: one testnet payment/fulfillment flow, durable dispatch recovery, signed evidence and reviewer.
Week 4: five customer discovery calls, two outside developer pilots and quantified benchmark publication.

No real-customer funds until independent review of tenancy, authorization, signing, finality, failed dispatch, recovery, replay and refund invariants.

## Commercial wedge

Start with teams whose multiple AI agents purchase overlapping API/data services. The buyer pays for verifiable completion and reduction of duplicated commitments and reconciliation effort — not for another blockchain token or generic agent dashboard.
