import {workflowForLocation,workflowCatalog,stepsForWorkflow,contextHref,presentationMode,syncWorkflowLinks} from './workflow-context.js';
// Preserve the existing default-route export for consumers of the report story.
export const storySteps=Object.freeze(stepsForWorkflow('report').map(step=>Object.freeze({...step,href:workflowCatalog.report.routes[step.id]})));
export function storyForPath(path,search=''){
 const page=path.split('/').at(-1)||'index.html',workflow=workflowForLocation(path,search);
 const id=['index.html','home.html','marketing.html'].includes(page)?'understand':['studio.html','campaign.html'].includes(page)?'try':['protocol.html','research.html'].includes(page)?'verify':page==='pilot.html'?'plan':null;
 const steps=stepsForWorkflow(workflow.id);return {id,workflow,steps,step:steps.find(s=>s.id===id)||null,next:id?steps[steps.findIndex(s=>s.id===id)+1]||null:steps[1]};
}
if(typeof document!=='undefined'){
 const main=document.querySelector('main');
 if(main){
  const wrapper=document.createElement('section'),footer=document.createElement('section');wrapper.className='story-journey';wrapper.setAttribute('aria-label','MEW guided story');footer.className='story-next';const homeAnchor=main.querySelector('#how-it-works');const after=main.querySelector('[data-journey-after]');if(homeAnchor)homeAnchor.before(wrapper);else if(after)after.after(wrapper);else main.prepend(wrapper);main.append(footer);
  function render(){
   const story=storyForPath(location.pathname,location.search);wrapper.replaceChildren();footer.replaceChildren();
   const choices=document.createElement('div');choices.className='story-choices';const label=document.createElement('span');label.textContent='Choose your example';choices.append(label);
   for(const profile of Object.values(workflowCatalog)){const link=document.createElement('a');link.href=contextHref(profile.routes[story.id||'understand'],profile.id);link.textContent=profile.name;if(profile.id===story.workflow.id)link.setAttribute('aria-current','true');choices.append(link);}
   const nav=document.createElement('nav');nav.setAttribute('aria-label','Understand, try, verify and plan');
   for(const [i,step]of story.steps.entries()){const a=document.createElement('a'),number=document.createElement('span');a.href=step.href;number.textContent=String(i+1).padStart(2,'0');number.setAttribute('aria-hidden','true');a.append(number,document.createTextNode(step.label));if(step.id===story.id)a.setAttribute('aria-current','step');nav.append(a);}
   const context=document.createElement('p');context.className='story-context';context.textContent=`${story.workflow.example} Synthetic example · models and payments disabled.`;
   const mode=document.createElement('p');mode.className='story-mode';mode.textContent=presentationMode(location.pathname);wrapper.append(choices,nav,context,mode);
   const next=story.next||story.steps[1],title=document.createElement('h2'),description=document.createElement('p'),link=document.createElement('a');
   title.textContent=story.next?next.question:'Keep the brief reviewable.';
   description.textContent=story.id==='try'?'Check the decision record and the limits of this simulation before planning real work.':story.id==='verify'?'Prepare a local pilot brief. It does not book a supplier, run a model or authorize payment.':story.id==='plan'?'Review scope, rights, acceptance and cost with your team. Return to the rehearsal when you need to test uncertainty.':`Continue with the ${story.workflow.id==='clips'?'five-outline':'one-report'} example. Nothing is ordered or paid through these navigation links.`;
   link.href=next.href;link.textContent=story.next?next.label:'Return to this demo';footer.append(title,description,link);
   syncWorkflowLinks(main,story.workflow.id);
  }
  render();window.addEventListener('mew:workflow-change',render);
 }
}
