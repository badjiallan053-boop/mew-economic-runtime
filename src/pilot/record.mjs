import {createHash} from 'node:crypto';
const id=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const integer=v=>Number.isSafeInteger(v)&&v>=0;
function fields(value,keys){if(!value||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))throw Error('Invalid pilot contract fields');}
export function createPilot(input){
 fields(input,['id','principal','objectiveId','effectId','customerConsentRef','rightsEvidenceRef','expectedClips','revisionLimit','mode']);
 for(const k of ['id','principal','objectiveId','effectId','customerConsentRef','rightsEvidenceRef'])if(!id(input[k]))throw Error(`Invalid ${k}`);
 if(input.expectedClips!==5||!integer(input.revisionLimit)||input.revisionLimit>5||!['simulation','operator-recorded'].includes(input.mode))throw Error('Invalid pilot limits');
 return {version:1,contract:structuredClone(input),clips:[],reviews:[]};
}
export function recordArtifact(input,{clipId,revision,artifactSha256,submittedAt}){
 const s=structuredClone(input);validate(s);
 if(!id(clipId)||!integer(revision)||revision>s.contract.revisionLimit||!hash(artifactSha256)||!integer(submittedAt))throw Error('Invalid artifact');
 const existing=s.clips.find(c=>c.clipId===clipId&&c.revision===revision);
 const row={clipId,revision,artifactSha256,submittedAt};
 if(existing){if(JSON.stringify(existing)!==JSON.stringify(row))throw Error('Conflicting artifact identity');return s;}
 const previous=s.clips.filter(c=>c.clipId===clipId);
 if(!previous.length&&revision!==0||previous.length&&revision!==Math.max(...previous.map(c=>c.revision))+1)throw Error('Nonsequential revision');
 if(!previous.length&&new Set(s.clips.map(c=>c.clipId)).size>=s.contract.expectedClips)throw Error('Clip quantity exceeded');
 s.clips.push(row);return s;
}
export function recordReview(input,review){
 validate(input);fields(review,['reviewId','reviewerId','clipId','revision','artifactSha256','decision','reviewedAt']);
 if(!id(review.reviewId)||!id(review.reviewerId)||!['ACCEPT','REVISE','REJECT'].includes(review.decision)||!integer(review.reviewedAt))throw Error('Invalid review');
 const artifact=input.clips.find(c=>c.clipId===review.clipId&&c.revision===review.revision&&c.artifactSha256===review.artifactSha256);
 if(!artifact||review.reviewedAt<artifact.submittedAt)throw Error('Review must bind submitted artifact');
 const existing=input.reviews.find(r=>r.reviewId===review.reviewId);
 if(existing){if(JSON.stringify(existing)!==JSON.stringify(review))throw Error('Conflicting review ID');return structuredClone(input);}
 if(input.reviews.some(r=>r.clipId===review.clipId&&r.revision===review.revision))throw Error('Revision already reviewed');
 const latest=Math.max(...input.clips.filter(c=>c.clipId===review.clipId).map(c=>c.revision));
 if(review.revision!==latest)throw Error('Stale review');
 const s=structuredClone(input);s.reviews.push(structuredClone(review));return s;
}
function validate(s){
 if(!s||s.version!==1||!Array.isArray(s.clips)||!Array.isArray(s.reviews)||s.clips.length>30||s.reviews.length>30)throw Error('Invalid pilot snapshot');
 createPilot(s.contract);
 // Trusted local snapshots only. Storage/authentication belongs to the host.
}
export function pilotMetrics(s,{reportedCostAtomic,asset}){
 validate(s);if(!integer(reportedCostAtomic)||!['lovelace'].includes(asset))throw Error('Invalid reported cost');
 const latest=[...new Set(s.clips.map(c=>c.clipId))].map(id=>s.clips.filter(c=>c.clipId===id).sort((a,b)=>b.revision-a.revision)[0]);
 const accepted=latest.filter(c=>s.reviews.some(r=>r.clipId===c.clipId&&r.revision===c.revision&&r.decision==='ACCEPT'));
 const latency=accepted.map(c=>s.reviews.find(r=>r.clipId===c.clipId&&r.revision===c.revision).reviewedAt-c.submittedAt);
 return {mode:s.contract.mode,expectedClips:5,acceptedClips:accepted.length,complete:accepted.length===5,revisions:s.clips.filter(c=>c.revision>0).length,reportedCostAtomic,asset,costPerAccepted:{numerator:reportedCostAtomic,denominator:accepted.length},meanApprovalLatencyMs:latency.length?latency.reduce((a,b)=>a+b,0)/latency.length:null,limitations:'Operator-recorded consent, rights, reviews and cost; no legal, cryptographic, payment or conversion verification.'};
}
export const artifactHash=bytes=>createHash('sha256').update(bytes).digest('hex');
