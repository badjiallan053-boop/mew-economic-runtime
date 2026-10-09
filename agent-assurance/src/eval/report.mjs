import { digest, integer } from '../dispatch/contracts.mjs';
import { SCENARIOS, MODES } from './scenarios.mjs';

export const REPORT_SCHEMA='agent-assurance.economic-evaluation/v1';
const limitationText=[
  'All purchases, delivery and refunds are synthetic local fixtures. No LLM or real provider is evaluated.',
  'Effectively-once acceptance depends on the simulator receiver persisting the stable idempotency key.',
  'Bypassed tools are outside MEW control. Coverage gaps are intentionally demonstrated.',
  'No signed mandates, signed delivery, partial refunds or tenant isolation are implemented.',
  'Hashes establish byte consistency, not independently authenticated truth or complete event disclosure.',
  'These frozen cases are regression evidence, not production loss, insurance or certification estimates.',
  'Actual subprocess kills and simultaneous processes run in guarded mode; unguarded comparisons use scripted equivalent failures.'
];
export function buildReport(results,{codeRevision='unversioned',node=process.version,platform=process.platform}={}) {
  const body={schema:REPORT_SCHEMA,simulated:true,codeRevision,environment:{node,platform},
    scheduleDigest:digest(SCENARIOS.map(s=>({id:s.id,steps:s.steps}))),results,
    limitations:limitationText};
  const report={...body,reportDigest:digest(body)};verifyReport(report);return report;
}
function object(value,keys,label) {
  if(!value || typeof value!=='object' || Array.isArray(value)||Object.keys(value).sort().join('|')!==[...keys].sort().join('|'))
    throw new Error('Invalid '+label+' fields');
}
function bounded(value,label,max=512) {if(typeof value!=='string'||!value.length||value.length>max)throw new Error('Invalid '+label);}
export function verifyReport(report) {
  object(report,['schema','simulated','codeRevision','environment','scheduleDigest','results','limitations','reportDigest'],'report');
  if(report.schema!==REPORT_SCHEMA||report.simulated!==true)throw new Error('Unsupported report');
  if(report.codeRevision!=='unversioned' && !/^[a-f0-9]{40}$/i.test(report.codeRevision))throw new Error('Invalid code revision');
  object(report.environment,['node','platform'],'environment');bounded(report.environment.node,'Node version',64);bounded(report.environment.platform,'platform',32);
  if(report.scheduleDigest!==digest(SCENARIOS.map(s=>({id:s.id,steps:s.steps}))))throw new Error('Schedule mismatch');
  if(JSON.stringify(report.limitations)!==JSON.stringify(limitationText))throw new Error('Missing limitations');
  if(!Array.isArray(report.results)||report.results.length!==SCENARIOS.length*MODES.length)throw new Error('Missing scenario results');
  const seen=new Set();
  for(const result of report.results) {
    object(result,['scenarioId','label','mode','simulated','scheduleDigest','mandate','metrics','controls','pass','timeline'],'result');
    const scenario=SCENARIOS.find(s=>s.id===result.scenarioId);
    if(!scenario||!MODES.includes(result.mode)||result.label!==scenario.label||result.simulated!==true||result.scheduleDigest!==digest(scenario.steps))
      throw new Error('Scenario mismatch');
    const identity=result.scenarioId+':'+result.mode;if(seen.has(identity))throw new Error('Duplicate result');seen.add(identity);
    object(result.mandate,['objectiveId','asset','quantity','maxExposure'],'mandate');
    if(JSON.stringify(result.mandate)!==JSON.stringify({objectiveId:'report',asset:'usd-cent',quantity:1,maxExposure:100}))throw new Error('Unexpected fixture mandate');
    const names=['acceptedPurchases','duplicateEquivalents','fulfilledQuantity','completedObjectives','unauthorizedAccepted','exposureByAsset','unresolvedOperations','admissibleProposals','unjustifiedBlocks','coverageGaps','eligibleObjectives','reconciliationSteps','observedOperations','coveredAcceptedActions'];
    object(result.metrics,names,'metrics');
    const m=result.metrics;
    for(const key of names.filter(k=>k!=='exposureByAsset'))integer(m[key],key);
    if(m.eligibleObjectives!==(scenario.complete?1:0)||m.completedObjectives>1||m.unjustifiedBlocks>m.admissibleProposals||
      m.coveredAcceptedActions+m.coverageGaps!==m.acceptedPurchases)throw new Error('Inconsistent denominators');
    if(!m.exposureByAsset||typeof m.exposureByAsset!=='object'||Array.isArray(m.exposureByAsset))throw new Error('Invalid asset metrics');
    for(const [asset,row] of Object.entries(m.exposureByAsset)){
      if(!['usd-cent','lovelace'].includes(asset))throw new Error('Unknown fixture asset');
      object(row,['cumulativeCharges','verifiedRefunds','currentCommitment','peakCommitment'],'asset exposure');
      for(const [key,value] of Object.entries(row))integer(value,key);
      if(row.cumulativeCharges-row.verifiedRefunds!==row.currentCommitment||row.peakCommitment<row.currentCommitment||row.peakCommitment>row.cumulativeCharges)throw new Error('Inconsistent exposure');
    }
    const keys=['economicMandate','usefulCompletion','routedCoverage','syntheticEvidence','signedMandateRevocation','signedDelivery','partialRefunds','tenantIsolation'];
    object(result.controls,keys,'controls');
    for(const value of Object.values(result.controls))if(!['PASS','FAIL','NOT_IMPLEMENTED','NOT_APPLICABLE'].includes(value))throw new Error('Invalid control status');
    for(const key of keys.slice(4))if(result.controls[key]!=='NOT_IMPLEMENTED')throw new Error('Unsupported control claim');
    const safe=m.duplicateEquivalents===0&&m.unauthorizedAccepted===0&&Object.entries(m.exposureByAsset).every(([asset,row])=>asset==='usd-cent'&&row.peakCommitment<=100);
    const useful=scenario.complete?m.completedObjectives===1:true;
    if(result.controls.economicMandate!==(safe?'PASS':'FAIL')||result.controls.usefulCompletion!==(scenario.complete?(useful?'PASS':'FAIL'):'NOT_APPLICABLE')||
      result.controls.routedCoverage!==(m.coverageGaps===0?'PASS':'FAIL')||result.pass!==(safe&&useful&&m.coverageGaps===0))throw new Error('Verdict inconsistent with measurements');
    if(!Array.isArray(result.timeline)||!result.timeline.length||result.timeline.length>100)throw new Error('Invalid bounded timeline');
    for(const [i,event] of result.timeline.entries()){
      const allowed=['sequence','event','effectId','decision','state','attempts','cycles','allowCount','point','signal','count'];
      if(!event||typeof event!=='object'||Array.isArray(event)||Object.keys(event).some(k=>!allowed.includes(k))||event.sequence!==i+1)throw new Error('Invalid timeline fields');
      bounded(event.event,'event');
      for(const [key,value] of Object.entries(event))if(key!=='sequence'&&key!=='event'){if(typeof value==='number')integer(value,key);else bounded(value,key);}
    }
    if(result.controls.syntheticEvidence!==(scenario.id==='counterfeit-evidence'?'PASS':'NOT_APPLICABLE'))throw new Error('Invalid evidence-control result');
  }
  const {reportDigest,...body}=report;
  if(reportDigest!==digest(body))throw new Error('Report digest mismatch');
  return true;
}
export function assertExpectedSuite(report) {
  verifyReport(report);
  const by=(id,mode)=>report.results.find(r=>r.scenarioId===id&&r.mode===mode);
  for(const result of report.results.filter(r=>r.mode==='guarded'))if(result.pass!==(result.scenarioId!=='bypass'))throw new Error('Unexpected guarded outcome: '+result.scenarioId);
  if(by('clean','deny-all').pass||by('clean','deny-all').metrics.completedObjectives!==0)throw new Error('Deny-all utility control failed');
  for(const id of ['concurrent','accepted-lost-response','crash-after-accept','delayed-delivery','asset-boundary'])if(by(id,'unguarded').pass)throw new Error('Unguarded negative control did not expose '+id);
  for(const mode of MODES)if(by('bypass',mode).controls.routedCoverage!=='FAIL')throw new Error('Bypass gap not detected');
  return true;
}
export const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderHTML(report) {
  verifyReport(report);
  const rows=report.results.map(r=>{
    const exposure=Object.entries(r.metrics.exposureByAsset).map(([asset,v])=>asset+': '+v.peakCommitment).join(', ')||'none';
    return '<tr>'+[r.scenarioId,r.mode,r.pass?'PASS':'FAIL',r.metrics.acceptedPurchases,r.metrics.duplicateEquivalents,
      exposure,r.metrics.completedObjectives+'/'+r.metrics.eligibleObjectives,r.metrics.unresolvedOperations,r.metrics.coverageGaps].map(x=>'<td>'+escapeHTML(x)+'</td>').join('')+'</tr>';
  }).join('');
  const guarded=report.results.filter(r=>r.mode==='guarded');
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>MEW economic assurance — simulated evidence</title><style>body{font:16px system-ui;margin:2rem;color:#172536;background:#f6f8fb}main{max-width:1200px;margin:auto}table{border-collapse:collapse;background:white;width:100%}td,th{padding:.6rem;border:1px solid #ccd4df;text-align:left}code{overflow-wrap:anywhere}h1{font-size:2rem}.scroll{overflow:auto}</style><main>'+
    '<p>LOCAL SIMULATION · NO REAL PAYMENTS · NO LLM EVALUATION</p><h1>MEW economic assurance</h1>'+
    '<p>'+guarded.filter(r=>r.pass).length+'/'+guarded.length+' guarded scenario outcomes pass. The bypass case intentionally fails coverage; unsupported controls remain NOT_IMPLEMENTED.</p>'+
    '<p>Completion is required only where delivery is available in the schedule. A 0/0 row means NOT_APPLICABLE, not successful completion.</p>'+
    '<p>Code revision: <code>'+escapeHTML(report.codeRevision)+'</code></p><div class="scroll"><table><thead><tr>'+
    ['Scenario','Mode','Outcome','Accepted','Duplicate equivalents','Peak commitment by asset','Completed / eligible','Unresolved','Coverage gaps'].map(x=>'<th>'+x+'</th>').join('')+
    '</tr></thead><tbody>'+rows+'</tbody></table></div><h2>Limitations</h2><ul>'+report.limitations.map(x=>'<li>'+escapeHTML(x)+'</li>').join('')+
    '</ul><p>Report digest: <code>'+escapeHTML(report.reportDigest)+'</code></p><p>Inspect report.json for timelines, denominators and per-control statuses.</p></main></html>';
}
