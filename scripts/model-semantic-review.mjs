import { open, writeFile, mkdir, lstat } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSemanticReviewPack,
  createSemanticNotesTemplate,
  summarizeSemanticReview,
} from "../src/learning/semantic-review.mjs";

export async function readBoundedRegularFile(path, maxBytes = 2097152) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 2097152)
    throw Error("Invalid review file limit");
  const file = await open(
    path,
    constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0),
  );
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > maxBytes)
      throw Error("Review input must be a bounded regular file");
    const buffer = Buffer.alloc(maxBytes + 1);
    let length = 0;
    while (length <= maxBytes) {
      const { bytesRead } = await file.read(
        buffer,
        length,
        buffer.length - length,
        null,
      );
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length > maxBytes) throw Error("Review input byte limit exceeded");
    return buffer.subarray(0, length);
  } finally {
    await file.close();
  }
}

export function buildSemanticReviewHtml(pack) {
  const data = JSON.stringify(pack)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>MEW constrained semantic review</title>
<style>body{font:16px/1.55 system-ui;max-width:1100px;margin:auto;padding:28px;background:#f6f5f0;color:#142126}h1,h2{line-height:1.2}pre{white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid #cbd1c8;padding:16px;background:white}label{display:block;margin:15px 0}button,input,select,textarea{font:inherit;padding:10px;max-width:100%;min-height:44px}textarea{display:block;width:95%;min-height:130px}button{cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible{outline:3px solid #4345ef;outline-offset:3px}.boundary{border-left:3px solid #4345ef;padding:15px;background:#ecebf9}.criteria{display:grid;grid-template-columns:1fr 1fr;gap:12px}.criteria label{padding:12px;background:white;border:1px solid #cbd1c8}.criteria select{display:block;margin-top:8px;width:100%}details{padding:12px;border:1px solid #cbd1c8;margin:12px 0}summary{cursor:pointer}.actions{display:flex;gap:12px;flex-wrap:wrap}small{display:block}@media(max-width:650px){body{padding:18px}.criteria{grid-template-columns:1fr}}</style>
<h1>Review meaning after valid JSON.</h1><p class="boundary">Latest constrained local run: twelve development cases. Format validity and supplied evidence coverage are separate from correctness. These notes are self-declared and cannot activate a model, approve training or authorize payments. No network requests or browser storage are used.</p>
<label>Reviewer name (self-declared)<input id="reviewer" maxlength="200" autocomplete="off"></label><label>Reviewer type<select id="reviewer-type"><option value="human-self-declared">Human, self-declared</option><option value="agent">Agent development review</option></select></label>
<label>Case<select id="case"></select></label><div class="actions"><button id="previous">Previous</button><button id="next">Next</button><button id="export">Download annotations</button></div><p id="status" role="status" aria-live="polite">No authenticated human review exists.</p>
<h2 id="question"></h2><p id="provenance"></p><h2>Answer to judge</h2><pre id="answer-text"></pre><details><summary>Exact raw JSON response, without repair</summary><pre id="answer"></pre></details><h2>Case criteria and supporting gold passages</h2><pre id="criteria"></pre><p>Gold criteria are for review only. They were not supplied to the model. A listed source ID is not proof of entailment.</p><h2>Exact supplied context</h2><div id="context"></div><h2>Separate judgments</h2><div id="dimensions" class="criteria"></div><label>Observations: identify the answer claim and supporting or contradicting passage<textarea id="observations" maxlength="4000"></textarea></label><p>Download before closing this tab. No notes are stored automatically. The import tool rejects substituted packs, trace hashes, duplicate cases or extra authority fields. It does not authenticate this name.</p>
<script type="application/json" id="pack">${data}</script><script>
const pack=JSON.parse(document.getElementById('pack').textContent),notes={};let index=0;const el=id=>document.getElementById(id);
for(const [key,title] of Object.entries(pack.dimensions)){const label=document.createElement('label'),select=document.createElement('select');label.append(document.createTextNode(title));select.id='judgment-'+key;for(const value of ['unreviewed','pass','fail','defer']){const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option)}select.addEventListener('change',save);label.append(select);el('dimensions').append(label)}
pack.cases.forEach((item,i)=>{const option=document.createElement('option');option.value=i;option.textContent=item.id+' / '+item.language;el('case').append(option)});
function save(){const trace=pack.cases[index];notes[trace.id]={id:trace.id,traceSha256:trace.traceSha256,judgments:Object.fromEntries(Object.keys(pack.dimensions).map(key=>[key,el('judgment-'+key).value])),observations:el('observations').value}}
function show(){const trace=pack.cases[index],note=notes[trace.id];el('question').textContent=trace.question;el('provenance').textContent='Requested language: '+trace.language+' · model revision '+trace.provenance.modelRevision+' · trace '+trace.traceSha256;el('answer').textContent=trace.rawAnswer;try{el('answer-text').textContent=JSON.parse(trace.rawAnswer).answer}catch{el('answer-text').textContent='Invalid answer contract; inspect the preserved raw response.'}el('criteria').textContent=JSON.stringify({criteria:trace.criteria,supportingEvidenceSpans:trace.supportingEvidenceSpans},null,2);el('context').replaceChildren();for(const source of trace.evidence){const d=document.createElement('details'),s=document.createElement('summary'),p=document.createElement('pre');s.textContent=source.id+' · '+(source.cited?'cited by answer':'supplied, not cited');p.textContent=source.text;d.append(s,p);el('context').append(d)}for(const key of Object.keys(pack.dimensions))el('judgment-'+key).value=note?.judgments[key]||'unreviewed';el('observations').value=note?.observations||'';el('case').value=index;el('previous').disabled=index===0;el('next').disabled=index===pack.cases.length-1;el('status').textContent='Case '+(index+1)+' / '+pack.cases.length+'; review identity remains unverified.'}
function navigate(next){save();index=next;show()}el('previous').addEventListener('click',()=>navigate(Math.max(0,index-1)));el('next').addEventListener('click',()=>navigate(Math.min(pack.cases.length-1,index+1)));el('case').addEventListener('change',()=>navigate(Number(el('case').value)));el('observations').addEventListener('input',save);
el('export').addEventListener('click',()=>{save();const name=el('reviewer').value.trim();if(!name){el('status').textContent='Add your self-declared reviewer name before download.';el('reviewer').focus();return}const rows=Object.values(notes);if(rows.some(note=>Object.values(note.judgments).some(v=>v!=='unreviewed')&&!note.observations.trim())){el('status').textContent='Each graded case needs observations tied to its answer and evidence.';return}const artifact={schema:'mew.semantic-review-notes.v1',packSha256:pack.packSha256,reviewer:{name,type:el('reviewer-type').value,identityAuthenticated:false},createdAt:new Date().toISOString(),notes:rows};const url=URL.createObjectURL(new Blob([JSON.stringify(artifact,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='mew-semantic-review-notes.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);el('status').textContent='Self-declared notes downloaded; no activation or authenticated approval.'});show();
</script></html>`;
}

export async function loadSemanticReviewPack(root) {
  const dir = resolve(root, "research/learning/frozen-0ab4d24bf6c71ab8");
  const load = (name) => readBoundedRegularFile(resolve(dir, name));
  const json = async (name) => JSON.parse(await load(name));
  return createSemanticReviewPack({
    benchmarkRaw: await load("benchmark.json"),
    manifest: await json("manifest.json"),
    reportRaw: await load("parent-context-evaluation.json"),
    fit: await json("parent-context-token-fit.json"),
    responseRaw: await load("constrained-parent-responses.jsonl"),
    policyRaw: await load("constrained-model-policy.json"),
    auditRaw: await load("constrained-parent-audit.json"),
    generationScriptRaw: await readBoundedRegularFile(
      resolve(root, "scripts/evaluate-constrained-parent-model.py"),
    ),
  });
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const args = process.argv.slice(2);
  if (
    (args.length !== 1 && args.length !== 3) ||
    (args.length === 3 && args[1] !== "--notes")
  )
    throw Error(
      "Usage: node scripts/model-semantic-review.mjs OUTPUT_DIRECTORY [--notes PRIVATE_NOTES_FILE]",
    );
  const output = resolve(args[0]);
  const pack = await loadSemanticReviewPack(root);
  const readiness = summarizeSemanticReview(
    pack,
    args.length === 3
      ? await readBoundedRegularFile(resolve(args[2]), 262144)
      : undefined,
  );
  // A fresh directory prevents overwrite and keeps raw answers/annotations private.
  await mkdir(output, { mode: 0o700 });
  const outputStat = await lstat(output);
  if (
    !outputStat.isDirectory() ||
    outputStat.isSymbolicLink() ||
    (outputStat.mode & 0o077) !== 0 ||
    (typeof process.getuid === "function" &&
      outputStat.uid !== process.getuid())
  )
    throw Error("Review output must be owner-only");
  const artifacts = {
    "model-review-pack.json": pack,
    "model-review-notes.template.json": createSemanticNotesTemplate(pack),
    "model-review-readiness.json": readiness,
  };
  for (const [file, value] of Object.entries(artifacts))
    await writeFile(
      resolve(output, file),
      JSON.stringify(value, null, 2) + "\n",
      { flag: "wx", mode: 0o600 },
    );
  await writeFile(
    resolve(output, "model-review.html"),
    buildSemanticReviewHtml(pack),
    { flag: "wx", mode: 0o600 },
  );
  console.log(JSON.stringify({ output, ...readiness }, null, 2));
}
