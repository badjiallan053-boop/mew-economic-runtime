---
name: mew-launch-readiness
description: Orchestrate MEW's evidence-backed presentation, customer-pilot, security, model, delivery, Cardano-payment and release reviews without granting agents execution authority.
---

# MEW launch-readiness review

Read `AGENTS.md`, `SPEC.md`, and [`docs/LAUNCH_READINESS_SWARM.md`](../../../docs/LAUNCH_READINESS_SWARM.md). Read the local skill/runbook for every assigned lane. Use the role prompts in `prompts/launch-readiness/` when delegating. This is a bounded review workflow; it does not register runtime agents, grant credentials, spend, sign, broadcast, deploy, or contact customers/partners.

Use one immutable commit and evidence index for all reviewers. Keep agent outputs independent, require an independent reviewer for high-risk findings, and carry the same mandate/principal/objective/effect/job/artifact/payment/network/asset identities across handoffs. Label missing observations `NOT-TESTED`; never infer a live result from a fixture, source repository, YouTube page, skill listing or schema pass.

Return per-gate `GO`, `NO-GO`, or `NOT-TESTED`, with an evidence reference, owner, unresolved risk and exact retest condition. Preserve the prototype boundary: agents advise; deterministic code admits; only an authorized human/operator can approve any future external action. Follow the order and current statuses in the launch-readiness document.
