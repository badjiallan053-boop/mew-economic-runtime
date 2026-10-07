const status=document.querySelector('#service-status');
const refresh=document.querySelector('#refresh-status');
async function inspectHost(){
  refresh.disabled=true;
  status.textContent='Checking this host’s service mode…';
  try{
    const response=await fetch('/api/health',{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
    if(!response.ok) throw new Error('Health endpoint unavailable');
    const health=await response.json();
    if(health.mode==='demo'||health.mode==='simulation') status.textContent='This host reports demo mode. The workspaces use synthetic evidence; no live payments are enabled.';
    else if(health.mode==='live') status.textContent='This host reports live evidence mode. That status alone does not prove model execution or a funded payment.';
    else status.textContent='The service responded, but its mode is not recognized. Treat all examples on this page as simulations.';
  }catch{status.textContent='Service mode could not be verified on this host. You can inspect the workspace pages; live operation is not established.';}
  finally{refresh.disabled=false;}
}
refresh.addEventListener('click',inspectHost);
await inspectHost();
