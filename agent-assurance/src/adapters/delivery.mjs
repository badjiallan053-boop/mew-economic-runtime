import { createHash,createPublicKey,verify } from 'node:crypto';
import { canonical,digest,integer,requestContract } from '../dispatch/contracts.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const hex=value=>{if(typeof value!=='string'||! /^[a-f0-9]{64}$/.test(value))throw new Error('SHA256 digest required');return value;};
const exact=(value,keys)=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==keys.slice().sort().join(','))throw new Error('Unexpected delivery fields');};
function publicKey(encoded){
  if(typeof encoded!=='string'||encoded.length>128)throw new Error('Ed25519 public key required');
  const bytes=Buffer.from(encoded,'base64');
  if(bytes.toString('base64')!==encoded)throw new Error('Canonical public key encoding required');
  const key=createPublicKey({key:bytes,type:'spki',format:'der'});
  if(key.asymmetricKeyType!=='ed25519'||key.export({type:'spki',format:'der'}).toString('base64')!==encoded)throw new Error('Ed25519 public key required');
  return key;
}
export const deliveryBytes=body=>Buffer.from('MEW-DELIVERY-V1\n'+JSON.stringify(canonical(body)));
export function artifactIdentity(bytes){
  if(!Buffer.isBuffer(bytes)||bytes.length<1||bytes.length>1048576)throw new Error('Artifact must be 1 byte to 1 MiB');
  return {artifactDigest:hash(bytes),bytes:bytes.length};
}
function signature(envelope,key){
  exact(envelope,['body','signature']);
  if(typeof envelope.signature!=='string'||envelope.signature.length!==88)throw new Error('Invalid delivery signature');
  const bytes=Buffer.from(envelope.signature,'base64');
  if(bytes.length!==64||bytes.toString('base64')!==envelope.signature||!verify(null,deliveryBytes(envelope.body),publicKey(key),bytes))throw new Error('Invalid delivery signature');
}

