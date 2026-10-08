# Which blockchain first?

Status: **recommendation from a short desk survey on 8 October 2026, not a validated decision.** Sources were mostly secondary (news, aggregators, vendor pages) and several figures are unverified. Technical properties (finality, determinism) come from general knowledge and must be confirmed against primary specs before an adapter is built. Re-check before committing.

## Recommendation

1. **Web2 rails first (no chain).** The layer's value is rail-neutral, insurers and buyers already work with card/invoice rails, and card-network agent protocols (mandates, tokens) are likely closer to what a broker reviews than any chain. This matches the contract's first customer delivery.
2. **Base (EVM L2, native USDC) as the first on-chain adapter, verify-only.** Design the adapter EVM-generic so other EVM chains are configuration. Reasons: native Circle USDC (a stablecoin a customer can budget in), the largest x402 ecosystem and facilitator set, redundant RPC/indexer providers for independent observation, standard `Transfer` / EIP-3009 authorization events, mature attestation (EAS) and custody tooling, and the chain auditors and insurers know best.
3. **Cardano second, already partly built.** The existing read-only preprod verifier is kept. eUTxO makes the transaction hash and fee predictable before submission, which suits "render exact bytes, query the original transaction after timeout". Costs: thinner stablecoin and facilitator ecosystem (reported Masumi proof of concept used USDM, not USDC), small agent-payment volume, less insurer familiarity, and reported x402-Cardano facilitator maturity limited to pre-production.
4. **Solana third, on demand.** Reported to lead recent x402 volume with native USDC and cheap fees; blockhash expiry gives a clear "definitely not landed" window. Add when a customer needs it.
5. **Stellar / Tempo: watch.** Stellar for regulated, deterministic-finality pilots; Tempo (Stripe/Paradigm, reported mainnet March 2026) is unverified for EVM compatibility.

## What would change this

- A pilot customer or insurer names a specific chain or stablecoin: follow them.
- Primary-source review shows Base soft-confirmation or sequencer semantics cannot meet the confirmation policy (define observation as soft, safe, finalized; never as absolute).
- Cardano facilitator and USDC-class stablecoin availability mature and a Masumi-style partner is the design customer.

## Risks

- Reported x402 volumes are inflated by wash activity (one estimate: roughly half). Do not treat them as demand.
- Coinbase dependence and centralized sequencer on Base.
- The per-chain claims about ERC-8004 status, x402 Foundation governance and Cardano facilitator readiness rest on secondary sources.
- Stablecoin regulation differs by jurisdiction.
- Insurers may weigh the mandate/authorization record more than the settlement chain.

## Adapter checklist (any chain)

Network and asset identity; exact units; payer and recipient bound from the reservation; observation by two independent providers where possible; explicit confirmation policy; idempotent journal; query the original transaction after timeout; no signing or custody in this repository.

Secondary sources consulted (verify before relying): coinalertnews.com (Solana vs Base x402, Jan 2026), cryptobriefing.com (Solana x402 share, ~Aug 2026), forkast.news (Base x402 volume, ~Jul 2026), forum.cardano.org (x402 Cardano digest, 28 Apr 2026), theblock.co and bankless.com (Tempo mainnet, Mar 2026), eco.com (ERC-8004, Jan 2026), the `@x402/stellar` README on jsDelivr (undated).
