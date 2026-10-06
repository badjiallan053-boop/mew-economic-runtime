import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Store } from '../src/server/store.mjs';
import { makeServer } from '../src/server/server.mjs';
import { checkCardanoConnection } from '../src/adapters/cardano-connection.mjs';
const hash='a'.repeat(64),token='operator-integration-test-'.repeat(3);
const objective={id:'o',principal:'p',semanticKey:'s',quantity:2,maxExposure:4000000};
const proposal=id=>({objectiveId:'o',proposedEffect:{id,semanticKey:'s',provider:'merchant',type:'payment',amount:1500000,agent:'a',recipientAddress:'addr_test1fixture'}});
const operation={id:'operation-1',effectId:'e',txHash:hash,submissionRef:'signer-record-1'};
test('operation binding survives restart and rejects replacement or cross-effect reuse',()=>{
  const dir=mkdtempSync(join(tmpdir(),'mew-chain-')),path=join(dir,'live.sqlite');let s=new Store(path,{mode:'live'});
  try{s.transact(k=>{k.createObjective(objective);k.evaluate(proposal('e'));k.evaluate(proposal('f'));});const first=s.bindCardanoOperation(operation);assert.equal(first.network,'cardano:preprod');s.close();s=new Store(path,{mode:'live'});assert.deepEqual(s.bindCardanoOperation(operation),first);assert.throws(()=>s.bindCardanoOperation({...operation,txHash:'b'.repeat(64)}),/immutable/);assert.throws(()=>s.bindCardanoOperation({...operation,id:'operation-2',effectId:'f'}),/attributed/);assert.equal(s.read().position('o').reserved,3000000);}finally{s.close();rmSync(dir,{recursive:true,force:true});}
});
test('missing configuration stays explicitly disconnected without network access',async()=>{
  const status=await checkCardanoConnection({projectId:'',fetchImpl:()=>assert.fail('No configured credential')});assert.equal(status.connected,false);assert.equal(status.reason,'NOT_CONFIGURED');assert.equal(status.paymentsEnabled,false);
});
test('connection checks fixed preprod origin and returns no credentials',async()=>{
  const calls=[];const status=await checkCardanoConnection({projectId:'test-secret',fetchImpl:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>url.endsWith('/health')?{is_healthy:true}:{height:102,hash,time:Math.floor(Date.now()/1000)}};}});
  assert.equal(status.connected,true);assert.equal(status.latestBlock.height,102);assert.ok(calls.every(c=>c.url.startsWith('https://cardano-preprod.blockfrost.io/api/v0/')&&c.options.redirect==='error'));assert.ok(!JSON.stringify(status).includes('test-secret'));
});
test('provider failures do not leak upstream messages or pretend connectivity',async()=>{
  const status=await checkCardanoConnection({projectId:'test-secret',fetchImpl:async()=>{throw new Error('credential test-secret');}});assert.equal(status.connected,false);assert.equal(status.reason,'PROVIDER_UNAVAILABLE');assert.ok(!JSON.stringify(status).includes('test-secret'));
});
test('unhealthy provider or malformed latest block remains disconnected',async()=>{
  for(const latest of [{height:-1,hash,time:1},{height:1,hash:'invalid',time:1}]){
    const status=await checkCardanoConnection({projectId:'test-key',fetchImpl:async(url)=>({ok:true,json:async()=>url.endsWith('/health')?{is_healthy:true}:latest})});assert.equal(status.connected,false);
  }
  const unhealthy=await checkCardanoConnection({projectId:'test-key',fetchImpl:async(url)=>({ok:true,json:async()=>url.endsWith('/health')?{is_healthy:false}:{height:1,hash,time:1}})});assert.equal(unhealthy.connected,false);
});
test('HTTP reconciliation requires persisted binding, rejects hash substitution, retains exposure on timeout',async()=>{
  let calls=0;const verify=async({txHash,effect})=>{calls++;if(calls===1)throw new Error('Indexer unavailable');return {claimId:`tx:${txHash}:${effect.id}`,effectId:effect.id,objectiveId:effect.objectiveId,amount:effect.amount,source:'cardano',type:'payment.settled',evidence:{verified:true,network:'cardano:preprod',txHash,confirmations:calls+1}};};
  const server=makeServer({dbPath:':memory:',demo:false,token,verify});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
  const post=async(path,body)=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify(body)});
  try{await post('/api/objectives',objective);await post('/api/evaluate',proposal('e'));assert.equal((await post('/api/cardano/verify',{effectId:'e',txHash:hash})).status,409);assert.equal(calls,0);assert.equal((await post('/api/cardano/operations',operation)).status,201);assert.equal((await post('/api/cardano/verify',{effectId:'e',txHash:'b'.repeat(64)})).status,409);assert.equal(calls,0);assert.equal((await post('/api/cardano/verify',{effectId:'e'})).status,400);const state=await(await fetch(base+'/api/state',{headers:{authorization:`Bearer ${token}`}})).json();assert.equal(state.positions[0].reserved,1500000);assert.equal((await post('/api/cardano/verify',{effectId:'e'})).status,200);assert.equal((await post('/api/cardano/verify',{effectId:'e'})).status,200);const final=await(await fetch(base+'/api/state',{headers:{authorization:`Bearer ${token}`}})).json();assert.equal(final.claims.length,1);assert.equal(final.positions[0].spent,1500000);assert.equal(final.positions[0].satisfied,0);}finally{await new Promise(r=>server.close(r));}
});
test('conflicting adapter evidence cannot mutate the live ledger',async()=>{
  const server=makeServer({dbPath:':memory:',demo:false,token,verify:async({effect})=>({claimId:'bad',effectId:effect.id,objectiveId:effect.objectiveId,amount:effect.amount,source:'cardano',type:'payment.settled',evidence:{verified:true,network:'cardano:preprod',txHash:'b'.repeat(64)}})});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
  const post=async(path,body)=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify(body)});
  try{assert.equal((await fetch(base+'/api/cardano/status')).status,401);await post('/api/objectives',objective);await post('/api/evaluate',proposal('e'));await post('/api/cardano/operations',operation);assert.equal((await post('/api/cardano/verify',{effectId:'e'})).status,400);const state=await(await fetch(base+'/api/state',{headers:{authorization:`Bearer ${token}`}})).json();assert.equal(state.claims.length,0);assert.equal(state.positions[0].reserved,1500000);}finally{await new Promise(r=>server.close(r));}
});
