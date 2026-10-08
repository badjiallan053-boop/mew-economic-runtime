# MEW operating ecosystem: product, agents, Cardano and assurance

Updated 8 October 2026. This is the target operating model and release sequence, not evidence of customer deployment, insurance capacity or live payment execution. Refer to [DELIVERY_PLAN.md](DELIVERY_PLAN.md) for current status and [BLOCKCHAIN_PROTOCOL_RUNBOOK.md](BLOCKCHAIN_PROTOCOL_RUNBOOK.md) for the chain-specific procedure.

## The product to build

MEW is an **agent commitment control and evidence service**. It receives a typed proposed action, checks it against a human-owned mandate, reserves capacity atomically, and records independently sourced lifecycle evidence. The first customer workflow is an agent buying a third-party digital service when the first supplier's response is ambiguous. MEW returns `ALLOW`, `DEFER` or `DENY`; a timeout never releases the original reservation or authorizes a replacement spend.

The business should sell a shadow-mode assurance pilot first. The target is a platform operator or finance/security team running agents with purchasing authority. The operator remains the action owner. A broker or insurer may review a consented evidence export as a separate partner lane. Trading controls and agentic-insurance evidence are later adapters; this pilot does not pool API purchases, trading P&L and insured losses into one score or promise.

## Authority and evidence map

```text
CUSTOMER / OPERATOR
 owns system inventory, mandate, consent, human approvals and incident response
             │ typed intent + versioned mandate
             ▼
MEW CONTROL PLANE ────────────── advisory evidence team
 deterministic reserve/decision  intake mapper → control mapper → data-quality
 operation journal + provenance  analyst → independent red team → human coordinator
             │                         │ no financial authority
             │ approved request         └── reviewed, minimized evidence packet
             ▼                                               │
PAYMENT RAIL / CARDANO                                      ▼
 wallet/signer signs; node/indexer reports       OPERATOR / BROKER / INSURER
 transaction inclusion and output facts          separate authority at each step
             │                                               ├─ broker maps evidence
             ▼                                               ├─ insurer sets policy terms
SUPPLIER / SERVICE PROVIDER                                 └─ claims team adjudicates
 signed delivery/fulfillment receipt
```

There are four distinct facts to preserve: **MEW decision/reservation**, **rail settlement observation**, **supplier fulfillment**, and **insurance underwriting/claim disposition**. One cannot stand in for another. A block explorer or transaction hash does not prove delivery; a delivery receipt does not prove settlement; an MEW `ALLOW` does not bind coverage; a checksum proves byte integrity, not factual truth or causation.

| Participant | Owns and may attest | Must not be inferred from its evidence |
| --- | --- | --- |
| Customer/operator | Agent/tool inventory, approved mandate, spend caps, approvals, incident context and consent | That inventory is complete unless reviewed and versioned |
| MEW deterministic kernel | Whether a typed effect fit the configured mandate and the journal state at that time | Off-platform actions, truth of customer inputs, rail acceptance or policy response |
| MEW advisory roles | Source mapping, control checklist, missingness, data-quality findings and adversarial questions | Approval, signer authority, coverage, claim liability or execution permission |
| Wallet custodian/signer | Approval/signature over exact displayed transaction bytes under its custody process | Correct business purpose unless the transaction is independently bound to the mandate |
| Cardano node/indexer | Transaction/output observation, inclusion and current confirmation depth | Irreversible finality under a fixed short depth, payer intent, delivery or coverage |
| Supplier | Receipt and delivery facts bound to an operation and exact artifact | Payment settlement unless independently observed |
| Broker/insurer/claims handler | Their own risk selection, policy terms, coverage and claim decisions | Anything MEW or its model proposed as a binding decision |

## Advisory-agent contracts

Agents assemble review material, not a swarm of autonomous business operators. Keep the current deterministic kernel and the existing compact advisory contract. For a future evidence pilot, divide advisory work into five typed handoffs:

1. **Intake mapper:** extracts only declared system, workflow, permission and source facts; each field retains source and timestamp.
2. **Control mapper:** maps a customer-approved control to `EVIDENCED`, `CLAIMED`, `MISSING` or `CONFLICTING`; it cannot silently upgrade a claim to evidence.
3. **Exposure/data-quality analyst:** checks action denominators, time windows, versions, asset units, missing intervals and selection bias. No unsupported loss score.
4. **Independent red team:** tests replay, duplicate effect IDs, wrong recipient/side/size, stale data, missing telemetry and source substitution; it cannot waive a failed gate.
5. **Human coordinator:** assembles the packet, preserves dissent and routes questions to the accountable operator or reviewer.

