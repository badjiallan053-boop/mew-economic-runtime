import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {workflowCatalog,workflowForLocation,stepsForWorkflow,contextHref,workflowLink,presentationMode} from '../public/workflow-context.js';
import {storyForPath} from '../public/journey.js';
test('each example keeps its context through the full journey, with existing pages and anchors',()=>{
 for(const workflow of ['report','clips'])for(const [index,step]of stepsForWorkflow(workflow).entries()){
  const url=new URL(step.href,'https://mew.invalid/'),html=readFileSync(new URL('../public'+url.pathname,import.meta.url),'utf8');
  if(url.hash)assert.ok(html.includes(`id="${url.hash.slice(1)}"`),step.href);
  const story=storyForPath(url.pathname,url.search);assert.equal(story.workflow.id,workflow);assert.equal(story.id,step.id);assert.equal(story.next?.id,['try','verify','plan',undefined][index]);
 }
 assert.equal(storyForPath('/research.html','?workflow=clips').next.href,'pilot.html?workflow=clips');
});
test('fixed demos never relabel their fixture because of a forged or stale query',()=>{
 for(const path of ['/','/home.html','/studio.html','/ledger.html','/rehearsal.html'])assert.equal(workflowForLocation(path,'?workflow=clips').id,'report');
 for(const path of ['/marketing.html','/campaign.html'])assert.equal(workflowForLocation(path,'?workflow=report').id,'clips');
 for(const search of ['?workflow=unknown','?workflow=constructor','?workflow=__proto__','?workflow=%3Cscript%3E'])assert.equal(workflowForLocation('/pilot.html',search).id,'report');
 assert.throws(()=>stepsForWorkflow('constructor'),/Unknown/);assert.throws(()=>contextHref('pilot.html','unknown'),/Unknown/);
});
test('handoff contains only the public workflow enum, preserves anchors, never forwards credentials or customer text',()=>{
 assert.equal(contextHref('pilot.html?customer=private&access_token=secret#planner-title','clips'),'pilot.html?workflow=clips#planner-title');
 assert.equal(workflowLink('studio.html#checkpoint-record','clips'),'campaign.html?workflow=clips');
 assert.equal(workflowLink('home.html','clips'),'marketing.html?workflow=clips#workflow');
 assert.equal(workflowLink('research.html','clips'),'research.html?workflow=clips');
 assert.equal(workflowLink('pilot.html?workflow=report','clips'),'pilot.html?workflow=report');
 assert.equal(workflowLink('pilot.html?workflow=clips&access_token=secret','report'),'pilot.html?workflow=clips');
 for(const href of ['#evidence','https://supabase.com/dashboard','https://github.com/a/b','mailto:example@example.com'])assert.equal(workflowLink(href,'clips'),href);
 assert.ok(Object.isFrozen(workflowCatalog.clips.routes));
});
test('synchronization describes the actual storage boundary rather than a shared financial session',()=>{
 assert.match(presentationMode('/home.html'),/Private to this tab/);assert.match(presentationMode('/campaign.html'),/Shared demo/);assert.match(presentationMode('/pilot.html'),/nothing submitted/);assert.match(presentationMode('/company.html'),/no model execution/);
});
test('displayed budgets and retained first quotes match the actual governed demo fixtures',async()=>{
 const {createCampaign,advanceCampaign}=await import('../src/demo/campaign.mjs');
 const {createRehearsal,advanceRehearsal}=await import('../src/demo/rehearsal.mjs');
 for(const [id,create,advance]of [['report',createRehearsal,advanceRehearsal],['clips',createCampaign,advanceCampaign]]){
  let state=create();const profile=workflowCatalog[id];assert.equal(state.kernel.objectives[0].maxExposure,profile.limit);assert.equal(state.kernel.objectives[0].quantity,1);
  for(let i=0;i<4;i++)state=advance(state,{expectedStage:state.stage,expectedCampaignId:state.campaignId});
  assert.equal(state.kernel.effects.length,1);assert.equal(state.kernel.effects[0].amount,profile.first.amount);
  const duplicate=state.kernel.decisions.at(-1);assert.equal(duplicate.effect.amount,profile.second.amount);assert.equal(duplicate.decision,'DEFER');assert.equal(duplicate.position.exposure,profile.first.amount);
  // The two illustrations explain different budget conditions, not identical math.
  assert.equal(profile.first.amount+profile.second.amount<=profile.limit,id==='report');
 }
});
