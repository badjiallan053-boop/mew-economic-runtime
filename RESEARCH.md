# MEW research and provenance

Checked 7 October 2026. The founder brief is the product hypothesis, not evidence of competitor absence or completed integrations. No outside repository code has been copied into this implementation.

| Official source | What it establishes | Implementation consequence |
| --- | --- | --- |
| [Masumi x402 repository](https://github.com/masumi-network/x402-cardano) | HTTP payment protocol source and examples; repository README still includes inherited EVM examples | Pin a Cardano implementation version before adding payment execution; do not turn EVM snippets into Cardano endpoints |
| [Cardano exact scheme](https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_cardano.md) | Cardano network names and direct/contract transfer methods | Reserve economic exposure before dispatch; settlement alone does not establish delivery |
| [Masumi Payment Service](https://github.com/masumi-network/masumi-payment-service) | Official service implementation | Escrow adapter remains pending deployment-specific API and evidence validation |
| [Masumi payments lifecycle](https://www.masumi.network/dev/masumi/core-concepts/payments) | Lock, result, dispute, release lifecycle | Keep unsettled commitments in exposure; refund must be verified |
| [Cardano developer portal](https://developers.cardano.org/docs/build/integrate/ai-agents/masumi/) | Masumi integration context | MEW sits above payment rails; it does not replace their contracts |
| [Blockfrost OpenAPI](https://raw.githubusercontent.com/blockfrost/openapi/master/openapi.yaml) | Preprod origin, project_id header, transaction outputs and block data | Read-only verifier checks recipient lovelace sum and confirmation depth |

The [Masumi introduction documentation](https://www.masumi.network/dev/masumi/documentation) links a YouTube “Masumi Introduction” video. The video could not be retrieved by the research tool and no transcript was available. We do not claim to have watched it or derive technical behavior from it. The documented APIs and source repositories are the basis of this build.

## Skills discovery

[skills.sh documentation](https://www.skills.sh/docs) identifies [vercel-labs/skills](https://github.com/vercel-labs/skills) as its open CLI and describes reusable procedural skills. We used that SKILL.md convention for the project-local engineering skill in `.agents/skills/mew-engineering/SKILL.md`. The [Masumi home page](https://www.masumi.network/) advertises `https://www.masumi.network/skill.md`; retrieval failed, so its contents have not been executed or assumed. No unreviewed remote skill was installed, and no skills CLI installation is claimed.

## Corrections to the brief

All demo amounts are ADA/lovelace: 0.55 ADA + 0.49 ADA = 1.04 ADA, exceeding a 1 ADA budget by 0.04 ADA. There is no dollar conversion. The 550,000-lovelace example is an accounting fixture; a real Cardano output must also satisfy ledger minimum-UTxO and fee requirements. MEW does not build or send that transaction.

The brief's `/v2/wallets/.../payments` endpoint was not verified and is not implemented. Current Masumi lifecycle documentation describes `/purchase` operations; wiring them requires a deployed authenticated service and matching version. Neither payment broadcasting, escrow execution, on-chain decision logging nor cryptographic merchant delivery verification is claimed in this prototype. “No existing product” is an unvalidated competitive claim; present objective accounting as MEW's thesis, not proven market exclusivity.

## 7 October: x402 and Origins refinement

Reviewed [Cardano Foundation's current facilitator source README](https://github.com/cardano-foundation/cardano-x402-facilitator). It names the 2.26.0 SDK compatibility target and documents v2 exact `cardano:preprod`, `lovelace`, string `amount`, `payTo`, `maxTimeoutSeconds` and explicit `extra.assetTransferMethod`. MEW now admits a deliberately restricted direct-transfer quote through its existing SQLite reservation transaction. This is not a facilitator integration or settlement verifier. Archived `cardano-foundation/x402-cardano` is not the implementation target.

[Official Cardano Office Hours context](https://developers.cardano.org/blog/2026-04-24-media-cardano-developer-office-hours/) links [x402 on Cardano on YouTube](https://www.youtube.com/watch?v=5yhdNPAn8BA). The official description discusses v2 and ecosystem integration. Video retrieval failed; no transcript was obtained, no video was watched, and no technical claims here are inferred from unseen video content. Source/API inspection provides the implementation details.

[Origins official event page](https://token2049.com/singapore/2049-origins) lists October 6–8, 2026 and Cardano's Agentic Commerce challenge. It does not supply a detailed Cardano scoring rubric. The suggested demonstration in docs/AGENT_COMMERCE.md is our proposal, not jury guidance.

## Paid-agent setup refinement

Fetched the user-supplied Masumi TOKEN2049 page, its agent-guide.md, skill/SKILL.md and submission page directly from the official site after the web reader could not access them. The guide separates Workspace credits, escrow funds and independently confirmed seller collection. Its event Task price is 1 test USDM, not ADA. MPS source was prepared at d569a338ca54d5be7441564770d75ebf89b71f12; the official live-demo template was inspected at ff35ea7. It uses saved payment stages, authoritative result bytes and pending-operation reconciliation. No template implementation was copied. Hashing conventions differ by endpoint: the local SHA-256 artifact fingerprint is not claimed to be a universally valid Masumi payment/result hash.

The supplied Cardano AI-development curriculum recommends current bundled source context; its official Dev Skills repository was downloaded and linked locally. `scaffold-project` excludes modifying existing structures, so MEW was preserved.

[Masumi Updates official Office Hours context](https://developers.cardano.org/blog/2026-08-28-media-cardano-developer-office-hours/) links [the YouTube session](https://www.youtube.com/watch?v=mCH4xWJ89Vc). The video page was inspected and transcript export attempted: no transcript is available. No technical behavior is attributed to unseen video content. Official source and guide inspection underpin this rehearsal.

The Masumi submission guide asks for a hosted project, presentation file and embedded recording; the browser presentation alone is not a complete submission. The local rehearsal produces no real model turn, Coworker Task, escrow or collected payment proof.

## Live-deployment reference audit

Inspected the official `cardano-foundation/x402-cardano-demo` at 6481c9aea1bc36c45c0d872fc1f3a3414c108e8f, including application idempotency and Masumi escrow setup. Its two tUSDM policies must not be mixed. The TOKEN2049 template's positive-net-only seller receipt check informed a stronger MEW read-only verifier that requires full expected net token amount. This verifier is unit-tested against mocked provider responses; no real transaction was supplied. See docs/LIVE_DEPLOYMENT.md for the prepared Railway patch and explicitly pending live gates.
