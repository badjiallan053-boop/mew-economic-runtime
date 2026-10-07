import test from 'node:test';
import assert from 'node:assert/strict';
import {IntegrationStore} from '../src/integration/store.mjs';
import {MEW} from '../src/core/mew.mjs';

function fixture({failBegin=false,failCommit=false,failRollback=false}={}){
  const calls=[],releases=[],error=Error('Injected transaction failure');let store;
  const client={async query(sql){calls.push(sql);if((sql==='BEGIN'&&failBegin)||(sql==='COMMIT'&&failCommit)||(sql==='ROLLBACK'&&failRollback))throw error;if(sql.startsWith('SELECT snapshot'))return {rows:[{snapshot:new MEW().snapshot(),policy_digest:store.policyDigest}]};return {rows:[]};},release(destroy){releases.push(Boolean(destroy));}};
  store=new IntegrationStore({pool:{connect:async()=>client}});
  return {store,calls,releases,error};
}
test('normal durable transaction returns its client reusable once',async()=>{const f=fixture();assert.equal(await f.store.transaction('payer',async()=>42),42);assert.deepEqual(f.releases,[false]);assert.equal(f.calls.at(-1),'COMMIT');});
test('callback failure with acknowledged rollback keeps the original error and safely reuses client',async()=>{const f=fixture();await assert.rejects(f.store.transaction('payer',async()=>{throw f.error;}),e=>e===f.error);assert.deepEqual(f.releases,[false]);assert.equal(f.calls.at(-1),'ROLLBACK');assert.equal(f.calls.includes('COMMIT'),false);});
test('failed rollback discards connection instead of reusing uncertain principal session',async()=>{const f=fixture({failRollback:true}),original=Error('Original rejected mutation');await assert.rejects(f.store.transaction('payer',async()=>{throw original;}),e=>e===original);assert.deepEqual(f.releases,[true]);assert.equal(f.calls.at(-1),'ROLLBACK');});
test('lost BEGIN acknowledgment discards connection even without a confirmed transaction',async()=>{const f=fixture({failBegin:true});await assert.rejects(f.store.transaction('payer',async()=>42),e=>e===f.error);assert.deepEqual(f.calls,['BEGIN']);assert.deepEqual(f.releases,[true]);});
test('lost COMMIT acknowledgment is never retried and discards connection even if rollback responds',async()=>{const f=fixture({failCommit:true});let mutations=0;await assert.rejects(f.store.transaction('payer',async()=>{mutations++;return 42;}),e=>e===f.error);assert.equal(mutations,1);assert.deepEqual(f.releases,[true]);assert.equal(f.calls.filter(s=>s==='BEGIN').length,1);assert.equal(f.calls.filter(s=>s==='COMMIT').length,1);assert.equal(f.calls.at(-1),'ROLLBACK');});
