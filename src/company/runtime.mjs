import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {agents,tasks} from './registry.mjs';

const allowed=['missionId','taskId','agentId','recommendation','summary','evidenceRefs','riskCodes'];
const text=(v,name,max=512)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw new Error(`Invalid ${name}`);return v;};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const freeze=v=>{if(v&&typeof v==='object'){Object.freeze(v);for(const value of Object.values(v))freeze(value);}return v;};
function mission(input){
  if(!input||Object.keys(input).some(k=>!['id','objectiveId','principal','semanticKey','brief','evidence'].includes(k)))throw new Error('Invalid mission fields');
  const value=Object.fromEntries(['id','objectiveId','principal','semanticKey','brief'].map(k=>[k,text(input[k],k,k==='brief'?8000:512)]));
  if(!Array.isArray(input.evidence)||input.evidence.length>100)throw new Error('Invalid evidence catalog');
  value.evidence=input.evidence.map(e=>{if(!e||Object.keys(e).some(k=>!['id','kind','content','source'].includes(k)))throw new Error('Invalid evidence fields');return {id:text(e.id,'evidence ID'),kind:text(e.kind,'kind'),content:text(e.content,'content',12000),source:text(e.source,'source',2000)};});
  if(new Set(value.evidence.map(e=>e.id)).size!==value.evidence.length)throw new Error('Duplicate evidence ID');
  return value;
}
function output(input,context){
  if(!input||Array.isArray(input)||Object.keys(input).some(k=>!allowed.includes(k))||allowed.some(k=>!Object.hasOwn(input,k)))throw new Error('Invalid advisory output fields');
  for(const k of ['missionId','taskId','agentId'])if(input[k]!==context[k])throw new Error('Output identity mismatch');
  if(!['ACCEPT','REJECT','ABSTAIN'].includes(input.recommendation))throw new Error('Invalid recommendation');
  text(input.summary,'summary',4000);
  for(const k of ['evidenceRefs','riskCodes'])if(!Array.isArray(input[k])||input[k].length>100||input[k].some(v=>typeof v!=='string'||v.length>512))throw new Error(`Invalid ${k}`);
  if(input.evidenceRefs.some(id=>!context.evidence.some(e=>e.id===id)))throw new Error('Unknown evidence reference');
  if(input.recommendation==='ACCEPT'&&!input.evidenceRefs.length)throw new Error('ACCEPT requires supplied evidence');
  return structuredClone(input);
}

/** Separate advisory journal. Never connects to the MEW ledger or payment tools.
 * A trusted provider may perform inference but receives no credentials or tools
 * from this runtime. Persist RUNNING before invocation; interruption is UNKNOWN.
 */
