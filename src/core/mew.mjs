const clone = value => structuredClone(value);
const randomUUID = () => globalThis.crypto.randomUUID();
function string(value, name) { if (typeof value !== 'string' || !value.trim() || value.length > 512) throw new Error(`${name} must be a nonempty string`); return value; }
function integer(value, name, min = 0) { if (!Number.isSafeInteger(value) || value < min) throw new Error(`${name} must be a safe integer >= ${min}`); return value; }
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value==='object' ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])) : value;
function same(a,b) { return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b)); }

/** Deterministic mission accounting. Call evaluate and persist its snapshot within
 * one database transaction before dispatching any external side effect. */
export class MEW {
  constructor(snapshot = {}) {
    this.state = clone({ objectives: snapshot.objectives ?? [], effects: snapshot.effects ?? [], claims: snapshot.claims ?? [], decisions: snapshot.decisions ?? [] });
  }
  snapshot() { return clone(this.state); }
  createObjective(input) {
    const objective = { id:string(input.id,'id'), principal:string(input.principal,'principal'), description:input.description ?? '', semanticKey:string(input.semanticKey,'semanticKey'), quantity:integer(input.quantity,'quantity',1), maxExposure:integer(input.maxExposure,'maxExposure') };
    const existing = this.state.objectives.find(o=>o.id===objective.id);
    if(existing) { if(!same(existing,objective)) throw new Error('Objective identity already exists with a different mandate'); return clone(existing); }
    if(this.state.objectives.some(o=>o.principal===objective.principal && o.semanticKey===objective.semanticKey)) throw new Error('Equivalent mandate already exists for this principal');
    this.state.objectives.push(objective); return clone(objective);
  }
  objective(id) { const o=this.state.objectives.find(o=>o.id===id); if(!o) throw new Error('Unknown objective'); return o; }
  position(id) {
    const objective=this.objective(id); const effects=this.state.effects.filter(e=>e.objectiveId===id);
    let spent=0,reserved=0,committed=0,refunded=0,satisfied=0,equivalents=0;
    for(const e of effects) {
      if(e.status==='settled') spent+=e.amount;
      if(e.status==='refunded') refunded+=e.amount;
      if(e.status==='reserved') reserved+=e.amount;
      if(e.status==='committed') committed+=e.amount;
      if(e.deliveryVerified) satisfied++;
      if(e.deliveryVerified || !['released','failed','refunded'].includes(e.status)) equivalents++;
    }
    const exposure=spent+reserved+committed;
    return {objectiveId:id,spent,reserved,committed,refunded,exposure,equivalents,satisfied,remainingQuantity:Math.max(0,objective.quantity-equivalents),remainingBudget:objective.maxExposure-exposure,status:satisfied>=objective.quantity?'SATISFIED':'OPEN'};
  }
  evaluate({objectiveId,proposedEffect}) {
    const objective=this.objective(objectiveId); const p=proposedEffect;
    if(!p || typeof p!=='object') throw new Error('proposedEffect is required');
    const effect={id:string(p.id,'effect id'),objectiveId:p.objectiveId ?? objectiveId,semanticKey:string(p.semanticKey,'semanticKey'),provider:string(p.provider,'provider'),type:string(p.type ?? 'payment','type'),amount:integer(p.amount,'amount'),agent:string(p.agent ?? 'agent','agent')};
    if(p.recipientAddress!==undefined) effect.recipientAddress=string(p.recipientAddress,'recipientAddress');
    const position=this.position(objectiveId); let decision,reason,safeNextAction;
    const existing=this.state.effects.find(e=>e.id===effect.id);
    if(effect.objectiveId!==objectiveId || effect.semanticKey!==objective.semanticKey) { decision='DENY';reason='Effect does not match the principal mandate';safeNextAction='Correct the objective and semantic key'; }
    else if(existing) {
      const contractKeys=['id','objectiveId','semanticKey','provider','type','amount','agent','recipientAddress'];
      const original=Object.fromEntries(contractKeys.filter(k=>existing[k]!==undefined).map(k=>[k,existing[k]]));
      if(!same(original,effect)) {decision='DENY';reason='Effect ID reused with a different contract';safeNextAction='Reconcile the original effect; do not dispatch';}
      else {decision=['settled','refunded','failed','released'].includes(existing.status)?'DENY':'DEFER';reason='This effect has already been authorized';safeNextAction='Reconcile the original effect; never dispatch this authorization again';}
    } else if(position.satisfied>=objective.quantity) {decision='DENY';reason='Objective already satisfied';safeNextAction='Return the verified deliverable';}
    else if(position.equivalents>=objective.quantity) {decision='DEFER';reason='Equivalent effect is unresolved or already paid';safeNextAction='Reconcile payment and delivery of the existing effect';}
    else if(effect.amount>position.remainingBudget) {decision='DENY';reason='Maximum economic exposure would be exceeded';safeNextAction='Choose a lower cost effect or obtain a new principal mandate';}
    else {decision='ALLOW';reason='Objective capacity and budget reserved atomically';safeNextAction='Dispatch this effect once, then reconcile evidence';this.state.effects.push({...effect,status:'reserved',deliveryVerified:false,unknown:false,createdAt:new Date().toISOString()});}
    const result={id:randomUUID(),decision,reason,safeNextAction,position:this.position(objectiveId),effect:clone(existing ?? this.state.effects.find(e=>e.id===effect.id) ?? effect),timestamp:new Date().toISOString()};
    this.state.decisions.push(result); return clone(result);
  }
  simulate(input) {const simulation=new MEW(this.snapshot());return {...simulation.evaluate(input),simulation:true};}
  observe(input) {
    if(!input || typeof input!=='object') throw new Error('claim is required');
    string(input.claimId,'claimId');string(input.effectId,'effectId');string(input.source,'source');
    const previous=this.state.claims.find(c=>c.claimId===input.claimId);
    if(previous) { const a=clone(previous);delete a.receivedAt;if(!same(a,input)) throw new Error('Claim ID reused with different evidence');const e=this.state.effects.find(e=>e.id===input.effectId);return {claim:clone(previous),effect:clone(e),position:this.position(e.objectiveId),idempotent:true}; }
    const effect=this.state.effects.find(e=>e.id===input.effectId);if(!effect) throw new Error('Unknown effect');
    if(input.objectiveId!==undefined && input.objectiveId!==effect.objectiveId) throw new Error('Claim objective does not match effect');
    const source=input.source.toLowerCase();
    const raw=string(input.type ?? input.outcome,'claim type').toLowerCase();
    const type=raw==='delivery.verified'?'delivery':raw.split('.').at(-1);
    const financial=['committed','settled','failed','released','refunded'];
    if(financial.includes(type) && (!['cardano','masumi'].includes(source) || input.evidence?.verified!==true)) throw new Error('Financial transition requires verified rail evidence');
    if(type==='delivery' && (source!=='merchant' || input.evidence?.verified!==true)) throw new Error('Delivery requires verified merchant evidence');
    if(input.amount!==undefined && integer(input.amount,'claim amount')!==effect.amount) throw new Error('Claim amount does not match effect');
    if(type==='committed') {if(!['reserved','committed'].includes(effect.status)) throw new Error('Regressive commitment');effect.status='committed';}
    else if(type==='settled') {if(!['reserved','committed','settled'].includes(effect.status)) throw new Error('Conflicting settlement');effect.status='settled';effect.unknown=false;}
    else if(type==='delivery') {if(['failed','released','refunded'].includes(effect.status)) throw new Error('Delivery conflicts with terminal release');effect.deliveryVerified=true;}
    else if(type==='unknown') {effect.unknown=true;}
    else if(['failed','released'].includes(type)) {if(effect.status!=='reserved' || effect.deliveryVerified) throw new Error('Cannot release a paid, committed, or delivered effect');effect.status=type;}
    else if(type==='refunded') {if(!['committed','settled','refunded'].includes(effect.status) || input.amount!==effect.amount) throw new Error('Refund requires full amount and existing paid commitment');effect.status='refunded';effect.unknown=false;}
    else throw new Error('Unsupported claim type');
    const claim={...clone(input),receivedAt:new Date().toISOString()};this.state.claims.push(claim);return {claim:clone(claim),effect:clone(effect),position:this.position(effect.objectiveId),idempotent:false};
  }
}
