import test from 'node:test';
import assert from 'node:assert/strict';
import { runPilot } from '../scripts/pilot.mjs';

test('one command completes one simulated purchase despite lost response and competing replacement',async()=>{
  const results=[];
  assert.equal(await runPilot({log:s=>results.push(JSON.parse(s)),fetchImpl:()=>{throw new Error('Local pilot must not call network');}}),0);
  const r=results[0];assert.equal(r.simulated,true);assert.equal(r.replacement,'DEFER');assert.equal(r.acceptedPurchases,1);
  assert.equal(r.fulfilledQuantity,1);assert.equal(r.evidence.simulation,true);
  const binding=r.evidence.operations[0].deliveryBinding;
  assert.equal(binding.simulated,true);assert.match(binding.artifactDigest,/^[a-f0-9]{64}$/);
  assert.match(binding.receiptDigest,/^[a-f0-9]{64}$/);assert.match(binding.acceptanceDigest,/^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(r).includes('PRIVATE KEY'));assert.ok(!JSON.stringify(r).includes('signature'));
});
test('simple pilot rejects live switch, arbitrary options and reconciliation without a provider',async()=>{
  for(const args of [['--live'],['--url','http://invalid'],['--reconcile'],['--stripe','--stripe']])
    await assert.rejects(runPilot({args,log:()=>{}}),/Use npm run pilot/);
});
