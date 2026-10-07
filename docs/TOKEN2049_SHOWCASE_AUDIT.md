# TOKEN2049 showcase acceptance review

## Final integration note from the lead

Browser navigation revealed a nonfatal cross-document view-transition exception in the existing workspace motion stylesheet. Removed its snapshot transition opt-in and opted the homepage out; retained ordinary link navigation, control micro-interactions and artwork motion. Repeated home → pilot → home navigation after the fix: both destinations rendered and the captured console received no additional error entries. Earlier errors remain in the session log; this does not claim the log was empty. The lead also inspected the final 375-pixel evidence layout, where labels and model-quality blockers remain readable.

Initial review: 8 October 2026, Asia/Singapore. Reviewer: multilingual red-team subagent, acting as an AI technical and evidence reviewer. This is not an external professional audit. Owned artifacts are this document and `features/token2049-showcase.feature`; no application changes are authorized by this review.

## Initial acceptance criteria

The opening screen should identify the purchasing problem, offer one clear path into the example, and visibly label its local simulation. A visitor must understand that an uncertain first purchase occupies the one-report mandate even when another offer fits the monetary ceiling. Show 1.50 ADA retained, Beta's 1.40 ADA quote and the 3.00 ADA ceiling with units and mode adjacent to the values. The quoted total is 2.90 ADA, not a budget breach.

The demo must call the actual MEW kernel with an ephemeral instance. No backend calls, wallet connection, analytics, browser persistence, private records or funds should be involved. Reset must create a fresh local instance, leaving other presenters and server records unaffected. Model output never authorizes money.

The evidence journey should proceed from example to protocol/evidence to a bounded pilot brief. Current local implementation, recorded experiments, hosted observations and proposed validation are different evidence classes. Public pages should provide usable explanations without relying solely on a private GitHub link. Do not imply that landing-page code proves the currently deployed version.

Use native controls, semantic headings, visible keyboard focus, a skip link, meaningful accessible names, and a polite live result announcement. Controls should meet a 44-pixel touch-target target. At 320 and 375 CSS pixels, navigation and the complete decision must remain readable without horizontal page scrolling. Reduced-motion users must receive a complete static experience; decorative graphics must not obscure evidence or convey state only through color. Rendered contrast, keyboard behavior and mobile geometry require actual inspection, not source assertions alone.

## Evidence and truth boundaries

- The specification's original accounting fixture uses a 1 ADA ceiling and 0.55/0.49 ADA offers. The showcase's 3 ADA, 1.50/1.40 ADA scenario is a separate illustrative fixture using the same kernel rule, not a reproduction of those original numeric inputs.
- Twelve valid model output formats do not establish twelve correct, grounded or language-appropriate answers. Grounding and language readiness remain blocked unless separately evidenced.
- No completed professional audit, funded preprod lifecycle, mainnet deployment, customer outcomes, financial savings or formal ecosystem partnership may be claimed.
- “Independent” agent review means separately tasked technical review; it does not mean an external audit firm or independent investment models.
- Existing `studio.html` is a shared persisted backend rehearsal. It must not be described as an ephemeral local simulation. Existing homepage health polling must not be carried into a showcase promising no API calls.

## Executed initial checks

Read SPEC.md, RESEARCH.md, existing homepage script, studio/protocol copy and the jury UI/UX and evidence-design skills at repository revision `11952a7d9955fcaf7ac7965a8c9c8ddccd65089e` (working changes may follow this review). Ran the actual kernel in a standalone ephemeral instance: Alpha ALLOW at 1,500,000 lovelace; simulated unknown outcome; Beta DEFER at 1,400,000 lovelace; exposure remains 1,500,000; one report remains occupied; no second effect is created. This check invoked no network, wallet, model or backend.

The Gherkin file records kernel-only execution separately from source review and browser observations. No Gherkin browser runner was executed.

## Second critique: homepage source and supplied captures

Read the new `public/home.html`, `home.css` and `home.js`. The controller imports the actual kernel, creates fresh in-memory state, verifies ALLOW and DEFER results and fails closed if loading or execution fails. Exposure and occupied quantity are read from the kernel. No API, persistence, analytics or wallet operations were found in the controller; the kernel import and local fonts remain normal static asset requests. All homepage internal document links and fragment IDs resolve in source, with no duplicate element IDs.

The lead reports observing the actual browser flow ALLOW → UNKNOWN → DEFER, 1.50 ADA held, one occupied report and payments disabled. This reviewer did not control that browser. Reviewed the lead-supplied desktop hero and demo screenshots in `.local/token2049-preview/`. Their exact capture time was not provided; review date is 8 October 2026, Asia/Singapore. The hero clearly separates the purchase problem from conceptual art, presents a primary decision CTA and visibly states payments disabled. The demo capture shows the correct under-budget deferral explanation and an explicit persisted-studio link. Its heading and mode badge were cropped after scrolling, so it cannot serve as standalone evidence of the demo mode; use a complete section capture after layout compaction.

Three actionable findings were sent to the author and lead:

1. The inherited global blue focus outline has only 2.59:1 contrast against the dark demo and 2.02:1 against the console. Use a light/mint focus outline inside that section; verify keyboard rendering afterward.
2. Whole-document 12/12 evidence coverage should be named expanded source-context coverage on agent-reviewed development cases. It is not fresh holdout accuracy or model answer correctness. Model format validity must remain adjacent to grounding/language activation blockers.
3. The compact conference layout and readable mobile proof column need recapture after the author's changes. Source shows a 44-pixel minimum restart target, compact short-desktop spacing and a single phone evidence column; rendered geometry has not been independently measured by this reviewer.

Reduced-motion CSS disables artwork animation and transitions; the pause control toggles animation state and announces its pressed state. The source review and supplied captures do not establish deployed-service version, paid operation or professional audit completion.

## Final verification and finding closure

All three second-critique corrections are resolved in the reviewed source and supplied final capture. The demo now uses a 3-pixel mint `#a3d9c9` keyboard outline. Coverage copy explicitly identifies agent-reviewed development cases, expanded source context and the distinction from answer quality or held-out retrieval accuracy. The final desktop demo capture in `.local/token2049-preview/desktop-demo-final.jpg` shows the entire heading, mode badge, controls, DEFER result and visible mint focus outline together; the cropped preliminary image should not be used as standalone evidence. Exact screenshot capture time remains unspecified.

The lead reports these manual browser checks, credited as lead-observed rather than independently executed by this reviewer:

- Keyboard Enter advances ALLOW → UNKNOWN → DEFER; Space on Restart restores READY, 0.00 ADA and 0/1 occupied capacity.
- Space on the pause control produces `aria-pressed=true` and the Resume label. Computed demo focus color is RGB 163/217/201.
- At 1280×720 the final demo section is 636.67 CSS pixels tall and its complete mode, heading and controls fit after scrolling.
- At 320×740 and 375×812, page `scrollWidth` equals `clientWidth`, with no horizontal page overflow. The lead inspected the 320-pixel hero and used Enter to open the native FAQ at 375 pixels.
- Pilot navigation reaches `pilot.html`; proof navigation reaches `protocol.html#evidence`, with accessibility state inspected by the lead.

Runtime OS reduced-motion emulation, actual screen-reader announcements, full focus-order coverage, browser zoom, network tracing and a Cucumber runner remain untested. No blanket 44-pixel pass is claimed for all controls. Local-source checks support absence of demo API/storage/wallet operations; they are not a captured network trace. No remaining material truth or safety defect was identified in this reviewed showcase scope, subject to those verification limits.
