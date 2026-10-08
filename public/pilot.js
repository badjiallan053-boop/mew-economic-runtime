import {workflowForLocation,contextHref} from './workflow-context.js';
import {createPilotPlan,formatPilotPlan} from './pilot-plan.js';
const form=document.querySelector('#pilot-form'),status=document.querySelector('#pilot-status'),output=document.querySelector('#pilot-output'),download=document.querySelector('#download-brief');
// A guide link may select an existing deliverable, never submit or authorize it.
const choice=document.querySelector('#workflow');
choice.value=workflowForLocation(location.pathname,location.search).id;
function updateContext(){
 const url=new URL(location.href);url.search='';url.searchParams.set('workflow',choice.value);history.replaceState(null,'',url);
 document.querySelector('#goal').placeholder=choice.value==='clips'?'Example: Can we recover from an editor timeout without ordering the same outline bundle twice?':'Example: Can we recover from a supplier timeout without ordering the same report again?';
 document.querySelector('#acceptance').placeholder=choice.value==='clips'?'Example: Five source-linked outlines, checked rights and review by the agreed acceptance owner.':'Example: A sourced report, exact file version and review by the agreed acceptance owner.';
 for(const [index,link] of [...document.querySelectorAll('.protocol-footer a')].entries()){const isDemo=index===0;link.href=contextHref(isDemo?(choice.value==='clips'?'campaign.html':'studio.html'):'protocol.html',choice.value);if(isDemo)link.textContent=choice.value==='clips'?'Try the clipping rehearsal':'Try the decision demo';link.dataset.workflowHref=link.getAttribute('href');}
 window.dispatchEvent(new Event('mew:workflow-change'));
}
updateContext();choice.addEventListener('change',updateContext);
let currentBrief;
form.addEventListener('submit',event=>{event.preventDefault();try{const fields=new FormData(form),plan=createPilotPlan({workflow:fields.get('workflow'),stage:fields.get('stage'),goal:fields.get('goal'),acceptance:fields.get('acceptance'),uncertainty:fields.get('uncertainty')==='on'});currentBrief=formatPilotPlan(plan);output.textContent=currentBrief;download.disabled=false;status.textContent='Draft prepared in this tab. Nothing was submitted. Review the required setup before arranging a pilot.';}catch(error){currentBrief=undefined;download.disabled=true;output.textContent='';status.textContent=error.message;}});
form.addEventListener('input',()=>{currentBrief=undefined;download.disabled=true;output.textContent='';status.textContent='Inputs changed. Prepare the brief again to include your latest choices.';});
download.addEventListener('click',()=>{if(!currentBrief)return;const url=URL.createObjectURL(new Blob([currentBrief],{type:'text/plain;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='mew-pilot-brief.md';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Draft downloaded. This is a proposal, not a submitted application or approved payment mandate.';});
