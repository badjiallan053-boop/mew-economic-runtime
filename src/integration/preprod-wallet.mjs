import {decodeEscrowAddress} from '../adapters/approval-escrow-plan.mjs';
const origin='https://cardano-preprod.blockfrost.io/api/v0';
const hex=/^[a-f0-9]{64}$/;
const integer=v=>Number.isSafeInteger(v)&&v>=0;
const quantity=v=>typeof v==='string'&&/^(0|[1-9][0-9]{0,29})$/.test(v);
/** Read-only bounded snapshot, not funding selection, a fee estimate or authorization.
 * Testnet addresses cannot distinguish preprod from preview. Fixed origin + enrolled
 * preprod project is the provider context, not cryptographic network proof.
 */
export async function observePreprodWallet({address,projectId=process.env.BLOCKFROST_PROJECT_ID,fetchImpl=fetch,nowMs=Date.now()}={}){
  decodeEscrowAddress(address);
  if(typeof projectId!=='string'||!/^preprod[^\s]{1,200}$/.test(projectId)||!integer(nowMs))throw Error('Configured preprod project and valid observation time required');
  async function get(path){
    const expectedUrl=origin+path;
    const r=await fetchImpl(expectedUrl,{method:'GET',headers:{project_id:projectId},redirect:'error',signal:AbortSignal.timeout(10000)});
    // Synthetic Response instances have an empty URL. A real/custom transport
    // reporting any URL must report the exact enrolled endpoint, without redirects.
    if(!r.ok||!r.body||r.redirected===true||(r.url&&r.url!==expectedUrl))throw Error('Preprod observation unavailable');
    const reader=r.body.getReader(),chunks=[];let size=0;
    try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144)throw Error('Provider response exceeds budget');chunks.push(value);}}finally{await reader.cancel();}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  const before=await get('/blocks/latest');
  if(!before||!hex.test(before.hash)||!integer(before.height)||!integer(before.slot)||!integer(before.epoch)||!integer(before.time)||before.time*1000>nowMs||nowMs-before.time*1000>600000)throw Error('Stale or malformed chain context');
  const parameters=await get('/epochs/latest/parameters');
  if(!parameters||parameters.epoch!==before.epoch||!integer(parameters.min_fee_a)||!integer(parameters.min_fee_b)||!quantity(parameters.coins_per_utxo_size)||BigInt(parameters.coins_per_utxo_size)<1n)throw Error('Malformed or mismatched protocol parameters');
  const utxos=[],seen=new Set(),balance={};let complete=false;
  for(let page=1;page<=5;page++){
    const rows=await get(`/addresses/${address}/utxos?count=100&page=${page}&order=asc`);
    if(!Array.isArray(rows)||rows.length>100)throw Error('Malformed UTxO page');
    for(const row of rows){
      if(!row||row.address!==address||typeof row.tx_hash!=='string'||!hex.test(row.tx_hash)||!integer(row.output_index)||!Array.isArray(row.amount)||!row.amount.length||row.amount.length>100)throw Error('Malformed or foreign funding input');
      const id=`${row.tx_hash}#${row.output_index}`;if(seen.has(id))throw Error('Repeated funding input');seen.add(id);
      const units=new Set();
      for(const a of row.amount){if(!a||typeof a.unit!=='string'||!(a.unit==='lovelace'||/^[a-f0-9]{56}(?:[a-f0-9]{2}){0,32}$/.test(a.unit))||!quantity(a.quantity)||units.has(a.unit))throw Error('Malformed asset amount');units.add(a.unit);balance[a.unit]=(BigInt(balance[a.unit]||'0')+BigInt(a.quantity)).toString();}
      if(!units.has('lovelace'))throw Error('Funding input lacks lovelace');
      utxos.push({txHash:row.tx_hash,index:row.output_index,address,amount:row.amount.map(a=>({unit:a.unit,quantity:a.quantity})),hasDatum:row.data_hash!=null||row.inline_datum!=null,hasReferenceScript:row.reference_script_hash!=null});
    }
    if(rows.length<100){complete=true;break;}
  }
  if(!complete)throw Error('Wallet pagination exceeds bounded observation; no partial balance returned');
  const after=await get('/blocks/latest');if(after?.hash!==before.hash||after?.height!==before.height||after?.epoch!==before.epoch||after?.slot!==before.slot)throw Error('Chain context changed; re-observe without dispatch');
  const latestBlock={hash:before.hash,height:before.height,slot:before.slot,epoch:before.epoch,time:before.time};
  return {schema:'mew.preprod-wallet-observation.v1',network:'cardano:preprod',provider:'blockfrost',observedAt:new Date(nowMs).toISOString(),address,latestBlock,parameters:{epoch:parameters.epoch,minFeeA:parameters.min_fee_a,minFeeB:parameters.min_fee_b,coinsPerUtxoByte:parameters.coins_per_utxo_size},utxos,balanceByUnit:balance,complete:true,paymentsEnabled:false,activationReady:false,limitations:['Provider observation is not atomic chain state or wallet ownership proof','Recheck selected inputs and global locks immediately before external signing','No coin selection, final fee calculation, collateral selection or contract audit','Native-token balances do not enter the lovelace-only MEW kernel']};
}
