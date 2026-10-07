import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {collectEducation,normalizeEducation,educationContext} from '../scripts/collect-education.mjs';
const registry=JSON.parse(await readFile(new URL('../research/education/registry.json',import.meta.url)));
const asOf='2026-10-08T03:00:00.000Z';
const source=registry.sources.find(r=>r.kind==='crossref');
const envelope={status:'ok','message-type':'work-list',message:{items:[{DOI:'10.1234/safety',title:['Agent transaction safety'],published:{'date-parts':[[2025,3,2]]},type:'journal-article',license:[]}]}};
const sha=s=>createHash('sha256').update(s).digest('hex');

test('education discovery rejects personal fields, malformed publication dates, future and duplicate metadata',()=>{
  const rows=normalizeEducation(source,envelope,asOf);assert.equal(rows[0].trainingEligible,false);assert.equal(rows[0].authority,'advisory-only');assert.equal(rows[0].reviewStatus,'discovery-only');assert.match(rows[0].referenceUrl,/^https:\/\/doi.org\//);
  const multilingual=structuredClone(envelope);multilingual.message.items[0].title.push('Évaluation de la sécurité des agents');assert.deepEqual(normalizeEducation(source,multilingual,asOf)[0].alternativeTitles,['Évaluation de la sécurité des agents']);
  const personal=structuredClone(envelope);personal.message.items[0].author=[{email:'private@example.invalid'}];assert.throws(()=>normalizeEducation(source,personal,asOf),/projection/);
  const badDate=structuredClone(envelope);badDate.message.items[0].published['date-parts']=[[2025,2,30]];assert.throws(()=>normalizeEducation(source,badDate,asOf),/publication date/);
  const future=structuredClone(envelope);future.message.items[0].published['date-parts']=[[2027]];assert.throws(()=>normalizeEducation(source,future,asOf),/future/);
  const duplicate=structuredClone(envelope);duplicate.message.items.push(duplicate.message.items[0]);assert.throws(()=>normalizeEducation(source,duplicate,asOf),/Duplicate/);
});

test('education context excludes stale observations and never exports activation or payment authority',()=>{
  const tip=registry.sources.find(r=>r.kind==='tip');const row=normalizeEducation(tip,[{block_no:123,abs_slot:456,block_time:Date.parse(asOf)/1000-10}],asOf)[0];
  assert.equal(educationContext([row],asOf).evidence.length,1);
  const stale=educationContext([row],'2026-10-08T03:10:01.000Z');assert.equal(stale.evidence.length,0);assert.equal(stale.excludedRecords,1);assert.equal(stale.trainingAuthorized,false);assert.equal(stale.paymentsEnabled,false);
  assert.throws(()=>educationContext([{...row,trainingEligible:true}],asOf),/Unbound/);
  assert.throws(()=>educationContext([row,row],asOf),/Unbound/);
  assert.throws(()=>normalizeEducation(tip,[{block_no:123,abs_slot:456,block_time:1,address:'addr_private'}],asOf),/projected/);
});

test('bounded collection retains provenance, failure gates and sanitized projections without raw source bodies',async()=>{
  const root=await mkdtemp(join(tmpdir(),'mew-education-')),calls=[];
  const fetchImpl=async(url,options)=>{
    calls.push(url);assert.equal(options.redirect,'error');assert.equal(options.signal instanceof AbortSignal,true);assert.equal(Object.hasOwn(options.headers,'Authorization'),false);
    const s=registry.sources.find(r=>r.url===url);assert.ok(s);
    if(s.kind==='course')return new Response(`${s.match} public course text private@example.invalid`,{status:200});
    if(s.kind==='repository')return new Response('# Public reference private@example.invalid',{status:200});
    if(s.kind==='crossref')return new Response(JSON.stringify(envelope),{status:200});
    if(s.kind==='tip')return new Response(JSON.stringify([{block_no:123,abs_slot:456,block_time:Date.parse(asOf)/1000-10}]),{status:200});
    throw Error('Provider response accidentally leaked token secret_xyz');
  };
  const result=await collectEducation({root,now:new Date(asOf),fetchImpl});assert.equal(calls.length,registry.sources.length);assert.equal(result.complete,false);assert.equal(result.unavailable,1);assert.equal(result.modelActivationAllowed,false);
  const lines=await readFile(join(result.directory,'records.jsonl'),'utf8'),manifest=await readFile(join(result.directory,'manifest.json'),'utf8');assert.equal(sha(lines),result.recordsSha256);assert.equal(sha(manifest),result.manifestSha256);assert.doesNotMatch(lines+manifest,/private@example|secret_xyz/);assert.equal((await readdir(result.directory)).length,4);
  await assert.rejects(collectEducation({root,now:new Date(asOf),fetchImpl}),/EEXIST/);
});

test('substituted redirects and oversized source bodies produce no usable records',async()=>{
  const root=await mkdtemp(join(tmpdir(),'mew-education-limit-'));let count=0;
  const fetchImpl=async()=>{
    count++;
    if(count%2){const r=new Response('reference');Object.defineProperty(r,'redirected',{value:true});return r;}
    return new Response('x'.repeat(1048577));
  };
  const result=await collectEducation({root,now:new Date(asOf),fetchImpl});assert.equal(result.recordCount,0);assert.equal(result.succeeded,0);assert.equal(result.unavailable,registry.sources.length);
  const context=JSON.parse(await readFile(join(result.directory,'advisory-input.json')));assert.deepEqual(context.evidence,[]);assert.equal(context.modelActivationAllowed,false);
});
