const workflows={report:'One accepted research report',clips:'Five accepted clip outlines'};
const stages={evaluation:'Private evaluation',manual:'Human-operated customer pilot',preprod:'Cardano preprod job'};
function bounded(value,label,max){if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw Error(`${label} must contain 1–${max} characters.`);return value.trim();}
export function createPilotPlan(input){
 if(!input||!Object.hasOwn(workflows,input.workflow)||!Object.hasOwn(stages,input.stage))throw Error('Choose a supported workflow and pilot stage.');
 const goal=bounded(input.goal,'Pilot goal',240),acceptance=bounded(input.acceptance,'Acceptance criteria',400);
 if(input.uncertainty!==true)throw Error('Confirm that uncertain outcomes require reconciliation before any repeat purchase.');
 const blockers=['Assign a customer acceptance owner and an independent review owner.','Approve input rights, privacy and retention before collecting customer data.','Agree budget, revision allowance and comparison baseline before work begins.'];
 if(input.stage==='evaluation')blockers.push('Approve model credentials and a separate model-usage budget before live inference.');
 if(input.stage==='preprod')blockers.push('Complete asset-aware accounting, approved signer custody and reviewed payment dispatch; payment execution remains disabled.');
 return {schema:'mew.pilot-brief.v1',proposal:true,executionAuthorized:false,workflow:workflows[input.workflow],stage:stages[input.stage],goal,acceptance,blockers,measurements:['Accepted deliverables against agreed criteria','Elapsed delivery time and customer review time','Actual total cost, including revisions and support','Unresolved operations and duplicate purchase attempts'],uncertaintyPolicy:'Retain unresolved capacity. Reconcile the original operation before considering another equivalent purchase.'};
}
export function formatPilotPlan(plan){return ['# MEW pilot brief','', 'Proposal only. No execution, payment or customer agreement is authorized.','',`Workflow: ${plan.workflow}`,`Stage: ${plan.stage}`,'','## Intended outcome',plan.goal,'','## Acceptance criteria',plan.acceptance,'','## Required setup',...plan.blockers.map(b=>`- ${b}`),'','## Measurements to agree',...plan.measurements.map(m=>`- ${m}`),'','## Uncertainty policy',plan.uncertaintyPolicy,''].join('\n');}
