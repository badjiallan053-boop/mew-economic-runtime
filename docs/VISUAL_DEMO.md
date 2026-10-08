# MEW visual demo

The homepage demo presents one report request through three clicks: ask Alpha,
receive no answer, try the same report from Beta. Each click still runs the
existing MEW kernel in a fresh in-memory browser instance. It does not call a
write API, shared database, model, wallet or payment service.

## Presentation

Open `/home.html#demo`. Start with “Your goal: one report”. Use the primary button
three times. Point to Alpha's open request and Beta's paused request in the
illustration. The amounts come from the kernel: 0, then 1.50 ADA, unchanged after
the timeout and duplicate attempt; the number of occupied report requests is 0,
then 1. The 3 ADA limit admits both prices arithmetically but the one-report rule
defers the duplicate. Restart creates a fresh local instance.

The comparison underneath is an illustrative budget-only risk, not an actual
second payment, delivered report, measured saving or competitor benchmark.
Supplier paths visualize decisions, not transaction broadcasts. The text
caption describes the diagram for assistive technology. Technical decisions and
live-payment prerequisites are available in a native keyboard-accessible disclosure.

## Verification

Check every phase, restart and reload; desktop and phone layouts; keyboard
activation; no horizontal overflow; visible simulation label; reduced-motion
styles; engine-load failure. The diagram responds only to user clicks. It never
autoplays a purchase. The existing motion pause also stops diagram transitions.

The deployment verifier includes the diagram stylesheet and compares hosted
bytes with the checkout. A commit alone does not establish deployment.
Live payment activation continues to require the prerequisites in
`docs/PAYMENT_SYSTEM.md`. This redesign grants no financial authority.
