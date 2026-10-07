import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {OperationStore} from '../src/server/operation-store.mjs';import {runSimulationOperation} from '../src/server/simulation-worker.mjs';import {deliveryReceiptBytes} from '../src/adapters/delivery-receipt.mjs';
const dir=mkdtempSync(join(tmpdir(),'mew-durable-fixture-')),path=join(dir,'fixture.sqlite');let store=new OperationStore(path);
try{
 store.transact(k=>k.createObjective({id:'fixture-objective',principal:'fixture-principal',semanticKey:'fixture-bundle',quantity:1,maxExposure:10000000}));
 store.reserveOperation({operationId:'fixture-operation',principal:'fixture-principal',objectiveId:'fixture-objective',proposedEffect:{id:'fixture-effect',semanticKey:'fixture-bundle',provider:'fixture-provider',type:'payment',amount:8000000,agent:'fixture-builder'}});
 const timeout=await runSimulationOperation(store,'fixture-operation',()=>new Promise(()=>{}),{timeoutMs:10});
 store.close();store=new OperationStore(path);
 const bytes=Buffer.from('Synthetic five-outline bundle; no rendered videos'),artifactSha256=createHash('sha256').update(bytes).digest('hex'),{publicKey,privateKey}=generateKeyPairSync('ed25519');
 const expected={keyId:'fixture-key',principal:'fixture-principal',objectiveId:'fixture-objective',effectId:'fixture-effect',provider:'fixture-provider',jobId:'fixture-job',artifactSha256};
 store.bindAcceptedDelivery(expected);const payload={version:'mew-delivery-v1',receiptId:'fixture-receipt',...expected,issuedAtMs:1000,expiresAtMs:2000};const envelope={payload,signature:sign(null,deliveryReceiptBytes(payload),privateKey).toString('base64url')};
 const args={effectId:'fixture-effect',envelope,artifactBytes:bytes,trustedPublicKey:publicKey,nowMs:1500};store.acceptDelivery(args);store.close();store=new OperationStore(path);
 const replay=store.acceptDelivery({...args,nowMs:999999});
 console.log(JSON.stringify({mode:'synthetic-local-durable-rehearsal',timeoutStatus:timeout.status,reopenedOperationStatus:store.operation('fixture-operation').status,historicalReceiptReplayIdempotent:replay.idempotent,position:store.read().position('fixture-objective'),paymentsEnabled:false,limitations:'Ephemeral provider key and synthetic artifact; no actual customer, signer, model or Cardano transaction.'},null,2));
}finally{store.close();rmSync(dir,{recursive:true,force:true});}
