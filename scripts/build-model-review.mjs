import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {verifyFrozenBenchmark} from '../src/learning/benchmark.mjs';
import {validateAdvisoryOutput} from '../src/learning/advisory-output.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
export const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function restoreLocalReviewState(raw, traceCount) {
  const stored=JSON.parse(raw||'{}'), notes={};
  const candidates=stored.notes ?? stored;
  for(const [key,value] of Object.entries(candidates ?? {})){
    if(/^\d+$/.test(key)&&Number(key)<traceCount&&value&&['pass','fail','defer','unreviewed'].includes(value.verdict)&&typeof value.observations==='string')notes[key]={verdict:value.verdict,observations:value.observations};
  }
  return {reviewerName:typeof stored.reviewerName==='string'?stored.reviewerName.slice(0,200):'',notes};
}
// Match the recorded Python json.dumps(ensure_ascii=False, sort_keys=True).
const pythonJson = value => Array.isArray(value) ? '[' + value.map(pythonJson).join(', ') + ']' : value && typeof value === 'object' ? '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ': ' + pythonJson(value[k])).join(', ') + '}' : JSON.stringify(value);

export function createReviewTraces(benchmark, manifest, runs) {
  const sources = new Map(benchmark.sources.map(s => [s.id, s]));
  const cases = new Map(benchmark.cases.map(c => [c.id, c]));
  return runs.flatMap(({variant, raw}) => {
    const seen = new Set();
    return raw.trim().split('\n').map(line => {
      const row = JSON.parse(line), c = cases.get(row.id);
      if (!['base','prompt-v2'].includes(variant) || !c || seen.has(row.id) || (row.variant ?? 'base') !== variant || row.language !== c.language || row.benchmarkSha256 !== manifest.sha256) throw new Error('Trace provenance mismatch');
      seen.add(row.id);
      const evidence = row.retrievedSourceIds.map(id => {
        const source = sources.get(id);
        if (!source) throw new Error('Unknown context source');
        return {id, text:Array.from(source.text).slice(0, variant === 'base' ? 4000 : 16000).join('')};
      });
      if (sha(pythonJson(evidence)) !== row.evidenceSha256) throw new Error('Context hash mismatch');
      const validation = validateAdvisoryOutput(row.response, row.retrievedSourceIds);
      return {id:c.id, variant, question:c.question, language:c.language, evidence,
        rawAnswer:row.response, contractErrors:validation.errors, criteria:c.usefulAnswerCriteria,
        supportingEvidenceSpans:c.supportingEvidenceSpans,
        provenance:{benchmarkSha256:manifest.sha256, runSha256:sha(raw), responseSha256:sha(row.response), evidenceSha256:row.evidenceSha256},
        contextLimitCodepoints:variant === 'base' ? 4000 : 16000};
    });
  });
}

