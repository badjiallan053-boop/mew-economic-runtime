import {readFile,writeFile} from 'node:fs/promises';
import {verifyFrozenBenchmark} from '../src/learning/benchmark.mjs';
import {auditParentModel} from '../src/learning/parent-model-audit.mjs';
const dir='research/learning/frozen-0ab4d24bf6c71ab8';
const manifest=JSON.parse(await readFile(`${dir}/manifest.json`));
const benchmark=verifyFrozenBenchmark(await readFile(`${dir}/benchmark.json`),manifest);
const result=auditParentModel({benchmark,manifest,reportRaw:await readFile(`${dir}/parent-context-evaluation.json`),fit:JSON.parse(await readFile(`${dir}/parent-context-token-fit.json`)),responseRaw:await readFile(`${dir}/parent-base-responses.jsonl`)});
await writeFile(`${dir}/parent-model-audit.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({strictContractPasses:result.strictContractPasses,annotatedEvidenceCoverage:result.annotatedEvidenceCoverage,modelActivationAllowed:false}));
