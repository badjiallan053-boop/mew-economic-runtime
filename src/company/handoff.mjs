import {createHash} from 'node:crypto';
import {tasks,compactTasks} from './registry.mjs';
const keys=['schema','missionId','taskId','agentId','policyDigest','authority','executionMode','recommendation','summary','evidenceRefs','riskCodes'];
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
function validate(record){
  if(!record||Array.isArray(record)||Object.keys(record).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(record,k)))throw new Error('Invalid handoff fields');
  if(record.schema!=='mew.advisory-handoff.v1'||record.authority!=='advisory-only'||!['simulation','advisory'].includes(record.executionMode)||!['ACCEPT','REJECT','ABSTAIN'].includes(record.recommendation))throw new Error('Invalid handoff authority or outcome');
  for(const k of ['missionId','taskId','agentId'])if(typeof record[k]!=='string'||!record[k].trim()||record[k].length>512)throw new Error('Invalid handoff identity');
  if(typeof record.policyDigest!=='string'||!/^[a-f0-9]{64}$/.test(record.policyDigest)||typeof record.summary!=='string'||!record.summary.trim()||record.summary.length>4000)throw new Error('Invalid handoff content');
  for(const k of ['evidenceRefs','riskCodes'])if(!Array.isArray(record[k])||record[k].length>100||record[k].some(v=>typeof v!=='string'||v.length>512))throw new Error('Invalid handoff references');
  if(record.recommendation==='ACCEPT'&&!record.evidenceRefs.length)throw new Error('Accepted handoff requires evidence');
}
/** Export from a trusted company snapshot, never a browser-submitted snapshot.
 * Digests detect changes; they are not signatures or payment/delivery proof. */
export function exportHandoff(snapshot,taskId){
  const task=snapshot.tasks.find(t=>t.taskId===taskId);
  if(task?.status!=='COMPLETE'||!task.output)throw new Error('Completed advisory task required');
  const o=task.output;
  const fields=['missionId','taskId','agentId','recommendation','summary','evidenceRefs','riskCodes'];
  if(typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!fields.includes(k))||fields.some(k=>!Object.hasOwn(o,k)))throw new Error('Invalid stored output fields');
  if(!Array.isArray(o.evidenceRefs)||[...tasks,...compactTasks].find(t=>t.id===taskId)?.agentId!==o.agentId)throw new Error('Stored output binding mismatch');
  if(o.missionId!==snapshot.mission.id||o.taskId!==taskId||o.evidenceRefs.some(id=>!snapshot.mission.evidence.some(e=>e.id===id)))throw new Error('Stored output binding mismatch');
  const record={schema:'mew.advisory-handoff.v1',missionId:o.missionId,taskId:o.taskId,agentId:o.agentId,policyDigest:snapshot.policyDigest,authority:'advisory-only',executionMode:snapshot.mode,recommendation:o.recommendation,summary:o.summary,evidenceRefs:structuredClone(o.evidenceRefs),riskCodes:structuredClone(o.riskCodes)};
  validate(record);return {record,digest:digest(record)};
}
export function checkHandoff(envelope,expected){
  if(!envelope||Object.keys(envelope).some(k=>!['record','digest'].includes(k)))throw new Error('Invalid handoff envelope');
  validate(envelope.record);
  if(typeof expected?.digest!=='string'||!/^[a-f0-9]{64}$/.test(expected.digest)||envelope.digest!==expected.digest||digest(envelope.record)!==expected.digest)throw new Error('Handoff digest mismatch');
  for(const k of ['missionId','taskId','agentId','policyDigest'])if(envelope.record[k]!==expected[k])throw new Error('Handoff identity mismatch');
  if(!Array.isArray(expected.evidenceIds)||envelope.record.evidenceRefs.some(id=>!expected.evidenceIds.includes(id)))throw new Error('Handoff evidence outside approved catalog');
  return {integrityValid:true,authenticated:false,authority:'advisory-only',record:structuredClone(envelope.record)};
}
export function interoperabilityCapabilities(){return {schema:'mew.interoperability.v1',paymentAuthority:false,interfaces:[
  {id:'company-provider',state:'implemented-boundary',operation:'validated advisory JSON',live:'model credentials pending'},
  {id:'github',state:'host-operated',operation:'source and release evidence',live:'private repository; authorized users only'},
  {id:'sokosumi-masumi-cardano',state:'implemented-read-only',operation:'bind Task, MPS withdrawal and chain receipt',live:'credentials and funding pending'},
  {id:'mcp',state:'design-only',operation:'future typed tool transport',live:'no MCP server or negotiation implemented'},
  {id:'a2a',state:'design-only',operation:'future authenticated task/artifact exchange',live:'no A2A server implemented'},
  {id:'cloudevents',state:'design-only',operation:'future event transport around advisory handoffs',live:'no event broker implemented'}
]};}
