import { resolve, dirname } from "node:path";
import { mkdir, writeFile, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadModelExperiment } from "./model-experiment-audit.mjs";
import { loadLocalizedModelExperiment } from "./model-experiment-localized-audit.mjs";
import { readBoundedRegularFile } from "./model-semantic-review.mjs";
import { auditModelExperiment } from "../src/learning/model-experiment.mjs";
import { auditLocalizedModelExperiment } from "../src/learning/model-experiment-localized.mjs";
import {
  createBlindedComparison,
  summarizeBlindedComparison,
  blindedNotesTemplate,
} from "../src/learning/blinded-model-review.mjs";

export function buildBlindedReviewHtml(pack) {
  const data = JSON.stringify(pack)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>MEW blinded answer comparison</title>
<style>body{font:16px/1.5 system-ui;max-width:1150px;margin:auto;padding:24px;background:#f5f5f0;color:#142126}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:white;border:1px solid #ccd1ca;padding:16px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}label{display:block;margin:12px 0}input,select,textarea,button{font:inherit;padding:10px;max-width:100%;min-height:44px}textarea{display:block;width:95%;min-height:120px}button{cursor:pointer}button:focus-visible,select:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid #4345ef;outline-offset:3px}@media(max-width:700px){.pair{grid-template-columns:1fr}body{padding:16px}}</style>
<h1>Compare answers against their evidence.</h1><p>EN/FR development questions. Variant labels and prompts are hidden; the original answers are unchanged. Share only this HTML with the reviewer. Keep the mapping JSON private until notes are finalized. These self-declared notes cannot activate models, training or payments. No network or browser storage is used.</p>
<label>Reviewer name<input id="name" maxlength="200" autocomplete="off"></label><label>Reviewer type<select id="type"><option value="human-self-declared">Human, self-declared</option><option value="agent">Agent development notes</option></select></label><label>Case<select id="case"></select></label><button id="prev">Previous</button> <button id="next">Next</button> <button id="download">Download notes before closing</button><p id="status" role="status" aria-live="polite"></p><h2 id="question"></h2><h3>Criteria for review only</h3><pre id="criteria"></pre><details><summary>Read the complete supplied evidence before judging claims</summary><pre id="evidence"></pre></details><div class="pair"><section><h2>Answer A</h2><pre id="answerA"></pre><div id="dimensionsA"></div></section><section><h2>Answer B</h2><pre id="answerB"></pre><div id="dimensionsB"></div></section></div><label>Observations: quote the claim and identify supporting or contradicting evidence<textarea id="observations" maxlength="4000"></textarea></label><details id="export-details"><summary>Copyable annotation JSON if downloading is unavailable</summary><label>Exported annotation JSON<textarea id="export-output" readonly></textarea></label></details>
<script type="application/json" id="pack">${data}</script><script>
const pack=JSON.parse(document.getElementById('pack').textContent),el=id=>document.getElementById(id),notes={};let index=0;
for(const side of ['A','B'])for(const [dimension,title] of Object.entries(pack.dimensions)){const label=document.createElement('label'),select=document.createElement('select');label.append(document.createTextNode(title));select.id=side+'-'+dimension;for(const value of ['unreviewed','pass','fail','defer']){const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option)}select.addEventListener('change',save);label.append(select);el('dimensions'+side).append(label)}
pack.cases.forEach((row,i)=>{const option=document.createElement('option');option.value=i;option.textContent='Pair '+(i+1)+' / '+row.language;el('case').append(option)});
function save(){const row=pack.cases[index];notes[row.id]={id:row.id,pairSha256:row.pairSha256,judgments:Object.fromEntries(['A','B'].map(side=>[side,Object.fromEntries(Object.keys(pack.dimensions).map(k=>[k,el(side+'-'+k).value]))])),observations:el('observations').value};el('status').textContent='Pair '+(index+1)+' of '+pack.cases.length+'. Notes remain in memory until downloaded.';}
function show(){const row=pack.cases[index],note=notes[row.id];el('case').value=index;el('question').textContent=row.question;el('criteria').textContent=JSON.stringify({criteria:row.criteria,supportingEvidenceSpans:row.supportingEvidenceSpans},null,2);el('evidence').textContent=row.evidence.map(s=>s.id+'\\n'+s.text).join('\\n\\n');for(const side of ['A','B']){el('answer'+side).textContent=row.answers[side];for(const k of Object.keys(pack.dimensions))el(side+'-'+k).value=note?.judgments[side][k]??'unreviewed'}el('observations').value=note?.observations??'';el('status').textContent='Pair '+(index+1)+' of '+pack.cases.length;}
el('case').addEventListener('change',()=>{save();index=Number(el('case').value);show()});el('prev').onclick=()=>{save();index=(index+pack.cases.length-1)%pack.cases.length;show()};el('next').onclick=()=>{save();index=(index+1)%pack.cases.length;show()};el('observations').addEventListener('input',save);
el('download').onclick=()=>{save();const value={schema:'mew.blinded-review-notes.v1',packSha256:pack.packSha256,reviewer:{name:el('name').value,type:el('type').value,identityAuthenticated:false},notes:Object.values(notes)},url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');el('export-output').value=JSON.stringify(value,null,2);el('export-details').open=true;el('status').textContent='Export prepared. Copy JSON below if the download is unavailable.';a.href=url;a.download='mew-blinded-review-notes.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};show();
</script></html>`;
}
async function main() {
  const [directory, flag, notesPath] = process.argv.slice(2);
  if (
    !directory ||
    ![3, 5].includes(process.argv.length) ||
    (flag && flag !== "--notes")
  )
    throw Error(
      "Usage: node scripts/model-blind-review.mjs <fresh-private-directory> OR <prepared-directory> --notes /absolute/notes.json",
    );
  const out = resolve(directory),
    write = (name, value) =>
      writeFile(
        resolve(out, name),
        typeof value === "string"
          ? value
          : JSON.stringify(value, null, 2) + "\n",
        { flag: "wx", mode: 0o600 },
      );
  if (flag) {
    if ((await realpath(out)) !== out)
      throw Error("Expected real prepared directory");
    const read = (name) => readBoundedRegularFile(resolve(out, name));
    const pack = JSON.parse(await read("blinded-pack.json")),
      key = JSON.parse(await read("private-mapping.json")),
      notes = JSON.parse(
        await readBoundedRegularFile(resolve(notesPath), 262144),
      );
    const summary = summarizeBlindedComparison(pack, key, notes);
    await write("annotated-summary.json", summary);
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  if ((await realpath(dirname(out))) !== dirname(out))
    throw Error("Expected existing real private parent");
  const root = process.cwd(),
    baseline = auditModelExperiment(
      await loadModelExperiment(
        root,
        "research/experiments/prompt-grounding-language-2026-10-08",
      ),
    ).packs.baseline,
    candidate = auditLocalizedModelExperiment(
      await loadLocalizedModelExperiment(
        root,
        "research/experiments/prompt-localized-action-v2-2026-10-08",
      ),
    ).pack;
  const { pack, key } = createBlindedComparison(baseline, candidate);
  await mkdir(out, { mode: 0o700 });
  await write("blinded-pack.json", pack);
  await write("private-mapping.json", key);
  await write("blinded-review.html", buildBlindedReviewHtml(pack));
  await write("notes-template.json", blindedNotesTemplate(pack));
  const summary = summarizeBlindedComparison(pack, key);
  await write("summary.json", summary);
  console.log(JSON.stringify({ directory: out, ...summary }, null, 2));
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
