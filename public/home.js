const status=document.querySelector('#service-status');
const refresh=document.querySelector('#refresh-status');
async function inspectHost(){
  refresh.disabled=true;
  status.textContent='Checking this host’s service mode…';
  try{
    const response=await fetch('/api/health',{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
    if(!response.ok) throw new Error('Health endpoint unavailable');
    const health=await response.json();
    if(health.mode==='demo'||health.mode==='simulation') status.textContent='Host reports demo mode. Workspaces use synthetic evidence; live payments are not enabled.';
    else if(health.mode==='live') status.textContent='Host reports live evidence mode. This alone does not establish model execution or a funded payment.';
    else status.textContent='Host responded with an unrecognized mode. Treat the examples as simulations.';
  }catch{status.textContent='Host mode could not be verified. These examples remain simulations.';}
  finally{refresh.disabled=false;}
}
refresh.addEventListener('click',inspectHost);
// Local explanatory states only. This never calls a reservation or payment API.
const checkpoints=[
  {decision:'RESERVED',kicker:'ALLOW → RESERVE',title:'The first report holds capacity.',description:'1.50 ADA is reserved. No payment has been dispatched in this illustration.',next:'Observe the timeout →'},
  {decision:'UNKNOWN',kicker:'TIMEOUT → RETAIN',title:'Silence doesn’t release the mandate.',description:'Delivery is uncertain. The same 1.50 ADA reservation remains held until evidence resolves the original effect.',next:'Attempt the equivalent report →'},
  {decision:'DEFER',kicker:'EQUIVALENT REQUEST → RECONCILE',title:'Resolve the original. Don’t buy it again.',description:'The 1.40 ADA equivalent request is deferred because the one-report objective is already held by an unresolved effect. Reconcile the original payment and delivery.',next:'Restart illustration →'}
];
let checkpoint=0;
function renderIllustration(){
 document.dispatchEvent(new CustomEvent('mew:art-phase',{detail:{phase:['reserved','unknown','defer'][checkpoint]}}));
 const item=checkpoints[checkpoint];
 document.querySelector('#fixture-decision').textContent=item.decision;
 document.querySelector('#fixture-kicker').textContent=item.kicker;
 document.querySelector('#fixture-title').textContent=item.title;
 document.querySelector('#fixture-description').textContent=item.description;
 document.querySelector('#demo-next').textContent=item.next;
 document.querySelectorAll('[data-step]').forEach(element=>{const selected=Number(element.dataset.step)===checkpoint;element.classList.toggle('active',selected);if(selected)element.setAttribute('aria-current','step');else element.removeAttribute('aria-current');});
}
document.querySelector('#demo-next').addEventListener('click',()=>{checkpoint=(checkpoint+1)%checkpoints.length;renderIllustration();});
document.querySelector('#demo-reset').addEventListener('click',()=>{checkpoint=0;renderIllustration();});
renderIllustration();
await inspectHost();
