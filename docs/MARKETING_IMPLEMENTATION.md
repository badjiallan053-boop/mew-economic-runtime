# From clipping to an accountable marketing campaign

Clipping is production: reuse approved long-form material as short videos.
Advertising is distribution: choose an audience and fund placement of approved
assets. MEW's proposed value is connecting supplier work, its exact acceptance
and its commitments so agents cannot blindly buy the same job twice.

## Smallest real pilot

One consenting customer, one owned recording, five usable clips, one editor,
one revision allowance and one person accepting the exact files. Keep publishing
manual and invoices in the customer's existing process. Compare accepted assets,
actual production cost, elapsed time and human review effort with their existing
workflow. Customer adoption and improved sales remain hypotheses.

## Records and connections

| Record | Required binding | First connection | Current state |
| --- | --- | --- | --- |
| Campaign brief | Customer, source rights, audience, offer, scope, revision cap | Reviewed local brief | Planning/demo |
| Production job | Objective, equivalence key, supplier, immutable request ID, asset-specific quote | One editor, initially manual | Synthetic outline rehearsal |
| Artifact | Source, producer, clip/bundle ID, exact version and digest | Private object storage | Real media storage/adapter pending |
| Acceptance | Reviewer identity, exact artifact, criteria, decision | Authenticated review/receipt | Private receipt code prepared; hosted operation pending |
| Publication | Accepted version, account, post/ad ID, explicit authorization | Manual publishing first | Not connected |
| Measurement | Account/post/clip ID, metric definition, window, source and observation time | Read-only authorized exports first | Synthetic metrics only |
| Payment | Approved quote, asset, payer/payee, job, immutable transaction and observed lifecycle | Existing invoices for Web2; bounded Cardano preprod later | Live payments disabled |

A first export pipeline needs no autonomous publishing agent. Deduplicate exports
using account/post/metric/window identifiers, retain source and observation times,
and distinguish missing values from zero. Tie creative variants to file versions.
Do not use public datasets as proof of the customer's own campaign performance.

YouTube's official metric definitions distinguish watch time and engagement and
warn that views differ by report context:
https://developers.google.com/youtube/analytics/metrics . Attribution needs
customer-consented website/CRM event definitions and a disclosed baseline.
Tracked visits or signups alone do not prove incremental sales.

## Agent responsibilities

Planner proposes the brief. Producer supplies inspectable files and measured cost.
Reviewer accepts exact versions or identifies changes. Measurement reads bounded
observations and reports uncertainty. The trusted host governs commitments;
agents have no spending authority through their prompts. These are future
responsibilities, not a claim that four live model agents executed the demo.

Production, ad spend and creator-performance obligations must remain separate.
No prompt converts ADA, fiat or USDM or grants an ad-account scope. A future
performance fee needs a contract with metric definition, window/cutoff, caps,
disputes and authenticated evidence; views are not a payable invoice.

## Current examples

Homepage: one report, Alpha 1.50 ADA, Beta 1.40 ADA, limit 3 ADA. It isolates
quantity protection: both fit the budget, but the duplicate waits.

Campaign: one five-outline bundle, A 8 ADA, B 6 ADA, limit 10 ADA. This illustrates
both duplicate protection and budget pressure; it does not isolate either cause.
Rights are fixture approvals, 3,000 views are invented, acceptance concerns exact
outline bytes, settlement is synthetic. No video, ads or real payment occurred.
The campaign endpoint holds a shared demo state. Starting or advancing it affects
other demo visitors; the homepage simulation stays private to its browser.

## Roadmap

1. Rehearse synthetic failure paths and explain the result.
2. Run a consenting, rights-cleared, human-operated five-clip pilot and measure it.
3. Connect private identity/storage, durable receipt handling and read-only metrics;
   verify isolation, concurrency and recovery against the actual hosted backend.
4. Independently audit the payment contract and approve signer custody/funding;
   run preprod acceptance and cancellation lifecycle evidence before activation.

The prepared ADA escrow commits an artifact digest before funding. It is not a
complete pay-first commission for unknown future clips. For a new clipping job,
choose an explicit staged commercial contract or fund only once the accepted
artifact is known; changing this requires new contract design and audit. Existing
escrow does not govern ad spend, performance bonuses or tUSDM Masumi collection.
See PAYMENT_SYSTEM.md and PREPROD_PAYMENT_ACTIVATION.md.

The new host skill is `.agents/skills/mew-marketing-workflow/SKILL.md`. It adapts
GSD Core's outcome/phase verification and reviewed skills.sh interface guidance,
without installing upstream executables or changing runtime policy fingerprints.
