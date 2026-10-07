import { createHash, randomUUID } from 'node:crypto';
import { MEW } from '../core/mew.mjs';
export const campaignStages = ['Campaign brief', 'Independent rights review', 'Reserve clipper A', 'Competing clipper B', 'Provisional metrics', 'Exact artifact acceptance', 'Simulated settlement'];
const scenarios = ['happy', 'missing-rights', 'early-metrics'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const objectiveId = 'campaign-five-clips';
const semanticKey = 'owned-webinar-five-clips-v1';
const freeze = value => { if(value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const rights = { source:'fixture-owned-webinar', contentOwnership:'SYNTHETIC_APPROVED', music:'NONE', likeness:'SYNTHETIC_APPROVED' };
export function createCampaign(scenario='happy') {
  if(!scenarios.includes(scenario)) throw new Error('Unknown campaign scenario');
  const k = new MEW();
  k.createObjective({id:objectiveId,principal:'synthetic-marketing-team',semanticKey,quantity:1,maxExposure:10000000,description:'Five promotional clips from one owned webinar'});
  return {version:1,campaignId:randomUUID(),mode:'simulation',scenario,stage:0,blocked:false,kernel:k.snapshot(),position:k.position(objectiveId),events:[],agents:[],brief:null,artifact:null,decisions:{},metrics:null};
}
/** Trusted local fixture snapshot only. Financial observations are synthetic and
 * must never be imported into a live ledger. Outer storage owns atomic persistence. */
export function advanceCampaign(input,{expectedStage,expectedCampaignId}={}) {
  if(!input || typeof input.campaignId!=='string' || !/^[0-9a-f-]{36}$/.test(input.campaignId) || input.version!==1 || input.mode!=='simulation' || !scenarios.includes(input.scenario) || !Number.isInteger(input.stage) || input.stage<0 || input.stage>campaignStages.length || typeof input.blocked!=='boolean') throw new Error('Invalid campaign snapshot');
  if(typeof expectedCampaignId!=='string' || expectedCampaignId!==input.campaignId) throw new Error('Stale campaign: reload before advancing');
  if(!Number.isInteger(expectedStage) || expectedStage!==input.stage) throw new Error('Stale stage: reload before advancing');
  const s = structuredClone(input);
  if(s.blocked || s.stage===campaignStages.length) return s;
  const k = new MEW(s.kernel);
  const event = (role,message,inputRefs=[],outputRefs=[]) => s.events.push({id:s.events.length+1,stage:s.stage,role,message,inputRefs,outputRefs,simulated:true,authority:role==='host'||role==='rail fixture'?'deterministic-fixture-host':'advisory-only'});
  if(s.stage===0) {
    s.brief={id:'campaign-brief-v1',audience:'Synthetic small agency',deliverable:'Five promotional clip outlines from an owned webinar',sourceId:'fixture-owned-webinar',acceptance:{clipCount:5,revisionLimit:1,publishingApproved:false},rights:s.scenario==='missing-rights'?{...rights,contentOwnership:'UNKNOWN'}:rights};
    s.agents.push({role:'strategy',status:'COMPLETE',inputRefs:['fixture-owned-webinar'],outputRefs:['campaign-brief-v1'],simulated:true});
    event('strategy','Fixed production brief prepared; no publishing or ad-spend permission.', ['fixture-owned-webinar'],['campaign-brief-v1']);
  }
  if(s.stage===1) {
    // Each independent reviewer receives its own frozen copy of source evidence,
    // never the other reviewer's output. These are rules, not model invocations.
    const review = role => {
      const context=freeze(structuredClone({brief:s.brief,sourceId:'fixture-owned-webinar'}));
      const approved=context.brief.rights.contentOwnership==='SYNTHETIC_APPROVED' && context.brief.rights.likeness==='SYNTHETIC_APPROVED' && context.brief.rights.music==='NONE';
      return {role,status:approved?'ACCEPT':'ABSTAIN',inputRefs:['campaign-brief-v1','fixture-owned-webinar'],outputRefs:[`${role}-review-v1`],context,simulated:true};
    };
    s.agents.push(review('risk'),review('red-team'));
    s.blocked=s.agents.some(a=>a.status==='ABSTAIN');
    event('risk','Independent synthetic rights check: missing rights block procurement.', ['campaign-brief-v1','fixture-owned-webinar'],['risk-review-v1']);
    event('red-team','Independent synthetic check: no peer judgment supplied; rights are fixtures, not legal verification.', ['campaign-brief-v1','fixture-owned-webinar'],['red-team-review-v1']);
  }
  if(s.stage===2) {
    const result=k.evaluate({objectiveId,proposedEffect:{id:'clipper-a',semanticKey,provider:'Clipper A fixture',type:'payment',amount:8000000,agent:'production'}});
    s.decisions.reserve=result.decision;
    s.agents.push({role:'production',status:'COMPLETE',inputRefs:['campaign-brief-v1'],outputRefs:['production-request-v1'],simulated:true});
    event('host',`${result.decision}: one clip production commitment reserves 8 ADA of the 10 ADA synthetic ceiling.`,['campaign-brief-v1','risk-review-v1','red-team-review-v1'],['clipper-a']);
  }
  if(s.stage===3) {
    s.agents.push({role:'creative',status:'COMPLETE',inputRefs:['campaign-brief-v1'],outputRefs:['creative-outline-v1'],simulated:true});
    const result=k.evaluate({objectiveId,proposedEffect:{id:'clipper-b',semanticKey,provider:'Clipper B fixture',type:'payment',amount:6000000,agent:'creative'}});
    s.decisions.competing=result.decision;
    event('host',`${result.decision}: the equivalent five-outline bundle is already reserved. A second 6 ADA commitment would also exceed the ceiling; reconcile A, no second dispatch.`,['campaign-brief-v1'],['creative-outline-v1','clipper-b-deferred']);
  }
  if(s.stage===4) {
    s.metrics={views:3000,source:'synthetic-analytics',provisional:true,measurementWindowClosed:false,disputeWindowClosed:false,financialAuthority:false};
    k.observe({claimId:'campaign-response-unknown',effectId:'clipper-a',source:'production',type:'delivery.unknown',evidence:{simulated:true}});
    event('measurement','3,000 provisional views are not payment evidence. The full reservation stays occupied; no liability release.', ['clipper-a'],['provisional-metrics-v1']);
  }
  if(s.stage===5) {
    if(s.scenario==='early-metrics') { s.blocked=true; event('delivery','Provisional metrics cannot replace exact deliverable acceptance. Await artifact and operator review.', ['provisional-metrics-v1'],[]); }
    else {
      const bytes=JSON.stringify({version:1,sourceId:s.brief.sourceId,clipOutlines:[1,2,3,4,5].map(i=>({id:`clip-${i}`,hook:`Synthetic hook ${i}`,caption:`Synthetic caption ${i}`})),revision:0});
      s.artifact={id:'campaign-artifact-v1',version:1,bytes,sha256:hash(bytes),effectId:'clipper-a',simulated:true,kind:'clip-outlines',mediaProduced:false};
      s.acceptance={effectId:'clipper-a',sourceId:s.brief.sourceId,artifactId:s.artifact.id,version:s.artifact.version,sha256:hash(bytes),clipCount:5,revision:0,approved:true,simulated:true,publishingApproved:false};
      if(s.acceptance.sha256!==s.artifact.sha256 || s.acceptance.version!==s.artifact.version) throw new Error('Artifact acceptance mismatch');
      k.observe({claimId:'campaign-delivery-fixture',effectId:'clipper-a',source:'merchant',type:'delivery.verified',evidence:{verified:true,simulated:true,artifactHash:s.artifact.sha256}});
      s.agents.push({role:'delivery',status:'COMPLETE',inputRefs:['campaign-artifact-v1','campaign-brief-v1'],outputRefs:['artifact-acceptance-v1'],simulated:true});
      event('delivery','Exact five-outline artifact accepted in a synthetic review. No video generated and no payment settlement inferred.', ['campaign-artifact-v1','campaign-brief-v1'],['artifact-acceptance-v1']);
    }
  }
  if(s.stage===6) {
    if(!s.artifact || !s.acceptance || s.acceptance.approved!==true || s.acceptance.effectId!=='clipper-a' || s.artifact.effectId!=='clipper-a' || s.acceptance.artifactId!==s.artifact.id || s.acceptance.sourceId!==s.brief.sourceId || s.acceptance.clipCount!==5 || !Number.isSafeInteger(s.acceptance.revision) || s.acceptance.revision<0 || s.acceptance.revision>s.brief.acceptance.revisionLimit || s.artifact.sha256!==hash(s.artifact.bytes) || s.acceptance.sha256!==s.artifact.sha256 || s.acceptance.version!==s.artifact.version) throw new Error('Artifact acceptance mismatch');
    const contents=JSON.parse(s.artifact.bytes);
    if(contents.sourceId!==s.acceptance.sourceId || contents.version!==s.acceptance.version || contents.revision!==s.acceptance.revision || !Array.isArray(contents.clipOutlines) || contents.clipOutlines.length!==s.acceptance.clipCount) throw new Error('Artifact content mismatch');
    k.observe({claimId:'campaign-settlement-fixture',effectId:'clipper-a',source:'cardano',type:'payment.settled',amount:8000000,evidence:{verified:true,simulated:true}});
    event('rail fixture','Synthetic 8 ADA settlement moves reservation to spent. No blockchain transaction, publishing, or performance payout occurred.', ['clipper-a','artifact-acceptance-v1'],['settlement-fixture-v1']);
  }
  s.stage++; s.kernel=k.snapshot(); s.position=k.position(objectiveId); return s;
}
