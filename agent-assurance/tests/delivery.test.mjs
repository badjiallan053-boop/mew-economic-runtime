import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync,sign } from 'node:crypto';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DeliveryVerifier,deliveryBytes,artifactIdentity } from '../src/adapters/delivery.mjs';
import { digest } from '../src/dispatch/contracts.mjs';
import { Store } from '../src/server/store.mjs';

const pem=pair=>pair.publicKey.export({type:'spki',format:'der'}).toString('base64');
const signed=(body,key)=>({body,signature:sign(null,deliveryBytes(body),key).toString('base64')});
function fixture(path=':memory:'){
  const store=new Store(path);let now=1000;
  store.transact(k=>k.createObjective({id:'report',principal:'owner',semanticKey:'report-v1',asset:'usd-cent',quantity:1,maxExposure:100}));
  const op=store.enqueue({objectiveId:'report',proposedEffect:{id:'effect',semanticKey:'report-v1',provider:'supplier',recipientAddress:'supplier:one',asset:'usd-cent',amount:100}}).operation;
  const supplier=generateKeyPairSync('ed25519'),owner=generateKeyPairSync('ed25519'),other=generateKeyPairSync('ed25519');
  const verifier=new DeliveryVerifier(store,{clock:()=>now}),terms={supplierKey:pem(supplier),ownerKey:pem(owner),criteriaDigest:digest({criteria:'One report for owner review'}),validUntil:2000};
  const contract=verifier.enroll('effect',terms),artifact=Buffer.from('The exact report.\n');now=1100;
  const receipt={schema:'mew.delivery-receipt/v1',contractDigest:contract.contractDigest,...artifactIdentity(artifact),issuedAt:1050};
  const acceptance={schema:'mew.delivery-acceptance/v1',contractDigest:contract.contractDigest,receiptDigest:digest(receipt),artifactDigest:receipt.artifactDigest,decision:'accept',issuedAt:1100};
  const settle=()=>{const claim=store.claim('effect','worker',now,30000);store.recordObservation('effect',claim.token,'worker',now,{key:op.key,request:op.request,requestDigest:op.requestDigest,simulated:true,reference:'fixture-payment',status:'accepted',delivered:false});};
  const receive=()=>verifier.receive('effect',signed(receipt,supplier.privateKey),artifact);
  const decide=(options)=>verifier.decide('effect',signed(acceptance,owner.privateKey),artifact,options);
  return {store,verifier,supplier,owner,other,terms,contract,artifact,receipt,acceptance,settle,receive,decide,setNow:value=>now=value,close:()=>store.close()};
}
test('supplier signature verifies exact bytes but does not establish owner acceptance',()=>{
  const f=fixture();try{f.settle();f.receive();assert.equal(f.store.read().position('report').satisfied,0);assert.equal(f.store.read().position('report').spent,100);
    f.decide();assert.equal(f.store.read().position('report').satisfied,1);assert.equal(f.store.read().position('report').spent,100);
    assert.equal(f.store.read().snapshot().claims.at(-1).evidence.verifier,'delivery-ed25519-local');
  }finally{f.close();}
});
for(const change of ['artifact bytes','contract','signature','wrong signer','signature domain','future','expired','unknown field','artifact size'])test('receipt rejects '+change+' without financial or delivery mutation',()=>{
  const f=fixture();try{f.settle();const before=f.store.read().snapshot();let body={...f.receipt},bytes=f.artifact;
    if(change==='artifact bytes')bytes=Buffer.from('Changed report.');if(change==='contract')body.contractDigest='a'.repeat(64);
    if(change==='future')body.issuedAt=1200;if(change==='expired')f.setNow(2001);if(change==='unknown field')body.verified=true;if(change==='artifact size')body.bytes++;
    let envelope=signed(body,change==='wrong signer'?f.other.privateKey:f.supplier.privateKey);
    if(change==='signature')envelope.signature='A'.repeat(86)+'==';if(change==='signature domain')envelope.signature=sign(null,Buffer.from(JSON.stringify(body)),f.supplier.privateKey).toString('base64');
    assert.throws(()=>f.verifier.receive('effect',envelope,bytes));assert.deepEqual(f.store.read().snapshot(),before);assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM delivery_receipts').get().n,0);
  }finally{f.close();}
});
for(const change of ['wrong owner','artifact','receipt','decision','before receipt','future','expired','not settled'])test('acceptance rejects '+change+' and retains capacity',()=>{
  const f=fixture();try{if(change!=='not settled')f.settle();f.receive();const before=f.store.read().snapshot();const body={...f.acceptance};
    if(change==='artifact')body.artifactDigest='b'.repeat(64);if(change==='receipt')body.receiptDigest='b'.repeat(64);if(change==='decision')body.decision='approved';
    if(change==='before receipt')body.issuedAt=1049;if(change==='future')body.issuedAt=1200;if(change==='expired')f.setNow(2001);
    assert.throws(()=>f.verifier.decide('effect',signed(body,change==='wrong owner'?f.other.privateKey:f.owner.privateKey),f.artifact));
    assert.deepEqual(f.store.read().snapshot(),before);assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM delivery_acceptance').get().n,0);
  }finally{f.close();}
});
test('owner rejection is recorded without fulfillment or financial release; contradictory replay fails',()=>{
  const f=fixture();try{f.settle();f.receive();const reject={...f.acceptance,decision:'reject'};
    f.verifier.decide('effect',signed(reject,f.owner.privateKey),f.artifact);assert.equal(f.store.read().position('report').satisfied,0);assert.equal(f.store.read().position('report').spent,100);
    assert.throws(f.decide,/Conflicting/);assert.equal(f.verifier.decide('effect',signed(reject,f.owner.privateKey),f.artifact).idempotent,true);
  }finally{f.close();}
});
test('delivery terms are immutable, independent keys required and enrollment cannot happen after dispatch',()=>{
  const f=fixture();try{assert.throws(()=>f.verifier.enroll('effect',{...f.terms,criteriaDigest:'a'.repeat(64)}),/immutable/);
    assert.throws(()=>f.verifier.enroll('effect',{...f.terms,ownerKey:f.terms.supplierKey}),/must differ/);
    f.settle();assert.equal(f.verifier.enroll('effect',f.terms).contractDigest,f.contract.contractDigest);
    f.store.db.prepare('DELETE FROM delivery_contracts').run();assert.throws(()=>f.verifier.enroll('effect',f.terms),/before dispatch/);
  }finally{f.close();}
});
test('acceptance and delivery claim roll back together; same evidence remains replayable',()=>{
  const f=fixture();try{f.settle();f.receive();const before=f.store.read().snapshot();assert.throws(()=>f.decide({beforeCommit:()=>{throw new Error('Crash');}}),/Crash/);
    assert.deepEqual(f.store.read().snapshot(),before);assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM delivery_acceptance').get().n,0);f.decide();
    const claims=f.store.read().snapshot().claims.length;f.setNow(3000);assert.equal(f.decide().idempotent,true);assert.equal(f.receive().idempotent,true);assert.equal(f.store.read().snapshot().claims.length,claims);
  }finally{f.close();}
});
test('signed receipt and owner decision survive restart; replay cannot produce another delivery',()=>{
  const dir=mkdtempSync(join(tmpdir(),'mew-delivery-')),path=join(dir,'runtime.sqlite'),f=fixture(path);let reopened;
  try{f.settle();f.receive();f.decide();f.close();reopened=new Store(path);const verifier=new DeliveryVerifier(reopened,{clock:()=>3000});
    assert.equal(verifier.decide('effect',signed(f.acceptance,f.owner.privateKey),f.artifact).idempotent,true);assert.equal(reopened.read().position('report').satisfied,1);
  }finally{reopened?.close();rmSync(dir,{recursive:true,force:true});}
});
test('changed persisted principal or recipient cannot accept a signed receipt',()=>{
  const f=fixture();try{f.settle();f.receive();f.store.transact(k=>{k.state.effects[0].recipientAddress='supplier:other';});const before=f.store.read().snapshot();assert.throws(f.decide,/authority changed/);assert.deepEqual(f.store.read().snapshot(),before);}finally{f.close();}
});
test('terminal release blocks delivery; oversized artifacts and private keys cannot enroll',()=>{
  const f=fixture();try{assert.throws(()=>artifactIdentity(Buffer.alloc(1048577)),/1 MiB/);assert.throws(()=>artifactIdentity('report'));
    assert.throws(()=>f.verifier.enroll('effect',{...f.terms,supplierKey:f.supplier.privateKey.export({type:'pkcs8',format:'der'}).toString('base64')}));
    f.store.transact(k=>k.observe({claimId:'failed',effectId:'effect',source:'web2',type:'payment.failed',evidence:{verified:true,simulated:true}}));assert.throws(f.receive,/terminal/);
  }finally{f.close();}
});
