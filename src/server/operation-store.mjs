import {createHash,randomUUID} from 'node:crypto';
import {Store} from './store.mjs';
import {deliveryReceiptBytes,verifyDeliveryReceipt} from '../adapters/delivery-receipt.mjs';
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const encoded=v=>JSON.stringify(canonical(v));
const digest=v=>createHash('sha256').update(v).digest('hex');
const text=v=>{if(typeof v!=='string'||!v.trim()||v.length>200)throw Error('Invalid operation identifier');};
const fields=(v,keys)=>{if(!v||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(v,k)))throw Error('Invalid operation fields');};
/** Trusted operator library. No HTTP routes, signer or live dispatch. Tables share
 * the economic SQLite connection so reservations/observations commit atomically. */
export class OperationStore extends Store{
 constructor(path,options){super(path,options);this.db.exec(`CREATE TABLE IF NOT EXISTS payment_outbox(id TEXT PRIMARY KEY,effect_id TEXT UNIQUE NOT NULL,contract TEXT NOT NULL,status TEXT NOT NULL,token TEXT,job_id TEXT);
 CREATE TABLE IF NOT EXISTS delivery_contracts(effect_id TEXT PRIMARY KEY,provider TEXT NOT NULL,job_id TEXT NOT NULL,contract TEXT NOT NULL,UNIQUE(provider,job_id));
 CREATE TABLE IF NOT EXISTS delivery_receipts(provider TEXT NOT NULL,key_id TEXT NOT NULL,receipt_id TEXT NOT NULL,job_id TEXT NOT NULL,record TEXT NOT NULL,PRIMARY KEY(provider,key_id,receipt_id),UNIQUE(provider,job_id));`);}
 budget(){const bytes=this.db.prepare(`SELECT (SELECT COALESCE(SUM(length(CAST(contract AS BLOB))),0) FROM payment_outbox)+(SELECT COALESCE(SUM(length(CAST(contract AS BLOB))),0) FROM delivery_contracts)+(SELECT COALESCE(SUM(length(CAST(record AS BLOB))),0) FROM delivery_receipts) AS n`).get().n;if(bytes>this.maxSnapshotBytes)throw Error('Operation storage budget exceeded');}
 reserveOperation(input){
 fields(input,['operationId','principal','objectiveId','proposedEffect']);for(const k of ['operationId','principal','objectiveId'])text(input[k]);
 if(!input.proposedEffect||Object.keys(input.proposedEffect).some(k=>!['id','semanticKey','provider','type','amount','agent','recipientAddress'].includes(k)))throw Error('Invalid effect fields');
 if(input.proposedEffect.type!=='payment'||!Number.isSafeInteger(input.proposedEffect.amount)||input.proposedEffect.amount<=0)throw Error('Positive lovelace payment required');
 const contract=encoded(input);if(Buffer.byteLength(contract)>32768)throw Error('Operation too large');
 return this.transact(k=>{
  if(k.objective(input.objectiveId).principal!==input.principal)throw Error('Principal mismatch');
  const old=this.db.prepare('SELECT * FROM payment_outbox WHERE id=? OR effect_id=?').get(input.operationId,input.proposedEffect.id);
  if(old){if(old.contract!==contract)throw Error('Immutable operation conflict');return {decision:'DEFER',operationId:old.id,status:old.status,dispatchAllowed:false};}
  const result=k.evaluate({objectiveId:input.objectiveId,proposedEffect:input.proposedEffect});
  if(result.decision==='ALLOW'){this.db.prepare('INSERT INTO payment_outbox VALUES(?,?,?,\'READY\',NULL,NULL)').run(input.operationId,result.effect.id,contract);this.budget();}
  return {...result,operationId:input.operationId,dispatchAllowed:false};
 });
 }
 operation(id){text(id);const r=this.db.prepare('SELECT * FROM payment_outbox WHERE id=?').get(id);return r?{id:r.id,contract:JSON.parse(r.contract),status:r.status,token:r.token,jobId:r.job_id}:null;}
 claimSimulation(id){
 if(this.mode!=='demo')throw Error('Live dispatch not implemented');
 return this.transact(k=>{const r=this.operation(id);if(!r||r.status!=='READY')throw Error('Operation not dispatchable');const effect=k.snapshot().effects.find(e=>e.id===r.contract.proposedEffect.id);if(!effect||effect.status!=='reserved'||effect.deliveryVerified||effect.unknown)throw Error('Economic reservation is not dispatchable');const token=randomUUID();this.db.prepare("UPDATE payment_outbox SET status='DISPATCHING',token=? WHERE id=? AND status='READY'").run(token,id);return {...r,status:'DISPATCHING',token};});
 }
 finishSimulation(id,token,{outcome,jobId}={}){
 if(this.mode!=='demo'||!['ACKNOWLEDGED','UNKNOWN'].includes(outcome))throw Error('Simulation completion only');
 if(outcome==='ACKNOWLEDGED')text(jobId);
 return this.transact(k=>{const r=this.operation(id);if(!r||r.status!=='DISPATCHING'||r.token!==token)throw Error('Stale worker fence');
 if(outcome==='UNKNOWN')k.observe({claimId:`outbox-unknown:${id}`,effectId:r.contract.proposedEffect.id,source:'host',type:'unknown',evidence:{simulated:true}});
 this.db.prepare('UPDATE payment_outbox SET status=?,job_id=?,token=NULL WHERE id=?').run(outcome,jobId??null,id);return this.operation(id);});
 }
 recoverInterrupted(){
 if(this.mode!=='demo')throw Error('Simulation recovery only');
 return this.transact(k=>{const rows=this.db.prepare("SELECT id FROM payment_outbox WHERE status='DISPATCHING'").all();for(const {id} of rows){const r=this.operation(id);k.observe({claimId:`outbox-unknown:${id}`,effectId:r.contract.proposedEffect.id,source:'host',type:'unknown',evidence:{simulated:true}});this.db.prepare("UPDATE payment_outbox SET status='UNKNOWN',token=NULL WHERE id=?").run(id);}return rows.length;});
 }
 bindAcceptedDelivery(expected){
 fields(expected,['keyId','principal','objectiveId','effectId','provider','jobId','artifactSha256']);
 for(const k of ['keyId','principal','objectiveId','effectId','provider','jobId'])text(expected[k]);if(!/^[a-f0-9]{64}$/.test(expected.artifactSha256))throw Error('Invalid accepted artifact');
 return this.transact(k=>{const effect=k.snapshot().effects.find(e=>e.id===expected.effectId);if(!effect||effect.objectiveId!==expected.objectiveId||effect.provider!==expected.provider||k.objective(expected.objectiveId).principal!==expected.principal||!['reserved','committed','settled'].includes(effect.status))throw Error('Delivery contract mismatch');
 const old=this.db.prepare('SELECT contract FROM delivery_contracts WHERE effect_id=? OR (provider=? AND job_id=?)').get(expected.effectId,expected.provider,expected.jobId);
 if(old){if(old.contract!==encoded(expected))throw Error('Immutable delivery binding conflict');return JSON.parse(old.contract);}
 this.db.prepare('INSERT INTO delivery_contracts VALUES(?,?,?,?)').run(expected.effectId,expected.provider,expected.jobId,encoded(expected));this.budget();return structuredClone(expected);});
 }
 acceptDelivery({effectId,envelope,artifactBytes,trustedPublicKey,nowMs}){
 // Caller key is pre-enrolled operator configuration; envelope cannot enroll keys.
 const signed=deliveryReceiptBytes(envelope?.payload),wireDigest=digest(encoded(envelope));
 if(!Buffer.isBuffer(artifactBytes)||artifactBytes.length>16*1024*1024||digest(artifactBytes)!==envelope.payload.artifactSha256)throw Error('Artifact mismatch');
 return this.transact(k=>{
 const row=this.db.prepare('SELECT contract FROM delivery_contracts WHERE effect_id=?').get(effectId);if(!row)throw Error('No accepted artifact contract');const expected=JSON.parse(row.contract);
 for(const key of Object.keys(expected))if(envelope.payload[key]!==expected[key])throw Error('Receipt binding mismatch');
 const old=this.db.prepare('SELECT record FROM delivery_receipts WHERE (provider=? AND key_id=? AND receipt_id=?) OR (provider=? AND job_id=?)').get(expected.provider,expected.keyId,envelope.payload.receiptId,expected.provider,expected.jobId);
 if(old){const saved=JSON.parse(old.record);if(saved.wireDigest!==wireDigest||saved.receiptDigest!==digest(signed))throw Error('Conflicting receipt replay');return {...saved,idempotent:true};}
 const verified=verifyDeliveryReceipt({envelope,expected,artifactBytes,trustedPublicKey,nowMs});
 const record={...verified,wireDigest,mode:this.mode};
 this.db.prepare('INSERT INTO delivery_receipts VALUES(?,?,?,?,?)').run(verified.provider,verified.keyId,verified.receiptId,verified.jobId,encoded(record));this.budget();
 const result=k.observe({claimId:`delivery:${digest(encoded([expected.provider,expected.jobId]))}`,objectiveId:expected.objectiveId,effectId,source:'merchant',type:'delivery.verified',evidence:{verified:true,simulated:this.mode==='demo',receiptDigest:verified.receiptDigest,artifactSha256:verified.artifactSha256}});
 return {...record,idempotent:false,position:result.position};});
 }
 reset(){throw Error('Operation journal cannot reset; use a separate fixture database');}
}
