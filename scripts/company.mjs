import {CompanyRuntime,simulatedProvider} from '../src/company/runtime.mjs';
const path=process.argv[2]||'data/company-simulation.sqlite';
const runtime=new CompanyRuntime(path);
try{
  runtime.create({id:'company-rehearsal-v1',objectiveId:'company-submission',principal:'synthetic-founder',semanticKey:'company-submission-v1',brief:'Rehearse MEW company task assignments using supplied synthetic evidence; no external execution.',evidence:[{id:'fixture-brief',kind:'synthetic',content:'Synthetic requirement: preserve objective accounting and label all demonstrations.',source:'local fixture; not external research'}]});
  console.log(JSON.stringify(await runtime.run('company-rehearsal-v1',simulatedProvider),null,2));
}finally{runtime.close();}
