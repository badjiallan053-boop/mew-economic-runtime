import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {prepareSupervisedExport} from '../src/learning/dataset.mjs';
const [input,output]=process.argv.slice(2);if(!input||!output||process.argv.length!==4)throw Error('Usage: node scripts/export-learning.mjs REVIEWED_LABELS_JSONL NEW_EXPORT_DIRECTORY');
const content=await readFile(input,'utf8');if(Buffer.byteLength(content)>1048576)throw Error('Labels exceed 1 MiB');
const result=prepareSupervisedExport(content.trim()?content.trim().split('\n').map(JSON.parse):[]);
if(!result.readyForReview)throw Error('Reviewed train, validation and test examples required; nothing exported');
await mkdir(output);for(const [split,rows]of Object.entries(result.splits))await writeFile(`${output}/${split}.jsonl`,rows.map(r=>JSON.stringify(r)).join('\n')+'\n',{flag:'wx'});
await writeFile(`${output}/gate.json`,JSON.stringify({readyForReview:result.readyForReview,fineTuningReady:false,trainingAuthorized:false,reason:result.reason},null,2)+'\n');
console.log('Reviewed export prepared locally; no provider upload or training request performed.');
