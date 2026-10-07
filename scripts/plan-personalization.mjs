import {readFile,writeFile} from 'node:fs/promises';
import {planPersonalization} from '../src/learning/personalization.mjs';
const snapshot='research/learning/frozen-0ab4d24bf6c71ab8';
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const args=process.argv.slice(2);
if(args.length>2)throw Error('Usage: node scripts/plan-personalization.mjs [profile.json] [reviewed-examples.jsonl]');
const plan=planPersonalization({profile:args[0]?await json(args[0]):undefined,benchmarkRaw:await readFile(`${snapshot}/benchmark.json`,'utf8'),benchmarkManifest:await json(`${snapshot}/manifest.json`),modelReceipt:await json('research/learning/local-model-receipt.json'),reviewedExamples:args[1]?(await readFile(args[1],'utf8')).split('\n').filter(x=>x.trim()).map(x=>JSON.parse(x)):[]});
await writeFile('research/learning/personalization-plan.json',JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify({trainingAuthorized:plan.trainingAuthorized,reviewedExampleCount:plan.reviewedExampleCount,blockers:plan.blockers},null,2));
