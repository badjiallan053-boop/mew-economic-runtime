# MEW website and internal studio

The website now has a product homepage and linked decision, company, evidence, clip and internal design workspaces. Root authored backend/studio/navigation and coordinated two reviewers: campaign_engineer authored homepage files; campaign_review challenged journey and evidence boundaries. Existing compact company policy fingerprints, economic schemas and payment authority are unchanged.

The shared presentation catalog in `public/workflow-context.js` keeps the report
and five-outline examples consistent across Understand → Try → Verify → Plan.
Only a validated `workflow=report|clips` selector crosses links; customer brief
text and economic state do not. Report and campaign simulations retain their
own fixed data. The homepage decision remains private to its tab, while campaign
and studio rehearsal records remain shared. The evidence explainer now begins
with a three-step diagram, shows which quantities belong to each example, and
places accounting names and implementation layers in optional details. All
financial API, company policy, and payment contracts remain unchanged.

The homepage is served at / and /home.html; the original economic demo remains /ledger.html. Navigation across company, research, campaign, rehearsal and presentation shares a shell. The decision studio now uses that same shell so the visitor does not switch navigation systems midway through the demo. The original report/clip workflows and research provenance remain intact.

## Internal design engineering

/design-studio.html links from the company workspace. It offers a bounded demonstration brief, five deterministic critique lanes, revision and a saved record. GET/POST /api/design-studio operates only in demo mode, using the existing demo request quota and mutation-origin/content-type protections. Latest brief is a singleton SQLite record separate from runtime economic state; it replaces its predecessor, not a complete historical audit trail. Maximum row is 16 KiB. Inputs are exact and bounded; expectedRevision serializes edits, stale saves reject. No models, external transmission, publication or new runtime permissions are introduced.

The shared demo can be read/edited by other presenters. Never submit private customer information, credentials or confidential plans. This is a demonstration surface, not an authenticated production design-project service. Evidence-class selection is a user label, not verified proof. Rule checks and text matching need human review and cannot approve production.

Tests cover persistence after reopen, stale revision, bounded input, extra authority rejection and unchanged economic state. Browser checks exercised a saved brief and its five visible critique records. Root inspected local rendering; server and source publication are distinct from Railway deployment.

## Source and design provenance

User-supplied Signalverse artwork and design direction remain the identity basis. Local PerpParrot design studio, graphic, jury UX and evidence procedures informed two review rounds.

Reviewed https://www.skills.sh/anthropics/skills/frontend-design and actual upstream https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md for intentional hierarchy and restrained interactions. Reviewed https://raw.githubusercontent.com/vercel-labs/agent-skills/main/skills/web-design-guidelines/SKILL.md for review workflow. These mutable source references are contextual guidance, not pinned executable dependencies or proof of improvement. Added an original local company-design-studio procedure; no installer or third-party source code copied.

For the shared cream-and-motion system, reviewed the
[Vercel Web Interface Guidelines repository](https://github.com/vercel-labs/web-interface-guidelines)
for reduced-motion behavior, visible focus, and motion limited to clear causes;
and the [shadcn/ui theming guide](https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/%28root%29/theming.mdx)
for semantic surface/foreground tokens rather than blanket color overrides.
MEW keeps its existing dependency-free HTML/CSS and adapts these patterns to its
own components. No React component library or copied third-party code was added.

## Current limits

Real model critique, automated website generation, private customer accounts, remote job dispatch and payments are still pending. The studio demonstrates accountable human-assisted design work; it is not an autonomous deployed engineering workforce. Git pushes do not change Railway's pinned release.

## 8 October: repository-led page coherence pass

The primary Understand → Try → Verify → Plan route now uses one generated
navigation across the homepage, knowledge library, demo, evidence explainer,
marketing workflow and pilot planner. Its validated `workflow=report|clips`
selector keeps sample labels and links aligned; it does not share or alter
financial state. The Verify page now compresses its spacing and type hierarchy
around the three-step decision diagram, preserving technical accounting and
payment details as disclosures. The shared cream theme uses semantic
surface/foreground tokens, role-specific buttons and reduced-motion handling.

Design references were the [Vercel Web Interface Guidelines repository](https://github.com/vercel-labs/web-interface-guidelines)
(focus, motion and semantic interaction patterns), the [shadcn/ui theming guide](https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/%28root%29/theming.mdx)
(semantic surface and foreground tokens), and the current [GSD phase-loop guide](https://github.com/open-gsd/gsd-core/blob/main/docs/explanation/the-phase-loop.md)
(define acceptance, inspect, verify). These references informed original
vanilla HTML/CSS/JS rather than adding a framework or copying components.

Verification: visual browser review at the available 1280px viewport confirmed
the report and clipping paths, shared nav, diagram, CTA labels and simulation
boundaries. Workflow and theme tests passed, all 414 project tests passed, and
the static build succeeded. The browser viewport tool did not apply a requested
375px override (the page stayed at 1280px), so this pass does not claim a fresh
mobile visual inspection. CSS retains the responsive breakpoints and reduced
motion behavior; those are not substitutes for that device check.
