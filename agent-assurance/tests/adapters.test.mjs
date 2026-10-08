import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyCardanoSettlement } from '../src/adapters/cardano.mjs';
const hash = 'a'.repeat(64);
const effect = { id: 'alpha', objectiveId: 'report', amount: 550000, recipientAddress: 'addr_test1recipient' };
function fixture({ amount = '550000', address = effect.recipientAddress, height = 102, valid = true, status = 200, identity = hash } = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => { calls.push({ url, options }); return { ok: status === 200, status, json: async () => url.endsWith('/blocks/latest') ? { height } : url.endsWith('/utxos') ? { hash: identity, outputs: [{ address, output_index: 0, amount: [{ unit: 'lovelace', quantity: amount }] }] } : { hash: identity, block_height: 100, valid_contract: valid } }; };
  return { calls, fetchImpl };
}
const verify = config => verifyCardanoSettlement({ txHash: hash, effect, projectId: 'server-secret', ...config });
test('verifies recipient, amount and chain confirmations with server credentials', async () => {
  const f = fixture(); const claim = await verify(f);
  assert.equal(claim.type, 'payment.settled'); assert.equal(claim.claimId, `tx:${hash}:alpha`); assert.equal(claim.evidence.confirmations, 3);
  assert.ok(f.calls.every(c => c.url.startsWith('https://cardano-preprod.blockfrost.io/api/v0/') && c.options.headers.project_id === 'server-secret' && c.options.redirect === 'error'));
});
for (const [name, config] of Object.entries({ 'wrong amount': { amount: '490000' }, 'wrong recipient': { address: 'addr_test1other' }, 'too few confirmations': { height: 100 }, 'invalid contract': { valid: false }, 'wrong transaction': { identity: 'b'.repeat(64) }, 'provider unavailable': { status: 404 }, 'malformed amount': { amount: '-550000' } })) test(`rejects ${name}`, async () => assert.rejects(verify(fixture(config))));
test('rejects malformed transaction hash before network access', async () => assert.rejects(verify({ txHash: '../secret', fetchImpl: () => { throw new Error('Should not fetch'); } })));
test('sums split recipient outputs without accepting a client asserted amount', async () => {
  const f = fixture(); const original = f.fetchImpl;
  f.fetchImpl = async (url, options) => url.endsWith('/utxos') ? { ok: true, json: async () => ({ hash, outputs: [200000,350000].map((n,i)=>({ address:effect.recipientAddress,output_index:i,amount:[{unit:'lovelace',quantity:String(n)}] })) }) } : original(url,options);
  assert.equal((await verify(f)).amount,550000);
});
