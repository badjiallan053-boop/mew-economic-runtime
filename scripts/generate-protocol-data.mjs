import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {MEW} from '../src/core/mew.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const generatorRevision=sha(await readFile(new URL(import.meta.url))),coreRevision=sha(await readFile(new URL('../src/core/mew.mjs',import.meta.url))),rows=[];
for(const family of ['within-budget','over-budget','mandate-mismatch','same-effect-retry','unknown-equivalent'])for(let variant=0;variant<8;variant++){
 const m=new MEW(),amount=100000+variant*1000;const objective={id:'report',principal:'fixture-principal',semanticKey:'report:v1',quantity:1,maxExposure:200000};m.createObjective(objective);
 const input={objectiveId:'report',proposedEffect:{id:'effect-b',semanticKey:'report:v1',provider:'fixture-provider',type:'payment',amount,agent:'fixture-worker'}};
 if(family==='over-budget')input.proposedEffect.amount=300000+variant*1000;
 if(family==='mandate-mismatch')input.proposedEffect.semanticKey='wrong-mandate';
 if(['same-effect-retry','unknown-equivalent'].includes(family)){
  m.evaluate({...input,proposedEffect:{...input.proposedEffect,id:'effect-a'}});
  if(family==='same-effect-retry')input.proposedEffect.id='effect-a';
  else m.observe({claimId:'unknown',source:'fixture',type:'unknown',effectId:'effect-a',evidence:{verified:true}});
 }
 const state={objective,position:m.position('report'),effects:m.snapshot().effects.map(({createdAt,...effect})=>effect)},oracle=m.simulate(input);
 const fixture={state,input};rows.push({id:`${family}-${variant}`,scenarioFamily:family,groupId:family,synthetic:true,generatorRevision,coreRevision,fixtureSha256:sha(JSON.stringify(fixture)),fixture,oracle:{decision:oracle.decision,reason:oracle.reason},targetAuthority:'advisory-only',trainingEligible:false,reviewStatus:'pending',humanTarget:null});
}
const directory=`research/social/protocol-fixtures-${new Date().toISOString().replaceAll(':','-').replaceAll('.','-')}`;await mkdir(directory,{recursive:true});const content=rows.map(r=>JSON.stringify(r)).join('\n')+'\n';await writeFile(`${directory}/fixtures.jsonl`,content);await writeFile(`${directory}/manifest.json`,JSON.stringify({rows:rows.length,scenarioFamilies:5,sha256:sha(content),generatorRevision,coreRevision,synthetic:true,languageModelTrained:false,paymentsExecuted:false,splitInstruction:'Assign entire scenario families to splits; amount variants are not independent examples.'},null,2)+'\n');console.log(JSON.stringify({directory,rows:rows.length}));
