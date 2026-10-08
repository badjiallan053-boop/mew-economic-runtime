import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/server/store.mjs';
import { makeServer } from '../src/server/server.mjs';
import { DatabaseSync } from 'node:sqlite';
import { MEW } from '../src/core/mew.mjs';
const objective={id:'o',principal:'p',semanticKey:'s',description:'test',quantity:1,maxExposure:100};
const proposal={objectiveId:'o',proposedEffect:{id:'e',semanticKey:'s',provider:'merchant',type:'payment',amount:10,agent:'a'}};
test('demo ledger cannot be reopened as live, and failure preserves the original',()=>{
  const dir=mkdtempSync(join(tmpdir(),'mew-mode-')),path=join(dir,'ledger.sqlite');
  try{let s=new Store(path,{mode:'demo'});s.transact(k=>{k.createObjective(objective);k.evaluate(proposal);k.observe({claimId:'fake',effectId:'e',type:'payment.settled',source:'cardano',evidence:{verified:true,simulated:true}});});s.close();
    assert.throws(()=>new Store(path,{mode:'live'}),/mode/);
    s=new Store(path,{mode:'demo'});assert.equal(s.read().snapshot().claims.length,1);s.close();
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('snapshot budget rejects replay growth atomically without losing reservations',()=>{
  const s=new Store(':memory:',{mode:'demo',maxSnapshotBytes:4096});
  try{s.transact(k=>{k.createObjective(objective);k.evaluate(proposal);});let rejected=false;
    for(let i=0;i<100;i++){const before=s.read().snapshot();try{s.transact(k=>k.evaluate(proposal));}catch(error){assert.match(error.message,/storage budget/);assert.deepEqual(s.read().snapshot(),before);rejected=true;break;}}
    assert.equal(rejected,true);assert.equal(s.read().position('o').reserved,10);
  }finally{s.close();}
});
test('public demo request quota preserves health availability',async()=>{
  const server=makeServer({dbPath:':memory:',demo:true,demoRequestLimit:2});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
  try{assert.equal((await fetch(url+'/api/state')).status,200);assert.equal((await fetch(url+'/api/state')).status,200);const blocked=await fetch(url+'/api/state');assert.equal(blocked.status,429);assert.ok(blocked.headers.get('retry-after'));assert.equal((await fetch(url+'/api/health')).status,200);}finally{await new Promise(r=>server.close(r));}
});
test('populated legacy database is never silently promoted live',()=>{
  const dir=mkdtempSync(join(tmpdir(),'mew-legacy-')),path=join(dir,'ledger.sqlite');
  try{const db=new DatabaseSync(path),k=new MEW();k.createObjective(objective);db.exec('CREATE TABLE runtime (id INTEGER PRIMARY KEY, snapshot TEXT NOT NULL)');db.prepare('INSERT INTO runtime VALUES(1,?)').run(JSON.stringify(k.snapshot()));db.close();assert.throws(()=>new Store(path,{mode:'live'}),/Unclassified/);}finally{rmSync(dir,{recursive:true,force:true});}
});
test('failed asynchronous transaction cannot leave an authorized effect',()=>{
  const s=new Store(':memory:');try{s.transact(k=>k.createObjective(objective));assert.throws(()=>s.transact(k=>{k.evaluate(proposal);return Promise.resolve();}),/synchronous/);assert.equal(s.read().position('o').reserved,0);assert.equal(s.read().snapshot().effects.length,0);}finally{s.close();}
});
test('seeded adversarial retries and unknown claims never exceed mandate',()=>{
  const k=new MEW();k.createObjective({...objective,quantity:3,maxExposure:1000});let seed=17;
  for(let i=0;i<1000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const id=`e${seed%20}`;const result=k.evaluate({objectiveId:'o',proposedEffect:{...proposal.proposedEffect,id,amount:100}});if(result.decision==='ALLOW')k.observe({claimId:`unknown-${i}`,effectId:id,source:'agent',type:'payment.unknown'});const p=k.position('o');assert.ok(p.exposure<=1000);assert.ok(k.snapshot().effects.filter(e=>e.status==='reserved').length<=3);}
  assert.equal(k.snapshot().effects.length,3);assert.equal(k.position('o').reserved,300);
});
test('live operation binding rejects double attribution and concurrent reconciliation stays idempotent',async()=>{
  const token='operator-test-token-'.repeat(3),hash='a'.repeat(64);
  const verify=async({effect})=>({claimId:`tx:${effect.id}`,effectId:effect.id,objectiveId:effect.objectiveId,source:'cardano',type:'payment.observed',amount:effect.amount,evidence:{verified:true,network:'cardano:preprod',txHash:hash,exposureReleaseAllowed:false,payerAttribution:'unverified',transactionBinding:'operator-attested',settlementFinality:'not-established'}});
  const server=makeServer({dbPath:':memory:',demo:false,token,verify});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
  const post=async(path,body)=>fetch(url+path,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify(body)});
  try{assert.equal((await post('/api/objectives',{...objective,quantity:2})).status,201);for(const id of ['e','f'])assert.equal((await(await post('/api/evaluate',{...proposal,proposedEffect:{...proposal.proposedEffect,id,recipientAddress:'addr_test1fixture'}})).json()).decision,'ALLOW');
    assert.equal((await post('/api/cardano/operations',{id:'op-e',effectId:'e',txHash:hash,submissionRef:'signer-e'})).status,201);
    assert.equal((await post('/api/cardano/operations',{id:'op-f',effectId:'f',txHash:hash,submissionRef:'signer-f'})).status,400);
    const results=await Promise.all([1,2].map(()=>post('/api/cardano/verify',{effectId:'e',txHash:hash})));assert.deepEqual(results.map(r=>r.status),[200,200]);
    const state=await(await fetch(url+'/api/state',{headers:{authorization:`Bearer ${token}`}})).json();assert.equal(state.claims.length,1);assert.equal(state.positions[0].exposure,20);
  }finally{await new Promise(r=>server.close(r));}
});
