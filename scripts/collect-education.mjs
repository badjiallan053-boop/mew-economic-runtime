import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const registryFile = new URL('../research/education/registry.json', import.meta.url);
const sha = value => createHash('sha256').update(value).digest('hex');
const integer = value => Number.isSafeInteger(value) && value >= 0;
const clean = (value, max = 300) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) throw Error('Invalid bounded source text');
  return value.trim().replace(/<[^>]*>/gu, '').replace(/\s+/gu, ' ');
};
const https = value => {const u = new URL(value); if (u.protocol !== 'https:' || u.username || u.password || u.hash) throw Error('Invalid public reference URL'); return u.href;};
const date = value => {if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value) || new Date(value).toISOString().slice(0,10) !== value) throw Error('Invalid publication date'); return `${value}T00:00:00.000Z`;};
const common = (source, observedAt) => ({schema:'mew.education-observation.v1', sourceId:source.id, sourceUrl:source.url, observedAt, availableAt:observedAt, eventAt:observedAt, summary:source.summary, workflowRole:source.workflowRole, license:{...source.license,trainingReuseApproved:false}, freshForSeconds:source.freshForSeconds, authority:'advisory-only', trainingEligible:false, sourceTextUntrusted:true});

// No source text is interpreted as instructions. All fields are explicit projections.
export function normalizeEducation(source, data, observedAt) {
  if (!Number.isFinite(Date.parse(observedAt))) throw Error('Invalid observation time');
  const base = common(source, observedAt);
  if (source.kind === 'course' || source.kind === 'repository') {
    if (typeof data !== 'string' || !data.trim() || (source.match && !data.includes(source.match))) throw Error('Reference identity not found');
    return [{...base,id:`${source.id}:${observedAt}`,title:source.title,referenceUrl:source.referenceUrl ?? source.url,grain:`${source.kind}_reference`,reviewStatus:'source-reviewed',commit:source.commit ?? null}];
  }
  if (source.kind === 'tip') {
    if (!Array.isArray(data) || data.length !== 1 || Object.keys(data[0]).some(k => !['block_no','abs_slot','block_time'].includes(k)) || !['block_no','abs_slot','block_time'].every(k => integer(data[0][k])) || data[0].block_time*1000 > Date.parse(observedAt)+300000) throw Error('Invalid projected network tip');
    return [{...base,id:`${source.id}:${data[0].block_no}:${observedAt}`,title:source.title,referenceUrl:source.url,grain:'network_tip',reviewStatus:'discovery-only',network:'preprod',metrics:{blockHeight:data[0].block_no,absoluteSlot:data[0].abs_slot,blockTime:data[0].block_time},eventAt:new Date(data[0].block_time*1000).toISOString()}];
  }
  let items;
  if (source.kind === 'crossref') {
    if (data?.status !== 'ok' || data['message-type'] !== 'work-list' || !Array.isArray(data.message?.items) || data.message.items.length > 4) throw Error('Invalid Crossref envelope');
    items = data.message.items.map(r => {
      if (Object.keys(r).some(k => !['DOI','title','published','type','license'].includes(k)) || typeof r.DOI !== 'string' || !/^10\.\d{4,9}\/[^\s]{1,180}$/iu.test(r.DOI) || !Array.isArray(r.title) || r.title.length < 1 || r.title.length > 4) throw Error('Unexpected Crossref projection');
      const parts = r.published?.['date-parts'];
      if (!Array.isArray(parts) || parts.length !== 1 || !Array.isArray(parts[0]) || parts[0].length < 1 || parts[0].length > 3 || parts[0].some(n => !integer(n))) throw Error('Invalid publication parts');
      const [year,month=1,day=1] = parts[0];
      if (year < 1900 || year > 2100) throw Error('Invalid publication year');
      const eventAt = date(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`);
      return {key:r.DOI.toLowerCase(),title:clean(r.title[0]),alternativeTitles:r.title.slice(1).map(t=>clean(t)),referenceUrl:`https://doi.org/${encodeURIComponent(r.DOI)}`,eventAt,publicationPrecision:parts[0].length === 1 ? 'year' : parts[0].length === 2 ? 'month' : 'day',workType:clean(r.type,64)};
    });
  } else if (source.kind === 'openalex') {
    if (!Array.isArray(data?.results) || data.results.length > 4 || data.meta?.page !== 1) throw Error('Invalid OpenAlex envelope');
    items = data.results.map(r => {
      if (Object.keys(r).some(k => !['id','doi','title','publication_date','type'].includes(k)) || typeof r.id !== 'string' || !/^https:\/\/openalex.org\/W\d+$/u.test(r.id)) throw Error('Unexpected OpenAlex projection');
      if (r.doi !== null && (typeof r.doi !== 'string' || !/^https:\/\/doi.org\/10\.\d{4,9}\/[^\s]+$/iu.test(r.doi))) throw Error('Invalid OpenAlex DOI');
      return {key:r.id.split('/').at(-1),title:clean(r.title),referenceUrl:https(r.doi ?? r.id),eventAt:date(r.publication_date),publicationPrecision:'day',workType:clean(r.type,64)};
    });
  } else throw Error('Unsupported education source');
  if (new Set(items.map(r=>r.key)).size !== items.length || items.some(r=>Date.parse(r.eventAt)>Date.parse(observedAt))) throw Error('Duplicate or future research metadata');
  return items.map(({key,...item})=>({...base,...item,id:`${source.id}:${key}:${observedAt}`,grain:'work_metadata',reviewStatus:'discovery-only'}));
}

export function educationContext(records, asOf, limit=30) {
  if (!Array.isArray(records) || records.length > 30 || !Number.isFinite(Date.parse(asOf)) || !Number.isSafeInteger(limit) || limit < 1 || limit > 30) throw Error('Invalid education context');
  const cutoff=Date.parse(asOf),ids=new Set();
  for (const r of records) {
    if (r.schema !== 'mew.education-observation.v1' || r.authority !== 'advisory-only' || r.trainingEligible !== false || r.license?.trainingReuseApproved !== false || r.sourceTextUntrusted !== true || typeof r.id !== 'string' || ids.has(r.id) || !integer(r.freshForSeconds) || r.freshForSeconds < 1 || !Number.isFinite(Date.parse(r.availableAt)) || !Number.isFinite(Date.parse(r.eventAt))) throw Error('Unbound education record');
    ids.add(r.id); https(r.referenceUrl);
  }
  const eligible=records.filter(r=>Date.parse(r.availableAt)<=cutoff && Date.parse(r.eventAt)<=cutoff && cutoff-Date.parse(r.availableAt)<=r.freshForSeconds*1000);
  return {schema:'mew.education-context.v1',asOf,authority:'advisory-only',sourceTextUntrusted:true,trainingAuthorized:false,modelActivationAllowed:false,paymentsEnabled:false,evidence:eligible.slice(0,limit).map(r=>({id:r.id,sourceId:r.sourceId,source:r.referenceUrl,kind:'untrusted-public-observation',content:JSON.stringify(r)})),excludedRecords:records.length-eligible.length,omittedForBudget:Math.max(0,eligible.length-limit),selection:'Fixed reviewed registry plus bounded discovery; not representative or authoritative.'};
}

export async function collectEducation({root='research/education',now,fetchImpl=fetch}={}) {
  if ((now !== undefined && (!(now instanceof Date) || !Number.isFinite(now.getTime()))) || typeof fetchImpl !== 'function') throw Error('Invalid collection options');
  const clock=now === undefined ? ()=>new Date() : ()=>new Date(now.getTime());
  const startedAt=clock().toISOString(), registryBytes=await readFile(registryFile), registry=JSON.parse(registryBytes);
  if (registry.schema !== 'mew.education-registry.v1' || registry.automaticTraining !== false || registry.maxRecords !== 30 || registry.sources.length > 20) throw Error('Invalid reviewed registry');
  // Caller cannot supply destinations. Source names and exact URLs are reviewed in this file's adjacent registry.
  const hosts=new Set(['cs251.stanford.edu','cs229.stanford.edu','web.stanford.edu','cs336.stanford.edu','raw.githubusercontent.com','api.crossref.org','api.openalex.org','preprod.koios.rest']);
  const manifest=[],records=[];
  for (const source of registry.sources) {
    const url=new URL(https(source.url)); if (!hosts.has(url.hostname)) throw Error('Registry host outside public allowlist');
    const entry={sourceId:source.id,url:source.url,requestedAt:clock().toISOString(),observedAt:null,kind:source.kind,status:'unavailable',records:0,freshForSeconds:source.freshForSeconds,scope:source.kind === 'tip' ? 'network aggregate only' : ['crossref','openalex'].includes(source.kind) ? 'projected bibliographic metadata; no authors, abstracts or full text' : 'identity check and MEW-owned summary; raw source not retained'};
    try {
      const response=await fetchImpl(source.url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:['course','repository'].includes(source.kind)?'text/html,text/plain':'application/json','User-Agent':'MEW-bounded-education/1.0 (https://github.com/badjiallan053-boop/mew-economic-runtime)'}});
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      if (response.redirected || (response.url && response.url !== source.url)) throw Error('Redirected or substituted source');
      const reader=response.body?.getReader(); if (!reader) throw Error('Source has no readable body');
      const chunks=[];let size=0;
      try {for (;;) {const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1048576)throw Error('Source exceeds 1 MiB');chunks.push(Buffer.from(value));}} finally {await reader.cancel();}
      const bytes=Buffer.concat(chunks), isText=['course','repository'].includes(source.kind);
      entry.observedAt=clock().toISOString();
      const rows=normalizeEducation(source,isText?bytes.toString('utf8'):JSON.parse(bytes),entry.observedAt);
      if (records.length+rows.length>registry.maxRecords) throw Error('Snapshot record budget exceeded');
      entry.responseSha256=sha(bytes);entry.responseBytes=bytes.length;entry.records=rows.length;entry.status='collected';records.push(...rows.map(r=>({...r,sourceResponseSha256:entry.responseSha256})));
    } catch (error) {
      // Do not persist arbitrary provider exception text, tokens, returned bodies or redirected URLs.
      entry.reason=/^HTTP \d{3}$/u.test(error.message)?error.message:['Source exceeds 1 MiB','Redirected or substituted source'].includes(error.message)?error.message:'Retrieval or projection validation failed';
    }
    manifest.push(entry);
  }
  const asOf=clock().toISOString(), context=educationContext(records,asOf), lines=records.map(r=>JSON.stringify(r)).join('\n')+(records.length?'\n':''),manifestText=JSON.stringify(manifest,null,2)+'\n';
  const quality={schema:'mew.education-quality.v1',startedAt,asOf,recordCount:records.length,recordsSha256:sha(lines),manifestSha256:sha(manifestText),registrySha256:sha(registryBytes),succeeded:manifest.filter(r=>r.status==='collected').length,unavailable:manifest.filter(r=>r.status!=='collected').length,complete:manifest.every(r=>r.status==='collected'),trainingAuthorized:false,modelActivationAllowed:false,paymentsEnabled:false,sourceTextUntrusted:true,limitations:['Course labels and reviewed summaries do not establish model competence.','Metadata search results require relevance and full-source review.','Network tip is an indexer observation, never settlement or delivery evidence.','No full text, raw captions, identities, wallet addresses or keys are published.','No retraining, benchmark mutation, signer or deployment is triggered.']};
  const dir=resolve(root,startedAt.replaceAll(':','-').replaceAll('.','-'));await mkdir(root,{recursive:true});await mkdir(dir);
  await writeFile(`${dir}/records.jsonl`,lines,{flag:'wx'});await writeFile(`${dir}/manifest.json`,manifestText,{flag:'wx'});await writeFile(`${dir}/quality.json`,JSON.stringify(quality,null,2)+'\n',{flag:'wx'});await writeFile(`${dir}/advisory-input.json`,JSON.stringify(context,null,2)+'\n',{flag:'wx'});
  return {...quality,directory:dir};
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if (process.argv.length>2) throw Error('This bounded collector accepts no arbitrary source URLs or credentials.');
  console.log(JSON.stringify(await collectEducation(),null,2));
}
