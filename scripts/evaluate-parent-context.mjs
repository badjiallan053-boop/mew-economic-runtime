import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {verifyFrozenBenchmark} from '../src/learning/benchmark.mjs';
import {paragraphChunks,fitChunkRetrieval,searchChunks} from '../src/learning/chunk-retrieval.mjs';
import {selectParentContexts} from '../src/learning/parent-context.mjs';
const dir=process.argv[2];if(!dir)throw Error('Frozen benchmark directory required');
const raw=await readFile(`${dir}/benchmark.json`),manifest=JSON.parse(await readFile(`${dir}/manifest.json`));
const b=verifyFrozenBenchmark(raw,manifest), denseRaw=await readFile(`${dir}/multilingual-retrieval-evaluation-canonical-verified.json`),dense=JSON.parse(denseRaw);
if(dense.benchmarkSha256!==manifest.sha256||dense.sourceSnapshotDigest!==b.sourceSnapshotDigest||dense.canonicalInputVerified!==true||dense.cases.length!==b.cases.length)throw Error('Dense receipt mismatch');
const inputRaw=await readFile(`${dir}/multilingual-ranking-input.json`), input=JSON.parse(inputRaw);
const expected={schema:'mew.multilingual-ranking-input.v1',benchmarkSha256:manifest.sha256,sourceSnapshotDigest:b.sourceSnapshotDigest,offsetUnit:'UTF-16 code units',chunks:paragraphChunks(b.sources),queries:b.cases.map(({id,language,question})=>({id,language,question}))};
if(JSON.stringify(input)!==JSON.stringify(expected)||dense.rankingInputSha256!==createHash('sha256').update(inputRaw).digest('hex')||new Set(dense.cases.map(c=>c.id)).size!==b.cases.length)throw Error('Canonical ranking input mismatch');
const chunkMap=new Map(expected.chunks.map(c=>[c.id,c]));
for(const row of dense.cases){
 if(!Array.isArray(row.results)||row.results.length!==3||new Set(row.results.map(r=>r.id)).size!==3)throw Error('Dense receipt must contain exactly three unique hits');
 for(const hit of row.results){const canonical=chunkMap.get(hit.id);if(!canonical||Object.entries(canonical).some(([k,v])=>hit[k]!==v))throw Error('Dense hit differs from canonical chunk');}
}
const model=fitChunkRetrieval(b.sources),runs=[];
for(const maxParents of [1,2,3]){
 const cases=b.cases.map(c=>{
  const matches=dense.cases.filter(x=>x.id===c.id);if(matches.length!==1||matches[0].language!==c.language)throw Error('Dense case mismatch');
  const selection=selectParentContexts(b.sources,[matches[0].results,searchChunks(model,c.question,3)],{maxParents,maxChars:20000});
  // Only after context selection are the frozen labels consulted.
  const covered=c.supportingEvidenceSpans.filter(s=>selection.contexts.some(r=>r.sourceId===s.sourceId&&r.start<=s.start&&r.end>=s.end));
  return {id:c.id,language:c.language,...selection,allEvidenceCovered:covered.length===c.supportingEvidenceSpans.length,evidenceSpanRecall:covered.length/c.supportingEvidenceSpans.length};
 });
 const metrics=lang=>{const rows=cases.filter(c=>!lang||c.language===lang);return {cases:rows.length,allEvidenceCovered:rows.filter(c=>c.allEvidenceCovered).length,maxContextChars:Math.max(...rows.map(c=>c.usedChars)),meanContextChars:rows.reduce((n,c)=>n+c.usedChars,0)/rows.length};};
 runs.push({maxParents,overall:metrics(),byLanguage:{en:metrics('en'),fr:metrics('fr')},cases});
}
const report={schema:'mew.parent-context-evaluation.v1',benchmarkSha256:manifest.sha256,sourceSnapshotDigest:b.sourceSnapshotDigest,denseReceiptSha256:createHash('sha256').update(denseRaw).digest('hex'),algorithm:'RRF per-source first occurrence, dense top3 plus lexical top3; complete parent expansion',maxChars:20000,offsetUnit:'UTF-16 code units',languageModelInvoked:false,runs,limitations:['Expanded document context coverage is not top3 paragraph retrieval accuracy.','Development configurations chosen after inspecting failures; not independent holdout.','Full prompt token fit is checked separately; no answer improvement measured.','Cached dense rankings from previous local experiment; no new encoder or generator training.']};
await writeFile(`${dir}/parent-context-evaluation.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(runs.map(({maxParents,overall,byLanguage})=>({maxParents,overall,byLanguage})),null,2));
