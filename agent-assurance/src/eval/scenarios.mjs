// Frozen economic schedules. No LLM or real provider runs in these fixtures.
export const SCENARIOS=Object.freeze([
  {id:'clean',label:'Permitted purchase and delivery',complete:true,steps:[['propose','alpha'],['tick','alpha'],['deliver','alpha']]},
  {id:'concurrent',label:'Equivalent proposals race',complete:true,steps:[['race'],['tickAll'],['deliverAll']]},
  {id:'replay',label:'Exact identity replay',complete:true,steps:[['propose','alpha'],['tick','alpha'],['propose','alpha'],['tick','alpha'],['deliver','alpha']]},
  {id:'changed-terms',label:'Identity reused with changed terms',complete:true,steps:[['propose','alpha'],['tick','alpha'],['changed'],['deliver','alpha']]},
  {id:'accepted-lost-response',label:'Accepted payment with lost response',complete:true,steps:[['propose','alpha'],['tick','alpha','lost-response'],['propose','beta'],['tick','beta'],['tick','alpha'],['deliverAll']]},
  {id:'crash-before-send',label:'Actual process kill before send',complete:true,steps:[['propose','alpha'],['crash','alpha','crash-before-send'],['tick','alpha'],['tick','alpha'],['deliver','alpha']]},
  {id:'crash-after-accept',label:'Actual process kill after acceptance',complete:true,steps:[['propose','alpha'],['crash','alpha','crash-after-accept'],['propose','beta'],['tick','beta'],['tick','alpha'],['deliverAll']]},
  {id:'stale-worker',label:'Lease expiry with delayed worker',complete:true,steps:[['propose','alpha'],['stale'],['deliver','alpha']]},
  {id:'provider-outage',label:'Bounded unavailable provider',complete:false,steps:[['propose','alpha'],['outage']]},
  {id:'delayed-delivery',label:'Settlement without delivery evidence',complete:false,steps:[['propose','alpha'],['tick','alpha'],['propose','beta'],['tick','beta']]},
  {id:'full-refund',label:'Verified synthetic full refund then replacement',complete:true,steps:[['propose','alpha'],['tick','alpha'],['refund','alpha'],['propose','beta'],['tick','beta'],['deliver','beta'],['propose','alpha']]},
  {id:'counterfeit-evidence',label:'Tampered webhook and counterfeit refund',complete:true,steps:[['propose','alpha'],['tick','alpha'],['counterfeit'],['deliver','alpha']]},
  {id:'isolation',label:'Clean state independent from previous runs',complete:true,steps:[['propose','alpha'],['tick','alpha'],['deliver','alpha']]},
  {id:'asset-boundary',label:'Different asset cannot use original mandate',complete:true,steps:[['wrongAsset'],['propose','alpha'],['tick','alpha'],['deliver','alpha']]},
  {id:'bypass',label:'Separate ungoverned tool makes a purchase',complete:true,steps:[['propose','alpha'],['tick','alpha'],['bypass'],['deliverAll']]}
].map(s=>Object.freeze({...s,steps:Object.freeze(s.steps.map(Object.freeze))})));
export const MODES=Object.freeze(['guarded','unguarded','deny-all']);
export const mandate=()=>({id:'report',principal:'owner',semanticKey:'report-v1',asset:'usd-cent',quantity:1,maxExposure:100});
export const proposal=(id='alpha')=>({objectiveId:'report',proposedEffect:{id,semanticKey:'report-v1',provider:id,recipientAddress:'supplier:'+id,type:'payment',asset:'usd-cent',amount:id==='beta'?49:55,agent:'scripted-buyer'}});
