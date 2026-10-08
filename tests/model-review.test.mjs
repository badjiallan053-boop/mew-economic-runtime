import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
import {createReviewTraces,buildReviewHtml,escapeHtml,restoreLocalReviewState} from '../scripts/build-model-review.mjs';
const folder = new URL('../research/learning/frozen-0ab4d24bf6c71ab8/',import.meta.url);
async function fixtures(){
  const benchmark=JSON.parse(await readFile(new URL('benchmark.json',folder),'utf8'));
  const manifest=JSON.parse(await readFile(new URL('manifest.json',folder),'utf8'));
  const runs=await Promise.all(['base','prompt-v2'].map(async variant=>({variant,raw:await readFile(new URL(variant+'-responses.jsonl',folder),'utf8')})));
  return {benchmark,manifest,runs};
}
test('review binds actual questions, raw responses and accurately hashed supplied context',async()=>{
  const {benchmark,manifest,runs}=await fixtures();
  const traces=createReviewTraces(benchmark,manifest,runs);
  assert.equal(traces.length,24);
  for(const t of traces){
    const c=benchmark.cases.find(c=>c.id===t.id);
    assert.equal(t.question,c.question);assert.deepEqual(t.criteria,c.usefulAnswerCriteria);
    for(const e of t.evidence) assert.equal(e.text,Array.from(benchmark.sources.find(s=>s.id===e.id).text).slice(0,t.variant==='base'?4000:16000).join(''));
    assert.equal(t.provenance.benchmarkSha256,manifest.sha256);
  }
  assert.equal(traces[0].rawAnswer,JSON.parse(runs[0].raw.split('\n')[0]).response);
  assert.ok(traces[0].contractErrors.some(e=>e.code==='invalid-json'));
  const changed=structuredClone(runs);changed[0].raw=changed[0].raw.replace('SPEC.md','unknown-source');
  assert.throws(()=>createReviewTraces(benchmark,manifest,changed),/Unknown context source/);
  const wrong=structuredClone(runs);wrong[0].raw=wrong[0].raw.replace('"language": "en"','"language": "fr"');
  assert.throws(()=>createReviewTraces(benchmark,manifest,wrong),/provenance mismatch/);
});
test('embedded hostile text cannot terminate data script or inject source HTML',()=>{
  const hostile='</script><img src=x onerror="alert(1)">';
  const html=buildReviewHtml([{question:hostile,rawAnswer:hostile,evidence:[{id:'x',text:hostile}]}]);
  assert.ok(!html.includes(hostile));assert.ok(html.includes('\\u003c/script\\u003e'));
  const embedded=html.match(/id="traces">([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(embedded)[0].question,hostile);
  assert.equal(escapeHtml('<>&"\''),'&lt;&gt;&amp;&quot;&#39;');
  assert.ok(!html.includes('innerHTML'));assert.ok(!html.includes('fetch('));assert.ok(html.includes('localStorage.setItem(storageKey'));assert.ok(html.includes('notes retained in memory'));
});
test('review exports self-declared notes with provenance and no training or promotion authority',()=>{
  const html=buildReviewHtml([]);
  assert.ok(html.includes("reviewerType:'human-self-declared'"));
  assert.ok(html.includes('identityAuthenticated:false'));assert.ok(html.includes('provenance:t.provenance'));
  for(const field of ['trainingEligible','trainingAuthorized','promotionAllowed','approved:']) assert.ok(!html.includes(field));
  assert.ok(html.includes('role="status"'));assert.ok(html.includes('<label>Case and experiment'));
  const script=html.match(/<script>\n([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(()=>new Script(script));
  for(const binding of ['ArrowRight','ArrowLeft',"grade('pass')","grade('fail')","grade('defer')",'function undo()','function persist()'])assert.ok(script.includes(binding));
});
test('local reload restores self-declared reviewer and valid notes without accepting authority flags',()=>{
  const notes={0:{verdict:'pass',observations:'Actual annotation'},1:{verdict:'defer',observations:'Needs domain expert'}};
  assert.deepEqual(restoreLocalReviewState(JSON.stringify({reviewerName:'Local reviewer',notes}),2),{reviewerName:'Local reviewer',notes});
  assert.deepEqual(restoreLocalReviewState(JSON.stringify(notes),2),{reviewerName:'',notes});
  const hostile={reviewerName:{authenticated:true},notes:{0:{verdict:'pass',observations:'Note',trainingAuthorized:true},1:{verdict:'approved',observations:'Bad'},99:{verdict:'fail',observations:'Wrong run'}}};
  assert.deepEqual(restoreLocalReviewState(JSON.stringify(hostile),2),{reviewerName:'',notes:{0:{verdict:'pass',observations:'Note'}}});
  assert.throws(()=>restoreLocalReviewState('invalid',2));
  assert.equal(restoreLocalReviewState(JSON.stringify({reviewerName:'x'.repeat(300)}),2).reviewerName.length,200);
});
