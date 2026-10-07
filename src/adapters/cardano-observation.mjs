const hex64=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
/** Read-only follow-up. A changed or missing observation never releases funds. */
export async function revalidateCardanoObservation({observation,projectId=process.env.BLOCKFROST_PROJECT_ID,fetchImpl=globalThis.fetch,minConfirmations=3}={}){
 // Copy primitives before validation or awaiting provider I/O. Caller-owned objects are mutable.
 observation=observation&&{network:observation.network,txHash:observation.txHash,blockHash:observation.blockHash,blockHeight:observation.blockHeight};
 if(!observation||observation.network!=='cardano:preprod'||!hex64(observation.txHash)||!hex64(observation.blockHash)||!Number.isSafeInteger(observation.blockHeight)||observation.blockHeight<0||!Number.isSafeInteger(minConfirmations)||minConfirmations<1)throw Error('Immutable preprod transaction/block observation required');
 const base={network:'cardano:preprod',txHash:observation.txHash,paymentsEnabled:false,exposureReleaseAllowed:false,automaticRetryAllowed:false,settlementClaimProduced:false};
 if(typeof projectId!=='string'||!projectId)return {...base,status:'UNKNOWN',reason:'NOT_CONFIGURED',automaticDispatchBlocked:true};
 const origin='https://cardano-preprod.blockfrost.io/api/v0';
 try{
  async function get(path){const r=await fetchImpl(origin+path,{headers:{project_id:projectId},redirect:'error',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Observation unavailable');return r.json();}
  const [tx,tip]=await Promise.all([get('/txs/'+observation.txHash),get('/blocks/latest')]);
  if(tx.hash!==observation.txHash||!hex64(tx.block)||!Number.isSafeInteger(tx.block_height)||tx.block_height<0||!hex64(tip.hash)||!Number.isSafeInteger(tip.height)||tip.height<0||typeof tx.valid_contract!=='boolean')throw Error('Invalid provider observation');
  if(tx.block!==observation.blockHash||tx.block_height!==observation.blockHeight||tx.valid_contract===false||tip.height<tx.block_height)return {...base,status:'REVIEW_REQUIRED',reason:'CHAIN_OBSERVATION_CHANGED',automaticDispatchBlocked:true};
  const confirmations=tip.height-tx.block_height+1;
  if(!Number.isSafeInteger(confirmations))throw Error('Invalid confirmation count');
  if(confirmations<minConfirmations)return {...base,status:'REVIEW_REQUIRED',reason:'CONFIRMATION_POLICY_NOT_MET',confirmations,automaticDispatchBlocked:true};
  return {...base,status:'STILL_OBSERVED',blockHash:tx.block,blockHeight:tx.block_height,confirmations,latestBlockHash:tip.hash,reason:'SAME_TRANSACTION_BLOCK_BINDING',limits:'Indexer observation, not absolute finality, payer attribution, delivery or refund proof'};
 }catch{return {...base,status:'UNKNOWN',reason:'PROVIDER_UNAVAILABLE_OR_INVALID',automaticDispatchBlocked:true};}
}
