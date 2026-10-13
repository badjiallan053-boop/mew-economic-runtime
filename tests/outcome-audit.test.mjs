import test from "node:test";
import assert from "node:assert/strict";
import {MEW} from "../src/core/mew.mjs";
import {analyzeOutcomeSnapshot} from "../src/core/outcome-audit.mjs";

const obj = (id,key) => ({id,principal:"alice",semanticKey:key,quantity:1,maxExposure:100});
const effect = (objectiveId,id,key,amount) => ({
  objectiveId, proposedEffect:{id,semanticKey:key,provider:"provider-" + id,
    type:"payment",amount,agent:"agent-" + id}
});

test("current core allows two individually valid objectives to exceed a shared cap", () => {
  const m = new MEW();
  m.createObjective(obj("research","report:v1"));
  m.createObjective(obj("alternate","report:v2"));
  assert.equal(m.evaluate(effect("research","a","report:v1",55)).decision,"ALLOW");
  assert.equal(m.evaluate(effect("alternate","b","report:v2",49)).decision,"ALLOW");
  const before = m.snapshot();
  const report = analyzeOutcomeSnapshot(before,{principal:"alice",maxAggregateExposure:100});
  assert.equal(report.aggregateExposure,104);
  assert.ok(report.findings.some(f=>f.code==="AGGREGATE_MANDATE_OVEREXPOSED"));
  assert.deepEqual(m.snapshot(),before,"audit must never mutate decisions");
});

test("human-attested equivalent objectives with different semantic keys are flagged", () => {
  const m = new MEW();
  m.createObjective(obj("a","report:v1"));
  m.createObjective(obj("b","alternate-report-key"));
  const report = analyzeOutcomeSnapshot(m.snapshot(), {
    principal:"alice",
    equivalenceByObjective:{a:"one report for Q3",b:"one report for Q3"}
  });
  assert.ok(report.findings.some(f=>f.code==="POTENTIALLY_DUPLICATE_OBJECTIVES"));
});

test("same delivery receipt claimed by two distinct effects is flagged as suspicious", () => {
  const snap = {objectives:[obj("a","report:v1")],
    effects:[{id:"one",objectiveId:"a",status:"settled",amount:20},
             {id:"two",objectiveId:"a",status:"settled",amount:20}],
    claims:[{effectId:"one",type:"delivery.verified",evidence:{receiptId:"r-7"}},
            {effectId:"two",type:"delivery.verified",evidence:{receiptId:"r-7"}}]};
  const report = analyzeOutcomeSnapshot(snap,{principal:"alice"});
  assert.ok(report.findings.some(f=>f.code==="DELIVERY_EVIDENCE_REUSED"));
});

test("principal isolation, aggregate accounting and invalid inputs", () => {
  const snap = {objectives:[obj("a","a"),{...obj("b","b"),principal:"bob"}],
    effects:[{id:"x",objectiveId:"a",status:"reserved",amount:10},
             {id:"y",objectiveId:"b",status:"settled",amount:90}],
    claims:[]};
  const report = analyzeOutcomeSnapshot(snap,{principal:"alice",maxAggregateExposure:10});
  assert.equal(report.aggregateExposure,10);
  assert.equal(report.status,"DIAGNOSTIC_ONLY");
  assert.throws(()=>analyzeOutcomeSnapshot(snap,{principal:"alice",maxAggregateExposure:-1}),TypeError);
  assert.throws(()=>analyzeOutcomeSnapshot(snap,{}),TypeError);
});
