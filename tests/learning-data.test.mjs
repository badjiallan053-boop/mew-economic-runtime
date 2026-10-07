import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLearning,contextAt,balancedContext,prepareSupervisedExport,describeLearning} from '../src/learning/dataset.mjs';
const observed='2026-10-07T13:00:00.000Z',hash='a'.repeat(64),block='b'.repeat(64);
const source={id:'transactions:mainnet',kind:'transaction',network:'mainnet',hashes:[hash],blocks:[block],url:'https://api.koios.rest/api/v1/tx_info'};
const transaction={tx_hash:hash,block_hash:block,block_height:1,tx_timestamp:1791360000,fee:'99999999999999999999',total_output:'999999999999999999999'};
test('transaction metadata preserves exact integer amounts and never asserts merchant receipt',()=>{
 const [r]=normalizeLearning(source,[transaction],observed);assert.equal(r.feeLovelace,transaction.fee);assert.equal(r.paymentAttribution,'UNKNOWN');assert.equal(r.validContract,null);assert.equal(r.merchantReceiptVerified,false);assert.equal(r.trainingEligible,false);
 assert.throws(()=>normalizeLearning(source,[{...transaction,fee:123}],observed));assert.throws(()=>normalizeLearning(source,[{...transaction,fee:'-1'}],observed));
});
test('transaction and block identity substitutions fail closed',()=>{
 assert.throws(()=>normalizeLearning(source,[{...transaction,tx_hash:'c'.repeat(64)}],observed));assert.throws(()=>normalizeLearning(source,[{...transaction,block_hash:'c'.repeat(64)}],observed));
});
test('historical events fetched later cannot leak into an earlier prediction',()=>{
 const row={id:'r',eventAt:'2026-09-01T00:00:00Z',availableAt:observed,source:'https://example.org'};
 assert.equal(contextAt([row],'2026-09-02').length,0);assert.equal(contextAt([row],observed).length,1);
});
test('bounded context preserves mixed sources instead of dropping chain evidence behind attention rows',()=>{
 const rows=[...Array.from({length:112},(_,i)=>({id:`attention-${i}`,source:'https://example.org/attention',eventAt:observed,availableAt:observed})),{id:'chain',source:'https://example.org/chain',eventAt:observed,availableAt:observed}];
 const selected=balancedContext(rows,observed,60);assert.equal(selected.evidence.length,60);assert.ok(selected.evidence.some(e=>e.id==='chain'));assert.equal(selected.omittedRecords,53);assert.throws(()=>balancedContext(rows,observed,101));
});
const example=(id,split)=>({groupId:id,reviewStatus:'approved',reuseApproved:true,reviewerId:'test-reviewer',input:`Question ${id}`,output:'Reviewed answer',split,asOf:observed,evidence:[{id,source:'https://example.org',eventAt:'2026-09-01',availableAt:'2026-10-01'}]});
test('unreviewed data cannot become a fine-tuning export',()=>{
 assert.throws(()=>prepareSupervisedExport([{...example('a','train'),reuseApproved:false}]));assert.throws(()=>prepareSupervisedExport([{...example('a','train'),reviewStatus:'pending'}]));assert.equal(prepareSupervisedExport([]).readyForReview,false);
});
test('human-reviewed export rejects future features and group leakage',()=>{
 assert.throws(()=>prepareSupervisedExport([{...example('a','train'),evidence:[{eventAt:'2026-09-01',availableAt:'2026-10-08'}]}]));
 assert.throws(()=>prepareSupervisedExport([example('a','train'),{...example('b','test'),groupId:'a'}]));
 assert.throws(()=>prepareSupervisedExport([example('a','train'),{...example('b','test'),input:'Question a'}]));
});
test('split integrity does not authorize model training, and evidence accompanies prompts',()=>{
 const r=prepareSupervisedExport([example('a','train'),example('b','validation'),example('c','test')]);assert.equal(r.readyForReview,true);assert.equal(r.fineTuningReady,false);assert.equal(r.trainingAuthorized,false);assert.ok(r.splits.train[0].messages[1].content.includes('evidence'));
});
test('mainnet and preprod fees remain separate and exact above safe integer range',()=>{
 const [row]=normalizeLearning(source,[transaction],observed);const analysis=describeLearning([row]);assert.equal(analysis.paymentContext[0].feeLovelaceSum,transaction.fee);assert.equal(analysis.paymentContext[1].sampledTransactions,0);assert.equal(analysis.correlationEstimated,false);
});
test('pageview records reject schema drift, impossible dates and open or future days',()=>{
 const source={id:'attention',kind:'attention',entity:'Cardano',start:'2026090100',end:'2026100700',url:'https://wikimedia.org'};
 const row={project:'en.wikipedia',access:'all-access',agent:'user',granularity:'daily',article:'Cardano',timestamp:'2026090100',views:5};
 assert.equal(normalizeLearning(source,{items:[row]},observed).length,1);
 assert.throws(()=>normalizeLearning(source,{items:[{...row,agent:'all-agents'}]},observed));assert.throws(()=>normalizeLearning(source,{items:[{...row,timestamp:'2026100700'}]},observed));assert.throws(()=>normalizeLearning(source,{items:[{...row,timestamp:'2026093100'}]},observed));
});

test('duplicate detail rows cannot hide a missing requested transaction',()=>{
 const second='c'.repeat(64);assert.throws(()=>normalizeLearning({...source,hashes:[hash,second]},[transaction,transaction],observed),/duplicate/);
});
test('supervised export requires bounded evidence with source provenance',()=>{
 assert.throws(()=>prepareSupervisedExport([{...example('a','train'),evidence:[{eventAt:'2026-09-01',availableAt:'2026-10-01'}]}]),/provenance/);
 assert.throws(()=>prepareSupervisedExport([{...example('a','train'),evidence:Array(101).fill(example('a','train').evidence[0])}]),/size/);
});