Every handoff carries schema/version, case ID, source digests, actor role, observation time, confidence/status, missing-field list and a bounded recommendation. Agent output has no tool for changing mandates, opening dispatch, signing, releasing exposure, quoting/binding insurance or deciding a claim. Until live model semantic quality passes an independent customer holdout, the production workflow must use deterministic controls and reviewed templates; current demo outputs remain visibly synthetic.

## Interoperability envelope

This is a proposed export contract, not a shipped API. The implementation requirements, state vocabulary, Web2/Web3 boundaries and release gates are in [Agent Payment Assurance](AGENT_PAYMENT_ASSURANCE.md). Version a canonical envelope around explicit state and provenance instead of adopting one vendor's object model as the internal ledger:

```json
{
  "schema": "mew.execution-evidence.v1",
  "case": {"tenantRef": "pseudonymous", "workflowId": "…", "workflowVersion": "…"},
  "authority": {"mandateRevision": "…", "actionClass": "service.purchase", "limitRef": "…"},
  "operation": {"objectiveId": "…", "effectId": "…", "state": "UNKNOWN", "assetUnit": "lovelace"},
  "observations": [{"kind": "rail|delivery|operator", "source": "…", "observedAt": "…", "verification": "…", "digest": "…"}],
  "outcome": {"status": "unresolved", "amountAtomic": "…", "currencyOrAsset": "…", "reviewStatus": "not-adjudicated"},
  "lineage": {"previousDigest": "…", "correctionOf": null, "revocationRef": null}
}
```

Keep amount values as decimal strings at external boundaries and integer atomic values inside each rail-specific ledger. Include explicit network, policy ID and asset name for native assets. Separate ADA fee/collateral reserves from token principal. Do not convert USDM to lovelace or permit one asset cap to fund another. No prompts, full conversations, personal content, wallet secrets or raw wallet addresses go into the default evidence packet. Off-chain data remains access-controlled; a Cardano hash commitment is optional and proves integrity only. Consider it only after a named partner approves purpose, consent, retention, correction and privacy design.

For a partner adapter, map only the agreed fields into its standard. ACORD P&C and GRLC are potential insurance exchange references, not MEW dependencies or present integrations. For service payment, inspect the pinned Masumi contract and Cardano Foundation x402 facilitator by exact version before any adapter work; read-only contract inspection is not operational compatibility. Adapters must preserve MEW objective/effect IDs, provider job IDs, rail transaction IDs and receipt digests without conflating them.

## Cardano implementation boundary and staged path

The current Cardano lane is a **preprod evidence and unsigned ADA escrow prototype**. It has local Aiken contract tests, unsigned CBOR preparation, witness inspection/assembly and read-only Blockfrost observation. It has not deployed the contract, signed or broadcast a transaction, completed a funded lifecycle or passed an independent audit. The narrow escrow controls one ADA cell; it does not enforce aggregate mandates, objective uniqueness or native-token payment accounting. The legacy recipient verifier now records `payment.observed` only: payer attribution is unverified, transaction binding is operator-attested, finality is unestablished, and the MEW reservation remains held. It cannot authorize the next spend.

Build the real rail path as a separately reviewed adapter with these acceptance stages:

| Stage | Build and verify | Gate before next stage |
| --- | --- | --- |
| A. Freeze terms | Named principal/provider, immutable quote/artifact digest, ADA-only preprod amount, network and operation ID | Human-approved max total debit including ADA fees, collateral and minimum-output reserve |
| B. Select inputs | Read current protocol parameters; decode addresses and verify preprod context; choose exact unspent UTxOs; lock them durably across workers | Fresh snapshot, no duplicate outpoint, correct asset inventory and fee/collateral separation |
| C. Build and review | Build exact transaction body, datum/redeemer, outputs, min-UTxO, fee, execution budget, script-data hash and required signers; render a human-readable summary and body hash | Independent transaction review matches mandate and compiled blueprint |
| D. Sign externally | Send only approved body to an isolated, explicitly enrolled testnet signer; keep keys/seeds outside MEW, browser and model contexts | Returned witness validates over the exact body; signer identity, limits and revocation path verified |
| E. Submit once | Durable outbox records the immutable signed transaction hash/body before submission; submit the same bytes once | Timeout becomes `UNKNOWN`; never create a second effect or release capacity |
| F. Reconcile | Independently observe the exact tx hash, inputs, outputs, address, asset, amount and inclusion; repeat after restart and rollback/re-inclusion | Report observed confirmation depth as observation; do not call three blocks finality or settle exposure without reviewed chain policy |
| G. Close lifecycle | Test provider accept/cancel, delivery, refund/recovery policy, fees/collateral and seller collection | Funded preprod scenarios, recovery and operational runbook pass; independent contract audit closed |

