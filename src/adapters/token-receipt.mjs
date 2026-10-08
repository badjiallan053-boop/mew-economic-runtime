/** Read-only native-token seller receipt verification. Call with a transaction
 * already bound to the authenticated Task/MPS withdrawal; chain data alone does
 * not bind a receipt to a Task. This does not emit lovelace kernel claims.
 */
export async function verifyTokenReceipt({txHash,sellerAddress,unit,expectedAmount,minConfirmations=3,projectId=process.env.BLOCKFROST_PROJECT_ID,fetchImpl=fetch}) {
  if(typeof txHash!=='string'||!/^[a-f0-9]{64}$/i.test(txHash))throw new Error('Invalid transaction hash');
  if(typeof sellerAddress!=='string'||!sellerAddress.startsWith('addr_test1'))throw new Error('Require configured preprod seller address');
  if(typeof unit!=='string'||!/^[a-f0-9]{56}(?:[a-f0-9]{2}){0,32}$/.test(unit))throw new Error('Require raw native-token unit (policy + asset name), not token label');
  if(typeof expectedAmount!=='string'||!/^[1-9][0-9]{0,19}$/.test(expectedAmount))throw new Error('Require positive atomic token amount');
  if(!Number.isSafeInteger(minConfirmations)||minConfirmations<1)throw new Error('Invalid confirmation policy');
  if(!projectId)throw new Error('Server-side Blockfrost project ID required');
  const hash=txHash.toLowerCase();
  const get=async path=>{const r=await fetchImpl(`https://cardano-preprod.blockfrost.io/api/v0${path}`,{headers:{project_id:projectId},redirect:'error',signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error(`Blockfrost lookup failed (${r.status})`);return r.json();};
  const [tx,utxos,latest]=await Promise.all([get(`/txs/${hash}`),get(`/txs/${hash}/utxos`),get('/blocks/latest')]);
  if(tx.hash!==hash||utxos.hash!==hash||tx.valid_contract===false)throw new Error('Transaction identity or validity mismatch');
  if(!Number.isSafeInteger(tx.block_height)||tx.block_height<0||!Number.isSafeInteger(latest.height)||latest.height<tx.block_height)throw new Error('Invalid chain heights');
  const confirmations=latest.height-tx.block_height+1;
  if(confirmations<minConfirmations)throw new Error('Insufficient confirmations');
  const sum=entries=>{if(!Array.isArray(entries))throw new Error('Missing transaction inputs/outputs');return entries.filter(e=>e.address===sellerAddress).reduce((total,e)=>{if(!Array.isArray(e.amount))throw new Error('Missing token quantities');return total+e.amount.filter(a=>a.unit===unit).reduce((n,a)=>{if(typeof a.quantity!=='string'||!/^[0-9]{1,30}$/.test(a.quantity))throw new Error('Invalid token quantity');return n+BigInt(a.quantity);},0n);},0n);};
  const net=sum(utxos.outputs)-sum(utxos.inputs);
  if(net<BigInt(expectedAmount))throw new Error('Expected full net seller receipt was not received');
  return {verified:true,simulated:false,network:'cardano:preprod',txHash:hash,sellerAddress,unit,expectedAtomicUnits:expectedAmount,netAtomicUnits:net.toString(),confirmations};
}
