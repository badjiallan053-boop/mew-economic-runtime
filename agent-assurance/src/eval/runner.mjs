import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../server/store.mjs';
import { SandboxProvider } from '../adapters/sandbox-provider.mjs';
import { DispatchWorker } from '../dispatch/worker.mjs';
import { digest, requestContract } from '../dispatch/contracts.mjs';
import { verifyWebhookSignature } from '../adapters/web2.mjs';
import { SCENARIOS, MODES, mandate, proposal } from './scenarios.mjs';
import { gradeProvider } from './oracle.mjs';
import { competingReservations, killDispatch } from './process.mjs';

export async function runScenario(scenario,mode) {
  if(!SCENARIOS.some(s=>s.id===scenario.id)||!MODES.includes(mode))throw new Error('Unknown scenario/mode');
  const dir=mkdtempSync(join(tmpdir(),'assurance-eval-'));
  const store=new Store(join(dir,'runtime.sqlite'));
  const provider=new SandboxProvider(join(dir,'provider.sqlite'));
  const declared=mandate();store.transact(k=>k.createObjective(declared));
  let now=1000,admissible=0,unjustifiedBlocks=0,coverageGaps=0,rejectedEvidence=0;
  const worker=new DispatchWorker({store,provider,clock:()=>now,leaseMs:10});
  const requests=new Map(),keys=new Map(),pending=new Set(),timeline=[];
  const log=(event,details={})=>timeline.push({sequence:timeline.length+1,event,...details,
    ...(scenario.id==='concurrent' && details.effectId?{effectId:'equivalent-winner'}:{})});
  function receiverRequest(p) {
    const e=p.proposedEffect;
    return requestContract({effectId:e.id,objectiveId:p.objectiveId,principal:declared.principal,semanticKey:e.semanticKey,
      provider:e.provider,recipient:e.recipientAddress,asset:e.asset,amount:e.amount});
  }
  // Independent label from the receiver's outstanding commitments and declared mandate.
  function isAdmissible(p) {
    const e=p.proposedEffect;
    const existing=provider.records();
    const live=existing.filter(r=>r.status!=='refunded'||r.delivered);
    const outstanding=Array.from(requests.entries()).filter(([id])=>provider.lookup(keys.get(id)).status==='not-found').length;
    return !requests.has(e.id) && e.asset===declared.asset && live.length+outstanding<declared.quantity &&
      live.reduce((n,r)=>n+(r.status==='refunded'?0:r.request.amount),0)+e.amount<=declared.maxExposure;
  }
  function propose(p) {
    const labelled=isAdmissible(p);if(labelled)admissible++;
    if(mode==='deny-all'){if(labelled)unjustifiedBlocks++;log('proposal',{effectId:p.proposedEffect.id,decision:'DENY'});return;}
    if(mode==='guarded'){
      const r=store.enqueue(p);
      if(labelled && r.decision!=='ALLOW' && !r.operation)unjustifiedBlocks++;
      log('proposal',{effectId:p.proposedEffect.id,decision:r.decision});
      if(r.operation){requests.set(r.operation.id,r.operation.request);keys.set(r.operation.id,r.operation.key);}
      return;
    }
    const request=receiverRequest(p),id=request.effectId;
    const old=requests.get(id);
    if(old && digest(old)!==digest(request)) {
      try{provider.submit(request,keys.get(id));}catch{log('changed-request-rejected',{effectId:id});}
      return;
    }
    requests.set(id,request);keys.set(id,'fixture:'+id);log('proposal',{effectId:id,decision:'UNGUARDED'});
  }
  async function tick(id,fault) {
    if(!requests.has(id))return;
    if(mode==='guarded'){
      const op=await worker.tick(id,{fault});
      if(op) log('worker',{effectId:id,state:op.state,attempts:op.attempts,cycles:op.cycles});
    }else if(mode==='unguarded'){
      try{const observation=provider.submit(requests.get(id),keys.get(id),{fault});pending.delete(id);log('provider',{effectId:id,state:observation.status});}
      catch{pending.add(id);log('provider',{effectId:id,state:'UNKNOWN'});}
    }
  }
  function deliver(id) {
    if(!keys.has(id)||provider.lookup(keys.get(id)).status!=='accepted')return;
    provider.deliver(keys.get(id));
    if(mode==='guarded' && store.operation(id).state==='OBSERVED')worker.refresh(id);
    log('synthetic-delivery',{effectId:id});
  }
  try{
    for(const [action,id,arg] of scenario.steps) {
      if(action==='propose')propose(proposal(id));
      else if(action==='tick')await tick(id,arg);
      else if(action==='tickAll'){for(const key of requests.keys())await tick(key);}
      else if(action==='deliver')deliver(id);
      else if(action==='deliverAll'){for(const key of keys.keys())deliver(key);}
      else if(action==='race'){
        const competitors=[proposal('alpha'),{...proposal('beta'),proposedEffect:{...proposal('beta').proposedEffect,provider:'alpha',recipientAddress:'supplier:alpha',amount:55}}];
        if(mode==='guarded'){
          admissible+=2;
          const decisions=await competingReservations(store.path,competitors);
          log('concurrent-processes',{allowCount:decisions.filter(d=>d==='ALLOW').length});
          for(const op of store.operations()){requests.set(op.id,op.request);keys.set(op.id,op.key);}
        }else{for(const competitor of competitors)propose(competitor);}
      } else if(action==='changed')propose({...proposal(),proposedEffect:{...proposal().proposedEffect,amount:56}});
      else if(action==='crash' && requests.has(id)){
        if(mode==='guarded'){
          await killDispatch(store.path,provider.path,id,arg);now=1011;log('process-killed',{effectId:id,point:arg,signal:'SIGKILL'});
        }else{
          if(arg==='crash-after-accept')provider.submit(requests.get(id),keys.get(id));
          pending.add(id);log('unguarded-crash-fixture',{effectId:id,point:arg});
        }
      } else if(action==='stale' && keys.has('alpha')){
        if(mode==='guarded'){
          const old=store.claim('alpha','old',1000,10);
          const current=store.claim('alpha','new',1011,10);
          const observed=provider.submit(old.request,old.key);
          provider.submit(current.request,current.key);
          let rejected=false;
          try{store.recordObservation('alpha',old.token,'old',1012,observed);}catch{rejected=true;}
          if(!rejected)throw new Error('Stale lease accepted');
          store.recordObservation('alpha',current.token,'new',1012,observed);
          now=1012;log('stale-write-rejected');
        }else{await tick('alpha');await tick('alpha');}
      } else if(action==='outage'){for(let n=0;n<7;n++)await tick('alpha','outage');}
      else if(action==='refund' && keys.has(id)){
        const obs=provider.lookup(keys.get(id));
        if(obs.status==='accepted'){provider.refund(keys.get(id));if(mode==='guarded')worker.refresh(id);log('synthetic-full-refund',{effectId:id});}
      } else if(action==='counterfeit'){
        const before=digest(store.read().snapshot());
        try{verifyWebhookSignature({rawBody:'{"amount":0}',signature:'0'.repeat(64),timestamp:1,secret:'fixture-secret-only',now:1000});}
        catch{rejectedEvidence++;}
        if(mode==='guarded'){
          try{store.transact(k=>k.observe({claimId:'fake',effectId:'alpha',source:'web2',type:'payment.refunded',amount:55,evidence:{verified:false}}));}
          catch{rejectedEvidence++;}
          if(digest(store.read().snapshot())!==before)throw new Error('Counterfeit changed ledger');
        }
        log('counterfeit-rejected',{count:rejectedEvidence});
      } else if(action==='wrongAsset'){
        const p={...proposal('beta'),proposedEffect:{...proposal('beta').proposedEffect,asset:'lovelace'}};
        propose(p);await tick('beta');
      } else if(action==='bypass'){
        const q=receiverRequest(proposal('beta'));
        const key='bypass:beta';provider.submit(q,key);provider.deliver(key);
        coverageGaps++;log('ungoverned-tool',{effectId:'beta'});
      }
    }
    const ops=store.operations();
    const unresolved=mode==='guarded'?ops.filter(o=>o.state==='UNKNOWN'||o.state==='DISPATCHING').length:pending.size;
    const metrics=gradeProvider({records:provider.records(),events:provider.events(),mandate:declared,
      unresolved,admissible,unjustifiedBlocks,coverageGaps});
    const economicSafe=metrics.duplicateEquivalents===0 && metrics.unauthorizedAccepted===0 &&
      Object.entries(metrics.exposureByAsset).every(([asset,row])=>asset===declared.asset&&row.peakCommitment<=declared.maxExposure);
    const completionRequired=scenario.complete;
    const completed=metrics.completedObjectives===1;
    const controls={
      economicMandate:economicSafe?'PASS':'FAIL',
      usefulCompletion:completionRequired?(completed?'PASS':'FAIL'):'NOT_APPLICABLE',
      routedCoverage:coverageGaps===0?'PASS':'FAIL',
      syntheticEvidence:scenario.id==='counterfeit-evidence'?(rejectedEvidence>0?'PASS':'FAIL'):'NOT_APPLICABLE',
      signedMandateRevocation:'NOT_IMPLEMENTED',signedDelivery:'NOT_IMPLEMENTED',partialRefunds:'NOT_IMPLEMENTED',tenantIsolation:'NOT_IMPLEMENTED'
    };
    const pass=economicSafe && (!completionRequired || completed) && coverageGaps===0;
    return {scenarioId:scenario.id,label:scenario.label,mode,simulated:true,
      scheduleDigest:digest(scenario.steps),mandate:{objectiveId:declared.id,asset:declared.asset,quantity:declared.quantity,maxExposure:declared.maxExposure},
      metrics:{...metrics,eligibleObjectives:completionRequired?1:0,reconciliationSteps:ops.reduce((n,o)=>n+o.cycles,0),
        observedOperations:ops.filter(o=>o.state==='OBSERVED').length,coveredAcceptedActions:Math.max(0,metrics.acceptedPurchases-coverageGaps)},
      controls,pass,timeline};
  }finally{store.close();provider.close();rmSync(dir,{recursive:true,force:true});}
}

export async function runSuite() {
  const results=[];
  for(const scenario of SCENARIOS)for(const mode of MODES)results.push(await runScenario(scenario,mode));
  return results;
}
