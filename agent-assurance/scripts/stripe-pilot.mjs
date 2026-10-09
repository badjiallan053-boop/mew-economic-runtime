import { resolve, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Store } from '../src/server/store.mjs';
import { StripeSandboxProvider } from '../src/adapters/stripe-sandbox.mjs';
import { DispatchWorker } from '../src/dispatch/worker.mjs';
import { buildEvidenceCase } from '../src/core/evidence.mjs';

export async function runStripePilot({args,env=process.env,fetchImpl=globalThis.fetch,log=console.log}={}) {
let store,provider;
try {
  const options={};
  for(let i=0;i<args.length;i++) {
    const name=args[i];
    if(name==='--submit'||name==='--reconcile'){options.mode=name.slice(2);continue;}
    if(!['--state','--operation'].includes(name)||!args[i+1]||options[name])throw new Error('Use --submit OR --reconcile --state DIRECTORY --operation ID');
    options[name]=args[++i];
  }
  if(args.filter(a=>a==='--submit'||a==='--reconcile').length!==1||!options['--state']||! /^[a-zA-Z0-9_-]{1,64}$/.test(options['--operation']||''))
    throw new Error('Use --submit OR --reconcile --state DIRECTORY --operation ID');
  const dir=resolve(options['--state']),id=options['--operation'],account=env.STRIPE_SANDBOX_ACCOUNT_ID;
  mkdirSync(dir,{recursive:true,mode:0o700});
  provider=new StripeSandboxProvider(join(dir,'stripe.sqlite'),{key:env.STRIPE_SANDBOX_KEY,accountId:account,fetchImpl});
  store=new Store(join(dir,'runtime.sqlite'));
  if(!store.operation(id)) {
    if(options.mode==='reconcile')throw new Error('No persisted operation; reconciliation cannot create one');
    const objectiveId='pilot:'+id;
    if(!store.read().snapshot().objectives.some(o=>o.id===objectiveId))store.transact(k=>k.createObjective({id:objectiveId,principal:'local-pilot-operator',semanticKey:objectiveId,
      asset:'usd-cent',quantity:1,maxExposure:100}));
    const result=store.enqueue({objectiveId,proposedEffect:{id,semanticKey:objectiveId,provider:'stripe-sandbox',
      recipientAddress:'stripe:'+account,type:'payment',asset:'usd-cent',amount:100,agent:'scripted-pilot'}});
    if(result.decision!=='ALLOW')throw new Error('Pilot admission rejected');
  }
  const worker=new DispatchWorker({store,provider,leaseMs:30000,owner:'stripe-pilot'});
  await worker.tick(id);
  const op=store.operation(id);
  // Do not export raw Stripe objects, client_secret, headers, keys or payment details.
  log(JSON.stringify({simulated:true,rail:'stripe-sandbox',operation:id,state:op.state,
    reference:op.reference,reason:op.reason,evidence:buildEvidenceCase(store.read().snapshot(),{objectiveId:op.request.objectiveId,purpose:'sandbox-pilot'})},null,2));
  return op.state==='OBSERVED'?0:2;
} finally {store?.close();provider?.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {process.exitCode=await runStripePilot({args:process.argv.slice(2)});}
  catch(error){console.error('Sandbox pilot failed: '+error.message);process.exitCode=1;}
}