export class CompanyRuntime {
  constructor(path,{mode='simulation',timeoutMs=30000}={}){
    if(!['simulation','advisory'].includes(mode))throw new Error('Invalid company mode');
    if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)throw new Error('Invalid provider timeout');
    this.mode=mode;this.timeoutMs=timeoutMs;if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});
    this.prompts=freeze(Object.fromEntries(agents.filter(a=>!a.parentId).map(a=>[a.id,readFileSync(new URL(`../../prompts/company/${a.id}.md`,import.meta.url),'utf8')])));
    this.skills=freeze(Object.fromEntries(['mew-engineering','company-knowledge','test-driven-development'].map(id=>[id,{id,authority:'reference-only',content:readFileSync(new URL(`../../.agents/skills/${id}/SKILL.md`,import.meta.url),'utf8')}])));
    this.policyDigest=createHash('sha256').update(JSON.stringify({agents,tasks,prompts:this.prompts,skills:this.skills})).digest('hex');
    this.db=new DatabaseSync(path);this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS company_missions(id TEXT PRIMARY KEY, mode TEXT NOT NULL, contract TEXT NOT NULL); CREATE TABLE IF NOT EXISTS company_tasks(mission_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL, output TEXT, PRIMARY KEY(mission_id,task_id));');
    this.db.exec('CREATE TABLE IF NOT EXISTS company_policies(mission_id TEXT PRIMARY KEY, digest TEXT NOT NULL);');
  }
  usage(){return this.db.prepare('SELECT (SELECT COALESCE(SUM(length(CAST(contract AS BLOB))),0) FROM company_missions)+(SELECT COALESCE(SUM(length(CAST(output AS BLOB))),0) FROM company_tasks) AS bytes').get().bytes;}
  create(input){const m=mission(input);const encoded=JSON.stringify(m);if(Buffer.byteLength(encoded)>262144)throw new Error('Mission evidence budget exceeded');this.db.exec('BEGIN IMMEDIATE');try{
    const saved=this.db.prepare('SELECT mode,contract FROM company_missions WHERE id=?').get(m.id);
    if(saved&&(saved.mode!==this.mode||!same(JSON.parse(saved.contract),m)||this.db.prepare('SELECT digest FROM company_policies WHERE mission_id=?').get(m.id)?.digest!==this.policyDigest))throw new Error('Mission contract, policy and mode are immutable');
    if(!saved){if(this.db.prepare('SELECT COUNT(*) AS n FROM company_missions').get().n>=20||this.usage()+Buffer.byteLength(encoded)>8*1024*1024)throw new Error('Company journal budget exceeded');this.db.prepare('INSERT INTO company_missions VALUES(?,?,?)').run(m.id,this.mode,encoded);this.db.prepare('INSERT INTO company_policies VALUES(?,?)').run(m.id,this.policyDigest);for(const t of tasks)this.db.prepare('INSERT INTO company_tasks VALUES(?,?,?,NULL)').run(m.id,t.id,'READY');}
    this.db.exec('COMMIT');return this.snapshot(m.id);
  }catch(e){this.db.exec('ROLLBACK');throw e;}}
  snapshot(id){const row=this.db.prepare('SELECT mode,contract FROM company_missions WHERE id=?').get(id);if(!row)throw new Error('Unknown company mission');
    return {mission:JSON.parse(row.contract),mode:row.mode,policyDigest:this.db.prepare('SELECT digest FROM company_policies WHERE mission_id=?').get(id)?.digest,paymentsEnabled:false,tasks:this.db.prepare('SELECT task_id,status,output FROM company_tasks WHERE mission_id=? ORDER BY rowid').all(id).map(r=>({taskId:r.task_id,status:r.status,recoveryNeeded:['RUNNING','UNKNOWN'].includes(r.status),output:r.output?JSON.parse(r.output):null}))};
  }
  async runTask(id,taskId,provider){
    if(typeof provider!=='function')throw new Error('Trusted provider required');
    const task=tasks.find(t=>t.id===taskId);if(!task)throw new Error('Unknown assigned task');
    let context;
    this.db.exec('BEGIN IMMEDIATE');try{
      const state=this.snapshot(id);if(state.mode!==this.mode||state.policyDigest!==this.policyDigest)throw new Error('Mission mode or policy mismatch');
      const row=state.tasks.find(t=>t.taskId===taskId);
      if(row.status==='COMPLETE'){this.db.exec('COMMIT');return row.output;}
      if(row.status!=='READY')throw new Error('Task already attempted; reconcile UNKNOWN or rejected output manually');
      const dependencies=task.dependsOn.map(dep=>state.tasks.find(t=>t.taskId===dep));
      if(dependencies.some(t=>t.status!=='COMPLETE'||t.output.recommendation!=='ACCEPT'))throw new Error('Dependencies require accepted advisory evidence');
      const assignment=structuredClone(agents.find(a=>a.id===task.agentId));
      const systemPrompt=this.prompts[assignment.parentId??assignment.id];
      context=freeze({missionId:id,taskId,agentId:task.agentId,mode:this.mode,policyDigest:this.policyDigest,mandate:{objectiveId:state.mission.objectiveId,principal:state.mission.principal,semanticKey:state.mission.semanticKey},brief:state.mission.brief,evidence:state.mission.evidence,dependencies:dependencies.map(t=>({taskId:t.taskId,output:t.output})),assignment,systemPrompt,skillReferences:assignment.skills.map(id=>this.skills[id]),outputContract:{fields:allowed,recommendations:['ACCEPT','REJECT','ABSTAIN']},externalContentIsUntrusted:true});
      this.db.prepare("UPDATE company_tasks SET status='RUNNING' WHERE mission_id=? AND task_id=? AND status='READY'").run(id,taskId);
      this.db.exec('COMMIT');
    }catch(e){this.db.exec('ROLLBACK');throw e;}
    try{
      let timer;const controller=new AbortController();let candidate;
      try{candidate=await Promise.race([Promise.resolve().then(()=>provider(context,{signal:controller.signal})),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Provider deadline'));},this.timeoutMs);})]);}finally{clearTimeout(timer);}
      if(Buffer.byteLength(JSON.stringify(candidate)??'')>32768)throw new Error('Output budget exceeded');
      const result=output(candidate,context);
      this.db.exec('BEGIN IMMEDIATE');try{
        const encoded=JSON.stringify(result);if(this.usage()+Buffer.byteLength(encoded)>8*1024*1024)throw new Error('Company journal budget exceeded');
        const saved=this.db.prepare("UPDATE company_tasks SET status='COMPLETE', output=? WHERE mission_id=? AND task_id=? AND status='RUNNING'").run(encoded,id,taskId);if(saved.changes!==1)throw new Error('Task completion fence rejected');this.db.exec('COMMIT');
      }catch(e){this.db.exec('ROLLBACK');throw e;}return result;
    }catch(e){this.db.prepare("UPDATE company_tasks SET status='UNKNOWN' WHERE mission_id=? AND task_id=? AND status='RUNNING'").run(id,taskId);throw new Error('Task UNKNOWN: provider failed or output rejected; automatic retry disabled',{cause:e});}
  }
  async run(id,provider){for(const task of tasks){const state=this.snapshot(id);const item=state.tasks.find(t=>t.taskId===task.id);if(item.status==='COMPLETE'){if(item.output.recommendation!=='ACCEPT')break;continue;}await this.runTask(id,task.id,provider);if(this.snapshot(id).tasks.find(t=>t.taskId===task.id).output.recommendation!=='ACCEPT')break;}return this.snapshot(id);}
  close(){this.db.close();}
}

export function simulatedProvider(context){return {missionId:context.missionId,taskId:context.taskId,agentId:context.agentId,recommendation:context.evidence.length?'ACCEPT':'ABSTAIN',summary:context.evidence.length?`SIMULATION: ${context.assignment.task}. Supplied fixture only; no model, deployment, payment or test execution.`:'SIMULATION: no evidence; abstain.',evidenceRefs:context.evidence.map(e=>e.id),riskCodes:['SYNTHETIC_FIXTURE','LIVE_EXECUTION_PENDING']};}