// Trusted local enrollment only. There is deliberately no browser enrollment route.
export class DeliveryVerifier {
  constructor(store,{clock=()=>Date.now()}={}) {
    this.store=store;this.clock=clock;
    store.db.exec(`CREATE TABLE IF NOT EXISTS delivery_contracts (effect_id TEXT PRIMARY KEY, contract TEXT NOT NULL,
      digest TEXT NOT NULL, supplier_key TEXT NOT NULL, owner_key TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS delivery_receipts (effect_id TEXT PRIMARY KEY, body TEXT NOT NULL, digest TEXT NOT NULL, signature TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS delivery_acceptance (effect_id TEXT PRIMARY KEY, body TEXT NOT NULL, digest TEXT NOT NULL, signature TEXT NOT NULL);`);
  }
  bound(k,id){
    const op=this.store.operation(id),e=k.snapshot().effects.find(e=>e.id===id);
    if(!op||!e)throw new Error('Unknown delivery operation');
    const expected=requestContract({effectId:e.id,objectiveId:e.objectiveId,principal:k.objective(e.objectiveId).principal,
      semanticKey:e.semanticKey,provider:e.provider,recipient:e.recipientAddress,asset:e.asset,amount:e.amount});
    if(digest(expected)!==op.requestDigest||digest(op.request)!==op.requestDigest)throw new Error('Delivery authority changed');
    return {op,e};
  }
  enroll(id,{supplierKey,ownerKey,criteriaDigest,validUntil}) {
    publicKey(supplierKey);publicKey(ownerKey);hex(criteriaDigest);integer(validUntil,'expiry');
    if(supplierKey===ownerKey)throw new Error('Supplier and owner keys must differ');
    return this.store.transact(k=>{
      const {op}=this.bound(k,id),old=this.store.db.prepare('SELECT * FROM delivery_contracts WHERE effect_id=?').get(id);
      const enrolledAt=old?JSON.parse(old.contract).enrolledAt:integer(this.clock(),'clock');
      const contract={schema:'mew.delivery-contract/v1',effectId:id,objectiveId:op.request.objectiveId,principal:op.request.principal,
        requestDigest:op.requestDigest,criteriaDigest,supplierKeyDigest:hash(Buffer.from(supplierKey,'base64')),
        ownerKeyDigest:hash(Buffer.from(ownerKey,'base64')),enrolledAt,validUntil,simulated:true};
      if(old){if(old.digest!==digest(contract))throw new Error('Delivery contract is immutable');return {...contract,contractDigest:old.digest};}
      if(op.state!=='READY'||op.attempts!==0||validUntil<=enrolledAt||validUntil-enrolledAt>86400000)throw new Error('Enroll bounded delivery terms before dispatch');
      this.store.db.prepare('INSERT INTO delivery_contracts VALUES (?,?,?,?,?)').run(id,JSON.stringify(contract),digest(contract),supplierKey,ownerKey);
      return {...contract,contractDigest:digest(contract)};
    });
  }
  contract(k,id){
    const {op,e}=this.bound(k,id),row=this.store.db.prepare('SELECT * FROM delivery_contracts WHERE effect_id=?').get(id);
    if(!row)throw new Error('Delivery contract not enrolled');
    const contract=JSON.parse(row.contract);
    if(digest(contract)!==row.digest||contract.requestDigest!==op.requestDigest||contract.supplierKeyDigest!==hash(Buffer.from(row.supplier_key,'base64'))||
      contract.ownerKeyDigest!==hash(Buffer.from(row.owner_key,'base64')))throw new Error('Delivery contract changed');
    return {row,contract,op,e};
  }
  fresh(body,contract){
    const now=integer(this.clock(),'clock');integer(body.issuedAt,'issued time');
    if(now<contract.enrolledAt||now>contract.validUntil||body.issuedAt<contract.enrolledAt||body.issuedAt>now||body.issuedAt>contract.validUntil)throw new Error('Expired or future delivery evidence');
  }
  receive(id,envelope,artifact) {
    exact(envelope,['body','signature']);const body=envelope.body;
    exact(body,['schema','contractDigest','artifactDigest','bytes','issuedAt']);
    const identity=artifactIdentity(artifact);hex(body.contractDigest);hex(body.artifactDigest);integer(body.bytes,'artifact size',1);
    if(body.schema!=='mew.delivery-receipt/v1'||body.artifactDigest!==identity.artifactDigest||body.bytes!==identity.bytes)throw new Error('Artifact does not match receipt');
    return this.store.transact(k=>{
      const {row,contract,e}=this.contract(k,id);
      if(body.contractDigest!==row.digest)throw new Error('Receipt belongs to another contract');
      signature(envelope,row.supplier_key);
      const old=this.store.db.prepare('SELECT * FROM delivery_receipts WHERE effect_id=?').get(id);
      if(old){if(old.digest!==digest(body))throw new Error('Conflicting delivery receipt');return {receiptDigest:old.digest,idempotent:true};}
      this.fresh(body,contract);
      if(['failed','released','refunded'].includes(e.status))throw new Error('Delivery conflicts with terminal release');
      this.store.db.prepare('INSERT INTO delivery_receipts VALUES (?,?,?,?)').run(id,JSON.stringify(body),digest(body),envelope.signature);
      return {receiptDigest:digest(body),idempotent:false};
    });
  }
  decide(id,envelope,artifact,{beforeCommit}={}) {
    exact(envelope,['body','signature']);const body=envelope.body;
    exact(body,['schema','contractDigest','receiptDigest','artifactDigest','decision','issuedAt']);
    hex(body.contractDigest);hex(body.receiptDigest);hex(body.artifactDigest);
    if(body.schema!=='mew.delivery-acceptance/v1'||!['accept','reject'].includes(body.decision)||artifactIdentity(artifact).artifactDigest!==body.artifactDigest)throw new Error('Invalid owner acceptance');
    return this.store.transact(k=>{
      const {row,contract,e}=this.contract(k,id),receipt=this.store.db.prepare('SELECT * FROM delivery_receipts WHERE effect_id=?').get(id);
      if(!receipt||receipt.digest!==body.receiptDigest||digest(JSON.parse(receipt.body))!==receipt.digest||body.contractDigest!==row.digest||JSON.parse(receipt.body).artifactDigest!==body.artifactDigest)throw new Error('Acceptance does not match receipt');
      signature({body:JSON.parse(receipt.body),signature:receipt.signature},row.supplier_key);
      signature(envelope,row.owner_key);
      const old=this.store.db.prepare('SELECT * FROM delivery_acceptance WHERE effect_id=?').get(id);
      if(old){if(old.digest!==digest(body))throw new Error('Conflicting owner decision');return {decision:body.decision,idempotent:true};}
      this.fresh(body,contract);
      if(body.issuedAt<JSON.parse(receipt.body).issuedAt)throw new Error('Acceptance predates receipt');
      if(e.status!=='settled')throw new Error('Payment settlement required before acceptance');
      this.store.db.prepare('INSERT INTO delivery_acceptance VALUES (?,?,?,?)').run(id,JSON.stringify(body),digest(body),envelope.signature);
      if(body.decision==='accept')k.observe({claimId:'delivery:'+digest(body),effectId:id,source:'merchant',type:'delivery',
        evidence:{verified:true,simulated:true,verifier:'delivery-ed25519-local',artifactDigest:body.artifactDigest,
          receiptDigest:body.receiptDigest,acceptanceDigest:digest(body),contractDigest:row.digest}});
      beforeCommit?.();
      return {decision:body.decision,idempotent:false};
    });
  }
}
