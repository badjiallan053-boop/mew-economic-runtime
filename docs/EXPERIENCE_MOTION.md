# MEW shared experience motion

Reviewed 8 October 2026. This finishing layer gives the homepage and linked
workspaces one movement vocabulary while preserving native documents and the
existing decision engine. It makes no network calls, saves no preferences and
changes no economic or model state.

The source review found four experience gaps: static homepage arrival beside
independently looping art; scattered entrances across workspaces; generic
button hover feedback; and selected chapters without consistent visual emphasis.
The storyboard fixes these with a brief reading-order introduction, finite
section/card entrances, tactile action feedback and a small reading-position
line. Evidence labels and prototype boundaries stay visible; numbers never
count up or imply live activity.

## Motion specification

| Moment                | Treatment                                                                        | Trigger and limit                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| First read            | Eyebrow, headline, lead and actions enter in order; sculpture settles separately | Once per mounted document, 660 ms text / 840 ms sculpture, at most 280 ms stagger, 14–20 px travel, opacity starts at 0.72 |
| Supporting chapter    | Headings and existing cards enter into their ordinary position                   | IntersectionObserver, once per element, 600 ms, at most 195 ms sibling stagger, 18 px travel                               |
| Primary action        | Small lift, shadow and a single sheen traversal                                  | Fine pointer hover only; 180–340 ms; no repeating keyframe                                                                 |
| Link arrow            | Small directional movement                                                       | Fine pointer hover only, 200 ms; native link behavior unchanged                                                            |
| Card inspection       | Radial surface sheen follows the last pointer position                           | Fine pointer only, one queued frame per pointer burst; reset on departure/pause                                            |
| Selected chapter/step | Thin inset accent                                                                | Actual aria-current, aria-selected or current-step attributes; no invented progression                                     |
| Reading position      | Two-pixel line at the top of the viewport                                        | Actual scroll position, coalesced event-driven update; no interpolation, metric, network activity or completion claim      |

One decelerating curve, `cubic-bezier(.16,1,.3,1)`, ties the elements together.
No scroll hijacking, router interception, magnetic controls, mouse-driven content
tilt, delayed actions, external animation dependencies or continuous frame loop
was added. Intersection entrances do not observe/animate the existing
checkpoint fields or rewrite their state. The older `motion.js` continues to
handle real checkpoint/panel feedback; this module targets introductory headings
and cards rather than those existing result selectors.

## Integration boundary

The layer consists of `public/experience-motion.js` and
`public/experience-motion.css`. Load the CSS after each page's existing style and
load the JavaScript as a module after the document is parsed. The module can be
imported by the shared shell with error isolation. Its exports
`enhanceExperience({document, window})` and `mountExperience(...)` make lifecycle
behavior testable without a browser or live backend. They return an idempotent
`destroy()` method; the ordinary module entry automatically mounts once.

Homepage art remains responsible for its own animation and pause control. After
its handlers are ready, the host marks `figure.dataset.motionReady="true"` and
dispatches:

```js
document.dispatchEvent(
  new CustomEvent("mew:motion-preference", {
    detail: {
      paused: manuallyPaused || reducedMotion.matches || document.hidden,
    },
  }),
);
```

Do not include art-offscreen pause in that shared event: an offscreen sculpture
must not disable entrances for the chapter being read. The new module has no
continuous art loop and independently checks reduced motion and document
visibility. It reads the current pause button's aria-pressed state on mount,
so an already paused homepage remains paused. Existing `figure.is-paused` also
suppresses effects within that figure.

On manual pause, reduced-motion changes or a hidden document, active WAAPI
effects are canceled, observers disconnected and pointer feedback cleared.
The static reading line still updates in response to a visitor's scroll under
manual/reduced pause; it has no animated interpolation. Hidden documents do not
queue those updates. Resume can observe unseen sections; it does not replay a
finished introductory sequence.

`pagehide` cancels effects and pending frames, removes mounted listeners and
reading line, and disconnects observers. A persisted `pageshow` remounts exactly
one layer for native back/forward cache restoration and reads current motion
preferences. Duplicate restore events destroy the previous mount before
replacement. No background or offscreen continuous requestAnimationFrame loop
exists; queued frames are driven only by scroll, resize or eligible pointer
events.

## Accessible and static fallback

Content starts visible in the original DOM. Neither the CSS nor JavaScript sets
an initial opacity of zero, hidden content state or delayed pointer access.
Unsupported WAAPI/IntersectionObserver simply skips entrances. Missing optional
JavaScript keeps existing text, links, focus order and controls. Existing
focus-visible outlines are preserved. No semantic text or aria-selected/current
state is manufactured by the layer.

Reduced motion removes travel/shine/transitions. Specific CSS rules override
the older homepage's generic primary-button hover transform under reduced
motion or coarse input. Touch receives ordinary controls without pointer shine
or tilt. Decorative lines and sheen are pointer-transparent and the reading
line is aria-hidden, so they cannot be confused with job/payment progress or
announced as a changing metric. Prototype/mode labels are excluded from the
introductory fade sequence.

## Validation and remaining visual review

Run:

```sh
node --test tests/experience-motion.test.mjs
```

Eight behavioral checks passed: reduced-motion suppression with actual reading
position; manual cancellation/resume without replay; live preference and hidden
document cancellation; clamped/coalesced scroll updates with no recursive frame;
fine-pointer versus touch feedback; complete pagehide teardown; unsupported
entrance APIs; and idempotent BFCache restoration under current preferences.
These tests exercise lifecycle behavior, not source-word matching.

Rendered desktop/mobile critique, keyboard traversal and a real browser's
reduced-motion/hidden-tab/BFCache checks remain part of the lead's integration
review. No browser automation was performed by this lane. The tests do not
claim compositor performance, device frame rate or exhaustive assistive
technology support. Run the existing complete regression and build before
publication; a local source change is distinct from a deployed observation.

## Reviewed sources

[CSS Motion Systems on skills.sh](https://www.skills.sh/stolinski/motion-skills/css-motion-systems)
and its pinned upstream skill informed choosing CSS for feedback and WAAPI for
cancelable finite entrances. The repository's top-level LICENSE could not be
retrieved; its source remains a reference only, with no copied skill bundle or
dependency installed.

[Interaction Design on skills.sh](https://www.skills.sh/wshobson/agents/interaction-design)
and its pinned MIT upstream informed purposeful hierarchy, restrained timing and
input/preference fallbacks. No React/Framer Motion example was imported into the
native site. The source register records exact revisions and hashes:
[experience-motion-sources.json](../research/design/experience-motion-sources.json).

Primary browser references: [WAAPI cancellation](https://developer.mozilla.org/en-US/docs/Web/API/Animation/cancel),
[IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API),
and [reduced-motion preference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion).
Local design-studio, jury UI/UX and evidence-design skills supplied the
storyboard/critique and adjacent evidence-boundary discipline. Source review
guides implementation; it is not rendered proof or evidence of live execution.
