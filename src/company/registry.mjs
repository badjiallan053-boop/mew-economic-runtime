const deepFreeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))deepFreeze(child);}return value;};
const role=(id,department,task,skills)=>({id,department,task,skills,permissions:['read-assigned-evidence','submit-advisory-output'],paymentAuthority:false});
const leads=[
  role('chief-of-staff','Leadership','Translate founder brief into a proposed plan; founder owns mandate approval',['company-knowledge','mew-engineering']),
  role('research','Intelligence','Extract source-backed requirements and disclose missing evidence',['company-knowledge']),
  role('procurement','Commerce','Compare supplied candidate IDs against approved acceptance criteria',['mew-engineering']),
  role('risk','Assurance','Independently challenge eligibility, uncertainty and exposure',['mew-engineering']),
  role('red-team','Assurance','Independently probe injection, substitution and duplicate-action paths',['mew-engineering']),
  role('engineering','Product','Propose bounded implementation changes preserving module contracts',['mew-engineering']),
  role('qa','Assurance','Review test artifacts and failure cases; never invent test runs',['mew-engineering','test-driven-development']),
  role('delivery','Commerce','Assess artifact quality; authenticated verifier owns delivery claims',['mew-engineering']),
  role('finance','Finance','Read exposure and identify funding gaps; no signing or budget modification',['mew-engineering']),
  role('operations','Operations','Prepare deployment and recovery checklist; operator owns external writes',['mew-engineering']),
  role('knowledge','Intelligence','Curate reviewed sources and skills with provenance and limits',['company-knowledge']),
  role('communications','Communications','Explain accepted evidence and distinguish demo from live milestones',['company-knowledge'])
];
const specialistAssignments={
  'chief-of-staff':[['scope','Extract requirements and distinguish approved scope from proposals'],['dependencies','Map blockers and deadline dependencies'],['acceptance','Draft measurable acceptance criteria for founder approval']],
  research:[['source-check','Check provenance and source identity'],['freshness','Identify stale, unavailable or contradicted evidence'],['gap-analysis','List unresolved questions without inventing answers']],
  procurement:[['candidate-fit','Compare supplied candidates to acceptance criteria'],['quote-binding','Flag recipient, resource, asset and price binding gaps'],['capacity','Flag duplicate intent and admission prerequisites']],
  risk:[['authority','Review credentials, principals and permission boundaries'],['economic','Review uncertainty, exposure and fees without changing budgets'],['failure-modes','Identify failure, timeout and rollback risks']],
  'red-team':[['injection','Challenge hostile instructions in external content'],['substitution','Challenge identity, artifact and receipt substitution'],['replay','Challenge duplicate actions, retries and cross-task reuse']],
  engineering:[['contracts','Review module interfaces and backwards compatibility'],['implementation','Draft bounded code changes and rollout steps'],['migration','Review data migrations and rollback preservation']],
  qa:[['regression','Review regression evidence and unchanged contracts'],['adversarial','Review malicious inputs and race-condition coverage'],['recovery','Review restart and uncertain-operation recovery evidence']],
  delivery:[['criteria','Compare artifact against approved deliverable criteria'],['attribution','Flag missing merchant identity and artifact digest bindings'],['quality','Identify unsupported claims and unresolved quality gaps']],
  finance:[['exposure','Report supplied integer-lovelace exposure without conversion'],['funding','Distinguish hosting credits, escrow funds and seller receipts'],['cost','Flag approved hosting/model cost ceilings and missing metering']],
  operations:[['readiness','Check supplied deployment readiness evidence'],['reconciliation','Draft inspection steps for uncertain operations'],['backup','Draft backup, restore and shutdown ownership checklist']],
  knowledge:[['repository','Review official repository contracts, pins and licenses'],['video','Extract only available transcripts with timestamps and limitations'],['skills','Review applicable skill instructions and reject unrelated installers']],
  communications:[['claims','Check every pitch statement against supplied evidence'],['demo','Draft clearly labeled demo recording and walkthrough'],['submission','Check required submission artifacts and judge access']]
};
export const agents=deepFreeze(leads.flatMap(lead=>[lead,...specialistAssignments[lead.id].map(([slug,task])=>({...role(`${lead.id}/${slug}`,lead.department,task,lead.skills),parentId:lead.id}))]));
const leadTasks=[
  {id:'plan',agentId:'chief-of-staff',dependsOn:[]},
  {id:'sources',agentId:'knowledge',dependsOn:['plan']},
  {id:'research',agentId:'research',dependsOn:['sources']},
  {id:'options',agentId:'procurement',dependsOn:['research']},
  {id:'risk-review',agentId:'risk',dependsOn:['options']},
  {id:'adversarial-review',agentId:'red-team',dependsOn:['options']},
  {id:'implementation',agentId:'engineering',dependsOn:['risk-review','adversarial-review']},
  {id:'tests',agentId:'qa',dependsOn:['implementation']},
  {id:'delivery-review',agentId:'delivery',dependsOn:['tests']},
  {id:'funding-review',agentId:'finance',dependsOn:['delivery-review']},
  {id:'deployment-plan',agentId:'operations',dependsOn:['funding-review']},
  {id:'submission-brief',agentId:'communications',dependsOn:['deployment-plan']}
];
export const tasks=deepFreeze(leadTasks.flatMap(task=>{
  const specialists=specialistAssignments[task.agentId].map(([slug])=>({id:`${task.id}/${slug}`,agentId:`${task.agentId}/${slug}`,dependsOn:[...task.dependsOn]}));
  return [...specialists,{...task,dependsOn:[...task.dependsOn,...specialists.map(t=>t.id)]}];
}));
const step=(id,dependsOn,specialists)=>({id,dependsOn,specialists});
const profileSteps={
  discovery:[step('plan',[],['scope']),step('sources',['plan'],['repository']),step('research',['sources'],['source-check','freshness']),step('risk-review',['research'],['failure-modes']),step('adversarial-review',['research'],['injection']),step('submission-brief',['risk-review','adversarial-review'],['claims'])],
  release:[step('plan',[],['scope','acceptance']),step('implementation',['plan'],['contracts','migration']),step('tests',['implementation'],['regression','recovery']),step('risk-review',['tests'],['authority']),step('adversarial-review',['tests'],['substitution','replay']),step('funding-review',['tests'],['cost']),step('deployment-plan',['risk-review','adversarial-review','funding-review'],['readiness','backup']),step('submission-brief',['deployment-plan'],['claims'])],
  'paid-readiness':[step('plan',[],['acceptance']),step('sources',['plan'],['repository']),step('options',['sources'],['quote-binding','capacity']),step('risk-review',['options'],['economic']),step('adversarial-review',['options'],['substitution','replay']),step('funding-review',['risk-review','adversarial-review'],['funding','cost']),step('deployment-plan',['funding-review'],['readiness','reconciliation']),step('submission-brief',['deployment-plan'],['claims'])]
};
const plans=deepFreeze(Object.fromEntries(Object.entries(profileSteps).map(([name,steps])=>[name,steps.flatMap(s=>{
  const lead=leadTasks.find(t=>t.id===s.id);
  const specialists=s.specialists.map(slug=>({id:`${s.id}/${slug}`,agentId:`${lead.agentId}/${slug}`,dependsOn:[...s.dependsOn]}));
  return [...specialists,{id:lead.id,agentId:lead.agentId,dependsOn:[...s.dependsOn,...specialists.map(t=>t.id)]}];
})])));
export const compactTasks=deepFreeze([
{id:'compact-scope',agentId:'chief-of-staff',dependsOn:[]},
{id:'compact-evidence',agentId:'knowledge',dependsOn:['compact-scope']},
{id:'compact-proposal',agentId:'engineering',dependsOn:['compact-evidence']},
{id:'compact-risk',agentId:'risk',dependsOn:['compact-proposal']},
{id:'compact-challenge',agentId:'red-team',dependsOn:['compact-proposal']},
{id:'compact-decision',agentId:'chief-of-staff',dependsOn:['compact-risk','compact-challenge']}
]);
export function workflowPlan(name='full'){if(name==='compact')return compactTasks;if(name==='full')return tasks;if(!Object.hasOwn(plans,name))throw new Error('Unknown company workflow');return plans[name];}
export const workflows=deepFreeze([
  {id:'compact',name:'Compact evidence-to-decision team',deliverable:'Bounded proposal with evidence and independent reviews; five roles, six tasks',tasks:compactTasks},
  {id:'discovery',name:'Evidence and decision brief',deliverable:'Source-backed options, uncertainties and independent challenge',tasks:plans.discovery},
  {id:'release',name:'Product release review',deliverable:'Contract-preserving implementation plan, test review and deployment checklist',tasks:plans.release},
  {id:'paid-readiness',name:'Paid-agent readiness review',deliverable:'Quote-binding, funding and recovery blockers; no payment dispatch',tasks:plans['paid-readiness']},
  {id:'full',name:'Full organization rehearsal',deliverable:'Synthetic tour of all 48 assigned roles; optional',tasks}
]);
export function companyRegistry(){return structuredClone({version:2,agents,tasks,workflows,defaultWorkflow:'compact',modelExecution:'NOT_CONFIGURED',paymentsEnabled:false});}
