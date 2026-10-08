import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
const definitions={
 'unknown-exposure':['SPEC.md','A reservation has no automatic timeout release: silence does not prove a payment failed.','Retain exposure and reconcile the original effect; do not redispatch or release on timeout.'],
 'settlement-delivery':['SPEC.md','Delivery satisfaction and payment settlement are separate facts.','Settlement alone does not prove delivery; require separately verified delivery evidence.'],
 'rail-mismatch':['docs/ML_LEARNING_PIPELINE.md','Mainnet and preprod remain separate.','Reject the revenue inference; distinguish preprod from mainnet and require attributable merchant receipt evidence.'],
 'evidence-grounding':['docs/ML_LEARNING_PIPELINE.md','Human reviewers grade usefulness, citation entailment, factual grounding, calibrated abstention and authority boundaries.','Propose a frozen comparative evaluation and consented customer outcomes; do not assert that improvement already exists.'],
 'event-opportunity':['docs/EVENT_DATA_SOURCES.md','They do not prove attendance, customer intent, payment settlement or marketing conversion.','Use listings as tentative opportunity leads; do not infer attendance, demand or verified payments.'],
 'training-rights':['docs/SOCIAL_PROTOCOL_COMMITTEE.md','Derived summaries retain the same restriction.','Visibility alone is insufficient; check source-specific rights and avoid automatic training approval.']
};
const input=await readFile('research/learning/benchmark-review-queue.jsonl','utf8'),queue=input.trim().split('\n').map(JSON.parse);
const sources=await Promise.all([...new Set(Object.values(definitions).map(d=>d[0]))].map(async id=>{const text=await readFile(id,'utf8');return{id,text,sha256:sha(text)};}));
const sourceSnapshotDigest=sha(JSON.stringify(sources));
const cases=queue.map(row=>{const [id,quote,criteria]=definitions[row.lineageGroup],s=sources.find(x=>x.id===id),start=s.text.indexOf(quote);if(start<0)throw Error(`Missing evidence span: ${id}`);return{...row,sourceSnapshotDigest,answerability:'ANSWERABLE_ADVISORY',supportingEvidenceSpans:[{sourceId:id,sourceSha256:s.sha256,start,end:start+quote.length,quote}],expectedUnits:'No monetary calculation requested',expectedHandoff:{authority:'advisory-only',activationAllowed:false},usefulAnswerCriteria:criteria,reviewers:['root-agent-labeler'],disagreement:'Independent agent review recorded separately; no human approval claimed.',labelVersion:'agent-development-v1',split:'development-evaluation',reviewStatus:'agent-labeled',trainingEligible:false};});
const artifact={schema:'mew.frozen-benchmark.v1',scope:'Agent-labeled development benchmark; not independent customer holdout',sourceSnapshotDigest,sources,cases};
const bytes=JSON.stringify(artifact,null,2)+'\n',digest=sha(bytes),dir=`research/learning/frozen-${digest.slice(0,16)}`;await mkdir(dir);await writeFile(`${dir}/benchmark.json`,bytes,{flag:'wx'});await writeFile(`${dir}/manifest.json`,JSON.stringify({sha256:digest,sourceSnapshotDigest,cases:cases.length,labels:'agent-reviewed development only',trainingEligible:false},null,2)+'\n');console.log(dir);
