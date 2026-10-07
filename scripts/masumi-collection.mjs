import { readFile } from 'node:fs/promises';
import { verifyMasumiCollection } from '../src/adapters/masumi-collection.mjs';

// Deliberately contains no payment writes, model calls, or automatic retries.
try {
  const path=process.argv[2],key=process.env.SOKOSUMI_COWORKER_API_KEY,token=process.env.MPS_API_TOKEN;
  if(!path||!key?.startsWith('coworker_')||!token||!process.env.BLOCKFROST_PROJECT_ID||!process.env.MPS_URL)throw new Error('NOT_CONFIGURED: provide trusted contract file, Coworker runtime key, MPS URL/token and Blockfrost preprod key');
  const contract=JSON.parse(await readFile(path,'utf8'));
  const base=new URL(process.env.MPS_URL);
  if(base.username||base.password||base.search||base.hash||base.pathname!=='/'||!(base.protocol==='https:'||(base.protocol==='http:'&&['127.0.0.1','localhost'].includes(base.hostname))))throw new Error('Require HTTPS or loopback MPS origin without embedded credentials');
  const request=async(url,options)=>{
    const r=await fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(10000)});
    if(!r.ok)throw new Error(`Provider request failed (${r.status})`);
    const payload=await r.json();return payload.data??payload;
  };
  const proof=await verifyMasumiCollection({contract,
    readTaskReceipt:id=>request(`https://api.preprod.sokosumi.com/v1/tasks/${encodeURIComponent(id)}/receipt`,{headers:{Authorization:`Bearer ${key}`}}),
    resolvePayment:id=>request(new URL('/api/v1/payment/resolve-blockchain-identifier',base),{method:'POST',headers:{token,'Content-Type':'application/json'},body:JSON.stringify({network:'Preprod',blockchainIdentifier:id,includeHistory:'true'})})
  });
  console.log(JSON.stringify(proof,null,2));process.exitCode=proof.verified?0:2;
} catch(error) {
  // Do not print remote payloads, contract files, request URLs, or credentials.
  const configured=error.message.startsWith('NOT_CONFIGURED:');
  console.error(configured?error.message:'COLLECTION_NOT_VERIFIED: check contract bindings, credentials and provider availability');process.exitCode=1;
}
