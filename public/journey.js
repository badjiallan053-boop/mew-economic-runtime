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
  const wrapper=document.createElement('section'),footer=document.createElement('section');wrapper.className='story-journey';wrapper.setAttribute('aria-label','MEW workflow context');footer.className='story-next';const homeAnchor=main.querySelector('#how-it-works');const after=main.querySelector('[data-journey-after]');const hero=main.querySelector('.protocol-heading,.marketing-hero,.studio-intro,.intro,.hero');if(homeAnchor)homeAnchor.before(wrapper);else if(after)after.after(wrapper);else if(hero)hero.after(wrapper);else main.prepend(wrapper);main.append(footer);
  function render(){
   const story=storyForPath(location.pathname,location.search);wrapper.replaceChildren();footer.replaceChildren();
   const choices=document.createElement('div');choices.className='story-choices';const label=document.createElement('span');label.textContent='Choose your example';choices.append(label);
   for(const profile of Object.values(workflowCatalog)){const link=document.createElement('a');link.href=contextHref(profile.routes[story.id||'understand'],profile.id);link.textContent=profile.name;if(profile.id===story.workflow.id)link.setAttribute('aria-current','true');choices.append(link);}
   const stage=document.createElement('p');stage.className='story-stage';stage.textContent=`${story.id?story.steps.findIndex(s=>s.id===story.id)+1:1} / ${story.steps.length} · ${story.step?.label||story.steps[0].label}`;
   const roadmap=document.createElement('ol');roadmap.className='story-roadmap';roadmap.setAttribute('aria-label','Four steps in the workflow');
   for(const [index,item] of story.steps.entries()){const entry=document.createElement('li');entry.textContent=item.label;if(item.id===story.id)entry.setAttribute('aria-current','step');roadmap.append(entry);}
   const context=document.createElement('p');context.className='story-context';context.textContent=story.workflow.example;
   const mode=document.createElement('p');mode.className='story-mode';mode.textContent=presentationMode(location.pathname);wrapper.append(choices,stage,roadmap,context,mode);
   const next=story.next||story.steps[1],link=document.createElement('a');
   link.href=next.href;link.textContent=`Next · ${next.label} →`;footer.append(link);
   syncWorkflowLinks(main,story.workflow.id);
  }
  render();window.addEventListener('mew:workflow-change',render);
 }
}
