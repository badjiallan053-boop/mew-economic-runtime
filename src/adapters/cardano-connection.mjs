/** Credential-safe, read-only connectivity probe. No payment submission. */
export async function checkCardanoConnection({projectId=process.env.BLOCKFROST_PROJECT_ID,fetchImpl=globalThis.fetch}={}) {
  const base={network:'cardano:preprod',provider:'blockfrost',configured:Boolean(projectId),connected:false,paymentsEnabled:false};
  if(typeof projectId!=='string' || !projectId) return {...base,reason:'NOT_CONFIGURED'};
  const origin='https://cardano-preprod.blockfrost.io/api/v0';
  try {
    async function get(path) {
      const response=await fetchImpl(origin+path,{headers:{project_id:projectId},redirect:'error',signal:AbortSignal.timeout(10000)});
      if(!response.ok) throw new Error('Provider unavailable');
      return response.json();
    }
    const [health,block]=await Promise.all([get('/health'),get('/blocks/latest')]);
    if(health?.is_healthy!==true || !Number.isSafeInteger(block?.height) || block.height<0 || typeof block.hash!=='string' || !/^[a-f0-9]{64}$/.test(block.hash) || !Number.isSafeInteger(block.time) || block.time<0) throw new Error('Invalid chain evidence');
    return {...base,connected:true,reason:'CONNECTED',latestBlock:{height:block.height,hash:block.hash,time:block.time}};
  } catch {return {...base,reason:'PROVIDER_UNAVAILABLE'};}
}
