import test from 'node:test';
import assert from 'node:assert/strict';
import {createPilotPlan,formatPilotPlan} from '../public/pilot-plan.js';
const input={workflow:'report',stage:'evaluation',goal:'Compare uncertain delivery recovery.',acceptance:'One sourced report reviewed against the agreed brief.',uncertainty:true};
test('pilot draft remains a proposal and identifies live model setup',()=>{const plan=createPilotPlan(input);assert.equal(plan.executionAuthorized,false);assert.equal(plan.proposal,true);assert.match(plan.blockers.join(' '),/separate model-usage budget/);assert.match(formatPilotPlan(plan),/No execution, payment or customer agreement is authorized/);});
test('preprod pilot cannot bypass payment setup via planning',()=>{const plan=createPilotPlan({...input,stage:'preprod'});assert.match(plan.blockers.join(' '),/asset-aware accounting/);assert.match(plan.blockers.join(' '),/payment execution remains disabled/);assert.equal(plan.executionAuthorized,false);});
test('planner rejects unsupported choices, missing acceptance and uncertain repeat policy',()=>{for(const change of [{stage:'mainnet'},{workflow:'__proto__'},{acceptance:' '},{goal:'x'.repeat(241)},{uncertainty:false}])assert.throws(()=>createPilotPlan({...input,...change}));});
