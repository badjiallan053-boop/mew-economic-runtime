import test from 'node:test';
import assert from 'node:assert/strict';
import { observeCardanoPayment } from '../src/adapters/cardano.mjs';
const hash = 'a'.repeat(64);
const effect = { id: 'alpha', objectiveId: 'report', amount: 550000, recipientAddress: 'addr_test1recipient' };
function fixture({ amount = '550000', address = effect.recipientAddress, height = 102, valid = true, status = 200, identity = hash } = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => { calls.push({ url, options }); return { ok: status === 200, status, json: async () => url.endsWith('/blocks/latest') ? { height } : url.endsWith('/utxos') ? { hash: identity, inputs: [], outputs: [{ address, output_index: 0, amount: [{ unit: 'lovelace', quantity: amount }] }] } : { hash: identity, block_height: 100, valid_contract: valid } }; };
  return { calls, fetchImpl };
}
const verify = config => observeCardanoPayment({ txHash: hash, effect, projectId: 'server-secret', ...config });
test('observes recipient amount and chain depth without claiming settlement', async () => {
  const f = fixture(); const claim = await verify(f);
  assert.equal(claim.type, 'payment.observed'); assert.equal(claim.claimId, `tx:${hash}:alpha`); assert.equal(claim.evidence.confirmations, 3);assert.equal(claim.evidence.payerAttribution,'unverified');assert.equal(claim.evidence.transactionBinding,'operator-attested');assert.equal(claim.evidence.settlementFinality,'not-established');assert.equal(claim.evidence.exposureReleaseAllowed,false);
  assert.ok(f.calls.every(c => c.url.startsWith('https://cardano-preprod.blockfrost.io/api/v0/') && c.options.headers.project_id === 'server-secret' && c.options.redirect === 'error'));
});
for (const [name, config] of Object.entries({ 'wrong amount': { amount: '490000' }, 'wrong recipient': { address: 'addr_test1other' }, 'too few confirmations': { height: 100 }, 'invalid contract': { valid: false }, 'wrong transaction': { identity: 'b'.repeat(64) }, 'provider unavailable': { status: 404 }, 'malformed amount': { amount: '-550000' } })) test(`rejects ${name}`, async () => assert.rejects(verify(fixture(config))));
test('rejects malformed transaction hash before network access', async () => assert.rejects(verify({ txHash: '../secret', fetchImpl: () => { throw new Error('Should not fetch'); } })));
test('sums split recipient outputs without accepting a client asserted amount', async () => {
  const f = fixture(); const original = f.fetchImpl;
  f.fetchImpl = async (url, options) => url.endsWith('/utxos') ? { ok: true, json: async () => ({ hash, inputs: [], outputs: [200000,350000].map((n,i)=>({ address:effect.recipientAddress,output_index:i,amount:[{unit:'lovelace',quantity:String(n)}] })) }) } : original(url,options);
  assert.equal((await verify(f)).amount,550000);
});
test('recipient-owned change cannot prove a new payment', async () => {
  const f=fixture(), original=f.fetchImpl;
  f.fetchImpl=async (url,options)=>{const response=await original(url,options);if(!url.endsWith('/utxos')) return response;const data=await response.json();data.inputs=[{address:effect.recipientAddress,amount:[{unit:'lovelace',quantity:'700000'}]}];return {...response,json:async()=>data};};
  await assert.rejects(verify(f),/recipient payment/);
});
test('missing input evidence fails closed', async () => {
  const f=fixture(), original=f.fetchImpl;
  f.fetchImpl=async (url,options)=>{const response=await original(url,options);const data=await response.json();if(url.endsWith('/utxos')) delete data.inputs;return {...response,json:async()=>data};};
  await assert.rejects(verify(f),/inputs/);
});
test('net receipt accepts payment plus recipient change, not the gross output',async()=>{
  const f=fixture({amount:'750000'}),original=f.fetchImpl;
  f.fetchImpl=async(url,options)=>{const r=await original(url,options);const data=await r.json();if(url.endsWith('/utxos'))data.inputs=[{address:effect.recipientAddress,amount:[{unit:'lovelace',quantity:'200000'}]}];return {...r,json:async()=>data};};
  assert.equal((await verify(f)).evidence.lovelace,'550000');
});
