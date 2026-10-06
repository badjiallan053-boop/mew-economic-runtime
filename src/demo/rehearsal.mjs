import { createHash } from 'node:crypto';
import { MEW } from '../core/mew.mjs';
import { reserveX402 } from '../adapters/x402.mjs';
export const USDM='16a55b2a349361ff88c03788f93e1e966e5d689605d044fef722ddde0014df10745553444d';
export const stages=['Research & review','Reserve quote','Payment timeout','Competing purchase','Verify deliverable','Complete seller Task','Observe seller collection'];
const hash=bytes=>createHash('sha256').update(bytes,'utf8').digest('hex');
const mandate={objectiveId:'rehearsal-report',principal:'synthetic-procurement-team',semanticKey:'supplier-review-v1',provider:'Alpha fixture',resourceUrl:'https://merchant.example/report',recipientAddress:'addr_test1fixture_not_a_wallet',maxAmount:1500000};
export function createRehearsal(scenario='timeout') {
  if(!['timeout','wrong-recipient','missing-evidence'].includes(scenario))throw new Error('Unknown rehearsal scenario');
  const k=new MEW();k.createObjective({id:mandate.objectiveId,principal:mandate.principal,semanticKey:mandate.semanticKey,description:'One supplier assurance report',quantity:1,maxExposure:3000000});
  return {version:1,mode:'simulation',scenario,stage:0,blocked:false,kernel:k.snapshot(),events:[],report:null,decisions:{},agents:[],seller:{status:'NOT_STARTED',asset:USDM,amount:'1000000',network:'cardano:preprod',receipt:null},live:{model:'PENDING',coworker:'PENDING',escrow:'PENDING',collection:'PENDING'}};
}
export function advanceRehearsal(input,{expectedStage}) {
  const s=structuredClone(input);
  if(expectedStage!==s.stage)throw new Error('Stale stage: reload before advancing');
  if(s.blocked||s.stage===stages.length)return s;
  const k=new MEW(s.kernel);
  const event=(role,message)=>s.events.push({id:s.events.length+1,stage:s.stage,role,message,simulated:true});
  const claim=type=>({claimId:`rehearsal-${type}`,effectId:'alpha-report',source:type.startsWith('delivery')?'merchant':'cardano',type,evidence:{verified:true,simulated:true}});
  if(s.stage===0){
    if(s.scenario==='missing-evidence'){s.blocked=true;s.agents=[{role:'Research',status:'ABSTAIN',reason:'No supplier evidence supplied'}];event('Research','Insufficient evidence. No report or purchase invented.');}
    else {
      // Synthetic supplied records, not retrieved sources or model-generated facts.
      s.agents=[{role:'Research',status:'COMPLETE',reason:'Compared two synthetic supplier records'},{role:'Risk review',status:'COMPLETE',reason:'Alpha certificate expires in 14 days; Beta has no certificate'},{role:'Delivery review',status:'WAITING',reason:'Must bind the exact report to the reserved effect'}];
      s.report={title:'Supplier assurance memo',sources:[{id:'fixture-alpha',label:'Synthetic Alpha offer',priceUsd:1200,deliveryDays:7,certificateDaysRemaining:14},{id:'fixture-beta',label:'Synthetic Beta offer',priceUsd:1100,deliveryDays:12,certificateDaysRemaining:null}],recommendation:'Request refreshed certification from Alpha before purchase approval. Beta is cheaper but lacks certification evidence.',uncertainties:['No independent certificate verification','No real supplier data','USD offer prices are report content, not payment accounting']};
      event('Research + Risk','A sourced synthetic report is prepared. No model was invoked.');
    }
  }
  if(s.stage===1){
    const quote={x402Version:2,resource:{url:mandate.resourceUrl},accepts:[{scheme:'exact',network:'cardano:preprod',asset:'lovelace',amount:'1500000',payTo:s.scenario==='wrong-recipient'?'addr_test1attacker':mandate.recipientAddress,maxTimeoutSeconds:60,extra:{assetTransferMethod:'default'}}]};
    try {const d=reserveX402({transact:fn=>fn(k)},{mandate,quote,effectId:'alpha-report',agent:'Research fixture'});s.decisions.reserve=d.decision;event('MEW',`${d.decision}: 1.50 ADA principal reserved atomically by the outer rehearsal transaction.`);}
    catch(error){if(s.scenario!=='wrong-recipient')throw error;s.blocked=true;s.decisions.reserve='REJECTED';event('Quote validator',error.message);}
  }
  if(s.stage===2){k.observe(claim('payment.settled'));k.observe(claim('delivery.unknown'));event('Rail fixture','Simulated direct ADA settlement. Delivery response times out; quantity and exposure stay occupied.');}
  if(s.stage===3){const d=k.evaluate({objectiveId:mandate.objectiveId,proposedEffect:{id:'beta-report',semanticKey:mandate.semanticKey,provider:'Beta fixture',type:'payment',amount:1400000,agent:'Fallback fixture',recipientAddress:'addr_test1fixture_beta'}});s.decisions.duplicate=d.decision;event('MEW',`${d.decision}: another report would violate the one-report objective even within the 3 ADA budget.`);}
  if(s.stage===4){const bytes=JSON.stringify(s.report);s.artifact={bytes,sha256:hash(bytes),effectId:'alpha-report',simulated:true};k.observe({...claim('delivery.verified'),evidence:{verified:true,simulated:true,artifactHash:s.artifact.sha256}});s.agents[2]={role:'Delivery review',status:'COMPLETE',reason:'Fixture receipt binds exact artifact bytes; no merchant signature verified'};event('Delivery fixture','Synthetic delivery accepted. Objective satisfied; no second report required.');}
  if(s.stage===5){
    // Separate seller fixture. USDM never enters the lovelace kernel.
    s.seller={...s.seller,status:'TASK_COMPLETED_COLLECTION_PENDING',taskId:'synthetic-task-001',result:s.artifact.bytes,resultHash:hash(s.artifact.bytes),simulated:true};
    event('Seller worker fixture','Separate seller rehearsal: exact result saved and Task completed. 1 test USDM collection still pending.');
  }
  if(s.stage===6){s.seller.status='SIMULATED_COLLECTION';s.seller.receipt={simulated:true,verified:false,txHash:null,asset:USDM,assetAmount:'1000000',network:'cardano:preprod',sellerAddress:null,proof:'LOCAL_FIXTURE_ONLY'};event('Receipt fixture','Illustrative seller collection only. Live payment proof remains pending; no transaction hash fabricated.');}
  s.stage++;s.kernel=k.snapshot();s.position=k.position(mandate.objectiveId);return s;
}
