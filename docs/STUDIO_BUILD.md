# Investor studio frontend and backend

The new /studio.html interface uses original white/ink/yellow design tokens adapted from the installed PerpParrot design studio, jury UX, graphic and evidence skills. Root authored the interface and backend; campaign_review provided two rounds of independent journey/evidence feedback. Root inspected browser rendering and exercised reservation, simulated settlement/unknown delivery and the deferred duplicate purchase. Review corrected scenario capture, mobile mandate visibility, accounting breakdown and stale recovery controls.

GET /api/studio is a read-only projection of existing SQLite rehearsal state, with exact core position, response observation time and paymentsEnabled:false. It rejects live mode. Existing reset/advance endpoints preserve checkpoint concurrency contracts. No private operator routes, model credentials or wallets are exposed. The page is served by the current Node backend; standalone dist needs that backend for interactive actions. Shared simulation state requires presenter coordination.

Public references inspected: https://github.com/NebeyouMusie/Dashboard-Template (Lovable-generated dashboard structure) and https://github.com/lovablelabs/lovable-cursor-plugin (official Cursor integration). No source code, external assets or dependencies copied. No Lovable account, paid plan, MCP connection or repository access was enabled. Free public reference access does not establish a free hosted backend plan.

Open MEW.code-workspace in Cursor. Cursor exists at /Applications/Cursor.app, but native desktop control returned “Computer Use permissions are not granted”; opening the workspace in Cursor was not verified. The project source is already on disk; no separate upload is needed. Run npm start and visit /studio.html, or use the separately running local preview on port3042. Git publication does not update Railway's pinned release.

## Signalverse adaptation

Adapted the user-supplied local Signalverse design at http://127.0.0.1:8947/PerpParrot-App/dist/index.html?tab=sources#signalverse . Original parrot-flight.png was reused from /Users/arslane/Documents/Codex/2026-10-07/the-file-marven-design-symphony-ultimate/outputs/PerpParrot-App/public/assets/parrot-flight.png as public/assets/mew-formation.png. Artwork is decorative; no trading code, source weights, external trackers or wallet connectors were copied. MEW role selection changes explanations only. The existing backend state and admission rules remain authoritative.

Root and campaign_review completed a second storyboard/file review cycle for this adaptation. Root verified actual browser rendering, role selection, Evidence tab and unchanged checkpoint state. Reviewer requested a finite animation; artwork now stops after four seconds and is disabled under reduced motion. Decision/Evidence/Pilot tabs support arrows, Home and End. This is a local/GitHub frontend update, not a Railway deployment.
