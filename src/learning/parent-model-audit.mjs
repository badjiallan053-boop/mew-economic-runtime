import {createHash} from 'node:crypto';
import {validateAdvisoryOutput} from './advisory-output.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
/** Audits trusted local experiment artifacts; hashes are not inference attestation. */
export function auditParentModel({benchmark,manifest,reportRaw,fit,responseRaw}) {
 const report=JSON.parse(reportRaw),reportSha=sha(reportRaw);
 if(responseRaw.length>1048576||fit.parentReportSha256!==reportSha||fit.benchmarkSha256!==manifest.sha256||report.benchmarkSha256!==manifest.sha256)throw Error('Unbound model context');
 const selected=report.runs.find(r=>r.maxParents===3),seen=new Set();
 if(!selected)throw Error('Missing parent policy');
 const cases=responseRaw.toString().trim().split('\n').map(line=>{
  const row=JSON.parse(line),label=benchmark.cases.find(c=>c.id===row.id),context=selected.cases.find(c=>c.id===row.id),tokens=fit.cases.find(c=>c.id===row.id&&c.maxParents===3);
  if(!label||!context||!tokens||seen.has(row.id)||row.language!==label.language||row.benchmarkSha256!==manifest.sha256||row.contextReportSha256!==reportSha||row.promptSha256!==tokens.promptSha256||row.inputTokens!==tokens.inputTokens||row.modelRevision!==fit.verifiedModelReceiptRevision||row.adapterUsed!==false||row.generationMaxTokens!==512||row.languageModelInvoked!==true||JSON.stringify(row.retrievedSourceIds)!==JSON.stringify(context.contexts.map(c=>c.sourceId)))throw Error('Run identity/renderer mismatch');
  seen.add(row.id);
  const result=validateAdvisoryOutput(row.response,row.retrievedSourceIds);
  return {id:row.id,language:row.language,allAnnotatedEvidencePresent:context.allEvidenceCovered,strictContractValid:result.valid,errors:result.errors,semanticStatus:'not-human-reviewed',citationEntailment:'unmeasured',authorityAccepted:result.valid&&result.value.authority==='advisory-only'};
 });
 if(seen.size!==benchmark.cases.length)throw Error('Incomplete run');
 return {schema:'mew.parent-model-audit.v1',benchmarkSha256:manifest.sha256,responseFileSha256:sha(responseRaw),cases,strictContractPasses:cases.filter(c=>c.strictContractValid).length,annotatedEvidenceCoverage:cases.filter(c=>c.allAnnotatedEvidencePresent).length,modelActivationAllowed:false,trainingAuthorized:false,paymentsEnabled:false,limitations:['Actual local base inference; no adapter trained.','Expanded evidence did not establish valid or grounded model answers.','No JSON repair, fabricated human labels or training consent.','Fresh human-reviewed development/holdout questions and a suitable model are pending.','Trusted local receipts are not authenticated proof of inference.']};
}