export function buildReviewHtml(traces) {
  const data = JSON.stringify(traces).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>MEW local trace review</title>
<style>body{font:17px system-ui;max-width:1000px;margin:40px auto;padding:20px;color:#182636;background:#f5f7fa}label{display:block;margin:14px 0}select,input,textarea,button{font:inherit;padding:10px;max-width:100%}textarea{width:95%;min-height:120px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:white;padding:18px;border:1px solid #bbc8d5}button{cursor:pointer}#pass{background:#d4f3df}#fail{background:#ffe0df}#defer{background:#fff0cb}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid #1763b5}details{margin:16px 0}h1,h2{line-height:1.2}</style>
<h1>MEW local trace review</h1><p>Offline development diagnostics, not a customer holdout. Benchmark labels were created and reviewed by agents. Grading criteria below are disclosed only for your review; they were not supplied to the model.</p>
<p>Your name is self-declared, not authenticated. Exported notes do not approve training or deployment. Notes autosave in this browser when local storage is available. Download a backup before closing. No external scripts or network requests. Browser storage is untrusted and is not proof of a human review.</p>
<label>Reviewer name (self-declared; saved locally with notes) <input id="reviewer" autocomplete="off" maxlength="200"></label><label>Case and experiment <select id="case"></select></label>
<button id="previous">Previous trace</button> <button id="next">Next trace</button><p id="progress" role="status"></p>
<h2 id="question"></h2><p id="settings"></p><h2>Raw model output (no repair)</h2><pre id="answer"></pre><h2>Strict contract errors</h2><pre id="errors"></pre><p>Contract validity does not establish factual accuracy or citation entailment.</p>
<h2>Full context supplied to model</h2><div id="context"></div><h2>Review criteria and gold supporting passages</h2><pre id="criteria"></pre>
<label>Factual answer meets criteria? <select id="verdict"><option value="unreviewed">Unreviewed</option><option value="pass">Pass</option><option value="fail">Fail</option><option value="defer">Defer</option></select></label><button id="pass">Pass (1)</button> <button id="fail">Fail (2)</button> <button id="defer">Defer (D)</button> <button id="undo">Undo last verdict (U)</button>
<label>Observed failures and supporting observations <textarea id="notes" placeholder="Describe the actual failure; quote the relevant answer and supplied evidence."></textarea></label><button id="export">Download review notes</button><p id="status" role="status"></p>
<script type="application/json" id="traces">${data}</script>
<script>
const traces=JSON.parse(document.getElementById('traces').textContent), notes={};
const el=id=>document.getElementById(id);let current=0,lastAction=null;
const storageKey='mew-local-review-'+traces.map(t=>t.provenance?.runSha256).join('-');
const restoreLocalReviewState=${restoreLocalReviewState.toString()};
try{const restored=restoreLocalReviewState(localStorage.getItem(storageKey),traces.length);Object.assign(notes,restored.notes);el('reviewer').value=restored.reviewerName}catch{el('status').textContent='Browser storage unavailable; download notes before closing.'}
traces.forEach((t,i)=>{const option=document.createElement('option');option.value=i;option.textContent=t.id+' / '+t.variant;el('case').append(option)});
function progress(){const labeled=Object.values(notes).filter(n=>['pass','fail'].includes(n.verdict)).length,deferred=Object.values(notes).filter(n=>n.verdict==='defer').length;el('progress').textContent='Trace '+(current+1)+' of '+traces.length+'; '+labeled+' labeled, '+deferred+' deferred, '+(traces.length-labeled-deferred)+' unreviewed.';el('previous').disabled=current===0;el('next').disabled=current===traces.length-1}
function persist(){try{localStorage.setItem(storageKey,JSON.stringify({reviewerName:el('reviewer').value,notes}));el('status').textContent='Notes and self-declared name autosaved locally. Identity and content are not authenticated.'}catch{el('status').textContent='Browser storage unavailable; notes retained in memory. Download a backup.'}progress()}
function save(){notes[current]={verdict:el('verdict').value,observations:el('notes').value};persist()}
function show(){const t=traces[current];el('question').textContent=t.question;el('settings').textContent='Language: '+t.language+'; variant: '+t.variant+'; context limit: '+t.contextLimitCodepoints+' code points per source. Prompt-v2 changed prompt and token limit as well as context; it is not a controlled single-variable comparison.';el('answer').textContent=t.rawAnswer;el('errors').textContent=t.contractErrors.length?JSON.stringify(t.contractErrors,null,2):'No syntax/identity errors. Semantic review still required.';el('context').replaceChildren();t.evidence.forEach((e,index)=>{const d=document.createElement('details'),s=document.createElement('summary'),p=document.createElement('pre');d.open=index===0;s.textContent=e.id;p.textContent=e.text;d.append(s,p);el('context').append(d)});el('criteria').textContent=JSON.stringify({criteria:t.criteria,supportingEvidenceSpans:t.supportingEvidenceSpans},null,2);el('verdict').value=notes[current]?.verdict||'unreviewed';el('notes').value=notes[current]?.observations||''}
function navigate(index){save();current=Math.min(traces.length-1,Math.max(0,index));el('case').value=current;show();progress()}
function grade(verdict){lastAction={index:current,prior:notes[current]?{...notes[current]}:{verdict:'unreviewed',observations:el('notes').value}};el('verdict').value=verdict;save()}
el('case').addEventListener('change',()=>navigate(Number(el('case').value)));
el('previous').addEventListener('click',()=>navigate(current-1));el('next').addEventListener('click',()=>navigate(current+1));
for(const verdict of ['pass','fail','defer'])el(verdict).addEventListener('click',()=>grade(verdict));
el('verdict').addEventListener('change',()=>grade(el('verdict').value));el('notes').addEventListener('input',save);
el('reviewer').addEventListener('input',persist);
function undo(){if(!lastAction)return;notes[lastAction.index]=lastAction.prior;current=lastAction.index;lastAction=null;el('case').value=current;show();persist()}
el('undo').addEventListener('click',undo);
document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='s'){event.preventDefault();el('export').click();return}if((event.metaKey||event.ctrlKey)&&event.key==='Enter'){event.preventDefault();navigate(current+1);return}if(['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))return;if(event.key==='ArrowRight'){event.preventDefault();navigate(current+1)}if(event.key==='ArrowLeft'){event.preventDefault();navigate(current-1)}if(event.key==='1')grade('pass');if(event.key==='2')grade('fail');if(event.key.toLowerCase()==='d')grade('defer');if(event.key.toLowerCase()==='u')undo()});
el('export').addEventListener('click',()=>{save();const reviewerName=el('reviewer').value.trim();if(!reviewerName){el('status').textContent='Enter your self-declared reviewer name before exporting.';el('reviewer').focus();return}const artifact={schema:'mew.local-trace-notes.v1',reviewerName,reviewerType:'human-self-declared',identityAuthenticated:false,createdAt:new Date().toISOString(),scope:'Development review notes only',reviews:traces.flatMap((t,i)=>notes[i]&&notes[i].verdict!=='unreviewed'?[{id:t.id,variant:t.variant,provenance:t.provenance,...notes[i]}]:[])};const url=URL.createObjectURL(new Blob([JSON.stringify(artifact,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='mew-local-review-notes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);el('status').textContent='Notes downloaded. This is not an authenticated approval.'});show();progress();
</script><p>Keyboard: left/right arrows navigate; 1 Pass; 2 Fail; D Defer; U undo verdict; Cmd/Ctrl+S download notes; Cmd/Ctrl+Enter save and advance. Navigation shortcuts do not interrupt typing.</p></html>`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const folder = resolve(process.argv[2] || 'research/learning/frozen-0ab4d24bf6c71ab8');
  const raw = await readFile(resolve(folder,'benchmark.json'),'utf8');
  const manifest = JSON.parse(await readFile(resolve(folder,'manifest.json'),'utf8'));
  const benchmark = verifyFrozenBenchmark(raw,manifest);
  const runs = await Promise.all(['base','prompt-v2'].map(async variant => ({variant,raw:await readFile(resolve(folder,variant+'-responses.jsonl'),'utf8')})));
  await writeFile(resolve('research/learning/model-review.html'),buildReviewHtml(createReviewTraces(benchmark,manifest,runs)));
  console.log('Built offline model-review.html');
}
