import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateKeyPairSync,sign } from 'node:crypto';
import { DeliveryVerifier,deliveryBytes,artifactIdentity } from '../src/adapters/delivery.mjs';
import { digest } from '../src/dispatch/contracts.mjs';
import { Store } from '../src/server/store.mjs';
import { SandboxProvider } from '../src/adapters/sandbox-provider.mjs';
import { DispatchWorker } from '../src/dispatch/worker.mjs';
import { buildEvidenceCase } from '../src/core/evidence.mjs';
import { runStripePilot } from './stripe-pilot.mjs';

export async function runPilot({args=[],env=process.env,fetchImpl=globalThis.fetch,log=console.log}={}) {
  if(args.some(a=>!['--stripe','--reconcile','--evidence'].includes(a))||new Set(args).size!==args.length||args.includes('--reconcile')&&!args.includes('--stripe'))
    throw new Error('Use npm run pilot, or npm run pilot -- --stripe [--reconcile]');
  if(args.includes('--stripe'))return runStripePilot({args:[args.includes('--reconcile')?'--reconcile':'--submit',
    '--state',resolve('private-pilot/stripe'),'--operation','report-001'],env,fetchImpl,log});
  const dir=mkdtempSync(join(tmpdir(),'mew-simple-pilot-'));
  let store,provider;
  try {
    store=new Store(join(dir,'runtime.sqlite'));provider=new SandboxProvider(join(dir,'receiver.sqlite'));
    store.transact(k=>k.createObjective({id:'one-report',principal:'demo-owner',semanticKey:'report-v1',asset:'usd-cent',quantity:1,maxExposure:100}));
    const proposedEffect={id:'alpha',semanticKey:'report-v1',provider:'alpha',recipientAddress:'supplier:alpha',
      type:'payment',asset:'usd-cent',amount:55,agent:'scripted-buyer'};
    const proposal={objectiveId:'one-report',proposedEffect};
    const admitted=store.enqueue(proposal),worker=new DispatchWorker({store,provider});
    const supplier=generateKeyPairSync('ed25519'),owner=generateKeyPairSync('ed25519');
    const delivery=new DeliveryVerifier(store),contract=delivery.enroll('alpha',{
      supplierKey:supplier.publicKey.export({type:'spki',format:'der'}).toString('base64'),
      ownerKey:owner.publicKey.export({type:'spki',format:'der'}).toString('base64'),
      criteriaDigest:digest({criteria:'One UTF-8 report describing the simulated purchase'}),validUntil:Date.now()+3600000});
    await worker.tick('alpha',{fault:'lost-response'});
    const replacement=store.enqueue({objectiveId:'one-report',proposedEffect:{...proposedEffect,id:'beta',provider:'beta',amount:49}});
    await worker.tick('alpha');
    const artifact=Buffer.from('MEW fixture report: one simulated purchase; replacement deferred.\n');
    const receipt={schema:'mew.delivery-receipt/v1',contractDigest:contract.contractDigest,...artifactIdentity(artifact),issuedAt:Date.now()};
    const signed=(body,key)=>({body,signature:sign(null,deliveryBytes(body),key).toString('base64')});
    const received=delivery.receive('alpha',signed(receipt,supplier.privateKey),artifact);
    const acceptance={schema:'mew.delivery-acceptance/v1',contractDigest:contract.contractDigest,receiptDigest:received.receiptDigest,
      artifactDigest:receipt.artifactDigest,decision:'accept',issuedAt:Date.now()};
    delivery.decide('alpha',signed(acceptance,owner.privateKey),artifact);
    const evidence=buildEvidenceCase(store.read().snapshot(),{objectiveId:'one-report',purpose:'local-pilot'});
    const result={simulated:true,rail:'local-simulator',admission:admitted.decision,replacement:replacement.decision,
      acceptedPurchases:provider.records().length,fulfilledQuantity:store.read().position('one-report').satisfied,evidence};
    if(result.admission!=='ALLOW'||result.replacement!=='DEFER'||result.acceptedPurchases!==1||result.fulfilledQuantity!==1)
      throw new Error('Pilot invariants failed');
    log(JSON.stringify(result,null,2));return 0;
  }finally{store?.close();provider?.close();rmSync(dir,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try{
    const args=process.argv.slice(2);
    const log=args.includes('--evidence')?console.log:raw=>{
      const r=JSON.parse(raw);
      console.log(r.rail==='local-simulator'
        ?'SIMULATION: 1 purchase, signed report and fixture owner acceptance; duplicate replacement deferred.'
        :'STRIPE SANDBOX: '+r.state+'. Delivery remains unverified.');
      console.log('Evidence digest: '+r.evidence.caseDigest);
      console.log('Use --evidence to inspect the full minimized evidence. No real funds moved.');
    };
    process.exitCode=await runPilot({args,log});
  }
  catch(error){console.error('Pilot failed: '+error.message);process.exitCode=1;}
}
