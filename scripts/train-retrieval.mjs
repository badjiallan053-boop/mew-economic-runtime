import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fitRetrieval,searchRetrieval} from '../src/learning/retrieval.mjs';
const files=['SPEC.md','docs/CARDANO_INTEGRATION.md','docs/CUSTOMER_PILOT.md','docs/ML_LEARNING_PIPELINE.md','docs/BACKUP_RECOVERY.md','docs/MARKETING_CAMPAIGN.md','docs/MODEL_EVALUATION.md','docs/AGENT_COMMERCE.md'];
const documents=await Promise.all(files.map(async id=>({id,text:await readFile(id,'utf8')})));
const model=fitRetrieval(documents);
const queries=[
 ['How are recipient transaction confirmations verified on Cardano?','docs/CARDANO_INTEGRATION.md'],
 ['How should we run a customer pilot?','docs/CUSTOMER_PILOT.md'],
 ['How do we restore a durable backup?','docs/BACKUP_RECOVERY.md'],
 ['How do we prevent temporal leakage in training data?','docs/ML_LEARNING_PIPELINE.md'],
 ['How is marketing campaign artifact acceptance tracked?','docs/MARKETING_CAMPAIGN.md']
];
const cases=queries.map(([query,expected])=>{const results=searchRetrieval(model,query);return {query,expected,results,hitAt3:results.some(r=>r.id===expected)};});
const dir=`research/model-hunt/retrieval-${new Date().toISOString().replaceAll(':','-').replaceAll('.','-')}`;await mkdir(dir,{recursive:true});
await writeFile(`${dir}/model.json`,JSON.stringify(model)+'\n');await writeFile(`${dir}/evaluation.json`,JSON.stringify({algorithm:model.algorithm,corpusDocuments:files.length,cases,hits:cases.filter(c=>c.hitAt3).length,total:cases.length,limitations:['Five authored smoke queries; not independent customer evaluation.','Corpus-fitted lexical retrieval only, not a fine-tuned language model.','No external training data, credentials, uploads or payments used.']},null,2)+'\n');console.log(JSON.stringify({directory:dir,hitsAt3:cases.filter(c=>c.hitAt3).length,total:cases.length}));
