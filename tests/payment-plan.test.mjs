import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePaymentPlan,paymentRecovery,syntheticPaymentPlan} from '../src/company/payment-plan.mjs';

test('offline preprod plan never authorizes, reserves or dispatches',()=>{
  const input=syntheticPaymentPlan(),before=structuredClone(input),result=validatePaymentPlan(input);
  assert.equal(result.overall,'BLOCKED');assert.equal(result.dispatchAllowed,false);assert.equal(result.externalWrites,false);assert.equal(result.paymentsEnabled,false);
  assert.deepEqual(input,before);assert.match(result.fingerprint,/^[a-f0-9]{64}$/);
  result.contract.asset.amountLovelace=1;assert.equal(input.asset.amountLovelace,2000000);
});
test('reject network, ambiguous amounts, asset confusion and extra authority',()=>{
  const changes=[p=>p.network='cardano:mainnet',p=>p.recipientAddress='addr1mainnet',p=>p.asset.amountLovelace=0.5,p=>p.asset.amountLovelace='2000000',p=>p.asset.amountLovelace=Number.MAX_SAFE_INTEGER+1,p=>p.asset.amountLovelace=4000000,p=>p.asset.unit='USDM',p=>p.verified=true,p=>p.bindings.apiKey='forbidden'];
  for(const change of changes){const p=syntheticPaymentPlan();change(p);assert.throws(()=>validatePaymentPlan(p));}
});
test('immutable operation terms survive key reordering and reject changed identity or amount',()=>{
  const saved=syntheticPaymentPlan(),reordered=Object.fromEntries(Object.entries(saved).reverse());
  assert.equal(validatePaymentPlan(reordered,{savedPlan:saved}).fingerprint,validatePaymentPlan(saved).fingerprint);
  for(const key of ['effectId','recipientAddress','semanticKey','operationId']){const p=structuredClone(saved);p[key]+='changed';assert.throws(()=>validatePaymentPlan(p,{savedPlan:saved}));}
  const changed=structuredClone(saved);changed.asset.amountLovelace++;assert.throws(()=>validatePaymentPlan(changed,{savedPlan:saved}));
});
test('native-token plan requires raw exact unit and cannot enter lovelace accounting',()=>{
  const p=syntheticPaymentPlan();p.rail='masumi-token';p.asset={unit:'a'.repeat(56)+'5553444d',expectedAtomicUnits:'1000000'};
  p.bindings={taskId:'task',blockchainIdentifier:'blockchain',agentIdentifier:'agent',walletId:'wallet',smartContractAddress:'addr_test1syntheticcontract',paymentSourceType:'Web3CardanoV2'};
  assert.ok(validatePaymentPlan(p).blockers.includes('NATIVE_TOKEN_LEDGER_NOT_IMPLEMENTED_NO_LOVELACE_CONVERSION'));
  for(const amount of ['1.0','01','-1',1000000]){const bad=structuredClone(p);bad.asset.expectedAtomicUnits=amount;assert.throws(()=>validatePaymentPlan(bad));}
  const bad=structuredClone(p);bad.asset.unit='USDM';assert.throws(()=>validatePaymentPlan(bad));
  const other=structuredClone(p);other.asset.unit='b'.repeat(56)+'5553444d';assert.throws(()=>validatePaymentPlan(other,{savedPlan:p}));
});
test('timeout and UNKNOWN never retry spend or release exposure; forged settlement rejected',()=>{
  for(const outcome of ['TIMEOUT','UNKNOWN']){const r=paymentRecovery(syntheticPaymentPlan(),{outcome});assert.equal(r.status,'UNKNOWN');assert.equal(r.retrySpendAllowed,false);assert.equal(r.releaseExposureAllowed,false);assert.equal(r.dispatchAllowed,false);}
  assert.equal(paymentRecovery(syntheticPaymentPlan(),{outcome:'NOT_DISPATCHED'}).dispatchAllowed,false);
  assert.throws(()=>paymentRecovery(syntheticPaymentPlan(),{outcome:'SETTLED'}));
});
