import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/server/store.mjs';
import { StripeSandboxProvider } from '../src/adapters/stripe-sandbox.mjs';
import { StripeInbox,verifyStripeEvent } from '../src/adapters/stripe-webhook.mjs';
import { createStripeReceiver } from '../src/server/stripe-receiver.mjs';

const secret='whsec_fixture123',accountId='acct_fixture';
function signed(event,now=1000000,key=secret){const raw=Buffer.from(JSON.stringify(event)+'\n'),t=Math.floor(now/1000);return {raw,header:`t=${t},v1=${createHmac('sha256',key).update(t+'.').update(raw).digest('hex')}`};}
function fixture(){
  let now=1000000,status='succeeded',outage=false,posts=0,gets=0;
  const store=new Store(':memory:');let intent;
  const provider=new StripeSandboxProvider(':memory:',{key:'rk_test_fixture',accountId,clock:()=>now,fetchImpl:async(url,options)=>{
    if(url.endsWith('/account'))return {ok:true,json:async()=>({object:'account',id:accountId})};
    if(options.method==='POST'){posts++;const b=new URLSearchParams(options.body);intent={object:'payment_intent',id:'pi_fixture',livemode:false,amount:100,currency:'usd',metadata:{mew_request_digest:b.get('metadata[mew_request_digest]')}};throw new Error('Lost response');}
    gets++;if(outage)throw new Error('Unavailable');return {ok:true,json:async()=>({...intent,status,amount_received:status==='succeeded'?100:0})};
  }});
  store.transact(k=>k.createObjective({id:'report',principal:'owner',semanticKey:'report-v1',asset:'usd-cent',quantity:1,maxExposure:100}));
  const op=store.enqueue({objectiveId:'report',proposedEffect:{id:'effect',semanticKey:'report-v1',provider:'stripe-sandbox',recipientAddress:'stripe:'+accountId,type:'payment',asset:'usd-cent',amount:100}}).operation;
  store.claim('effect','worker',now,30000);
  const inbox=new StripeInbox(store,provider,{clock:()=>now});
  const event=(id='evt_fixture')=>({object:'event',id,livemode:false,type:'payment_intent.succeeded',data:{object:{object:'payment_intent',id:'pi_fixture',livemode:false,status:'succeeded',client_secret:'DO_NOT_RETAIN',metadata:{mew_request_digest:op.requestDigest}}}});
  return {store,provider,inbox,op,event,setNow:x=>now=x,now:()=>now,setStatus:x=>status=x,setOutage:x=>outage=x,posts:()=>posts,gets:()=>gets,close(){store.close();provider.close();}};
}
test('raw-body signature supports rotation and multiple v1 signatures; minimizes payload',()=>{
  const f=fixture();try{const {raw,header}=signed(f.event());const result=verifyStripeEvent(raw,header+',v1='+'0'.repeat(64),{secrets:['whsec_previous123',secret],accountId,now:f.now()});assert.equal(result.id,'evt_fixture');assert.ok(!JSON.stringify(result).includes('DO_NOT_RETAIN'));}finally{f.close();}
});
for(const kind of ['body','secret','stale','future','duplicate timestamp','v0','array','zero tolerance','live','account','thin'])test('rejects '+kind+' before durable intake',()=>{
  const f=fixture();try{let event=f.event(),options={secrets:[secret],accountId,now:f.now()};
    if(kind==='live')event.livemode=true;if(kind==='account')event.account='acct_other';if(kind==='thin')event.object='v2.core.event';
    let {raw,header}=signed(event);
    if(kind==='body')raw=Buffer.concat([raw,Buffer.from(' ')]);if(kind==='secret')options.secrets=['whsec_wrong123'];
    if(kind==='stale')options.now+=301000;if(kind==='future')options.now-=301000;
    if(kind==='duplicate timestamp')header+=',t=1000';if(kind==='v0')header=header.replace('v1=','v0=');if(kind==='array')header=[header];if(kind==='zero tolerance')options.tolerance=0;
    assert.throws(()=>verifyStripeEvent(raw,header,options),/Invalid/);
  }finally{f.close();}
});
test('lost creation beyond replay window recovers via GET; duplicate is durable and fences original worker',async()=>{
  const f=fixture();try{await assert.rejects(f.provider.submit(f.op.request,f.op.key));f.setNow(f.now()+23*3600000);
    const {raw,header}=signed(f.event(),f.now());f.inbox.accept(raw,header,[secret]);assert.equal(f.gets(),0);
    assert.equal(f.inbox.accept(raw,header,[secret]).duplicate,true);await f.inbox.tick();assert.equal(f.posts(),1);assert.equal(f.gets(),1);
    assert.equal(f.store.operation('effect').state,'OBSERVED');assert.equal(f.store.read().position('report').spent,100);
    assert.equal(await f.inbox.tick(),false);assert.throws(()=>f.store.assertLease('effect',1,'worker',f.now()),/Stale/);
    const row=f.store.db.prepare('SELECT * FROM stripe_event_inbox').get();assert.equal(row.state,'APPLIED');assert.ok(!row.descriptor.includes('DO_NOT_RETAIN'));
  }finally{f.close();}
});
test('out-of-order snapshot never settles pending API state; outage retains capacity and retry is bounded',async()=>{
  const f=fixture();try{await assert.rejects(f.provider.submit(f.op.request,f.op.key));f.setStatus('processing');const s=signed(f.event());f.inbox.accept(s.raw,s.header,[secret]);await f.inbox.tick();assert.equal(f.store.read().position('report').reserved,100);
    f.setOutage(true);for(let i=0;i<8;i++){f.setNow(f.now()+31000);await f.inbox.tick();}
    assert.equal(f.store.db.prepare('SELECT state FROM stripe_event_inbox').get().state,'REVIEW');assert.equal(f.posts(),1);assert.equal(f.store.read().position('report').reserved,100);
  }finally{f.close();}
});
test('verified API cancellation releases; event identity conflict is rejected',async()=>{
  const f=fixture();try{await assert.rejects(f.provider.submit(f.op.request,f.op.key));f.setStatus('canceled');const s=signed(f.event());f.inbox.accept(s.raw,s.header,[secret]);
    const changed=f.event();changed.data.object.id='pi_other';const c=signed(changed);assert.throws(()=>f.inbox.accept(c.raw,c.header,[secret]),/Conflicting/);
    await f.inbox.tick();assert.equal(f.store.read().position('report').reserved,0);assert.equal(f.store.operation('effect').state,'OBSERVED');
  }finally{f.close();}
});
test('kernel application failure rolls back APPLIED marker and financial snapshot',async()=>{
  const f=fixture();try{await assert.rejects(f.provider.submit(f.op.request,f.op.key));const s=signed(f.event());f.inbox.accept(s.raw,s.header,[secret]);const before=f.store.read().snapshot();
    const apply=f.store.applyObservation.bind(f.store);f.store.applyObservation=(...args)=>{apply(...args);throw new Error('Crash before commit');};
    await assert.rejects(f.inbox.tick(),/Crash/);assert.deepEqual(f.store.read().snapshot(),before);assert.equal(f.store.db.prepare('SELECT state FROM stripe_event_inbox').get().state,'PROCESSING');
    f.store.applyObservation=apply;f.setNow(f.now()+31000);await new StripeInbox(f.store,f.provider,{clock:f.now}).tick();assert.equal(f.store.read().position('report').spent,100);
  }finally{f.close();}
});
test('HTTP acknowledgement commits inbox without waiting for any provider request',async()=>{
  const f=fixture(),server=createStripeReceiver(f.inbox,[secret]);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{const s=signed(f.event()),url=`http://127.0.0.1:${server.address().port}/stripe/webhook`;
    assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':s.header},body:s.raw})).status,200);
    assert.equal(f.gets(),0);assert.equal(f.posts(),0);assert.equal(f.store.db.prepare('SELECT state FROM stripe_event_inbox').get().state,'PENDING');
    assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':s.header,Origin:'https://example.org'},body:s.raw})).status,403);
  }finally{await new Promise(r=>server.close(r));f.close();}
});
test('event deduplication survives closing and reopening the SQLite store',()=>{
  const dir=mkdtempSync(join(tmpdir(),'stripe-inbox-')),f=fixture();let store;
  try{store=new Store(join(dir,'runtime.sqlite'));let inbox=new StripeInbox(store,f.provider,{clock:f.now});const s=signed(f.event());inbox.accept(s.raw,s.header,[secret]);store.close();
    store=new Store(join(dir,'runtime.sqlite'));inbox=new StripeInbox(store,f.provider,{clock:f.now});assert.equal(inbox.accept(s.raw,s.header,[secret]).duplicate,true);assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM stripe_event_inbox').get().count,1);
  }finally{store?.close();f.close();rmSync(dir,{recursive:true,force:true});}
});
test('read-only recovery rejects a returned payment identity different from the event hint',async()=>{
  const f=fixture();try{await assert.rejects(f.provider.submit(f.op.request,f.op.key));await assert.rejects(f.provider.readObservation(f.op.key,'pi_other'),/identity changed/);assert.equal(f.provider.row(f.op.key).intent,null);assert.equal(f.posts(),1);}finally{f.close();}
});
