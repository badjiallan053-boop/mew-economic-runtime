import CSL from "@emurgo/cardano-serialization-lib-nodejs";
import { buildEscrowDraft } from "./escrow-transaction.mjs";
import { reviewEscrowWitnesses } from "./escrow-witness-review.mjs";

/** Assemble already supplied CIP-30 key witness sets. Does not invoke a wallet,
 * create signatures, accept private keys or authorize submission. */
export function assembleEscrowWitnesses(args, witnessSets, options = {}) {
  args = structuredClone(args);
  if (!Array.isArray(witnessSets) || witnessSets.length < 1 || witnessSets.length > 16)
    throw Error("One to sixteen external key witness sets required");
  const draft = buildEscrowDraft(args, options),
    fixed = CSL.FixedTransaction.from_hex(draft.cbor),
    allowed = new Set(draft.requiredSigningKeys), seen = new Map();
  let totalBytes = 0;
  for (const hex of witnessSets) {
    if (typeof hex !== "string" || !/^([0-9a-f]{2})+$/.test(hex) || hex.length > 32768)
      throw Error("Bounded lowercase witness-set CBOR required");
    totalBytes += hex.length / 2;
    if (totalBytes > 32768) throw Error("Witness input budget exceeded");
    const set = CSL.TransactionWitnessSet.from_hex(hex),
      json = JSON.parse(set.to_json());
    if (Object.entries(json).some(([key, value]) => key !== "vkeys" && value !== null))
      throw Error("Only key witnesses are accepted from the external wallet");
    const keys = set.vkeys();
    if (!keys?.len() || keys.len() > 16) throw Error("Bounded key witnesses required");
    for (let i = 0; i < keys.len(); i++) {
      const witness = keys.get(i), publicKey = witness.vkey().public_key(),
        hash = publicKey.hash().to_hex();
      if (!allowed.has(hash)) throw Error("Unexpected signing key");
      if (!publicKey.verify(fixed.transaction_hash().to_bytes(), witness.signature()))
        throw Error("Invalid transaction signature");
      const previous = seen.get(hash);
      if (previous && previous !== witness.to_hex()) throw Error("Conflicting duplicate witness");
      if (!previous) {
        seen.set(hash, witness.to_hex());
        fixed.add_vkey_witness(witness);
      }
    }
  }
  const cbor = fixed.to_hex();
  const review = reviewEscrowWitnesses(args, cbor, options);
  return {
    schema: "mew.escrow-witness-assembly.v1", cbor, review,
    walletInvoked: false, signatureCreated: false, transactionBroadcast: false,
    signingAllowed: false, dispatchAllowed: false, paymentsEnabled: false,
  };
}
