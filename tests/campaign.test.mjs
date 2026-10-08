import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaign, advanceCampaign, campaignStages } from '../src/demo/campaign.mjs';
const advance = s => advanceCampaign(s,{expectedStage:s.stage,expectedCampaignId:s.campaignId});
const until = (s,stage) => { while(s.stage<stage&&!s.blocked) s=advance(s); return s; };
test('campaign competing commitments stay bounded; acceptance is separate from settlement',()=>{
  const original=createCampaign(); const reviewed=until(original,2);
  assert.equal(original.stage,0); assert.equal(original.events.length,0);
  const [risk,red]=reviewed.agents.filter(a=>['risk','red-team'].includes(a.role));
  assert.deepEqual(risk.context,red.context); assert.notEqual(risk.context,red.context);
  assert.equal(JSON.stringify(risk.context).includes('review-v1'),false);
  let s=until(reviewed,4);
  assert.equal(s.decisions.reserve,'ALLOW'); assert.equal(s.decisions.competing,'DEFER');
  assert.equal(s.kernel.effects.length,1); assert.equal(s.position.reserved,8000000);
  s=advance(s); assert.equal(s.metrics.provisional,true); assert.equal(s.position.reserved,8000000);
  s=advance(s); assert.equal(s.artifact.mediaProduced,false); assert.equal(s.acceptance.clipCount,5);
  assert.equal(s.position.reserved,8000000); assert.equal(s.position.spent,0);
  s=advance(s); assert.equal(s.position.spent,8000000); assert.equal(s.position.reserved,0);
  assert.equal(s.position.status,'SATISFIED'); assert.equal(s.stage,campaignStages.length); assert.deepEqual(advance(s),s);
  assert.ok(s.events.every(e=>e.simulated===true&&['advisory-only','deterministic-fixture-host'].includes(e.authority)));
  assert.ok(s.kernel.claims.every(c=>c.evidence.simulated));
});
test('missing source rights blocks before any authorization',()=>{
  const s=until(createCampaign('missing-rights'),campaignStages.length);
  assert.equal(s.stage,2); assert.equal(s.blocked,true); assert.equal(s.kernel.effects.length,0);
  assert.ok(s.agents.filter(a=>['risk','red-team'].includes(a.role)).every(a=>a.status==='ABSTAIN'));
  assert.deepEqual(advance(s),s);
});
test('early metrics cannot replace artifact acceptance or release capacity',()=>{
  const s=until(createCampaign('early-metrics'),campaignStages.length);
  assert.equal(s.blocked,true); assert.equal(s.artifact,null); assert.equal(s.position.reserved,8000000);
  assert.equal(s.position.spent,0); assert.equal(s.position.satisfied,0);
  assert.equal(s.metrics.measurementWindowClosed,false); assert.equal(s.metrics.financialAuthority,false);
});
test('snapshot stage concurrency and invalid states fail closed',()=>{
  assert.throws(()=>createCampaign('unknown'),/Unknown/);
  const s=createCampaign();
  assert.throws(()=>advanceCampaign(s,{expectedStage:1,expectedCampaignId:s.campaignId}),/Stale/);
  assert.throws(()=>advanceCampaign(s),/Stale/);
  assert.throws(()=>advanceCampaign(s,{expectedStage:0,expectedCampaignId:createCampaign().campaignId}),/Stale campaign/);
  for(const patch of [{mode:'live'},{scenario:'unknown'},{stage:-1},{stage:99},{stage:0.1},{blocked:'false'}]) assert.throws(()=>advanceCampaign({...s,...patch},{expectedStage:patch.stage??0,expectedCampaignId:s.campaignId}),/Invalid/);
});
test('changed artifact cannot inherit approved digest during settlement',()=>{
  const s=until(createCampaign(),6); s.artifact.bytes+='tampered';
  assert.throws(()=>advance(s),/acceptance mismatch/); assert.equal(s.position.spent,0);
});

test('approval fields cannot bypass final artifact reconciliation',()=>{
  for(const patch of [{approved:false},{revision:-1},{revision:'0'},{clipCount:4},{effectId:'other'},{sourceId:'other'}]) {
    const s=until(createCampaign(),6); Object.assign(s.acceptance,patch);
    assert.throws(()=>advance(s),/acceptance mismatch/);
  }
});
