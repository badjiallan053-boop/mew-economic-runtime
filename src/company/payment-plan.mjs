import {createHash} from 'node:crypto';

const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const fields=(v,keys)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(v,k)))throw new Error('Invalid plan fields');};
const text=(v)=>{if(typeof v!=='string'||!v.trim()||v.length>512)throw new Error('Invalid immutable identifier');};
const integer=v=>{if(!Number.isSafeInteger(v)||v<=0)throw new Error('Require positive safe integer lovelace');};

/** Offline intent only. No credentials, network, ledger reservation or signing.
 * Fingerprints bind bytes under trusted storage; they are not signatures. */
export function validatePaymentPlan(input,{savedPlan}={}){
  fields(input,['schema','network','rail','operationId','objectiveId','principal','semanticKey','effectId','recipientAddress','asset','bindings']);
  if(input.schema!=='mew.preprod-operation-plan.v1'||input.network!=='cardano:preprod'||!['cardano-ada','masumi-token'].includes(input.rail))throw new Error('Require supported preprod operation');
  for(const k of ['operationId','objectiveId','principal','semanticKey','effectId','recipientAddress'])text(input[k]);
  if(!/^addr_test1[0-9a-z]+$/.test(input.recipientAddress))throw new Error('Require configured preprod recipient');
  if(input.rail==='cardano-ada'){
    fields(input.asset,['unit','amountLovelace','maxExposureLovelace']);
    if(input.asset.unit!=='lovelace')throw new Error('ADA plan requires lovelace');
    integer(input.asset.amountLovelace);integer(input.asset.maxExposureLovelace);
    if(input.asset.amountLovelace>input.asset.maxExposureLovelace)throw new Error('Amount exceeds mandate');
    fields(input.bindings,['submissionRef']);text(input.bindings.submissionRef);
  }else{
    fields(input.asset,['unit','expectedAtomicUnits']);
    if(typeof input.asset.unit!=='string'||!/^[a-f0-9]{56}(?:[a-f0-9]{2}){0,32}$/.test(input.asset.unit)||typeof input.asset.expectedAtomicUnits!=='string'||!/^[1-9][0-9]{0,19}$/.test(input.asset.expectedAtomicUnits))throw new Error('Require raw native-token unit and integer atomic amount');
    fields(input.bindings,['taskId','blockchainIdentifier','agentIdentifier','walletId','smartContractAddress','paymentSourceType']);
    for(const value of Object.values(input.bindings))text(value);
    if(input.bindings.paymentSourceType!=='Web3CardanoV2'||!/^addr_test1[0-9a-z]+$/.test(input.bindings.smartContractAddress))throw new Error('Require preprod V2 contract');
  }
  const contract=structuredClone(input),fingerprint=digest(contract);
  if(savedPlan!==undefined){
    // Revalidate trusted stored terms; a caller-supplied digest is insufficient.
    const saved=validatePaymentPlan(savedPlan);
    if(saved.fingerprint!==fingerprint)throw new Error('Operation plan is immutable');
  }
  return {contract,fingerprint,overall:'BLOCKED',dispatchAllowed:false,paymentsEnabled:false,externalWrites:false,
    blockers:[
      'PLAN_IS_NOT_AUTHORIZATION_OR_RESERVATION','AUTHENTICATED_OPERATOR_AND_MANDATE_REQUIRED',
      'DURABLE_RESERVATION_AND_OUTBOX_REQUIRED','APPROVED_SIGNER_AND_FUNDING_REQUIRED',
      'FEE_AND_MIN_UTXO_REVIEW_REQUIRED','PINNED_PAYMENT_SERVICE_AND_ASSET_CONFIGURATION_REQUIRED',
      'AUTHENTICATED_DELIVERY_AND_SETTLEMENT_PROOF_REQUIRED',
      ...(input.rail==='masumi-token'?['NATIVE_TOKEN_LEDGER_NOT_IMPLEMENTED_NO_LOVELACE_CONVERSION']:[])
    ]};
}

export function paymentRecovery(plan,{outcome}={}){
  const checked=validatePaymentPlan(plan);
  if(!['NOT_DISPATCHED','TIMEOUT','UNKNOWN'].includes(outcome))throw new Error('Settlement requires existing authenticated verifier, not offline flags');
  const uncertain=outcome!=='NOT_DISPATCHED';
  return {fingerprint:checked.fingerprint,status:uncertain?'UNKNOWN':'NOT_DISPATCHED',dispatchAllowed:false,retrySpendAllowed:false,releaseExposureAllowed:false,action:uncertain?'RECONCILE_ORIGINAL_OPERATION':'COMPLETE_LIVE_GATES_AND_RESERVE_BEFORE_DISPATCH'};
}

export function syntheticPaymentPlan(){return {schema:'mew.preprod-operation-plan.v1',network:'cardano:preprod',rail:'cardano-ada',operationId:'synthetic-operation',objectiveId:'synthetic-objective',principal:'synthetic-operator',semanticKey:'synthetic-one-report',effectId:'synthetic-effect',recipientAddress:'addr_test1syntheticfixture',asset:{unit:'lovelace',amountLovelace:2000000,maxExposureLovelace:3000000},bindings:{submissionRef:'synthetic-offline-no-transaction'}};}
