# Four implementation workstreams

These workstreams reuse the five-role compact company architecture. Each lead decomposes its task into focused review subtasks; they are not new persistent model processes. Prompt briefs live in prompts/workstreams and are operator reference material, not automatically selected by CompanyRuntime. The unchanged seven-field advisory contract and deterministic ledger remain authoritative.

| Workstream | Actual implementation agent | Focused subtasks | Runnable result |
| --- | --- | --- | --- |
| Model evaluation | model_evaluation_build | contract validation, adversarial fixtures, baseline comparison | `npm run model:evaluate` |
| Customer pilot | primary agent | consent/rights checklist, exact revision review, measurement | `npm run pilot:rehearse` |
| Authenticated delivery | delivery_build | signature/binding verification, freshness and replay review | `node --test tests/delivery-receipt.test.mjs` |
| Preprod readiness | security_review, reassigned | exact configuration terms, immutable identity, timeout recovery | `npm run payment:plan` |

Implemented: real-provider transport prepared with explicit opt-in; synthetic evaluation comparator; private pilot record functions; cryptographic receipt verifier; offline preprod planner. Not performed: paid inference, customer recruitment, video rendering, signed receipt from an actual provider, wallet signing or submitted preprod payment.

The lead owns integration review, package commands and full regression. Specialists own separate modules and tests. Model and payment credentials remain pending; the approved hosting budget does not authorize model usage. No new runtime role or tool authority is added by these briefs.

References: official openai/openai-node for Responses transport; masumi-network/Sokosumi-MCP for future service transport; masumi-network/masumi-payment-service for payment lifecycle; Node built-in crypto for Ed25519. Exact limitations and sources are recorded in MODEL_EVALUATION.md, CUSTOMER_PILOT.md, AUTHENTICATED_DELIVERY.md and PREPROD_EXECUTION_PLAN.md. No third-party executable or skill installer was required.

`npm run workstreams:rehearse` composes all four boundaries offline: immutable operation identifiers feed the pilot; ephemeral Ed25519 fixture signatures verify exact outline bytes before operator-recorded acceptance; evaluation runs the deterministic baseline; timeout produces UNKNOWN without dispatch or release. Durable receipt replay storage and authenticated customer review are deliberately not supplied by this rehearsal. No model API or payment network is called.
