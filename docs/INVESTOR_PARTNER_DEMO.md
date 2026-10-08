# MEW investor and ecosystem-partner demo

Prepared 7 October 2026. Evidence baseline: c9f0e8c, 146 tests passed and build succeeded. Hosted demo remains a separately pinned simulation release; private-host code is not deployed. Verify hosted health immediately before presenting. These dates are evidence timestamps, not customer traction.

## Positioning

MEW is a prototype economic control layer for agent workflows. It reserves a principal's budget and deliverable capacity before an action, prevents duplicate authorization under the same mandate and preserves unresolved exposure after timeout or restart. Advisory agents propose and review work; deterministic code decides admission. The first commercial hypothesis is paid content-production workflows, where multiple specialists can otherwise procure overlapping deliverables.

Suggested opening: “When several agents work on one customer request, a timeout can make the same job look available to buy again. MEW keeps one durable mandate across those actions. Here is the duplicate purchase it rejects, and the exposure it preserves until evidence resolves the original job.” This is a synthetic demonstration of a tested mechanism, not measured customer savings.

## Four-minute walkthrough

| Time | Show | Explain | Evidence boundary |
| --- | --- | --- | --- |
| 0:00–0:30 | One report, one budget | The customer mandate defines both quantity and money | Illustrative objective, not a customer contract |
| 0:30–1:45 | /rehearsal.html timeout scenario; advance visible stages | First admission reserves capacity; timeout leaves the job unresolved; a second equivalent purchase is blocked/deferred | Hosted synthetic workflow, payments disabled |
| 1:45–2:30 | Journal and exposure | The system records why another purchase cannot proceed | SQLite checkpoint persistence; do not claim a new restart experiment without running one |
| 2:30–3:15 | /company.html compact roles; /research.html | Evidence, proposal and independent reviews feed a bounded decision process | Synthetic advisory execution; ecosystem data is context, not demand evidence |
| 3:15–4:00 | One pilot proposal and evidence gates | Ask the partner to help prove one real end-to-end job | Future milestone, not an achieved integration |

Hosted entry: https://mew-demo-production.up.railway.app/rehearsal.html . Rehearse the scenario in advance, use only synthetic demo records and keep the simulation labels visible. Reset/advance changes shared demonstration state; coordinate with other presenters. Fallback: run npm run demo:rehearse and npm run durable:rehearse locally. The durable CLI demonstrates reopen/UNKNOWN and signed synthetic delivery; its ephemeral key is not merchant enrollment. Save sanitized output or a recording clearly labelled local fixture if connectivity is unreliable.

## Six-slide narrative

1. Operational problem: parallel agent work and uncertain outcomes can create overlapping purchases. Present this as a hypothesis to validate, not a quantified industry loss.
2. Product proof: one mandate, reservation before action, rejected duplicate authorization, durable unresolved exposure.
3. Integration: customer mandate → advisory proposal → deterministic admission → provider operation → separately verified delivery and settlement. Live dispatch is not implemented.
4. Beachhead: one consenting content team, one licensed source asset, five actual clips, agreed acceptance rubric. Current outlines are synthetic and no video-generation provider is integrated.
5. Evidence: 146 scenario tests and successful build at the baseline; hosted simulation; local private authentication and recovery foundations. No revenue, live model evaluation or confirmed payment claimed.
6. Ask: one design partner, one rail-integration reviewer and a scoped pilot milestone. Investment amount and runway require an actual staffing/cost plan; do not invent them.

## Audience-specific asks

| Audience | Why the conversation fits | Concrete proposed ask | Success evidence |
| --- | --- | --- | --- |
| Content agency or creator operations team | Revisions, vendor handoffs and duplicate orders offer a concrete workflow | One consenting pilot owner, rights-cleared asset and acceptance rubric | Five real accepted artifacts, revision count, billed cost per accepted artifact and elapsed time |
| Masumi/Sokosumi maintainers or ecosystem builders | Their job/payment lifecycle is relevant to the planned provider boundary | Review exact deployed API, merchant key enrollment and reconciliation design; introductions to one preprod merchant | One authenticated external job with stable IDs and independently verified receipt |
| Cardano/x402 implementers | Payment verification can feed MEW's mandate-level accounting | Review exact network/asset/amount semantics and a bounded preprod proof | Verified collection, separate delivery evidence and restart without duplicate spend |
| Early-stage infrastructure investor | The demonstrable mechanism supports a testable infrastructure thesis | Feedback on buyer pain and introductions to two qualified design partners | A real pilot plus willingness-to-pay evidence before forecasting revenue |

These are prospective counterparties, not existing partnerships. No outreach is sent by this package. Pilot metrics are proposed; no time-saving, ROI or demand result has been measured. Price testing should compare a managed pilot fee and a later infrastructure subscription hypothesis; do not publish invented pricing or market size.

## GitHub context and integration boundaries

The official Cardano facilitator README describes verification/settlement of already signed transactions and explicitly distinguishes current offline compatibility testing from older preprod evidence: https://github.com/cardano-foundation/cardano-x402-facilitator . Inference: MEW can complement that boundary by governing the customer's aggregate mandate and separately checking delivery. This is a proposed complement, not an integration or endorsement. A facilitator acknowledgment alone cannot establish customer acceptance.

Official Masumi demo source: https://github.com/masumi-network/demo-agent-token2049 . Existing MEW research inspected its live-demo-name-finder branch at ff35ea7 for pending stages, Task and seller-collection flow; see LIVE_DEPLOYMENT.md. It is implementation context, not proof our worker exists. The official docs hub links the immutable payment API specification: https://www.masumi.network/dev/agents ; see MASUMI_CONTRACT_PIN.md for our exact pin and deployed-version mismatch caveat.

skills.sh positioning-basics listing: https://www.skills.sh/brianrwagner/ai-marketing-claude-code-skills/positioning-basics . Its listing suggests audience-specific messaging modes. Full upstream file retrieval was unavailable. Added an original local partner-demo procedure rather than treating a remote package as trusted runtime instructions; no external installer ran and compact mission fingerprints are unchanged.

## Questions investors will ask

“Is it live?” The public simulation is hosted. Private authorization and recovery libraries are tested locally. Models, remote job dispatch and payments remain unconfigured or unimplemented.

“What is defensible?” The implemented contract enforces admission invariants and binds durable evidence. That is demonstrable differentiation, not a moat claim. Customer adoption, provider integrations and comparative reliability must establish commercial defensibility.

“Why Cardano?” It is the selected preprod payment ecosystem with inspected Masumi/x402 interfaces. We have not proven it is cheaper or superior to other rails. Native-token accounting remains a required engineering gate.

“What does MEW not cover?” Actions bypassing MEW, malicious mandate definitions, multiple independently provisioned ledgers, compromised operators and upstream chain/data failures exceed the demonstrated guarantees. Customer rights and consent need independent evidence.

“What happens next?” Real model evaluation with explicit spend approval; actual customer artifacts; authenticated provider delivery; then a scoped preprod payment lifecycle. See NEXT_PILOT.md. None requires adding more advisory agents.
