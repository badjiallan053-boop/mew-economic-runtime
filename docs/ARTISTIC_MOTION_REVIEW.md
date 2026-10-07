# Artistic motion review

Review date: 8 October 2026, Asia/Singapore. Initial source baseline: `991144bdb8328994133de66582511c7a948ed453`. This is an independent source/design review. Browser operation belongs to the coordinating agent; no rendering, frame-rate measurement or external accessibility certification is claimed here.

Applied installed guidance: `perp-jury-uiux` and `perp-evidence-design`. Their relevant principles are deliberate headline → graphic → evidence-label scan order, clear next actions, adjacent interpretation-changing qualifications, and separation of current source, rendered observations, fixtures and future validation. External skills are research references, not permission to install code.

## Round 1: three consequential issues

1. **The sculpture moves without explaining the decision.** The existing stack translates and the orbit changes opacity (`public/home.css:277–293`); three named agents are static labels (`public/home.html:253–256`). The image is attractive but the central product rule requires reading the demo. Give three paths different silhouettes/directions, one fixed capacity chamber, and a retained Alpha marker. UNKNOWN leaves this marker held; DEFER stops Beta at the boundary. A decorative third path must not look like a third admitted purchase. State changes must follow the real kernel's render path (`public/home.js:111–145`), never an autonomous timer.

2. **The qualifications are too visually subordinate for a public hero.** The figure header, legend and state caption use 9–10px sizes (`public/home.css:224–263`). Keep “Concept illustration” and “local simulation / no live activity” legible and next to the art, including mobile crops. Recommend 12px minimum for the qualifier, natural wrapping, and no cropping of the pause control or caption. This is a legibility recommendation, not a claimed WCAG font-size requirement.

3. **Motion currently depends on JavaScript to become pausable.** Infinite CSS motion starts by default (`public/home.css:277–293`), while the pause handler is attached by the home module (`public/home.js:30–33`). With JavaScript disabled or module initialization unavailable, motion continues and the pause control does nothing. New art should render a complete static SVG/poster first and opt into motion only after successful initialization; failed canvas context or failed import must retain the static composition and truthful caption.

The current home already has useful controls: manual pause, reduced-motion changes, visibility changes and intersection gating (`public/home.js:13–46`); demo feedback is announced through a status region (`public/home.html:418–435`). Preserve them.

## Practical storyboard

| Moment | Visible art | Evidence and next action |
| --- | --- | --- |
| READY | Separate agent paths surround one unoccupied boundary; complete static composition available | Concept illustration; reserve the first report |
| ALLOW | Alpha occupies the single chamber; short directed emphasis | Actual local kernel reservation: 1.50 ADA, one report; observe timeout |
| UNKNOWN | Alpha stays in place; restrained uncertainty texture, no removal or second traversal | Outcome unknown; commitment retained; try equivalent report |
| DEFER | Beta ends outside the occupied boundary; Alpha remains | Local kernel deferred equivalent request; reconcile original commitment |
| Reduced/paused/failure | Same state and labels remain understandable without movement | No lost information or blocked action |

Use one easing family and a small set of durations. Art may breathe slowly; feedback should be brief and finite. Avoid large blur shaders or scrolling parallax behind reading text. Do not render model calls, blockchain confirmations or wallets as active nodes.

## Round 2 acceptance checks

Pending revised code and coordinator screenshots. Check actual desktop/mobile crops, keyboard focus and control size, readable mode labels, reduced-motion state changes, manual pause/resume and no-JavaScript fallback. Inspect requestAnimationFrame cancellation, hidden/offscreen gating, capped device-pixel ratio, bounded particles/segments, resize scheduling and teardown/BFCache restoration. Screenshots can establish layout, not loop suspension or frame rate.

### Revised source observations before integration

The new `public/kinetic-art.js` provides bounded 56×8 or 88×12 geometry, 1.35/1.8 DPR caps, a single guarded RAF handle, hidden/offscreen/reduced/manual gates, observer/listener disposal and BFCache remount (`public/kinetic-art.js:17,108–158,161–165`). Its canvas is decorative and hidden from accessibility APIs while the existing SVG/caption remains the semantic fallback (`public/kinetic-art.js:98–104`; `public/kinetic-art.css:24–27`). These are source-established controls, not measured rendering performance. About 1,056 desktop quads plus projection/sorting per draw deserves a foreground mobile/desktop observation before describing it as smooth.

Reported integration concerns: the existing SVG's description must match the enhanced torus/core composition; no-JS and failed-context paths still need the old CSS's infinite float animation gated by root integration. A fixed decorative core is permissible if labeled as concept artwork; it should not be called a measured held-capacity indicator when no such geometry is drawn.

