import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {normalizeLearning,auditLearning,balancedContext} from '../src/learning/dataset.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const stamp=date=>date.toISOString().slice(0,10).replaceAll('-','')+'00';
export async function collectLearning({now=new Date(),fetchImpl=fetch,root='research/learning'}={}){
 const run=now.toISOString().replaceAll(':','-').replaceAll('.','-');const dir=`${root}/${run}`;
 await mkdir(root,{recursive:true});await mkdir(dir);await mkdir(`${dir}/raw`);
 const records=[],manifest=[];
 async function read(source,body){
  const entry={...source,observedAt:new Date().toISOString(),method:body?'POST':'GET',requestBody:body??null};manifest.push(entry);
  try{
   const response=await fetchImpl(source.url,{method:entry.method,redirect:'error',signal:AbortSignal.timeout(20000),headers:{Accept:'application/json','User-Agent':'MEW-learning-research/1.0 (https://github.com/badjiallan053-boop/mew-economic-runtime)',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
   if(!response.ok)throw Error(`HTTP ${response.status}`);
   const reader=response.body.getReader();let count=0;const chunks=[];
   try{for(;;){const {done,value}=await reader.read();if(done)break;count+=value.byteLength;if(count>1048576)throw Error('Source exceeds 1 MiB');chunks.push(Buffer.from(value));}}finally{await reader.cancel();}
   const raw=Buffer.concat(chunks);const data=JSON.parse(raw);entry.observedAt=new Date().toISOString();entry.sha256=sha(raw);entry.bytes=raw.length;
   const rows=source.kind==='transaction-list'?[]:normalizeLearning(source,data,entry.observedAt);
   if(source.kind==='attention'&&(rows.length!==28||new Set(rows.map(r=>r.id)).size!==28))throw Error('Incomplete attention window');
   // tx_info uses server-side projection; no addresses, datum, metadata or source text are retained.
   if(source.kind==='transaction'&&data.length!==new Set(source.hashes).size)throw Error('Incomplete transaction details');
   if(source.kind==='transaction'&&data.some(r=>Object.keys(r).some(k=>!['tx_hash','block_hash','block_height','tx_timestamp','fee','total_output','valid_contract'].includes(k))))throw Error('Unexpected transaction projection');
   entry.status='collected';entry.records=rows.length;entry.rawFile=`raw/${sha(source.id).slice(0,16)}.json`;await writeFile(`${dir}/${entry.rawFile}`,raw,{flag:'wx'});records.push(...rows);return data;
  }catch(error){entry.status='unavailable';entry.reason=error.message;entry.records=0;return null;}
 }
 const end=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-2)),start=new Date(end.getTime()-27*86400000);
 for(const entity of ['Cardano_(blockchain_platform)','Artificial_intelligence','Intelligent_agent','Content_marketing'])await read({id:`attention:${entity}`,kind:'attention',entity,start:stamp(start),end:stamp(end),url:`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/user/${encodeURIComponent(entity)}/daily/${stamp(start)}/${stamp(end)}`});
 for(const entity of ['masumi-network/sokosumi','masumi-network/masumi-payment-service','cardano-community/koios-artifacts','modelcontextprotocol/typescript-sdk','n8n-io/n8n'])await read({id:`repository:${entity}`,kind:'repository',entity,url:`https://api.github.com/repos/${entity}`});
 for(const network of ['mainnet','preprod']){
  const base=network==='mainnet'?'https://api.koios.rest/api/v1':'https://preprod.koios.rest/api/v1';
  const blocks=await read({id:`blocks:${network}`,kind:'block',network,url:`${base}/blocks?limit=5&select=hash,block_height,block_time,tx_count`});if(!blocks)continue;
  const hashes=blocks.map(r=>r.hash);
  const list=await read({id:`transaction-list:${network}`,kind:'transaction-list',network,url:`${base}/block_txs?limit=20`},{_block_hashes:hashes});
  if(!Array.isArray(list)||!list.length||list.length>20||list.some(r=>!/^[a-f0-9]{64}$/.test(r.tx_hash)||!hashes.includes(r.block_hash))){manifest.push({id:`transactions:${network}`,status:'unavailable',reason:'No valid bounded transaction list',records:0});continue;}
  await read({id:`transactions:${network}`,kind:'transaction',network,hashes:list.map(r=>r.tx_hash),blocks:hashes,url:`${base}/tx_info?select=tx_hash,block_hash,block_height,tx_timestamp,fee,total_output`},{_tx_hashes:list.map(r=>r.tx_hash),_inputs:false,_metadata:false,_assets:false,_withdrawals:false,_certs:false,_scripts:false,_bytecode:false,_governance:false});
 }
 const quality=auditLearning(records,manifest);if(quality.duplicates)throw Error('Duplicate observation IDs');
 const lines=records.map(r=>JSON.stringify(r)).join('\n')+'\n';quality.snapshotSha256=sha(lines);quality.collectedAt=new Date().toISOString();quality.directory=dir;
 await writeFile(`${dir}/records.jsonl`,lines);await writeFile(`${dir}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');await writeFile(`${dir}/quality.json`,JSON.stringify(quality,null,2)+'\n');
 await writeFile(`${dir}/advisory-input.json`,JSON.stringify({schema:'mew.public-context.v1',asOf:quality.collectedAt,training:false,paymentsEnabled:false,...balancedContext(records,quality.collectedAt)},null,2)+'\n');
 await writeFile(`${dir}/label-queue.jsonl`,records.map(r=>JSON.stringify({id:r.id,groupId:r.grain==='article_day'?r.entity:r.network??r.entity,reviewStatus:'pending',reuseApproved:false,reviewerId:null,split:null,asOf:r.observedAt,evidence:[r],input:null,output:null})).join('\n')+'\n');
 return quality;
}
if(process.argv[1]?.endsWith('/collect-learning.mjs'))console.log(JSON.stringify(await collectLearning(),null,2));
