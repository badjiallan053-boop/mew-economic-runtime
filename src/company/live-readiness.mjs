/** Reports configuration separately from execution proof. No external writes. */
export async function liveReadiness({env={},accountAuthenticated=false,readHostedHealth,checkChain}={}){
  let hosted='UNVERIFIED',chain='NOT_CONFIGURED';
  try{const h=await readHostedHealth?.();if(h?.ok===true&&h.persistence==='sqlite'&&['demo','live'].includes(h.mode)&&h.paymentsEnabled===false)hosted=h.mode==='demo'?'VERIFIED_DEMO':'VERIFIED_EVIDENCE_SERVER';}catch{hosted='UNAVAILABLE';}
  const present=key=>typeof env[key]==='string'&&env[key].trim().length>0;
  if(present('BLOCKFROST_PROJECT_ID'))try{chain=(await checkChain?.()).connected===true?'VERIFIED_PREPROD_CONNECTION':'UNVERIFIED';}catch{chain='UNAVAILABLE';}
  const gates=[
    {id:'hosting',status:hosted},
    {id:'account',status:accountAuthenticated?'AUTHENTICATED':'AUTH_REQUIRED'},
    {id:'model',status:['OPENAI_API_KEY','ANTHROPIC_API_KEY','EVE_API_KEY'].some(present)?'CONFIGURED_UNTESTED':'NOT_CONFIGURED'},
    {id:'coworker-runtime',status:present('SOKOSUMI_COWORKER_API_KEY')&&env.SOKOSUMI_COWORKER_API_KEY.startsWith('coworker_')?'CONFIGURED_UNTESTED':'NOT_CONFIGURED'},
    {id:'blockfrost',status:chain},
    {id:'payment-service',status:present('MPS_URL')&&present('MPS_API_TOKEN')?'CONFIGURED_UNTESTED':'NOT_CONFIGURED'},
    {id:'model-response',status:'PROOF_REQUIRED'},
    {id:'wallet-funding-and-registration',status:'PROOF_REQUIRED'},
    {id:'paid-task-and-seller-collection',status:'PROOF_REQUIRED'}
  ];
  return {version:1,overall:'BLOCKED',externalWrites:false,gates,nextAction:accountAuthenticated?'Provide a private model/Blockfrost configuration path, then prove one model response before any paid job.':'Run node scripts/tools.mjs sokosumi --preprod auth login, then rerun this preflight.',limitations:['Credential presence is not a successful model call, payment-service connection or funded wallet.','This preflight does not read Task receipts or wallet balances; paid execution remains unverified.']};
}
