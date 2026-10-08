import test from 'node:test';import assert from 'node:assert/strict';
import {createPilot,recordArtifact,recordReview,pilotMetrics,artifactHash} from '../src/pilot/record.mjs';
const contract={id:'pilot-1',principal:'fixture',objectiveId:'objective-1',effectId:'effect-1',customerConsentRef:'fixture-consent',rightsEvidenceRef:'fixture-rights',expectedClips:5,revisionLimit:1,mode:'simulation'};
test('pilot requires consent references and exact artifact-bound reviews',()=>{
 assert.throws(()=>createPilot({...contract,customerConsentRef:''}));
 let s=createPilot(contract);const row={clipId:'clip-1',revision:0,artifactSha256:artifactHash('fixture'),submittedAt:100};s=recordArtifact(s,row);
 assert.deepEqual(recordArtifact(s,row),s);
 assert.throws(()=>recordArtifact(s,{...row,artifactSha256:artifactHash('changed')}));
 const review={reviewId:'review-1',reviewerId:'fixture-reviewer',clipId:'clip-1',revision:0,artifactSha256:row.artifactSha256,decision:'ACCEPT',reviewedAt:200};
 assert.throws(()=>recordReview(s,{...review,artifactSha256:artifactHash('wrong')}));
 s=recordReview(s,review);assert.equal(pilotMetrics(s,{reportedCostAtomic:100,asset:'lovelace'}).acceptedClips,1);
 s=recordArtifact(s,{...row,revision:1,artifactSha256:artifactHash('revision'),submittedAt:300});
 assert.equal(pilotMetrics(s,{reportedCostAtomic:100,asset:'lovelace'}).acceptedClips,0);
 assert.throws(()=>recordReview(s,{...review,reviewId:'stale'}));
});
test('pilot bounds quantities and keeps undefined cost-per-acceptance explicit',()=>{
 let s=createPilot(contract);for(let n=0;n<5;n++)s=recordArtifact(s,{clipId:`clip-${n}`,revision:0,artifactSha256:artifactHash(String(n)),submittedAt:0});
 assert.throws(()=>recordArtifact(s,{clipId:'sixth',revision:0,artifactSha256:artifactHash('six'),submittedAt:0}));
 assert.equal(pilotMetrics(s,{reportedCostAtomic:100,asset:'lovelace'}).costPerAccepted.denominator,0);
 assert.throws(()=>pilotMetrics(s,{reportedCostAtomic:1.5,asset:'lovelace'}));
});
