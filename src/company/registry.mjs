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
export function companyRegistry(){return structuredClone({version:1,agents,tasks,modelExecution:'NOT_CONFIGURED',paymentsEnabled:false});}
