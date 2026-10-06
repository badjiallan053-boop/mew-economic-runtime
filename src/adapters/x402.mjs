/** Restricted x402 v2 preprod/lovelace/default quote admission.
 * mandate MUST come from authenticated server configuration, never an agent's
 * or merchant's request. This is accounting admission, not signature verification.
 * ALLOW reserves exposure; this module never signs, fetches or dispatches.
 */
export function reserveX402(store, { mandate, quote, effectId, agent }) {
  if (!mandate || !quote || quote.x402Version !== 2) throw new Error('Require x402 v2 and a trusted mandate');
  const resource = new URL(mandate.resourceUrl);
  if (resource.protocol !== 'https:' || resource.username || resource.password || resource.hash) throw new Error('Require an HTTPS resource without credentials or fragment');
  if (quote.resource?.url !== mandate.resourceUrl) throw new Error('Resource differs from mandate');
  if (!Array.isArray(quote.accepts) || quote.accepts.length !== 1) throw new Error('Require one explicitly selected payment option');
  const r = quote.accepts[0];
  if (!r || r.scheme !== 'exact' || r.network !== 'cardano:preprod' || r.asset !== 'lovelace') throw new Error('Unsupported payment rail');
  if (r.extra?.assetTransferMethod !== 'default') throw new Error('Only explicit direct transfer is supported');
  if (typeof r.payTo !== 'string' || !r.payTo.startsWith('addr_test1') || r.payTo !== mandate.recipientAddress) throw new Error('Recipient differs from mandate');
  // Address equality binds trusted configuration; this does not validate Bech32.
  if (typeof r.amount !== 'string' || !/^[1-9][0-9]{0,15}$/.test(r.amount)) throw new Error('Require a positive integer lovelace amount');
  const amount = Number(r.amount);
  if (!Number.isSafeInteger(amount) || !Number.isSafeInteger(mandate.maxAmount) || mandate.maxAmount < 1 || amount > mandate.maxAmount) throw new Error('Amount exceeds mandate or safe integer range');
  if (!Number.isSafeInteger(r.maxTimeoutSeconds) || r.maxTimeoutSeconds < 1) throw new Error('Invalid protocol timeout');
  return store.transact(kernel => {
    const objective = kernel.objective(mandate.objectiveId);
    if (objective.principal !== mandate.principal || objective.semanticKey !== mandate.semanticKey) throw new Error('Mandate does not match objective owner and meaning');
    return kernel.evaluate({objectiveId:objective.id, proposedEffect:{id:effectId,agent,semanticKey:objective.semanticKey,provider:mandate.provider,type:'payment',amount,recipientAddress:r.payTo}});
  });
}
