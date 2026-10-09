import { Store } from '../server/store.mjs';
import { SandboxProvider } from '../adapters/sandbox-provider.mjs';
import { DispatchWorker } from '../dispatch/worker.mjs';

// Test-only IPC child. Parent supplies only local fixture paths and a fixed proposal.
const store=new Store(process.argv[2]);
const mode=process.argv[3];
process.send({stage:'ready'});
process.once('message',async message=>{
  if(mode==='reserve') {
    try{const result=store.enqueue(message.proposal);process.send({stage:'result',decision:result.decision});}
    catch(error){process.send({stage:'error',error:error.message});}
    finally{store.close();process.disconnect();}
    return;
  }
  const provider=new SandboxProvider(process.argv[4]);
  const block=async()=>{process.send({stage:'kill-point'});await new Promise(()=>{});};
  const worker=new DispatchWorker({store,provider,clock:()=>1000,leaseMs:10,
    hooks:mode==='crash-before-send'?{beforeSend:block}:{afterObservation:block}});
  try {await worker.tick(message.id);}
  catch(error){process.send({stage:'error',error:error.message});store.close();provider.close();process.disconnect();}
});
