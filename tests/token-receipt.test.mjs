import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyTokenReceipt } from '../src/adapters/token-receipt.mjs';
const txHash='a'.repeat(64),unit='1'.repeat(56)+'00',sellerAddress='addr_test1fixture';
const args={txHash,unit,sellerAddress,expectedAmount:'1000000',projectId:'fixture-key'};
const fetcher=(out='1000000',spent='0')=>async url=>({ok:true,status:200,json:async()=>url.endsWith('/utxos')?{hash:txHash,inputs:[{address:sellerAddress,amount:[{unit,quantity:spent}]}],outputs:[{address:sellerAddress,amount:[{unit,quantity:out}]}]}:url.endsWith('/blocks/latest')?{height:102}:{hash:txHash,block_height:100,valid_contract:true}});
test('receipt requires full expected seller net, not merely positive token value',async()=>{await assert.rejects(()=>verifyTokenReceipt({...args,fetchImpl:fetcher('100000')}),/Expected/);await assert.rejects(()=>verifyTokenReceipt({...args,fetchImpl:fetcher('1000000','900000')}),/Expected/);const r=await verifyTokenReceipt({...args,fetchImpl:fetcher()});assert.equal(r.netAtomicUnits,'1000000');assert.equal(r.verified,true);});
test('seller change cannot be counted as new collection',async()=>{await assert.rejects(()=>verifyTokenReceipt({...args,fetchImpl:fetcher('2000000','2000000')}),/Expected/);});
test('token identity, amount and confirmation depth are enforced',async()=>{await assert.rejects(()=>verifyTokenReceipt({...args,expectedAmount:'1.0',fetchImpl:fetcher()}));await assert.rejects(()=>verifyTokenReceipt({...args,unit:'USDM',fetchImpl:fetcher()}));await assert.rejects(()=>verifyTokenReceipt({...args,minConfirmations:4,fetchImpl:fetcher()}),/confirmations/);});
