# MEW positioning: assurance for agent execution

Reviewed 8 October 2026. This is a product thesis and research map, not evidence of a live trading, insurance, or payment integration.

## The cross-market position

**MEW should be the independent execution-assurance layer between an AI agent's intent and an external commitment.** It checks a mandate, constrains exposure, records the decision, and reconciles what actually happened. It can serve Web2 purchasing agents and Web3 payment/trading agents through separate adapters while keeping one stable control-and-evidence contract.

The near-term product is not “AI trading insurance.” MEW today is a deterministic economic-control prototype for bounded objectives; it does not submit trades, custody funds, issue coverage, adjudicate claims, or prove merchant delivery. Build first around a narrower job: **prevent duplicate or out-of-policy commitments and produce a reviewable execution record.** Insurance can later consume those records as underwriting or claims evidence, under a licensed insurer's policy and authority.

### The common execution record

An adapter should normalize only the facts needed to assess a proposed commitment:

| Shared field | Purchase / API call | Trading action |
| --- | --- | --- |
| Principal + mandate | Buyer, task, spend ceiling | Account, strategy mandate, exposure ceiling |
| Intent identity | Supplier + deliverable key | Venue + instrument + side + strategy intent |
| Proposed commitment | Price, quantity, fee, delivery terms | Size, order type, limit/slippage, fees, funding/margin |
| Risk evidence | Supplier history, quote freshness, fulfillment state | Market/oracle freshness, liquidity, volatility, liquidation distance |
| Decision journal | Allow, defer, deny; stable idempotency key | Allow, defer, deny; stable idempotency key |
| Observed outcome | Receipt, artifact hash, refund | Order/fill IDs, settlement, position and realized fee |

The shared kernel can enforce mandate, idempotency, quantity/exposure, freshness and uncertainty rules. Domain adapters must not erase what differs: market risk includes price movement, leverage, liquidation, oracle manipulation and MEV; a procurement payment primarily adds fulfillment, quality and refund risk. Never treat an on-chain transfer as proof of a delivered service or a successful order as proof of a profitable strategy.

## Why this position fits the market

- Payment networks are preparing for agent-initiated commerce. Visa describes adding identity and behavioral signals to agent transaction-risk decisions; Coinbase's x402 materials describe paid API discovery/calls and payment retries. These show useful integration surfaces, not a settled cross-industry standard or proof that MEW is integrated.
- Central-bank work treats agents as potentially useful for payment/liquidity management while stressing safeguards and human oversight. That supports a bounded control plane, not autonomous authority.
- Insurance regulators are formalizing insurer AI governance, including data, controls and third-party model risk. This makes provenance and reviewable evidence a more credible initial bridge to insurance than claiming automated coverage.
- On-chain mutual cover products illustrate that coverage is a separate policy lifecycle with wording, eligibility, period, amount and claims assessment. MEW's internal risk decision must never be represented as an insurance policy or claim decision.

These sources support a direction, not a claim that agent execution insurance is mature. The “agent insurance” research/vendor category is early and must be revalidated before using it in a pitch.

## Product architecture and authority boundaries

```text
Agent / operator proposes intent
             │ typed request; untrusted text stays out of authority fields
             ▼
Domain adapter ── normalizes quote, identity, risk facts and evidence age
             │
             ▼
MEW deterministic mandate kernel
  identity · budget/exposure · quantity · freshness · idempotency
       ├── DENY: invalid or out of mandate
       ├── DEFER: outcome uncertain; reconcile original operation
       └── ALLOW: durable reservation, then hand off to an approved executor
             │
             ▼
Executor / payment rail / venue (separate signer and policy controls)
             │ independently verified observations
             ▼
Append-only evidence receipt ──► operator / auditor / (later) insurer
```

Advisory models may summarize evidence or propose risk factors; they cannot change the mandate, fabricate evidence, release uncertain exposure, sign, dispatch, settle, or decide insurance claims. Keep the existing “reserve before dispatch, unknown is not failure” invariant from [SPEC.md](../SPEC.md). Payment and trading adapters need separate schemas and tests; add no live executor until custody, authentication, replay safety, reconciliation, and independent security review are complete.

### Insurance integration boundary

The future insurer-facing product should be an **evidence and controls API**, not an MEW-branded promise of indemnity:

1. A regulated carrier, broker, or authorized mutual defines insured event, covered party, exclusions, limits, deductible, period and claims process.
2. MEW can attest to versioned mandate decisions and verified execution observations. It must label missing, delayed, disputed and simulated events distinctly.
3. The insurer independently maps evidence to policy terms and makes underwriting/claims decisions. MEW cannot decide coverage or trigger an automatic payout.
4. Minimize retained personal/transaction data; agree purpose, retention, access, correction and incident procedures with the partner before a pilot.

Potential partners: agent-commerce/payment providers, API marketplaces, custodians/exchanges, wallet infrastructure, brokers, cyber/technology E&O carriers and on-chain cover providers. Treat each as a discovery hypothesis until interviews and a consented pilot establish demand, permitted data use, acceptance criteria and cost.

The concrete first buyer, pilot interview script, packaging hypothesis, scorecard and disconfirming signals are in [the go-to-market plan](EXECUTION_ASSURANCE_GO_TO_MARKET.md).

## Build and validation sequence

