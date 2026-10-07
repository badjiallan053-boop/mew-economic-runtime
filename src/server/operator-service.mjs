import {createHash,timingSafeEqual,KeyObject} from 'node:crypto';
const hash=v=>createHash('sha256').update(v).digest('hex');
const actions=['read','reserve','accept-delivery'];
const id=v=>typeof v==='string'&&/^[A-Za-z0-9._:@/-]{1,200}$/.test(v);
const exact=(v,keys)=>{if(!v||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))throw Error('Invalid trusted policy');};
/** Hash is for high-entropy random bearer tokens, never user passwords. */
export function operatorTokenDigest(token){if(typeof token!=='string'||token.length<32||token.length>1024||/\s/.test(token))throw Error('High-entropy operator token required');return hash(token);}
function authorize(policy,token,action,nowMs){
 if(!Number.isSafeInteger(nowMs)||nowMs<0||!actions.includes(action))throw Error('Operator authorization denied');
 const candidate=operatorTokenDigest(token);let matched;
 for(const p of policy){if(timingSafeEqual(Buffer.from(candidate,'hex'),Buffer.from(p.tokenDigest,'hex')))matched=p;}
 if(!matched||matched.revoked||nowMs>=matched.expiresAtMs||!matched.actions.includes(action))throw Error('Operator authorization denied');return matched.principal;
}
/** No HTTP listener or signer. Deployment must supply private reviewed policy,
 * bind clock to trusted host time and keep this store separate from public demo. */
export class OperatorService{
 #policy; #providerKeys; #store; #clock;
 constructor({store,policy,providerKeys,clock=Date.now}){
 if(!store||store.mode!=='live'||typeof clock!=='function'||!Array.isArray(policy)||!policy.length||policy.length>100||!Array.isArray(providerKeys)||providerKeys.length>100)throw Error('Private live operation store and bounded policy required');
 const tokens=new Set();this.#policy=policy.map(p=>{exact(p,['principal','tokenDigest','expiresAtMs','revoked','actions']);if(!id(p.principal)||!/^[a-f0-9]{64}$/.test(p.tokenDigest)||tokens.has(p.tokenDigest)||!Number.isSafeInteger(p.expiresAtMs)||p.expiresAtMs<=0||typeof p.revoked!=='boolean'||!Array.isArray(p.actions)||!p.actions.length||p.actions.some(a=>!actions.includes(a))||new Set(p.actions).size!==p.actions.length)throw Error('Invalid trusted operator policy');tokens.add(p.tokenDigest);return structuredClone(p);});
 const keys=new Set();this.#providerKeys=providerKeys.map(k=>{exact(k,['provider','keyId','publicKey','notBeforeMs','expiresAtMs','revoked']);const ref=JSON.stringify([k.provider,k.keyId]);if(!id(k.provider)||!id(k.keyId)||keys.has(ref)||!(k.publicKey instanceof KeyObject)||k.publicKey.type!=='public'||k.publicKey.asymmetricKeyType!=='ed25519'||!Number.isSafeInteger(k.notBeforeMs)||k.notBeforeMs<0||!Number.isSafeInteger(k.expiresAtMs)||k.expiresAtMs<=k.notBeforeMs||typeof k.revoked!=='boolean')throw Error('Invalid pre-enrolled provider key');keys.add(ref);return {...k};});
 this.#store=store;this.#clock=clock;
 }
 owner(token,action,objectiveId){const principal=authorize(this.#policy,token,action,this.#clock());let objective;try{objective=this.#store.read().objective(objectiveId);}catch{throw Error('Operator authorization denied');}if(objective.principal!==principal)throw Error('Operator authorization denied');return principal;}
 read(token,objectiveId){this.owner(token,'read',objectiveId);return this.#store.read().position(objectiveId);}
 reserve(token,input){exact(input,['operationId','objectiveId','proposedEffect']);const principal=this.owner(token,'reserve',input.objectiveId);return this.#store.reserveOperation({...input,principal});}
 acceptDelivery(token,{effectId,envelope,artifactBytes}){
 const row=this.#store.db.prepare('SELECT contract FROM delivery_contracts WHERE effect_id=?').get(effectId);if(!row)throw Error('Operator authorization denied');const expected=JSON.parse(row.contract);this.owner(token,'accept-delivery',expected.objectiveId);
 const nowMs=this.#clock();if(!Number.isSafeInteger(nowMs)||nowMs<0)throw Error('Operator authorization denied');const key=this.#providerKeys.find(k=>k.provider===expected.provider&&k.keyId===expected.keyId);if(!key||key.revoked||nowMs<key.notBeforeMs||nowMs>=key.expiresAtMs)throw Error('Provider key unavailable');
 return this.#store.acceptDelivery({effectId,envelope,artifactBytes,trustedPublicKey:key.publicKey,nowMs});
 }
}
