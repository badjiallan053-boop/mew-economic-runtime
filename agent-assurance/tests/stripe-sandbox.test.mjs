import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StripeSandboxProvider } from '../src/adapters/stripe-sandbox.mjs';
import { Store } from '../src/server/store.mjs';
import { DispatchWorker } from '../src/dispatch/worker.mjs';
import { runStripePilot } from '../scripts/stripe-pilot.mjs';

const accountId='acct_fixture',key='rk_test_fixture';
const request={effectId:'effect',objectiveId:'report',principal:'owner',semanticKey:'report-v1',
  provider:'stripe-sandbox',recipient:'stripe:'+accountId,asset:'usd-cent',amount:100};
function fixture(){
  const dir=mkdtempSync(join(tmpdir(),'stripe-fixture-'));let now=1000,fault=null,posts=0,gets=0;
  const intents=new Map(),calls=[];
  const fetchImpl=async(url,options)=>{
    calls.push({url,options});assert.ok(url.startsWith('https://api.stripe.com/v1/'));
    assert.equal(options.redirect,'error');assert.ok(options.signal);
    if(url.endsWith('/account'))return {ok:true,json:async()=>({object:'account',id:fault==='account'?'acct_wrong':accountId})};
    if(options.method==='POST'){
      posts++;const body=new URLSearchParams(options.body),idempotency=options.headers['Idempotency-Key'];
      if(!intents.has(idempotency))intents.set(idempotency,{object:'payment_intent',id:'pi_fixture',livemode:false,
        amount:Number(body.get('amount')),currency:body.get('currency'),status:'succeeded',amount_received:100,
        metadata:{mew_request_digest:body.get('metadata[mew_request_digest]')}});
      if(fault==='lost')throw new Error(key+' secret server response');
      const intent=intents.get(idempotency);
      return {ok:true,json:async()=>({...intent,...(fault==='live'?{livemode:true}:{}),...(fault==='terms'?{amount:101}:{}),
        ...(fault==='pending'?{status:'requires_action',amount_received:0}:{}),...(fault==='cancel'?{status:'canceled',amount_received:0}:{})})};
    }
    gets++;if(fault==='outage')return {ok:false};
    return {ok:true,json:async()=>[...intents.values()][0]};
  };
  const config={key,accountId,fetchImpl,clock:()=>now};
  const provider=new StripeSandboxProvider(join(dir,'stripe.sqlite'),config);
  return {dir,provider,config,calls,intents,posts:()=>posts,gets:()=>gets,setFault:value=>fault=value,setNow:value=>now=value,
    close(){provider.close();rmSync(dir,{recursive:true,force:true});}};
}
test('Stripe bridge rejects live keys and missing merchant before opening a journal',()=>{
  for(const value of ['sk_live_fixture','rk_live_fixture','missing'])assert.throws(()=>new StripeSandboxProvider(':memory:',{key:value,accountId}),/test-only/);
  assert.throws(()=>new StripeSandboxProvider(':memory:',{key}),/merchant/);
});
test('sandbox request binds merchant, asset, amount and constant test payment method',async()=>{
  const f=fixture();try{const result=await f.provider.submit(request,'op');assert.equal(result.status,'accepted');assert.equal(result.delivered,false);
    assert.equal(result.verifier,'stripe-api-sandbox');assert.equal(result.simulated,true);
    const body=new URLSearchParams(f.calls.find(c=>c.options.method==='POST').options.body);
    assert.equal(body.get('payment_method'),'pm_card_visa');assert.equal(body.get('confirm'),'true');
    assert.equal(body.has('payment_method_types'),false);assert.equal(body.get('automatic_payment_methods[allow_redirects]'),'never');
    assert.ok(!JSON.stringify(result).includes(key));
  }finally{f.close();}
});
test('lost creation response replays same key within window; restart retrieves known intent',async()=>{
  const f=fixture();try{f.setFault('lost');await assert.rejects(f.provider.submit(request,'op'),/unavailable/);
    f.setFault(null);const recovered=await f.provider.lookup('op');assert.equal(recovered.reference,'pi_fixture');assert.equal(f.intents.size,1);
    const reopened=new StripeSandboxProvider(join(f.dir,'stripe.sqlite'),f.config);
    try{await reopened.lookup('op');assert.equal(f.posts(),2);assert.equal(f.gets(),1);}finally{reopened.close();}
  }finally{f.close();}
});
test('expired idempotency recovery never posts again or generates a replacement',async()=>{
  const f=fixture();try{f.setFault('lost');await assert.rejects(f.provider.submit(request,'op'));
    f.setNow(1000+22*60*60*1000);f.setFault(null);await assert.rejects(f.provider.lookup('op'),/window expired/);assert.equal(f.posts(),1);
  }finally{f.close();}
});
test('unknown journal and changed key terms cannot trigger another payment',async()=>{
  const f=fixture();try{await assert.rejects(f.provider.lookup('missing'),/Missing/);assert.equal(f.posts(),0);
    await f.provider.submit(request,'op');await assert.rejects(f.provider.submit({...request,amount:101},'op'),/different request/);assert.equal(f.posts(),1);
  }finally{f.close();}
});
for(const fault of ['account','live','terms'])test('mismatched '+fault+' evidence cannot settle',async()=>{
  const f=fixture();try{f.setFault(fault);await assert.rejects(f.provider.submit(request,'op'),/mismatch|does not match/);
    assert.equal(f.provider.row('op').intent,null);
  }finally{f.close();}
});
test('authentication/processing remain pending and only confirmed cancellation releases',async()=>{
  for(const [fault,status] of [['pending','pending'],['cancel','failed']]){const f=fixture();try{f.setFault(fault);assert.equal((await f.provider.submit(request,'op')).status,status);}finally{f.close();}}
});
test('worker awaits provider and lost response keeps capacity before recovery',async()=>{
  const f=fixture(),store=new Store(join(f.dir,'runtime.sqlite'));
  try{store.transact(k=>k.createObjective({id:'report',principal:'owner',semanticKey:'report-v1',asset:'usd-cent',quantity:1,maxExposure:100}));
    store.enqueue({objectiveId:'report',proposedEffect:{id:'effect',semanticKey:'report-v1',provider:'stripe-sandbox',recipientAddress:'stripe:'+accountId,type:'payment',asset:'usd-cent',amount:100}});
    const worker=new DispatchWorker({store,provider:f.provider,clock:()=>1000,leaseMs:30000});
    f.setFault('lost');await worker.tick('effect');assert.equal(store.operation('effect').state,'UNKNOWN');assert.equal(store.read().position('report').reserved,100);
    f.setFault(null);await worker.tick('effect');assert.equal(store.operation('effect').state,'OBSERVED');assert.equal(f.intents.size,1);
    assert.equal(store.read().position('report').satisfied,0);assert.equal(store.read().snapshot().claims.at(-1).evidence.verifier,'stripe-api-sandbox');
  }finally{store.close();f.close();}
});
test('receiver failure messages never leak a supplied key',async()=>{const f=fixture();try{f.setFault('lost');try{await f.provider.submit(request,'op');assert.fail('must reject');}catch(error){assert.ok(!error.message.includes(key));}}finally{f.close();}});
test('pilot command persists the same operation and exports minimized evidence on replay',async()=>{
  const f=fixture();try{const outputs=[],env={STRIPE_SANDBOX_KEY:key,STRIPE_SANDBOX_ACCOUNT_ID:accountId};
    const options={args:['--submit','--state',f.dir,'--operation','pilot-1'],env,fetchImpl:f.config.fetchImpl,log:s=>outputs.push(JSON.parse(s))};
    assert.equal(await runStripePilot(options),0);assert.equal(await runStripePilot({...options,args:['--reconcile','--state',f.dir,'--operation','pilot-1']}),0);
    assert.equal(f.posts(),1);assert.equal(outputs[0].state,'OBSERVED');assert.equal(outputs[0].evidence.simulation,true);
    assert.ok(!JSON.stringify(outputs).includes('client_secret'));assert.ok(!JSON.stringify(outputs).includes(key));
  }finally{f.close();}
});
