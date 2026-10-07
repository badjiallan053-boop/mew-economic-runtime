import {generateKeyPairSync,sign} from 'node:crypto';
import {baselineProvider,evaluateProvider} from '../src/evaluation/model.mjs';
import {createPilot,recordArtifact,recordReview,pilotMetrics,artifactHash} from '../src/pilot/record.mjs';
import {deliveryReceiptBytes,verifyDeliveryReceipt} from '../src/adapters/delivery-receipt.mjs';
import {validatePaymentPlan,paymentRecovery,syntheticPaymentPlan} from '../src/company/payment-plan.mjs';
const plan=syntheticPaymentPlan();
let pilot=createPilot({id:'synthetic-pilot',principal:plan.principal,objectiveId:plan.objectiveId,effectId:plan.effectId,customerConsentRef:'synthetic-consent',rightsEvidenceRef:'synthetic-rights',expectedClips:5,revisionLimit:1,mode:'simulation'});
// Ephemeral test key: not a wallet or an actual provider identity.
const {publicKey,privateKey}=generateKeyPairSync('ed25519');let verified=0;
for(let n=1;n<=5;n++){
 const bytes=Buffer.from(`Synthetic outline ${n}; not a rendered video`),artifactSha256=artifactHash(bytes);
 const expected={keyId:'synthetic-provider-key',principal:plan.principal,objectiveId:plan.objectiveId,effectId:plan.effectId,provider:'synthetic-provider',jobId:'synthetic-job',artifactSha256};
 const payload={version:'mew-delivery-v1',receiptId:`synthetic-receipt-${n}`,...expected,issuedAtMs:1000,expiresAtMs:2000};
 const envelope={payload,signature:sign(null,deliveryReceiptBytes(payload),privateKey).toString('base64url')};
 const receipt=verifyDeliveryReceipt({envelope,expected,artifactBytes:bytes,trustedPublicKey:publicKey,nowMs:1500});verified++;
 pilot=recordArtifact(pilot,{clipId:`clip-${n}`,revision:0,artifactSha256:receipt.artifactSha256,submittedAt:1000});
 pilot=recordReview(pilot,{reviewId:`synthetic-review-${n}`,reviewerId:'synthetic-operator',clipId:`clip-${n}`,revision:0,artifactSha256,decision:'ACCEPT',reviewedAt:1500});
}
console.log(JSON.stringify({mode:'synthetic-offline-interoperability',evaluation:await evaluateProvider(baselineProvider,{label:'deterministic-baseline'}),pilot:pilotMetrics(pilot,{reportedCostAtomic:0,asset:'lovelace'}),delivery:{syntheticReceiptsCryptographicallyVerified:verified,durableReplayEnforcement:'NOT_IMPLEMENTED_BY_THIS_REHEARSAL'},payment:{plan:validatePaymentPlan(plan).overall,recovery:paymentRecovery(plan,{outcome:'TIMEOUT'})},limitations:'No live model, actual customer, rendered video, provider-issued receipt, wallet or payment. Ephemeral local signing is a fixture.'},null,2));
