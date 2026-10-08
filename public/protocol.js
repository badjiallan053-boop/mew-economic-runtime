import {workflowForLocation,workflowLink,formatExampleAda} from './workflow-context.js';
const workflow=workflowForLocation(location.pathname,location.search);
const amount=formatExampleAda;
const copy={
 'proof-example-label':workflow.id==='clips'?'THE FIVE-OUTLINE EXAMPLE':'THE RESEARCH REPORT EXAMPLE',
 'first-title':'Ask '+workflow.first.name+'.',
 'first-copy':'Set aside '+amount(workflow.first.amount)+' for '+workflow.goal+'.',
 'second-title':'Pause '+workflow.second.name+'.',
 'second-copy':'Another '+amount(workflow.second.amount)+' would order the same '+(workflow.id==='clips'?'bundle':'report')+' again.',
 'proof-example':workflow.id==='clips'?'8 + 6 = 14 ADA. The second order would repeat the occupied bundle and exceed the 10 ADA limit. Check Editor A before asking someone else.':'1.50 + 1.40 = 2.90 ADA. Both prices fit the 3 ADA limit. The second request waits because you asked for one report, and that job is already held.'
};
for(const [id,text]of Object.entries(copy))document.getElementById(id).textContent=text;
const goal=document.getElementById('proof-goal');goal.replaceChildren(document.createTextNode('Your goal: '));
const deliverable=document.createElement('strong');deliverable.textContent=workflow.goal;
const budget=document.createElement('strong');budget.textContent=amount(workflow.limit);
goal.append(deliverable,document.createTextNode(' · maximum '),budget);
const record=workflow.id==='clips'?'campaign.html?workflow=clips#campaign-record':'studio.html?workflow=report#checkpoint-record';
for(const id of ['proof-record-link','evidence-demo-link'])document.getElementById(id).href=record;
document.querySelector('#timeout-demo-link').href=workflowLink('studio.html',workflow.id);
if(workflow.id==='clips')document.querySelector('#timeout-demo-link').textContent='Try the duplicate-request demo →';
const layers={
 advice:{state:'Configured advice only',title:'A team proposes. Code checks.',description:'Knowledge and engineering prepare a proposal. Risk and red team examine it independently. The coordinator combines accepted handoffs.',allowed:'Read assigned evidence and submit a recommendation.',boundary:'A recommendation cannot authorize spending. Hosted role outputs are fixtures, not model executions.',href:'company.html',link:'See team responsibilities'},
 mandate:{state:'Implemented decision engine',title:'Check the goal and the money.',description:'Each request belongs to one agreed objective. Code checks quantity and cost together, then records the reservation before dispatch.',allowed:'Hold admissible capacity and reject mismatched or exhausted requests.',boundary:'This covers governed requests only. Separate currencies and objectives are not one combined budget.',href:'studio.html',link:'Inspect the decision demo'},
 proof:{state:'Local integration tested; live delivery pending',title:'Accept the exact delivered file.',description:'An authenticated receipt must identify the enrolled provider, job and exact artifact. A different file needs a different review.',allowed:'Validate contract-bound delivery evidence and observe matching chain records.',boundary:'Receipt acceptance is not proof of payment. Browser claims and self-supplied public keys do not establish trust.',href:'research.html',link:'Inspect source evidence'},
 rail:{state:'Payment execution disabled',title:'Prepare the connection. Prove it separately.',description:'The prepared Cardano preprod path links a reviewed escrow transaction with a durable operation journal.',allowed:'Prepare unsigned drafts and inspect externally supplied evidence.',boundary:'Private database login, approved signer custody, funding and independent audit remain pending. No real transaction was signed or broadcast.',href:'research.html',link:'Read ecosystem sources'}
};
const tabs=[...document.querySelectorAll('[data-layer]')];
function select(tab){const layer=layers[tab.dataset.layer];for(const item of tabs){const selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;}for(const key of ['state','title','description','allowed','boundary'])document.querySelector('#layer-'+key).textContent=layer[key];const link=document.querySelector('#layer-link');link.href=workflowLink(layer.href,workflow.id);link.textContent=layer.link;document.querySelector('#layer-panel').setAttribute('aria-labelledby',tab.id);}
for(const tab of tabs){tab.addEventListener('click',()=>select(tab));tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=tabs.indexOf(tab),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].focus();select(tabs[next]);});}
