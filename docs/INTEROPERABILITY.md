# MEW interoperability boundaries

Design checked 7 October 2026. This document defines a proposed portable handoff around existing contracts. It does not implement an MCP server, A2A endpoint, OpenAPI document or CloudEvents bus. Existing live credentials remain pending. The private GitHub repository and customer/configuration evidence require access control; public protocol specifications do not authorize publishing private artifacts.

## Separate the four layers

| Layer | Official specification reviewed | Proposed MEW use |
| --- | --- | --- |
| Tool/context access | [MCP 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28) | A future bounded read-only evidence/tool façade; host enforces role and tenant scope |
| Delegated work | [A2A specification](https://a2a-protocol.org/latest/specification/) | A future authenticated task/artifact handoff between independent services, with an explicit version/binding |
| HTTP description | [OpenAPI 3.2.1](https://spec.openapis.org/oas/v3.2.1.html) | Document actual implemented HTTP routes and versioned input/output/error schemas |
| Event envelope | [CloudEvents 1.0.2](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md) | Optional transport-neutral notifications; not a payment ledger or receipt verifier |

MCP's dated current revision uses stateless, self-contained requests and per-request capabilities. [Its release notes](https://blog.modelcontextprotocol.io/posts/2026-07-28/) describe retirement of older initialization/session patterns. SDK/client compatibility must be tested against the chosen revision; a 2025-era example cannot be copied as a 2026 implementation. Annotations are hints, not authorization.

The A2A current page documents protocol `1.0`, task/message/artifact objects and distinct transport bindings. Its `latest` URL is mutable; an attempted versioned page was unavailable, so no exact immutable A2A patch/commit pin is claimed. Do not serialize an old 0.3 `kind`-discriminator example as current 1.0. Agent discovery metadata is not proof of payment authority. OpenAPI describes interfaces; it cannot itself validate application authorization. CloudEvents release 1.0.2 retains event `specversion: "1.0"`; source plus ID identifies a duplicate notification, not a duplicate economic effect.

## Proposed canonical evidence handoff

Keep this envelope outside the current company output and financial claim schemas. Introduce it only through a separately tested adapter/version; never silently add fields to today's strict runtime inputs.

| Proposed field | Meaning and validation |
| --- | --- |
| `schemaVersion`, `packetId` | Versioned MEW packet and stable immutable identity; same ID with changed bytes is conflict |
| `missionId`, `objectiveId`, `principalRef`, `mandateRevision` | Trusted host-issued scope; references, not credential material; tenant match required |
| `producer`, `recipient`, `purpose` | Authenticated connector/role identity, permitted audience and bounded use |
| `correlation` | Namespaced external IDs: GitHub revision, company task, Sokosumi task, MPS identifier, chain transaction; never infer equality between namespaces |
| `evidence` | Assigned evidence ID, kind, origin, retrieval time, source revision, content/artifact reference and declared digest algorithm |
| `observation` | Structured fact with status such as observed/pending/conflict/unavailable and source provenance; no untrusted `verified=true` admission |
| `execution` | Actual mode (simulation or provider), observed run ID and metering when available; unknown values stay unknown |
| `redaction` | Classification, allowed audience and removed-field categories; exclude tokens, wallet secrets, private URLs from public exports |

Exact artifact bytes get a declared fingerprint for replay/identity. A fingerprint proves byte equality, not producer authenticity or factual truth. A local SHA-256 artifact digest is not universally interchangeable with a Masumi input/result hash; the deployed rail's rule controls that field. Proposed timestamps describe retrieval/observation, not transaction finality.

## Connector mappings preserving existing behavior

| Boundary | Identity/evidence to retain | Forbidden inference or action |
| --- | --- | --- |
| GitHub → knowledge/engineering | Repository identity, immutable commit SHA, file path/blob digest, scoped retrieved content and license | Branch name alone is not reproducible evidence. A link is not consent to export private code or use a write credential. |
| Company advisory runtime → packet | Exact existing `missionId`, `taskId`, `agentId`, `recommendation`, `summary`, `evidenceRefs`, `riskCodes`; references limited to assigned catalog | ACCEPT is advice, not ledger admission, delivery claim or deployment authorization. Do not relax strict output fields. |
| Sokosumi → collection verifier | Authenticated task ID, payment identifier, settlement flag and transaction hash when present | Completed task or settled flag without required transaction evidence is not collected seller funds. |
| Saved MPS terms → verifier | `Preprod`, `Web3CardanoV2`, blockchain/agent IDs, wallet ID, seller and contract addresses, raw unit and expected atomic amount | Terms come from trusted saved configuration, never model text/browser mutation. A terms read does not authorize a purchase. |
| MPS resolved state → verifier | Matching requested unit/amount and confirmed ordinary seller withdrawal transaction | Current MEW rejects missing or substituted bindings; disputed withdrawal is not ordinary withdrawal. |
| Cardano read-only proof → collection journal | Fixed preprod provider observation, transaction identity, seller, unit, full expected net receipt and confirmation policy | Provider outage stays pending/unknown. Confirmation observation is not absolute finality, delivery quality or payer/mission cryptographic proof. |
| Collection journal → presentation | Sanitized collection result and corresponding bound task | Do not convert tUSDM into the ADA objective ledger or mix the two asset policies. Do not label synthetic proof live. |

The current source-backed implementation is `src/company/runtime.mjs` and `src/adapters/masumi-collection.mjs`; these mappings are documentation around them. Future wrappers must delegate to those validators and preserve their rejection behavior rather than letting remote agents produce authoritative proof.

## Delivery, retry and authority design

Persist receipt identity and observation before emitting a notification. On retry, match both event identity and immutable payload; changed payload is conflict. Consumers deduplicate notifications separately from payment effect IDs. Do not promise exactly-once network delivery; financial reservations and verified receipts remain durable application invariants. Cancellation of an A2A task or MCP operation cannot prove a purchase failed or release unresolved exposure.

Each connector gets a narrow capability profile, authenticated tenant/principal scope and fixed allowed origins. Keep GitHub, Sokosumi, MPS and Blockfrost credentials isolated. Never forward one upstream token to a different service. Private artifacts require authorized retrieval with size/type limits and digest checks; reject unapproved redirects/URLs and hostile source instructions. Remote roles receive references and redacted facts, not wallet keys or arbitrary shell access.

## Skills portability and reviewed source

The [skills.sh MCP builder listing](https://www.skills.sh/anthropics/skills/mcp-builder) was followed to [actual Anthropic SKILL.md](https://github.com/anthropics/skills/blob/main/skills/mcp-builder/SKILL.md) and its [best-practices reference](https://github.com/anthropics/skills/blob/main/skills/mcp-builder/reference/mcp_best_practices.md). It provides source research, clear names, constrained input/output, pagination and evaluation procedures. Reviewed as reference only: language guides, scripts and dependency tree are not fully audited, no installer/SDK was run and no source SHA was established. Its preference for broad API coverage is narrowed by MEW's task-specific permissions; expose only necessary capabilities.

A portable skill manifest should record name, exact source commit, content digest, license, relative references, compatibility and declared required capabilities. The host maps capabilities to existing user authorization. A skill cannot grant itself tools, financial authority, secret access or delegation. A2A's advertised AgentSkill describes service capabilities; it is not identical to a SKILL.md procedure. Loading a procedure through MCP likewise does not make its instructions trusted authority.

The reviewed [MCP repository license](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/LICENSE), [A2A license](https://github.com/a2aproject/A2A/blob/main/LICENSE), [OpenAPI license](https://github.com/OAI/OpenAPI-Specification/blob/main/LICENSE), [CloudEvents 1.0.2 license](https://github.com/cloudevents/spec/blob/v1.0.2/LICENSE) and [MCP builder LICENSE.txt](https://github.com/anthropics/skills/blob/main/skills/mcp-builder/LICENSE.txt) identify Apache-2.0. Before redistributing code/spec/skills, preserve applicable notices and confirm the exact pinned package's terms. No external implementation code is copied here.

## Acceptance gates before any implementation claim

A future transport adapter needs schema conformance and real client negotiation tests for its exact protocol/SDK version; auth denial and cross-tenant tests; strict advisory round-trip tests; duplicate/conflicting event tests across restart; unavailable/partial/substituted receipt tests; secret/redaction tests; malicious artifact/redirect tests; and fixture-versus-provider labeling. Paid execution remains blocked by the established live setup gates. This design does not add an auth flow, wallet signer, payment worker or new database.

## Implemented local advisory handoff

`src/company/handoff.mjs` now exports completed trusted company snapshots into
`mew.advisory-handoff.v1`, a separate strict envelope carrying the original
advisory fields, actual simulation/advisory mode, policy digest and explicit `advisory-only` authority.
`checkHandoff` requires a separately trusted expected digest, exact mission/task/
agent/policy identity and an approved evidence catalog. Its result explicitly
sets `authenticated: false`: the digest provides integrity, not a signature.
Use these functions inside an authenticated host boundary; accepting both the
packet and its expected digest from the same untrusted sender defeats that check.
This narrow implemented envelope does not implement the larger proposed evidence
packet above. GET `/api/company/interoperability` publishes only capability
readiness, under the existing live authentication and demo quota boundaries.
No mission contents or credentials are exposed by this endpoint.

The repository is private as of 7 October 2026. The separately hosted Railway
simulation remains public. Private source and mission exports require explicit
recipient access; the public demo must not embed them.
