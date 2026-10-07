# MEW kinetic art direction

## Intent

An original physical metaphor: three fine paths surround one protected core inside a substantial shared boundary. The hero should feel like a designed object rather than a technology dashboard backdrop. Metallic violet ribs, soft mint glass and an architectural ground plane complement the existing paper/ink website. Existing adjacent copy explains the actual purchasing problem; the object is explicitly a concept illustration with no live activity.

The studio's composition critique chose one memorable hero object and retained clear control/caption placement. Do not add fake transaction trails, flashing “AI” particles, a custom cursor or continuous motion to every section. Decorative rotation never advances a request or implies blockchain activity. Original geometry and gradients use no copied 0G/template artwork.

## Motion spec

- Toroidal perimeter: 88 longitudinal segments × 12 sides, depth-sorted Canvas2D faces with directional highlights. Coarse-pointer devices use 56 × 8 faces. Three thin projected orbital paths and one stable core preserve the many-paths/one-boundary metaphor.
- Time advances only while motion is allowed. Slow perimeter rotation, a small orientation drift and restrained material highlights provide visible movement. Pausing freezes phase; resuming starts from the held phase rather than jumping by wall-clock time.
- Fine-pointer response stays within approximately seven degrees horizontally and five degrees vertically, with gradual interpolation. Pointer movement changes decorative orientation only. Touch/coarse pointers have no orientation tracking.
- Drawing is capped at 30 frames per second on fine-pointer devices and 24 on coarse devices. Device pixel ratio is capped at 1.8 and 1.35 respectively. Geometry and memory are bounded; these caps are design budgets, not measured device-performance guarantees.
- `figure.dataset.decision` is the only optional demo-state input. Only known enum values are accepted; the renderer never writes that field. Unknown/unavailable changes a restrained material tint without removing the protected core. No confirmation, release or request animation is generated.

## Implementation

Root integration loads `kinetic-art.css` after the homepage stylesheet and `kinetic-art.js` as an independent module script. It does not import artwork through the economic demo module, so optional artwork failure does not block the decision engine.

```html
<link rel="stylesheet" href="/kinetic-art.css">
<script type="module" src="/kinetic-art.js"></script>
```

`mountKineticArt(figure)` wraps the existing `.mandate-sculpture` SVG inside `.kinetic-stage` and adds an assistive-technology-hidden canvas. The SVG remains the intrinsic layout and accessible semantic fallback. `.is-rendered` is added only after a complete first draw succeeds. If canvas creation or painting fails, the original SVG is restored. Caption, figure label and Pause button remain outside the artwork stage.

The homepage must set `figure.dataset.motionReady = 'true'` only after its Pause listeners are wired. Without that marker the renderer draws one static frame and queues no animation. The renderer observes `class`, `data-decision` and `data-motion-ready`; Pause state remains the existing `.is-paused` primitive. No duplicate renderer mounts on the same figure.

The public API returns `{dispose, sync, resize}`. `pagehide` cancels the queued frame, disconnects mutation/intersection/resize observers, removes listeners and restores the SVG. `pageshow` can remount after back/forward-cache restoration. There are no network requests, telemetry, model calls, wallets or financial actions.

## Accessibility fallback

Animation requires all of: Pause control readiness, an unpaused figure, no reduced-motion preference, a visible document and an intersecting hero. Disabling any condition cancels the frame queue. Reduced motion still presents a fully drawn static object and the existing caption. Automatic looping has the adjacent working Pause control.

The canvas is decorative and receives `aria-hidden="true"`; the existing SVG label and figure caption remain available. Artwork interaction adds no focusable surface and does not consume keyboard/touch gestures. Rendering never hides headline, actions, demo results or other useful page content. Static fallback motion is owned by the homepage stylesheet and must also remain inactive until working Pause controls are available.

## QA checklist

`node --test tests/kinetic-art.test.mjs` passes four tests checking deterministic moving geometry and bounded coarse mesh; readiness/pause/reduced/hidden/offscreen cancellation; duplicate prevention/pagehide cleanup/back-forward remount; and failed canvas/paint fallback. Tests use explicit browser doubles and do not claim cross-browser or visual performance certification.

Rendered review is a separate required studio round: inspect the actual desktop and mobile hero, moving frames, paused frames and reduced-motion state. Check silhouette, caption legibility, object clipping, headline/art balance and rapid pause/resume. Profile a real or throttled browser for drawing cost and interaction responsiveness before claiming smooth performance. This document's source-code checks alone are insufficient proof of those outcomes.

## Reviewed skills and provenance

[skills.sh CSS Motion Systems](https://www.skills.sh/stolinski/motion-skills/css-motion-systems) led to the [pinned upstream procedure](https://github.com/stolinski/motion-skills/blob/aa804dc26c6d863a7c79cc1dfe8f2f6a4912b069/skills/css-motion-systems/SKILL.md). Its motion review checklist, token file, easing patterns and transition recipes were read. Applied principles are bounded, interruptible movement, reduced-motion alternatives and independent fallback. Canvas drawing is chosen for the user's explicit original-art request; ordinary UI layout is not animated. No View Transitions or runtime library is added by this module.

[skills.sh Interaction Design](https://www.skills.sh/wshobson/agents/interaction-design) led to [the pinned procedure](https://github.com/wshobson/agents/blob/46891e7e60da0e52baf1050b7b6391b64e84c6d9/plugins/ui-design/skills/interaction-design/SKILL.md). Its orientation, cleanup and progressive-enhancement guidance informed the lifecycle. No copied Framer Motion implementation or React dependency was adopted. Source revisions, hashes, license observations and boundaries are recorded in `research/design/kinetic-art-sources.json`; no installer was run.

Existing perp-design-studio, perp-jury-uiux, perp-evidence-design, perp-graphic-design and MEW engineering procedures supplied the two-round critique workflow and evidence boundaries. Their PerpParrot mascot/palette is not imposed on MEW. Repository changes, local visual observation and deployed behavior remain separate evidence classes.
