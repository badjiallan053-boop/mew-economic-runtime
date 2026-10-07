# MEW Growth Treasury: bounded clip-production pilot

This is a customer hypothesis and a simulation workflow, not an operating ad
agency. The recovered Growth Treasury proposal concerned AI and human clippers,
creator revenue, distribution campaigns and shared unresolved liabilities.
Its useful principle is retained without copying its earlier Solana rail design:
several agents must not independently promise the same campaign capacity.

## First offer and value test

Offer one narrow pilot: turn one customer-owned webinar or podcast into five
approved promotional clips with a fixed production budget and revision allowance.
Clip count is a proposed commercial offer, not a claim about generated assets.
Avoid performance-based payouts and automated publishing in the first pilot.

Interview an authorized marketing owner about current editing/review time,
revision cost and abandoned assets. Produce a sample only from approved media.
Measure accepted clips, human correction effort, elapsed time, observed cost and
repeat intent. Compare against the customer's existing process. No interviews,
outreach, actual clipping or commercial validation are established by this SOP.

## Interacting company responsibilities

| Owner | Input and bounded output | Consumer |
| --- | --- | --- |
| Chief of staff / acceptance specialist | Customer brief, fixed scope, revision cap and evidence requirements | Research and procurement |
| Knowledge / source-check specialists | Source identity, recorded permissions and missing provenance | Both independent reviewers |
| Research | Audience/offer hypotheses, source-backed claims and creative constraints | Engineering and communications |
| Procurement / quote-binding specialist | Supplier identity, exact deliverable, asset, quote, fees and retry identity | Deterministic admission host |
| Risk / authority specialist | Frozen rights, mandate and source evidence; eligibility advice | Delivery and host |
| Red team / substitution specialist | Same frozen evidence; hostile text, swapped artifact and replay challenges | Delivery and host |
| Engineering / contracts specialist | Adapter and versioned artifact contract proposal | QA |
| QA / adversarial and recovery specialists | Actual validation evidence and unknown failure paths | Delivery and operations |
| Delivery / criteria and attribution specialists | Exact artifact version/digest against approved brief | Authorized customer/operator |
| Finance / exposure specialist | Integer-lovelace commitments and unresolved liabilities | Host and campaign owner |
| Operations / reconciliation specialist | Pending operation inspection and recovery plan | Authorized operator |
| Communications / claims specialist | Accepted source-backed copy and honest simulation/live labels | Customer review |

These are ownership assignments, not proof that each model ran. Dependency
handoffs let roles use prior evidence; reviewers remain independent until the
downstream gate. Run only task-relevant specialists, rather than requiring every
role to exchange every output. Shared context can spread injection, increase
cost and erase independent review.

## Campaign SOP and acceptance gates

1. Record customer and permitted external actions. Freeze audience, offer,
   deliverables, channels, timeline, budget and revision bounds.
2. Record source ownership and scope of music/likeness/brand permissions. Missing
   rights block production/publication readiness. Paid-ad rights are distinct
   from permission to post organically; the system does not adjudicate rights.
3. Obtain a bound supplier quote. Route any future real external commitment
   through economic admission before dispatch, using one immutable effect ID.
4. Collect a versioned artifact; bind ID, source, producer, bytes digest and review
   evidence. Replacing a file after approval cannot inherit that approval.
5. Run independent risk/red-team review of frozen evidence. Check actual media
   only when available; an advisory JSON result cannot establish visual quality.
6. Customer/operator accepts the exact artifact or requests a bounded revision.
   Revisions outside the agreed allowance require a separately approved mandate.
7. Publishing and paid distribution require their own authorization and adapters.
   No campaign design grants permission to access an account or launch an ad.
8. Collect read-only metrics. Keep window-open observations provisional. For any
   future performance contract, window and dispute closure are necessary but not
   sufficient: authenticated evidence and the agreed contract decide liability.
9. Reconcile payment separately from delivery. Unknown evidence retains exposure.
   Document unresolved work and next owner before closing the campaign.

## Economic rehearsal

Use ADA-only synthetic fixtures: commitment A = 8,000,000 lovelace, B = 6,000,000,
campaign ceiling = 10,000,000. The objective quantity is one five-outline bundle.
A can consume its capacity; equivalent bundle B receives DEFER because A is
already unresolved. Their combined exposure would also be 14,000,000, beyond
the ceiling. These figures are accounting examples, not
quotes, pricing guidance or funded transactions.

Observed views do not authorize releasing A's reservation. A maximum obligation
may remain unresolved even when current performance is low. Payment settlement
also does not establish acceptable content. The current kernel governs its one
objective/currency contract; creating unrelated semantic keys is a trusted
configuration boundary and cannot prove a shared campaign budget is enforced.

USDM escrow, fiat advertising spend and performance compensation are future,
separate typed ledgers/contracts. They must never be converted into existing
lovelace balances by a prompt. Fees, revisions and disputes must fit approved
capacity. Cardano evidence adapters are read-only; no signer or campaign payout
implementation follows from this rehearsal.

The implemented fixture boundary is `src/demo/campaign.mjs`: `createCampaign()`
starts a private simulation snapshot and `advanceCampaign()` requires the expected
campaign ID and stage to advance it. The server persists its fixture snapshot
atomically in a separate SQLite `campaign` table, apart from the economic state
table. `GET /api/campaign` reads or initializes the shared demo snapshot;
`POST /api/campaign/reset` starts the selected scenario;
`POST /api/campaign/advance` requires `expectedCampaignId` and `expectedStage`.
Stale campaign IDs or stages are rejected rather than advancing replaced work.
These routes are disabled in live mode. This is one shared demo campaign, not a
multi-customer campaign store or a live dispatch journal. The `happy`,
`missing-rights` and `early-metrics` scenarios demonstrate independent frozen
reviews, deferral of the
competing commitment, missing-rights abstention, provisional analytics, exact
synthetic artifact acceptance and separate synthetic settlement. The artifact
contains fixture bytes; `mediaProduced` is false. No actual clips, views,
customer acceptance, supplier action or chain transaction occur.

## Missing integrations before a customer pilot

- Access-controlled source-media/artifact storage, retention and deletion rules.
- Versioned artifact catalog with authenticated producer/customer review records.
- One clipping/editor adapter with actual output inspection and cost metering.
- Customer identity, mission ownership, review interface and support owner.
- Read-only analytics with fixed account/metric/window bindings.
- Bound quote/dispatch/reconciliation and recourse policy before any paid job.
- A baseline experiment proving less review effort or more accepted usable assets.

The original local skills `campaign-acceptance` and `campaign-measurement` encode
these procedures. They are available to host planning and review; the fixture
does not inject them into provider contexts or call any model. They are not
third-party installs or authority grants. Future provider activation must be
explicit and part of a frozen mission policy; older mission policies must not
be silently reinterpreted when skill text changes.
