import CSL from "@emurgo/cardano-serialization-lib-nodejs";
import { buildEscrowDraft } from "./escrow-transaction.mjs";

/** Offline evidence inspection only. Rebuild from trusted operator args, never
 * accept a caller-supplied expected hash as authority. No wallet/network/state I/O. */
export function reviewEscrowWitnesses(args, candidateCbor, options = {}) {
  if (
    typeof candidateCbor !== "string" ||
    !candidateCbor.length ||
    candidateCbor.length > 262144 ||
    !/^([0-9a-f]{2})+$/.test(candidateCbor)
  )
    throw Error("Bounded lowercase transaction CBOR required");
  const draft = buildEscrowDraft(args, options);
  if (candidateCbor.length / 2 > args.parameters.maxTxSize)
    throw Error("Signed transaction exceeds protocol size");
  const expected = CSL.FixedTransaction.from_hex(draft.cbor),
    fixed = CSL.FixedTransaction.from_hex(candidateCbor);
  if (!Buffer.from(fixed.raw_body()).equals(Buffer.from(expected.raw_body())))
    throw Error("Transaction body changed");
  if (
    !Buffer.from(fixed.raw_auxiliary_data() ?? []).equals(
      Buffer.from(expected.raw_auxiliary_data() ?? []),
    )
  )
    throw Error("Transaction auxiliary data changed");
  const tx = CSL.Transaction.from_hex(candidateCbor),
    original = CSL.Transaction.from_hex(draft.cbor);
  if (tx.is_valid() !== true || tx.is_valid() !== original.is_valid())
    throw Error("Transaction validity flag changed");
  if (
    BigInt(tx.body().fee().to_str()) <
    BigInt(args.parameters.minFeeA) * BigInt(candidateCbor.length / 2) +
      BigInt(args.parameters.minFeeB)
  )
    throw Error("Signed size exceeds linear fee coverage");
  const ws = tx.witness_set();
  if (ws.bootstraps()?.len()) throw Error("Unexpected bootstrap witness");
  const nonKey = JSON.parse(ws.to_json());
  delete nonKey.vkeys;
  const originalNonKey = JSON.parse(original.witness_set().to_json());
  delete originalNonKey.vkeys;
  // Normalize both decoded witness sets equally; CSL's JSON bridge may change
  // set tags, so comparing one normalized set with raw original CBOR is invalid.
  if (
    CSL.TransactionWitnessSet.from_json(JSON.stringify(nonKey)).to_hex() !==
    CSL.TransactionWitnessSet.from_json(JSON.stringify(originalNonKey)).to_hex()
  )
    throw Error("Non-key witness changed");
  const witnesses = ws.vkeys(),
    seen = new Set(),
    allowed = new Set(draft.requiredSigningKeys);
  if ((witnesses?.len() ?? 0) > 16) throw Error("Too many signing witnesses");
  const bodyHash = fixed.transaction_hash().to_bytes();
  for (let i = 0; i < (witnesses?.len() ?? 0); i++) {
    const witness = witnesses.get(i),
      publicKey = witness.vkey().public_key(),
      keyHash = publicKey.hash().to_hex();
    if (!allowed.has(keyHash)) throw Error("Unexpected signing key");
    if (seen.has(keyHash)) throw Error("Repeated signing key");
    if (!publicKey.verify(bodyHash, witness.signature()))
      throw Error("Invalid transaction signature");
    seen.add(keyHash);
  }
  const missingSigningKeys = draft.requiredSigningKeys.filter(
    (key) => !seen.has(key),
  );
  return {
    schema: "mew.escrow-witness-review.v1",
    network: draft.network,
    networkMagic: draft.networkMagic,
    action: draft.action,
    txHash: draft.txHash,
    intentSha256: draft.intentSha256,
    parameterSnapshotSha256: draft.parameterSnapshotSha256,
    verifiedSigningKeys: [...seen].sort(),
    missingSigningKeys,
    allRequiredKeysPresent: missingSigningKeys.length === 0,
    bodyBytesUnchanged: true,
    auxiliaryDataUnchanged: true,
    nonKeyWitnessesUnchanged: true,
    synthetic: draft.synthetic,
    ledgerEvaluationPerformed: false,
    signingAllowed: false,
    dispatchAllowed: false,
    exposureReleaseAllowed: false,
    paymentsEnabled: false,
    blockers: draft.blockers,
    limitations: [
      "Cryptographic signatures bind these exact bytes; they do not establish signer enrollment or approval.",
      "Operator input snapshots are not fresh chain evidence. Testnet bytes alone cannot distinguish preview from preprod.",
      "No script execution, chain confirmation, settlement, refund or independent audit is established.",
    ],
  };
}
