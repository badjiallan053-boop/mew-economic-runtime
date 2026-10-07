import {CompanyRuntime,simulatedProvider} from '../src/company/runtime.mjs';
const workflow=process.argv[3]||'compact';
const path=process.argv[2]||`data/company-${workflow}-simulation.sqlite`;
const runtime=new CompanyRuntime(path,{workflow});
const id=workflow==='full'?'company-rehearsal-v1':`company-${workflow}-v1`;
try{
  runtime.create({id,objectiveId:'company-submission',principal:'synthetic-founder',semanticKey:'company-submission-v1',brief:'Rehearse MEW company task assignments using supplied synthetic evidence; no external execution.',evidence:[{id:'fixture-brief',kind:'synthetic',content:'Synthetic requirement: preserve objective accounting and label all demonstrations.',source:'local fixture; not external research'}]});
  console.log(JSON.stringify(await runtime.run(id,simulatedProvider),null,2));
}finally{runtime.close();}