The new `public/experience-motion.js` retains visible static content and uses finite WAAPI entrances; pointer writes are scheduled once per frame and listeners/animations are released on destroy. A concrete issue was sent to the coordinator: `pagehide` calls destroy (`public/experience-motion.js:117–125`), but its initial version only auto-mounts once (`public/experience-motion.js:133`), leaving BFCache restoration without enhancements. Add idempotent pageshow remount. Its reading indicator initially queues updates regardless of `allowed()` (`public/experience-motion.js:44–46`): either explicitly exempt this non-animated positional indicator from manual pause or gate/hide it consistently. Neither issue was changed by this reviewer.

### Integrated desktop review

Coordinator capture inspected: `/private/tmp/mew-art-desktop.jpg`, 805×827 pixels. Capture date supplied by this review session: 8 October 2026; exact capture clock time was not provided. No application run timestamp or live-agent activity is inferred from this image.

Observed: the headline, explanation and violet CTA form a clear scan order; orbit art fits its right column without text collision; “Interactive prototype · models and payments disabled” and “Concept illustration · no live activity” remain visible. No consequential screenshot-established layout defect at this viewport. This static image cannot establish the quality of motion, effective pause, frame rate, focus movement or screen-reader output.

Integrated source recheck confirms the old infinite SVG animation is removed, caption sizes improved, the Pause button begins disabled, a motion-ready attribute gates animation, and the SVG alternative accurately describes orbital paths/violet boundary/mint core. Experience motion now has a persisted-pageshow remount. Reading progress remains an immediate scroll-position display: it does not run autonomously, although it can update after direct scrolling during manual/reduced pause. Mobile crops and shared disclosure navigation remain pending coordinator captures; runtime lifecycle counters and assistive-technology checks have not been executed by this reviewer.

### Mobile render and final disposition

Coordinator capture inspected: `/private/tmp/mew-art-mobile.jpg`, 390×7448 pixels, full page. The initial preview was automatically resized; the original-detail view was also inspected. The hero becomes one column; headline, CTA, art, pause and qualifiers remain in reading order. The legend wraps naturally, demo controls remain visible, the console keeps its units/ceiling/disabled-payment explanation, and the proof cards preserve their development/model/unsigned-rehearsal labels. No observed horizontal clipping or consequential layout defect in this capture. The coordinator separately reports no browser overflow at 390px; that report is not an independently executed measurement.

Final disposition: the original fallback/pause defect and caption readability concern have been addressed in source. The artistic result uses a coherent orbital sculpture rather than the recommended literal capacity storyboard; its concept/no-live labeling makes that choice truthful, with the actual accounting lesson still in the kernel-driven demo. No additional required art/layout correction is established by the two inspected screenshots. The BFCache remount concern is addressed in revised source. Shared-menu Escape focus restoration was reported by the coordinator, with a narrow-viewport repeat still pending at the time of this review.

Limits: this reviewer did not operate a browser, simulate keyboard/screen-reader access, measure contrast from rendered pixels, run animation lifecycle tests, capture performance traces, measure frame rates, or verify external WCAG certification. Lifecycle, reduced-motion and sizing controls above are source observations. Repository tests and coordinator behavior results should be reported separately with their actual outcomes.

### Shared-menu correction reported after mobile review

The coordinator's actual 390px shared-navigation interaction found a menu left edge of −66px: the summary wrapped left while its popover stayed right-aligned. This did not appear in the home capture, which has different navigation, and was not established by the initial source-only overflow concern. The coordinator changed the mobile rule in `public/journey.css:1` to `left:0; right:auto` with a viewport-constrained width; this reviewer inspected that source correction. Rendered readback is still pending, so the fix is not claimed verified here. The coordinator reports 286 full-suite tests passing; this reviewer did not run that suite.

Meaningful behavior checks: freeze/resume counters under pause/visibility/intersection; only one scheduled RAF after repeated resume; no growth in canvas/observer counts across lifecycle cycles; same ALLOW → UNKNOWN → DEFER amounts/capacity with motion enabled and disabled; failed graphics initialization preserves a usable demo. Do not replace these with CSS-string snapshot tests.

Shared-site rendering risk to inspect: `.site-nav` has horizontal overflow (`public/site-shell.css:2`) while a disclosure menu is its child (`public/site-shell.js:6`). A menu extending vertically may be clipped by its scroll container. Verify at narrow widths before claiming the shared navigation is accessible.

## Research references

[Emil Kowalski Motion Follow-Up](https://www.skills.sh/nexu-io/open-design/emilkowalski-motion): state/hierarchy should determine the limited set of effects; prefer transform/opacity, coherent easing and reduced-motion alternatives.

[Optimize Web Animations](https://www.skills.sh/akillness/jeo-skills/optimize-web-animations): use lifecycle and offscreen-work evidence rather than screenshots alone; release long-lived animation resources. Its prescribed browser work is reserved for the coordinator in this task.

[Fixing Motion Performance](https://www.skills.sh/ibelick/ui-skills/fixing-motion-performance): review concrete source snippets, batch reads before writes and retain the current animation stack. No dependency installation is needed for this review.
