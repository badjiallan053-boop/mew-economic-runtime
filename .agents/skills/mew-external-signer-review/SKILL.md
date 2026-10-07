---
name: mew-external-signer-review
description: Inspect externally supplied MEW ADA escrow transaction witnesses against trusted unsigned draft inputs, keeping signer custody, fresh chain evidence and audit gates separate.
---

Read AGENTS.md, docs/MODEL_PAYMENT_UNBLOCKING.md and docs/PREPROD_PAYMENT_ACTIVATION.md. This procedure inspects bytes and signatures; it never creates a wallet, acquires keys, invokes signTx, submits a transaction or releases exposure.

Use `npm run escrow:witness-review -- /absolute/operator-args.json /absolute/transaction.cbor.hex`. The tool rebuilds the expected draft from trusted operator arguments, checks unchanged raw body and auxiliary bytes, true validity flag, bounded signed size/linear fee floor, unchanged decoded non-key witnesses, and Ed25519 signatures for only expected payment/required signer hashes. Incomplete signing stays explicit. Do not trust caller-supplied expected hashes, symbols or verified flags.

A fully signed result remains non-dispatching. Testnet addresses cannot distinguish preprod from preview; independently bind provider/node context. Verify selected outpoints and assets afresh, global locks, protocol parameters, script evaluation of exact final body, input/output conservation, minimum outputs, collateral and current validity window. Operator-supplied snapshots and fixture cryptography do not prove any of those facts.

Keep the payer/provider/fee-sponsor custody owners, exact debit caps, human transaction review, revocation and incident process explicit before external signing is proposed. Preserve body-bound partial signatures; witness content normalization is distinct from raw body identity. Any changed body needs a new reviewed intent and signatures, not a silent repair.

The existing lane is ADA only. Masumi tUSDM requires full policy/name identity and durable separate token/ADA-overhead accounting; the in-memory asset prototype does not supply it. Do not import x402 facilitator dispatch or substitute its ordinary-transfer verifier for MEW's script evaluation/audit.

Commission an independent assessor against exact source, blueprint, compiler/dependency pins, positive/negative tests and funded accept/cancel/refund scenarios. Internal tests and AI review never satisfy that gate. UNKNOWN retains original reservations and locks, with no replacement spend on timeout.
