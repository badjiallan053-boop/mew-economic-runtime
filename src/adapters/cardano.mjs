/** Read-only settlement verifier. effect must come from the server's reserved contract. */
export async function verifyCardanoSettlement({ txHash, effect, minConfirmations = 3, fetchImpl = globalThis.fetch, projectId = process.env.BLOCKFROST_PROJECT_ID }) {
  if (typeof txHash !== 'string' || !/^[a-f0-9]{64}$/i.test(txHash)) throw new Error('Transaction hash must be 64 hexadecimal characters');
  const hash = txHash.toLowerCase();
  if (!projectId || typeof projectId !== 'string') throw new Error('Server BLOCKFROST_PROJECT_ID is required');
  if (!effect?.id || !effect.objectiveId || !Number.isSafeInteger(effect.amount) || effect.amount <= 0 || typeof effect.recipientAddress !== 'string' || !effect.recipientAddress.startsWith('addr_test1')) throw new Error('Reserved effect must include positive lovelace amount and preprod recipientAddress');
  if (!Number.isSafeInteger(minConfirmations) || minConfirmations < 1) throw new Error('Confirmation threshold must be a positive integer');
  const origin = 'https://cardano-preprod.blockfrost.io/api/v0';
  async function get(path) {
    const response = await fetchImpl(`${origin}${path}`, { headers: { project_id: projectId }, redirect: 'error', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Blockfrost verification unavailable (${response.status})`);
    return response.json();
  }
  const [tx, utxos, latest] = await Promise.all([get(`/txs/${hash}`), get(`/txs/${hash}/utxos`), get('/blocks/latest')]);
  if (tx.hash !== hash || utxos.hash !== hash || tx.valid_contract === false) throw new Error('Transaction identity or validity mismatch');
  if (!Number.isSafeInteger(tx.block_height) || !Number.isSafeInteger(latest.height) || tx.block_height < 0 || latest.height < tx.block_height) throw new Error('Invalid chain height evidence');
  const confirmations = latest.height - tx.block_height + 1;
  if (confirmations < minConfirmations) throw new Error('Settlement is not sufficiently confirmed; reconcile later');
  if (!Array.isArray(utxos.outputs) || !Array.isArray(utxos.inputs)) throw new Error('Missing transaction inputs or outputs');
  let total = 0n;
  const outputIndexes = [];
  for (const output of utxos.outputs) {
    if (output.address !== effect.recipientAddress) continue;
    if (!Array.isArray(output.amount)) throw new Error('Invalid recipient output');
    for (const asset of output.amount) {
      if (asset.unit !== 'lovelace') continue;
      if (typeof asset.quantity !== 'string' || !/^\d{1,30}$/.test(asset.quantity)) throw new Error('Invalid on-chain amount');
      total += BigInt(asset.quantity);
    }
    outputIndexes.push(output.output_index);
  }
  // Change returned from recipient-owned inputs is not newly received value.
  for (const input of utxos.inputs) {
    if(input.address!==effect.recipientAddress) continue;
    if(!Array.isArray(input.amount)) throw new Error('Invalid recipient input');
    for(const asset of input.amount) {
      if(asset.unit!=='lovelace') continue;
      if(typeof asset.quantity!=='string' || !/^\d{1,30}$/.test(asset.quantity)) throw new Error('Invalid on-chain input amount');
      total-=BigInt(asset.quantity);
    }
  }
  if (total !== BigInt(effect.amount)) throw new Error('On-chain recipient payment does not match reserved effect amount');
  return { claimId: `tx:${hash}:${effect.id}`, source: 'cardano', type: 'payment.settled', effectId: effect.id, objectiveId: effect.objectiveId, amount: effect.amount, evidence: { verified: true, network: 'cardano:preprod', txHash: hash, recipientAddress: effect.recipientAddress, lovelace: total.toString(), outputIndexes, blockHeight: tx.block_height, confirmations, minConfirmations, verifier: 'blockfrost-readonly' } };
}
