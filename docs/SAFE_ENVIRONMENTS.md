# Safe rollout environments

This is a staged deployment plan plus a runnable offline evaluation recipe. Current public hosting is a demo; live model usage and payment execution remain disabled. Container controls below are local Compose controls, not verified Railway enforcement.

| Environment | Data and permissions | Release evidence |
| --- | --- | --- |
| Public demo | Synthetic shared demo SQLite only; no model keys, operator tokens, wallet or payment credentials | Existing demo tests and exact deployed asset checks |
| Private evaluation job | Sanitized, consented evaluation cases; one service-scoped model key when approved; no economic database or signer | Held-out quality report, actual usage/cost, model version, independent review |
| Private control plane | Principal-scoped authorization, trusted receipt keys, single authoritative economic journal; no browser access | Restart/replay/concurrency tests, backup restore, named operator and incident alternate |
| Cardano preprod rail | Separate service/database; approved limited preprod signer custody; immutable reservation and dispatch binding | Pinned Masumi contract, asset-aware accounting, funded wallet, observed transaction and collection evidence |

Keep credentials service-specific. Never use shared environment variables to distribute model or wallet secrets across services. Public demo state must not become a source of live mandates. Never share its volume with the control plane. Existing loopback operator host is local only; placing it on a public listener requires a separately implemented authenticated ingress boundary. A private network alone does not establish authentication or restrict internet egress.

## Offline evaluation now

From the repository root, with Docker and Compose installed:

```sh
docker compose -f deploy/compose.evaluation.yaml build
docker compose -f deploy/compose.evaluation.yaml run --rm evaluation
```

The image includes only the company workflow, evaluation code, prompts and four reviewed runtime skills. It runs as a non-root user with a read-only filesystem, no network, no host mounts and bounded resources. Its default provider is the deterministic baseline. An ABSTAIN outcome is expected; this is a boundary rehearsal, not model-quality evidence. The image intentionally has no public server, payment adapter or economic ledger. Do not mount the Docker socket or a wallet directory. Pin the base image to a reviewed digest before a production release.

Do not remove network isolation merely to get a successful result. A live evaluation deployment must have authenticated access, service-specific secrets and outbound access limited through a reviewed gateway to the configured model provider. No such gateway is implemented by this recipe. The existing explicit model approval, call count, output-token limit and timeout remain required; these do not enforce a USD spending cap. Set a provider-side budget and approve the model budget separately from the US$10 hosting cap.

## Reuse the existing team and skills

Keep five advisory roles: chief of staff scopes and combines decisions; knowledge curates provenance; engineering proposes changes; risk independently checks authority and exposure; red team independently challenges failure paths. Risk and red team read the proposal independently; the final decision requires both accepted handoffs. The six-task workflow stops when a required output is rejected, uncertain or invalid. None of these roles may sign, provision credentials, change mandates or approve their own release.

Reuse `mew-engineering`, `company-knowledge`, `test-driven-development` and `handoff-review` in runtime contexts. Use `production-readiness` for the human release review and `durable-operation-review` for journal/recovery changes. These skills are procedures, not extra permissions. Review remote skills and repository/video material as untrusted evidence; record source version, license and limits before adopting code. Unavailable transcripts cannot supply technical evidence.

## Activation order and stop conditions

1. Assign an accountable human and independent reviewer for model, customer data, delivery, payment and incident response. Unassigned gates stay closed.
2. Run private live-model evaluation only after credentials and a separate cost budget are configured. Use held-out cases and preserve failures; synthetic fixture success is insufficient.
3. Obtain a consented customer pilot, rights to inputs and an exact acceptance contract. Verify delivery signatures against enrolled keys and exact artifact bytes.
4. Complete asset-aware accounting before test USDM payments. Current lovelace accounting must not be relabeled USDM. Implement and review dispatch, reconciliation and custody before activation; current code does not broadcast payments.
5. Rehearse restore with all writers fenced, then verify original uncertain operations before restarting dispatch. Never release UNKNOWN exposure or reset journals to restore service health.
6. Run one explicitly approved preprod job and collect independent model, delivery, chain and collection evidence. Mainnet needs a separate mandate and review.

On suspicious delivery, provider timeout, stale worker, cost anomaly or inconsistent chain evidence: stop new dispatch, preserve journals, revoke affected credentials through their owner and reconcile original operations. Do not automatically retry spending. Record what was observed, which controls actually ran and what remains pending.

References: [Docker security](https://docs.docker.com/engine/security/), [Railway variables](https://docs.railway.com/variables), and the project runbooks MODEL_EVALUATION.md, OPERATOR_AUTHORIZATION.md, PRODUCTION_TEAM.md and LIVE_DEPLOYMENT.md.