1. **Now — define a simulation contract.** Create a typed intent/decision/evidence schema and adapter conformance suite for one Web2 purchase and one Web3 action. Reuse the existing kernel; no execution or coverage authority.
2. **Prove the control.** Test duplicates, retries, stale quotes, provider timeouts, conflicting receipts, partial fills, fee changes, refund/reversal, chain reorgs and concurrent reservations. Track principal and position risk separately from model quality.
3. **Customer pilot.** Interview one agent/API buyer and one execution-risk or insurance partner. Run only with consented, non-sensitive cases; measure prevented duplicate commitments, review time, unresolved outcomes, false blocks, latency and evidence completeness.
4. **Insurance evidence trial.** Have a licensed partner assess whether the receipt format is useful for a real policy workflow. Do not call a dataset “actuarial” or price a policy without an insurer and suitable exposure/outcome data.
5. **Preprod execution, separately gated.** After signer custody, funded lifecycle tests, reconciliation, audit and budget approval; separate testnet results from production guarantees.

Release measures should include false-allow rate, false-defer rate, exposure-accounting correctness, duplicate-dispatch count (target zero), reconciliation age, evidence-field completeness, time-to-review and partner acceptance. Do not substitute model agreement, citation count or synthetic scenario pass rate for these.

## Stanford/MIT learning plan — not a model-training claim

Use the courses as a curriculum for people and benchmark design. The [Stanford CS329Z course](https://cs329z.stanford.edu/) covers agent-system decomposition, evaluation, safety and operational concerns; Stanford's [AFTLab](https://fintech.stanford.edu/) gives relevant finance/DeFi research context. MIT's [Advanced Corporate Risk Management](https://live.ocw.mit.edu/courses/15-997-practice-of-finance-advanced-corporate-risk-management-spring-2009/) helps frame exposure measurement and transfer. MIT OCW's [Finance Theory I lectures](https://www.youtube.com/watch?v=tL7Lcl90Sc0) provide foundational portfolio/risk context.

Do not scrape full course recordings, copy lecture notes into a commercial training set, or infer a model-training license from public access. The cited MIT course has a noncommercial/share-alike courseware license; Stanford material also has its own rights/terms. The Stanford course is in progress in Fall 2026; use only materials actually released. Extract public learning objectives and citations; write original scenarios and assessment rubrics; obtain rights review before reproducing text or using any source as training data.

Recommended curriculum-to-evaluation mapping:

| Learning area | Original MEW benchmark task | Measure |
| --- | --- | --- |
| Agent decomposition and tool boundaries | Identify which steps require deterministic kernel vs advisory model | Correct authority assignment; no model-authorized spend |
| Risk measurement | Explain gross exposure, uncertainty, fees and tail/liquidation risk from supplied fixture facts | Numeric correctness and explicit unknowns |
| Evaluation and safety | Detect stale, conflicting or instruction-bearing external evidence | Unsupported-claim and false-allow rate |
| Insurance and risk transfer | Separate operational control evidence from policy coverage and claims | No implied coverage; correct escalation |
| Web3 settlement | Distinguish submitted, observed, confirmed, reorged and fulfilled states | State-transition and replay correctness |

Freeze the existing semantic benchmark, add these as new versioned cases, have domain experts label independently, and retain a customer-family holdout. Evaluate retrieval first. Fine-tune only if a repeatable generation failure remains after the evidence is present, and only on rights-reviewed, reviewed examples. Current local model results and activation gates are documented in [FROZEN_MODEL_EXPERIMENT.md](FROZEN_MODEL_EXPERIMENT.md), [MODEL_RELIABILITY_RESOURCES.md](MODEL_RELIABILITY_RESOURCES.md) and [ML_LEARNING_PIPELINE.md](ML_LEARNING_PIPELINE.md); this research adds no training data and activates no model.

## Research and skills provenance

Primary references checked 8 October 2026:

- [BIS Working Paper 1310: AI agents for cash management in payment systems](https://www.bis.org/publ/work1310.htm) — simulated RTGS use and need for safeguards.
- [Visa Intelligent Commerce: Agentic AI](https://corporate.visa.com/en/solutions/intelligent-commerce/vcs-agentic-ai.html) — identity/behavior context for payment risk.
- [Coinbase x402 Bazaar MCP](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/x402-facilitator/bazaar-mcp-server) — paid resource discovery/call flow; protocol-specific, not MEW integration.
- [NAIC Artificial Intelligence](https://content.naic.org/insurance-topics/artificial-intelligence) and [2023 Model Bulletin](https://content.naic.org/sites/default/files/inline-files/2023-12-4%20Model%20Bulletin_Adopted_0.pdf) — insurer governance and examination expectations.
- [Nexus Mutual cover guide](https://docs.nexusmutual.io/using/buy-cover/) and [claims contracts](https://docs.nexusmutual.io/developers/contracts/Claims/) — separate cover and claims lifecycle.
- [Bank of England July 2026 Financial Stability Report](https://www.bankofengland.co.uk/financial-stability-report/2026/july-2026) — wider operational/cyber risk context for capable agents.

Reviewed skills.sh listings for [DefiLlama risk assessment](https://www.skills.sh/defillama/defillama-skills/risk-assessment), [Bankr DeFi-native research](https://www.skills.sh/bankrbot/skills/defi-native) and [ECC LLM-trading security](https://www.skills.sh/affaan-m/ecc/llm-trading-agent-security), then inspected the [ECC upstream skill](https://raw.githubusercontent.com/affaan-m/ecc/main/skills/llm-trading-agent-security/SKILL.md). The ECC skill is a checklist source only: its example patterns include unsafe coupling of agent decisions with signing, fragile text sanitization and non-atomic spending checks. None was installed or copied as executable code. This original MEW skill is authored for cross-domain execution-assurance research; external procedures remain reference material. See [docs/SKILLS.md](SKILLS.md) and [.agents/skills/agentic-execution-assurance/SKILL.md](../.agents/skills/agentic-execution-assurance/SKILL.md).
