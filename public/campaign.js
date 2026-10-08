// This page reads and advances the shared synthetic campaign, never a live job.
let state;
const status=document.querySelector('#status'),advance=document.querySelector('#advance'),reset=document.querySelector('#reset');
const stages=[
 ['Start with one clear brief.','One owned recording. Five clip outlines. A 10 ADA example limit.','Write the campaign brief →'],
 ['The brief is ready.','The example fixes the source, five outlines and one revision. Publishing is not approved.','Check the source rights →'],
 ['The rights checks passed in this example.','Both simulated reviewers have the same source facts. These fixture checks are not legal verification.','Set aside 8 ADA for Editor A →'],
 ['One editing job is held.','Editor A occupies the one-bundle slot. MEW has set aside 8 ADA in the simulation.','Try the same bundle from Editor B →'],
 ['The replacement has to wait.','A second 6 ADA job would repeat the bundle and take the total to 14 ADA, above the 10 ADA limit.','Look at the example views →'],
 ['Views are not file approval.','The invented 3,000 views don’t show that five files were accepted. The original commitment stays open.','Review the five outlines →'],
 ['Five outlines were accepted in this example.','The review matches the exact outline version. No video was made or published. Payment is a separate fact.','Record the simulated payment →'],
 ['The outline rehearsal is complete.','The fixture records 8 ADA as spent. No real payment, video, ad or customer result occurred.','Rehearsal complete'],
];
const roles={strategy:'Campaign planner',risk:'Rights reviewer','red-team':'Second reviewer',host:'MEW decision rules',measurement:'Measurement reviewer',delivery:'Deliverable reviewer','rail fixture':'Payment fixture'};
function text(tag,value){const n=document.createElement(tag);n.textContent=value;return n;}
function render(){
 const item=stages[state.stage];
 const blocked=state.blocked;
 status.textContent=blocked?'This scenario stops here. Choose another scenario to restart.':state.stage>=7?'Complete · synthetic outlines only':`Step ${state.stage} of 7 · shared simulation`;
 document.querySelector('#campaign-step-title').textContent=blocked?(state.scenario==='missing-rights'?'Stop: permission to use the recording is missing.':'Stop: views cannot replace approved files.'):item[0];
 document.querySelector('#campaign-step-description').textContent=blocked?(state.scenario==='missing-rights'?'No editing commitment is admitted. Record the necessary rights before real production.':'The original 8 ADA commitment remains held. Get the exact deliverable reviewed before closing the job.'):item[1];
 advance.textContent=blocked?'Scenario stopped':item[2];advance.disabled=blocked||state.stage>=7;
 const position=document.querySelector('#position');position.replaceChildren();
 for(const [label,value] of [['Set aside',`${(state.position.reserved/1_000_000).toFixed(2)} ADA`],['Recorded as spent',`${(state.position.spent/1_000_000).toFixed(2)} ADA`],['Bundle slots occupied',`${state.position.equivalents} / 1`]]){const cell=text('div','');cell.append(text('span',label),text('strong',value));position.append(cell);}
 const list=document.querySelector('#events');list.replaceChildren();
 for(const event of state.events){const item=text('li','');item.append(text('strong',roles[event.role]||'Demo step'),text('p',event.message));list.append(item);}
 document.querySelector('#evidence').textContent=JSON.stringify({brief:state.brief,artifact:state.artifact,metrics:state.metrics,decisions:state.decisions},null,2);
}
async function request(path,body){advance.disabled=reset.disabled=true;try{const response=await fetch(path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok)throw new Error('The shared demo could not advance. Reload to check its current step before trying again.');state=await response.json();render();}catch(error){status.textContent=error.message;}finally{reset.disabled=false;advance.disabled=!state||state.blocked||state.stage>=7;}}
reset.addEventListener('click',()=>request('/api/campaign/reset',{scenario:document.querySelector('#scenario').value}));
advance.addEventListener('click',()=>request('/api/campaign/advance',{expectedStage:state.stage,expectedCampaignId:state.campaignId}));
await request('/api/campaign');
