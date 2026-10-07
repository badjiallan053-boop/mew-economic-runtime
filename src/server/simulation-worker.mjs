/** Test-only relay: the store rejects live mode before the provider is called.
 * Acknowledgment is a job reference, never chain settlement or delivery proof. */
export async function runSimulationOperation(store,id,provider,{timeoutMs=1000}={}){
 if(typeof provider!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)throw Error('Invalid simulation worker');
 const claimed=store.claimSimulation(id),controller=new AbortController();let timer;
 try{
  const response=await Promise.race([Promise.resolve().then(()=>provider(structuredClone(claimed.contract),{signal:controller.signal})),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Simulation deadline'));},timeoutMs);})]);
  if(!response||Object.keys(response).length!==1||typeof response.jobId!=='string'||!response.jobId.trim()||response.jobId.length>200)throw Error('Invalid provider acknowledgment');
  return store.finishSimulation(id,claimed.token,{outcome:'ACKNOWLEDGED',jobId:response.jobId});
 }catch{
  // Provider details never reach the journal; ambiguous response remains occupied.
  return store.finishSimulation(id,claimed.token,{outcome:'UNKNOWN'});
 }finally{clearTimeout(timer);}
}
