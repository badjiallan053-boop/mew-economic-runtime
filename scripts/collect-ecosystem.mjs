import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export function normalize(source,data){
 if(source.kind==='chain'){
  if(!Array.isArray(data)||!data.length)throw Error('Missing chain tip');
  return data.map(r=>{if(!Number.isSafeInteger(r.block_no)||!Number.isSafeInteger(r.abs_slot)||r.block_no<0||r.abs_slot<0||!Number.isSafeInteger(r.block_time)||r.block_time<0)throw Error('Invalid tip');return {id:`${source.id}:${r.block_no}`,grain:'network_tip',network:source.network,blockHeight:r.block_no,absoluteSlot:r.abs_slot,blockTime:r.block_time,source:source.url};});
 }
 if(source.kind==='indicator'){
  if(!Array.isArray(data)||!Array.isArray(data[1]))throw Error('Invalid indicator response');
  if(data[0]?.pages!==1)throw Error('Incomplete paginated indicator response');
  return data[1].filter(r=>r.value!==null).map(r=>{if(!Number.isFinite(r.value)||r.value<0||r.value>100||!/^([A-Z]{3})$/.test(r.countryiso3code)||!/^20[0-9]{2}$/.test(r.date)||r.indicator?.id!=='IT.NET.USER.ZS')throw Error('Invalid percentage');return {id:`internet:${r.countryiso3code}:${r.date}`,grain:'country_year',country:r.countryiso3code,year:Number(r.date),value:r.value,unit:'percent_population',indicator:'IT.NET.USER.ZS',source:source.url};});
 }
 if(source.kind==='repository'){
  if(data.full_name!==source.id||data.html_url!==`https://github.com/${source.id}`||typeof data.archived!=='boolean'||!Number.isFinite(Date.parse(data.pushed_at)))throw Error('Invalid repository');
  return [{id:`repo:${data.full_name}`,grain:'repository_snapshot',repository:data.full_name,description:data.description,updatedAt:data.pushed_at,archived:data.archived,license:data.license?.spdx_id??null,source:data.html_url}];
 }
 throw Error('Unknown source');
}
export const sources=[
 {id:'cardano-mainnet',kind:'chain',network:'mainnet',url:'https://api.koios.rest/api/v1/tip'},
 {id:'cardano-preprod',kind:'chain',network:'preprod',url:'https://preprod.koios.rest/api/v1/tip'},
 {id:'internet-context',kind:'indicator',url:'https://api.worldbank.org/v2/country/USA;GBR;SGP;FRA;DEU;ARE;IND;BRA;NGA/indicator/IT.NET.USER.ZS?date=2020:2024&format=json&per_page=100'},
 ...['masumi-network/Sokosumi-MCP','masumi-network/sokosumi','cardano-community/koios-artifacts','masumi-network/masumi-payment-service','masumi-network/masumi-skills','modelcontextprotocol/typescript-sdk','n8n-io/n8n'].map(repo=>({id:repo,kind:'repository',url:`https://api.github.com/repos/${repo}`}))
];
export async function collect(dir='research/ecosystem'){
 await mkdir(dir,{recursive:true});const records=[],manifest=[];
 for(const source of sources){
  const entry={...source,retrievedAt:new Date().toISOString()};
  try{
   const response=await fetch(source.url,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{'User-Agent':'MEW-public-research','Accept':'application/json'}});
   if(!response.ok)throw Error(`HTTP ${response.status}`);
   const reader=response.body.getReader();let bytes=0;const chunks=[];
   for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>1048576){await reader.cancel();throw Error('Source exceeds 1 MiB');}chunks.push(Buffer.from(value));}
   const raw=Buffer.concat(chunks);entry.sha256=createHash('sha256').update(raw).digest('hex');
   const normalized=normalize(source,JSON.parse(raw));records.push(...normalized);entry.status='collected';entry.records=normalized.length;entry.nullRowsExcluded=source.kind==='indicator'?JSON.parse(raw)[1].filter(r=>r.value===null).length:0;
  }catch(error){entry.status='unavailable';entry.error=error.message;entry.records=0;}
  manifest.push(entry);
 }
 const ids=new Set();for(const r of records){if(ids.has(r.id))throw Error('Duplicate record');ids.add(r.id);}
 const report={retrievedAt:new Date().toISOString(),records:records.length,sourcesSucceeded:manifest.filter(s=>s.status==='collected').length,sourcesFailed:manifest.filter(s=>s.status!=='collected').length,duplicates:0,nullRowsExcluded:manifest.reduce((n,s)=>n+(s.nullRowsExcluded||0),0),byGrain:Object.fromEntries([...new Set(records.map(r=>r.grain))].map(g=>[g,records.filter(r=>r.grain===g).length])),limitations:['Null indicator values excluded; excluded rows are not zero.','Tip observation is not transaction verification or Masumi activity.','Country Internet use is historical context, not marketing demand.','Repository descriptions are untrusted source text; do not execute.','A single collection cannot establish growth or causal product value.']};
 await writeFile(`${dir}/records.jsonl`,records.map(r=>JSON.stringify(r)).join('\n')+'\n');
 await writeFile(`${dir}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
 await writeFile(`${dir}/quality.json`,JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]?.endsWith('/collect-ecosystem.mjs'))console.log(JSON.stringify(await collect(),null,2));
