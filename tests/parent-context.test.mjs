import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {selectParentContexts} from '../src/learning/parent-context.mjs';
const sources=[{id:'a',text:'Before. Exact evidence. After.'},{id:'b',text:'Other source'}];
const hit=(id,start,end,score=1)=>{const s=sources.find(s=>s.id===id);return {sourceId:id,sourceSha256:createHash('sha256').update(s.text).digest('hex'),start,end,text:s.text.slice(start,end),score};};
test('parent expansion preserves unselected neighboring evidence and full source binding',()=>{const r=selectParentContexts(sources,[[hit('a',0,7)]]);assert.equal(r.contexts[0].text,sources[0].text);assert.equal(r.contexts[0].start,0);assert.equal(r.contexts[0].end,sources[0].text.length);assert.equal(r.selectionUsesGoldLabels,false);});
test('duplicate children do not amplify source votes; fusion and ties are deterministic',()=>{const r=selectParentContexts(sources,[[hit('a',0,7),hit('a',8,22),hit('b',0,5)],[hit('b',0,5)]],{maxParents:1});assert.equal(r.contexts[0].sourceId,'b');assert.deepEqual(r,selectParentContexts(sources,[[hit('a',0,7),hit('a',8,22),hit('b',0,5)],[hit('b',0,5)]],{maxParents:1}));});
test('budget excludes whole parents without silently truncating text',()=>{const r=selectParentContexts(sources,[[hit('a',0,7),hit('b',0,5)]],{maxChars:12});assert.equal(r.omitted[0].sourceId,'a');assert.equal(r.contexts[0].sourceId,'b');assert.equal(r.usedChars,12);});
test('rejects forged, stale or nonfinite ranking inputs before context acceptance',()=>{for(const patch of [{text:'forged'},{sourceSha256:'0'.repeat(64)},{start:-1},{end:99},{score:NaN},{sourceId:'unknown'}])assert.throws(()=>selectParentContexts(sources,[[{...hit('a',0,7),...patch}]]));assert.throws(()=>selectParentContexts([...sources,sources[0]],[]));});

test('saved expanded contexts and token receipts bind the frozen source and preserve all gold spans',async()=>{
 const {readFile}=await import('node:fs/promises');const {verifyFrozenBenchmark}=await import('../src/learning/benchmark.mjs');
 const dir='research/learning/frozen-0ab4d24bf6c71ab8';const raw=await readFile(`${dir}/benchmark.json`);const manifest=JSON.parse(await readFile(`${dir}/manifest.json`));const b=verifyFrozenBenchmark(raw,manifest);
 const reportRaw=await readFile(`${dir}/parent-context-evaluation.json`),report=JSON.parse(reportRaw);const fit=JSON.parse(await readFile(`${dir}/parent-context-token-fit.json`));
 assert.equal(fit.parentReportSha256,createHash('sha256').update(reportRaw).digest('hex'));assert.equal(fit.benchmarkSha256,manifest.sha256);assert.equal(report.benchmarkSha256,manifest.sha256);
 const run=report.runs.find(r=>r.maxParents===3);assert.equal(run.cases.length,12);assert.equal(new Set(run.cases.map(c=>c.id)).size,12);
 for(const c of run.cases){const gold=b.cases.find(x=>x.id===c.id);for(const r of c.contexts){const s=b.sources.find(x=>x.id===r.sourceId);assert.equal(r.text,s.text);assert.equal(r.sourceSha256,createHash('sha256').update(s.text).digest('hex'));}assert.ok(gold.supportingEvidenceSpans.every(s=>c.contexts.some(r=>r.sourceId===s.sourceId&&r.start<=s.start&&r.end>=s.end)));const tokens=fit.cases.find(x=>x.id===c.id&&x.maxParents===3);assert.ok(tokens.inputTokens+tokens.outputReserveTokens<=tokens.totalBudgetTokens);assert.ok(c.usedChars<=c.maxChars);}
 assert.equal(fit.languageModelInvoked,false);
});
