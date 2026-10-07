import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {verifyFrozenBenchmark} from '../src/learning/benchmark.mjs';
import {validateAdvisoryOutput} from '../src/learning/advisory-output.mjs';
const dir=process.argv[2];if(!dir)throw Error('Frozen benchmark directory required');
const raw=await readFile(`${dir}/benchmark.json`),manifest=JSON.parse(await readFile(`${dir}/manifest.json`));
const benchmark=verifyFrozenBenchmark(raw,manifest),expected=new Map(benchmark.cases.map(c=>[c.id,c])),sourceIds=new Set(benchmark.sources.map(s=>s.id));
const retrieval=JSON.parse(await readFile(`${dir}/retrieval-evaluation.json`));
if(retrieval.benchmarkSha256!==manifest.sha256)throw Error('Retrieval benchmark mismatch');
const rankings=new Map(retrieval.cases.map(c=>[c.id,c.results.map(r=>r.id)]));
const runs=[];
for(const file of ['base-responses.jsonl','prompt-v2-responses.jsonl']){
 const bytes=await readFile(`${dir}/${file}`);if(bytes.length>1048576)throw Error('Run too large');
 const seen=new Set(),cases=bytes.toString('utf8').trim().split('\n').map(line=>{
  const row=JSON.parse(line),label=expected.get(row.id);
  if(!label||seen.has(row.id)||row.benchmarkSha256!==manifest.sha256||row.language!==label.language||row.languageModelInvoked!==true||!Array.isArray(row.retrievedSourceIds)||row.retrievedSourceIds.some(id=>!sourceIds.has(id))||new Set(row.retrievedSourceIds).size!==row.retrievedSourceIds.length)throw Error('Unbound or duplicate run case');
  const ids=rankings.get(row.id);
  if(!ids||JSON.stringify(ids)!==JSON.stringify(row.retrievedSourceIds)||row.adapterUsed!==false||row.generationMaxTokens!==(file==='base-responses.jsonl'?256:512))throw Error('Legacy experiment settings mismatch');
  seen.add(row.id);const result=validateAdvisoryOutput(row.response,row.retrievedSourceIds);
  return {id:row.id,language:row.language,strictContractValid:result.valid,errors:result.errors,referenceStatus:result.referenceStatus,abstentionStatus:result.abstentionStatus,semanticStatus:result.semanticStatus,evidenceGrounded:result.evidenceGrounded};
 });
 if(seen.size!==expected.size)throw Error('Incomplete benchmark run');
 runs.push({file,sha256:createHash('sha256').update(bytes).digest('hex'),cases,strictContractPasses:cases.filter(c=>c.strictContractValid).length,semanticPasses:null});
}
const report={schema:'mew.advisory-run-audit.v2',benchmarkSha256:manifest.sha256,languageModelInvoked:false,trainingAuthorized:false,promotionAllowed:false,runs,limitations:['This regrades preserved model responses; it does not run a model.','Source-ID validity does not prove entailment.','Run hashes fingerprint provided artifacts; model execution, actual prompt and supplied context are not independently attested.','Semantic verdicts require trace review; null is unmeasured, not zero.']};
await writeFile(`${dir}/advisory-run-audit-v2.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(runs.map(r=>({file:r.file,cases:r.cases.length,strictContractPasses:r.strictContractPasses,semanticPasses:r.semanticPasses})),null,2));
