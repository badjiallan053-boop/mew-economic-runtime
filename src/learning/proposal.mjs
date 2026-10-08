import {createHash} from 'node:crypto';
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
export const proposalDigest=p=>createHash('sha256').update(JSON.stringify(canonical(p))).digest('hex');
const families=['evidence-provenance','input-validation','replay-protection','uncertainty-retention','delivery-binding','dataset-integrity'];
export function validateProposal(p,{baselinePolicyDigest,evidenceSnapshotDigest,evidenceIds}){
 const keys=['schema','proposalId','authority','activationAllowed','baselinePolicyDigest','evidenceSnapshotDigest','ruleFamily','problem','suggestion','evidenceRefs','uncertainties','requiredTests'];
 if(!p||Object.keys(p).length!==keys.length||Object.keys(p).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(p,k)))throw Error('Invalid proposal fields');
 if(p.schema!=='mew.rule-proposal.v1'||p.authority!=='advisory-only'||p.activationAllowed!==false||!families.includes(p.ruleFamily))throw Error('Invalid proposal authority');
 if(!hex(baselinePolicyDigest)||!hex(evidenceSnapshotDigest)||p.baselinePolicyDigest!==baselinePolicyDigest||p.evidenceSnapshotDigest!==evidenceSnapshotDigest)throw Error('Stale proposal binding');
 for(const k of ['proposalId','problem','suggestion'])if(typeof p[k]!=='string'||!p[k].trim()||p[k].length>2000)throw Error('Invalid proposal text');
 for(const k of ['evidenceRefs','uncertainties','requiredTests'])if(!Array.isArray(p[k])||!p[k].length||p[k].length>20||new Set(p[k]).size!==p[k].length||p[k].some(x=>typeof x!=='string'||!x.trim()||x.length>1000))throw Error('Invalid proposal list');
 if(p.evidenceRefs.some(id=>!evidenceIds.includes(id)))throw Error('Unknown evidence');
 if(!p.requiredTests.includes('unknown-evidence-ref')||!p.requiredTests.includes('source-instruction-injection')||Buffer.byteLength(JSON.stringify(p))>16000)throw Error('Missing proposal safety tests or oversized payload');
 return{digest:proposalDigest(p),authority:'advisory-only',activationAllowed:false};
}
export function reviewProposal(p,context,reviews){
 const validated=validateProposal(p,context);
 if(!Array.isArray(reviews)||reviews.length!==2)return{status:'BLOCKED',activationAllowed:false,authenticated:false};
 const roles=new Set(),reviewers=new Set();
 for(const r of reviews){
  const keys=['role','reviewerId','proposalDigest','verdict'];
  if(!r||Object.keys(r).some(k=>!keys.includes(k))||!['risk','red-team'].includes(r.role)||roles.has(r.role)||typeof r.reviewerId!=='string'||!r.reviewerId.trim()||r.reviewerId.length>100||reviewers.has(r.reviewerId)||r.proposalDigest!==validated.digest||!['ACCEPT','ABSTAIN','REJECT'].includes(r.verdict))throw Error('Invalid or stale independent review');roles.add(r.role);reviewers.add(r.reviewerId);
 }
 return{status:reviews.every(r=>r.verdict==='ACCEPT')?'READY_FOR_HUMAN_REVIEW':'BLOCKED',proposalDigest:validated.digest,activationAllowed:false,authenticated:false};
}
