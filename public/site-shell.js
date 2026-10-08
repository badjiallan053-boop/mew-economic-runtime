import {workflowForLocation,stepsForWorkflow,contextHref} from './workflow-context.js';
const profile=workflowForLocation(location.pathname,location.search);
const primary=stepsForWorkflow(profile.id).map(s=>[s.href,s.label.replace(' the demo','').replace(' the result','').replace(' a pilot','')]);
const supporting=[['marketing.html','Marketing & clipping'],['company.html','Agent workflows'],['design-studio.html','Design tools'],['research.html','Source library'],['knowledge.html','Engineering knowledge'],['campaign.html','Clip rehearsal']];
const nav=document.createElement('nav');nav.className='site-nav';nav.setAttribute('aria-label','MEW website');const brand=document.createElement('a');brand.className='site-brand';brand.href=contextHref(profile.routes.understand,profile.id);brand.textContent='mew';const mark=document.createElement('span');mark.textContent='✳';mark.setAttribute('aria-hidden','true');brand.append(mark);nav.append(brand);
function addLink(parent,path,label){const a=document.createElement('a');a.href=path.includes('workflow=')?path:contextHref(path,['marketing.html','campaign.html'].includes(path)?'clips':profile.id);a.textContent=label;const page=path.split(/[?#]/)[0];if(location.pathname.endsWith('/'+page)||(page==='home.html'&&(location.pathname==='/'||location.pathname.endsWith('/index.html'))))a.setAttribute('aria-current','page');parent.append(a);}
for(const [path,label]of primary)addLink(nav,path,label);
const details=document.createElement('details');details.className='support-nav';const summary=document.createElement('summary');summary.textContent='More workspaces';const menu=document.createElement('div');for(const [path,label]of supporting)addLink(menu,path,label);details.append(summary,menu);nav.append(details);document.body.prepend(nav);

// Native disclosure: Escape restores focus; outside pointer closes without trapping it.
details.addEventListener('keydown',event=>{if(event.key==='Escape'&&details.open){details.open=false;summary.focus();event.preventDefault();}});
document.addEventListener('pointerdown',event=>{if(details.open&&!details.contains(event.target))details.open=false;});

// Independent progressive enhancement: an optional art failure cannot block navigation.
const motionStyles=document.createElement('link');motionStyles.rel='stylesheet';motionStyles.href='/experience-motion.css';document.head.append(motionStyles);
import('/experience-motion.js').catch(()=>{});

// Rebuild the context links after an explicit pilot deliverable change.
window.addEventListener('mew:workflow-change',()=>{const current=workflowForLocation(location.pathname,location.search);const steps=stepsForWorkflow(current.id);brand.href=contextHref(current.routes.understand,current.id);[...nav.children].filter(e=>e.tagName==='A'&&e!==brand).forEach((a,i)=>{a.href=steps[i].href;});for(const a of menu.querySelectorAll('a')){const page=new URL(a.href).pathname.slice(1);a.href=contextHref(page,['marketing.html','campaign.html'].includes(page)?'clips':current.id);}});
