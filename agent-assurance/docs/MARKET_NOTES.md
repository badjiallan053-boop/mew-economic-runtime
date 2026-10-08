# Market notes and claims to avoid

Desk research, 8 October 2026. Mostly secondary sources; only aiuc-1.com was fetched as a primary page. Treat as leads, not facts.

| Area | What appears to exist | Implication |
| --- | --- | --- |
| Agent certification | AIUC-1 standard (Accountability covers logging and incident response; Reliability covers tool calls); third-party audit; accredited auditor reported Feb 2026 | Evidence exports should be mappable to its controls. Read the actual catalogue before citing control IDs |
| Agent liability cover | Armilla with Chaucer/Lloyd's (limits reported up to $25M), Munich Re aiSure, HSB small-business cover, others | Underwriting is bespoke; no public agent-evidence schema found |
| Transaction-layer proofs | Google AP2 signed mandates, Visa Trusted Agent Protocol, Mastercard Agent Pay (reported), Stripe/OpenAI ACP, Coinbase x402 | Mandate evidence already exists per protocol; this layer should ingest, not replace, it |
| DeFi cover | Nexus Mutual terms exclude several key-compromise categories | No agent-execution cover found |
| Receipts standards | IETF individual drafts for signed agent action receipts | Candidate export format; not adopted standards |

**Gap (absence of evidence only):** no product found that joins mandate evidence, pre-spend reservation state and settlement evidence in one minimized, purpose-bound case exported to insurers or brokers without making underwriting claims. Searches were limited and US-centric.

**Do not claim:** "no existing product" or "first"; that any insurer accepts or requires this format; premium reduction or insurability; AIUC-1 compliance without a control mapping; Lloyd's, Armilla or Munich Re as partners; that AP2/Visa/Mastercard evidence is integrated; any testnet or mainnet transaction without retained verified evidence.

Fields reportedly wanted (unverified tracker attributing to AIUC-1): run/session ID, agent ID and version, initiating principal, timestamps, termination state; tool name/version, parameters/results, scope-violation alerts; delegation and approval events; incident plan. Confirm against standard.aiuc-1.com.