Start with ADA-only escrow because the current contract and persistence are explicit about that unit. Treat tUSDM/Masumi native-token purchase/withdrawal as a separate future product lane requiring policy-ID/name identity, string atomic amounts, durable multi-asset reservations, fee ADA budgets and its own tests. Do not use Cardano as an insurance oracle or place customer evidence on-chain by default.

## Business operations required to go live

| Operation | Owner | Must exist before customer pilot |
| --- | --- | --- |
| Tenant onboarding | Customer/product owner | Named accountable contact, system inventory, workflow, consent and customer-approved mandate |
| Evidence review | Security/privacy owner | Data map, access matrix, retention/deletion date, subprocessor list and export approval |
| Service reliability | Operations owner | Availability target, support hours, incident severity, escalation contact, alert/runbook and tested restore |
| Uncertain operation | Payment/rail operator | Quarantine queue, same-effect reconciliation procedure, no auto-retry, dual review for manual recovery |
| Cardano custody | Independent signer custodian | Testnet-only key custody, scope, approval display, audit trail, rotation/revocation and incident process |
| Partner use | Broker/insurer contact | Named process, approved fields, use limitation, correction path; their staff retain every coverage decision |
| Billing and sales | Business owner | Fixed-fee shadow pilot scope, cost cap, deliverable and acceptance rubric; no pricing on insured exposure or claimed loss savings |
| Release | Release owner + independent reviewer | Reviewed commit, green tests/build, release ID, deployed asset hashes, rollback evidence and clear disabled/live labels |

## A practical customer offer

Offer one 2–4 week, fixed-scope shadow-mode pilot: instrument one agent workflow that buys third-party digital services; replay a customer-approved case set; compare the customer's current behavior with MEW's deterministic decisions; deliver a privacy-minimized report with traceability, duplicate/unknown handling, false allow/defer/deny, review time, missing evidence and actual integration cost. Do not change the customer's execution path or move funds during this offer. Ask one broker/insurer reviewer whether the evidence supports one named submission or control-review step. A positive interview is not coverage, demand validation or a payment pilot.

Stop or redesign if the customer's existing system already atomically deduplicates and reconciles, false deferrals exceed the value of prevented duplicate commitments, logs cannot be used under acceptable rights, or the buyer requires custody/insurance authority that MEW does not have.

## Release order and current blockers

1. **Private operation:** establish the Supabase application's actual login role, authenticated service connection, tenant isolation, contention, restart, backup and restore. Keep the public Railway site in demo-only mode.
2. **Useful model output:** activate no model until the frozen semantic benchmark passes a blind, independent customer holdout for factual support, citations, abstention, language and boundary compliance under an approved cost cap.
3. **Customer proof:** secure written consent, rights, acceptance criteria, actual cost, data retention and incident contact for one shadow pilot.
4. **Authenticated delivery:** enroll provider verification keys; bind signed receipts to exact job, operation, customer, artifact bytes and revision in the durable transaction; test replay/recovery.
5. **Preprod payments:** only after funded test-wallet custody, exact transaction review, idempotent single submission, restart/rollback reconciliation, delivery/closing tests and independent Plutus audit.
6. **Commercial gate:** validate buyer, process, procurement and fixed pilot economics before insurance integration, token rails, production trading or mainnet.

The current browser demo can explain these stages; it is not the private service or a live payment product. External setup is required for account entitlements, database access, customer consent, signer custody and audit. Do not remove disabled labels until each stage has its own retained evidence record.

## Primary technical references

- [Cardano transaction tutorial](https://docs.cardano.org/developer-resources/transaction-tutorials): transaction construction, signing and submission.
- [eUTxO explainer](https://docs.cardano.org/about-cardano/learn/eutxo-explainer): input/output model and concurrency implications.
- [Confirmation versus chain confirmation](https://docs.cardano.org/about-cardano/learn/chain-confirmation-versus-transaction-confirmation): depth is not equivalent to irreversible finality.
- [CIP-30](https://cips.cardano.org/cip/CIP-30): browser dApp wallet request boundary; MEW should not collect wallet secrets.
- [Cardano Foundation x402 facilitator](https://github.com/cardano-foundation/cardano-x402-facilitator): inspect exact deployed contract and security posture before use; facilitator submission is not an authorization or insurer decision.
- [ACORD P&C data standards](https://www-dev.acord.org/standards-architecture/acord-data-standards/Property_Casualty_Data_Standards) and [GRLC Generation 2.0](https://www-dev.acord.org/standards-architecture/ruschlikon/ruschlikon-news/2025/04/10/acord-launches-grlc-generation-2.0-data-standards-to-support-digitalization-throughout-global-%28re%29insurance-industry): potential partner mappings, not current MEW integrations.
