# MEW and agentic insurance

Research checked 8 October 2026. This is a product design and partner-pilot brief, not insurance advice, a coverage opinion, an actuarial model or an offer of insurance.

## The opportunity, stated carefully

AI is entering insurance operations, and insurers are clarifying how existing policies treat AI. In EIOPA's February 2026 survey of 347 undertakings across 25 countries, nearly two-thirds reported actively using generative AI; most uses were still proof-of-concept, human-supervised and internal, with 64% of reported uses focused on back-office productivity. The same survey cites privacy/security, compliance, hallucinations and third-party dependencies as concerns. This favors explainable evidence and assisted workflows over autonomous coverage decisions. [EIOPA survey](https://www.eiopa.europa.eu/eiopa-survey-generative-ai-shows-swift-cautious-adoption-among-europes-insurers-2026-02-02_en)

CFC announced affirmative AI wording across seven existing product families, including Tech E&O, professional liability, eHealth, IP, management liability, media and cyber. That is evidence of product adaptation, but not proof that a policy covers a particular agent action or that an “agent execution insurance” product is established. The policy wording, insured, territory, cause, exclusions and facts control any coverage decision. [CFC announcement](https://www.cfc.com/en-us/knowledge/news/2026/06/cfc-responds-to-customer-demand-for-affirmative-ai-cover/)

NAIC's AI Risk Evaluation Supplement v5.0 was exposed for feedback through 29 September 2026; the working group scheduled further discussion for 8 October. Its published change summary adds emphasis on model inventory, materiality, third-party models, model risk/limitations, data use and a definition of agentic AI. Treat this as evolving supervisory work, not a finalized rule. [NAIC working group](https://content.naic.org/committees/h/big-data-artificial-intelligence-wg) · [v5.0 change summary](https://content.naic.org/sites/default/files/inline-files/summary-of-changes.pdf)

EIOPA's 2025 Opinion applies a proportionate, risk-based governance approach to insurance-sector AI. Open papers proposing an “agentic AI insurance stack” are useful research hypotheses, not proof of market adoption, reliable premiums or enforceable coverage. [EIOPA Opinion](https://www.eiopa.europa.eu/publications/opinion-artificial-intelligence-governance-and-risk-management_en) · [Agentic AI insurance paper](https://arxiv.org/abs/2606.05449)

## Product position

Build **Agent Execution Evidence**: a system-of-record and control interface that helps an agent operator show a broker or insurer how delegated actions are bounded, recorded and reconciled. Begin as a shareable, operator-approved evidence pack and shadow-mode control; do not assign a risk score, quote a premium, bind a policy, handle a claim or hold risk.

The primary near-term buyer is a company deploying agents that can authorize purchases or make payments. Its broker/underwriter is the evidence consumer and design partner. A second discovery lane can help an insurer document its own internal agents against its model inventory and control program, but that should not be mixed into the first product workflow.

For trading, keep the v1 scope to **execution/control incidents** such as duplicate orders, wrong recipient/side/size, replay, or action beyond an approved limit. Market P&L, price moves, liquidation, oracle failure, MEV, protocol exploit and custody losses are separate exposures. They must not be bundled into an implied guarantee or a generic “insured trade” feature. A smart-contract cover product does not by itself cover trading losses or agent misconduct.

## Boundary: control is not coverage

```text
Agent operator                  MEW                         Insurer / broker
-------------                   ---                         ---------------
declares system, tools,    validates mandate and logs    reviews evidence against
limits and owner           each state and receipt        its own process
       │                         │                               │
       └── authorized action ───►│── evidence pack ─────────────►│
                                 │                               ├─ selects/declines risk
                                 │                               ├─ writes policy wording
                                 │                               └─ adjusts claim
```

MEW may prove what its configured boundary allowed and what a trusted observer later reported. It cannot prove the agent's full off-platform behavior, that an operator disclosed every tool, that an external observation is complete, that the loss was caused by the agent, or that a policy responds. A signed/hash-bound record proves integrity of those recorded bytes under its signing assumptions; it does not prove their truth or coverage.

| Layer | MEW's part | Partner's part |
| --- | --- | --- |
| Prevention | Enforce a configured mandate, amount/quantity cap and idempotency key; defer unresolved operations | Decide what safeguards are required for a particular risk |
| Evidence | Preserve versioned decision, reservation and bound observation references | Validate source reliability, completeness and relevance |
| Underwriting | Export a transparent evidence pack with missing fields visible | Select risk, set terms/price/limits/exclusions or decline |
| Incident/claim | Show recorded events, status and supporting references | Determine cause, liability, policy response, settlement and appeal |

## Minimum evidence contract (proposal, not a shipped runtime API)

Capture facts necessary to reconstruct delegated authority and outcomes:

1. **System inventory:** pseudonymous system/workflow ID, version, model/provider revision where known, connected tools and deployment period.
2. **Authority:** accountable organization/owner, permitted action classes, assets/rails, per-action and aggregate limits, approval thresholds, emergency stop and recovery owner.
3. **Controls:** control version, tested scenario, expected/observed decision, test time and result artifact digest; distinguish a test fixture from a live observation.
4. **Action lifecycle:** stable operation/effect ID, mandate revision, quote/asset/amount or order facts, decision, reservation, dispatch status, external reference, confirmation, delivery and final resolution. Keep unknown, rejected, reversed, refunded and fulfilled distinct.
5. **Incident/outcome:** independently reviewed event category and cause confidence, gross impact and recovered amount in their original asset/currency, evidence source, adjudication status and observation maturity date. Separate observed losses from hypothetical loss avoided by a block.
6. **Provenance:** issuer, timestamp, source class, verification method, signature/key version, exact digest and revocation/correction linkage.

Do not place prompts, full conversations, customer content, personal data, secrets, private keys, seed phrases or raw wallet addresses in the default evidence pack. Use stable pseudonymous identifiers and an explicit purpose, access, retention and deletion policy. A broker/insurer must identify any additional fields it needs and why.

Underwriting analysis also needs **exposure denominators**: counts and amounts of eligible actions, active-system time, action types and system-version periods, including safely completed operations. Incident-only logs create selection bias; blocked counterfactual losses are not realized claims. Preserve development, validation and future-period holdouts by organization/system family. Do not train or price from the synthetic MEW demo.

## What to pilot first

Run a 4–6 week evidence-quality pilot with one agent operator and one licensed/authorized broker or insurer contact. Keep MEW in shadow mode; do not change the customer's execution path or policy terms.

1. Agree the covered workflow only as a research scope: e.g., an agent buying third-party services under a fixed mandate. State excluded actions and jurisdictions.
2. Inventory every model, tool, permission, budget and human gate in that workflow. Record uncertainty and changes.
3. Replay a customer-approved incident set (timeouts, duplicate retries, wrong target, stale quote, credential misuse, supplier failure, valid completion) against the deterministic MEW simulator.
4. Produce an evidence pack with control outcomes and explicit missingness. The reviewer maps fields to its existing underwriting/claims intake; MEW does not recommend acceptance or a premium.
5. Ask the reviewer to rate usefulness, traceability, missing evidence and review time. Ask the operator whether it accurately describes the system and what was burdensome.
6. Delete or retain pilot data only under the written agreement. Publish no loss reduction, rate improvement or “insurable” claim from a small synthetic/selected sample.

### Pilot success measures

- percentage of actions traceable from mandate through final observed state;
- completeness and correction rate for the system inventory;
- time for operator to assemble the pack and reviewer to locate evidence;
- false/misleading event classifications and unresolved provenance defects;
- replay, duplicate, stale and uncertain-state control test outcomes;
- reviewer confirmation that the pack supports a named process step;
- privacy/security exceptions and retention/deletion compliance.

No premium savings or loss reduction KPI until a carrier has a valid method, adequate longitudinal data and a comparison design it accepts.

## Risk and claims workflow SOP

| Stage | Owner | Required evidence | Stop condition |
| --- | --- | --- | --- |
| Define system | Operator | Versioned tool/model inventory, authority map, named accountable owner | Unknown tools or permissions; no complete action boundary |
| Test controls | MEW/engineering with independent QA | Frozen adversarial scenarios, expected state transitions, restart/replay outcomes | Any extra dispatch, released UNKNOWN exposure or silent evidence substitution |
| Build evidence pack | MEW | Hash-bound observations, source/verification type, missing fields and corrections | Anything labeled verified without its verifier or source |
| Review risk | Broker/underwriter | Human assessment, named policy/process, questions and disposition | Treating MEW ALLOW as insurability or coverage acceptance |
| Handle incident | Operator, then insurer claims function | Original IDs, preserved logs, event chronology, asset-specific amounts, evidence custody | Re-running/retrying the action before original state is reconciled |
| Update controls | Operator + risk owner | New system version, changed authority, regression results and effective date | Reusing an earlier pack after material model/tool/limit changes |

## Roadmap and gates

**Now:** publish the concept page and evidence schema proposal; keep current MEW demo unchanged in authority. Interview operators, brokers and insurer risk/claims staff.

**Next:** add a local, non-sensitive export from the existing rehearsal journal only after a reviewer confirms the required fields. Mark it prototype evidence; run no production scoring.

**Then:** connect one consented shadow-mode pilot, use a customer holdout, validate accuracy and data handling, and obtain independent security review.

**Later:** only with a named carrier/MGA and legal/regulatory review consider policy-linked monitoring, premium incentives, embedded cover, parametric triggers or claims integrations. Each requires licensed authority, policy wording, claims controls, capital/reinsurance, jurisdiction review, adverse-selection analysis and independent oracle/trigger design. Cardano or a smart contract can automate a defined obligation; it cannot supply insurance capacity or resolve disputed facts by itself.

## Research and build references

- [NAIC AI Risk Evaluation Supplement process](https://content.naic.org/committees/h/big-data-artificial-intelligence-wg) and [change summary v5.0](https://content.naic.org/sites/default/files/inline-files/summary-of-changes.pdf): inventory, materiality, model risk/limits, third-party oversight and data documentation.
- [EIOPA GenAI survey (February 2026)](https://www.eiopa.europa.eu/eiopa-survey-generative-ai-shows-swift-cautious-adoption-among-europes-insurers-2026-02-02_en) and [governance Opinion](https://www.eiopa.europa.eu/publications/opinion-artificial-intelligence-governance-and-risk-management_en): adoption pattern and proportional governance.
- [CFC affirmative AI cover announcement](https://www.cfc.com/en-us/knowledge/news/2026/06/cfc-responds-to-customer-demand-for-affirmative-ai-cover/): market example; announcement is not policy form or MEW partnership.
- [Insurance of Agentic AI](https://arxiv.org/abs/2606.05449): emerging working research; use to formulate questions, not to claim a mature product market.
- Existing control rules: [SPEC.md](../SPEC.md), [MEW cross-market positioning](AGENTIC_EXECUTION_ASSURANCE_POSITIONING.md), [customer/pilot plan](EXECUTION_ASSURANCE_GO_TO_MARKET.md).
