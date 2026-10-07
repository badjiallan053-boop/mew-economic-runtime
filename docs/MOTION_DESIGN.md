# MEW interaction and motion standard

Reviewed 7 October 2026. The website uses native documents and controls; economic contracts and endpoint payloads are unchanged.

## What movement explains

| Interaction | Treatment | Boundary |
| --- | --- | --- |
| Move between chapters | Short document fade/8 px entrance; chapter rail retains visual continuity where supported | Native links, history and fallback navigation; no router interception |
| Advance a checkpoint | Real pending feedback, disabled duplicate action, persisted progress, latest timeline emphasis | Stage and amounts come from returned state; no counting animation or fabricated completion |
| Change explanatory tabs | 180 ms entrance, existing arrow/Home/End navigation | Selection changes explanation only |
| Observe uncertainty | Brief opacity transitions on the existing art paths and retained marker | Seeded illustration, not payment telemetry; no perpetual particles |
| Open supporting navigation | Native disclosure with small entrance; Escape restores summary focus, outside pointer closes it | Links remain ordinary links; no keyboard trap |
| Reach supporting content | Finite intersection entrance | Content is visible without animation or JavaScript; no scroll locking |

Motion tokens: 140 ms control feedback, 260 ms state emphasis, 300 ms page entrance. Reduced-motion CSS disables animations and cross-document transitions; JavaScript suppresses effects and cancels active effects when preference changes. Unsupported APIs keep ordinary navigation and visible content. No external animation dependencies, new tracking, storage or runtime agent permissions.

## Review findings and corrections

- The initial backend-failure path left reset controls disabled: reset/scenario now recover, advance stays disabled, and unavailable progress is indeterminate.
- Disabling an active checkpoint button lost keyboard focus: focus returns after the request when available, without overriding a visitor who moved elsewhere.
- Homepage hierarchy pushed the main action below the desktop reading sequence: reduced headline size and upper spacing.
- Shared context said every page used the report example, while the secondary clip rehearsal does not: label now says “Main decision example.”
- Private accounting source link lacked the earlier intended access warning: the actual link now states repository access is required.

## References, not installed dependencies

- [skills.sh interaction-design](https://www.skills.sh/wshobson/agents/interaction-design) and [upstream instructions](https://github.com/wshobson/agents/blob/main/plugins/ui-design/skills/interaction-design/SKILL.md): purposeful feedback, restrained timing, reduced motion and visible fallbacks. Adapted principles; no React snippets or executable package copied.
- [Vercel Labs transition demo](https://github.com/vercel-labs/react-view-transitions-demo): continuity for navigation and immediate control feedback. Its React stack is not installed into this native site.
- [Chrome cross-document guide](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document): same-origin document opt-in, fallback navigation and conditional reduced-motion opt-out.

Browser review exercised checkpoint advance and focus restoration, arrow-key tab selection, menu Escape behavior, disconnected backend controls and a 390 px demo layout without horizontal overflow. Unit tests exercise reduced-motion suppression and preference-change cancellation. These checks do not establish frame rate on customer devices or exhaustive assistive-technology support.
