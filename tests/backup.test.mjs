import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {OperationStore} from '../src/server/operation-store.mjs';import {createBackup,inspectBackup,restoreDrill} from '../src/server/backup.mjs';
const request={operationId:'op',principal:'p',objectiveId:'o',proposedEffect:{id:'e',semanticKey:'key',provider:'fixture',type:'payment',amount:80,agent:'fixture'}};
function setup(){const dir=mkdtempSync(join(tmpdir(),'mew-backup-test-')),s=new OperationStore(join(dir,'source.sqlite'));s.transact(k=>k.createObjective({id:'o',principal:'p',semanticKey:'key',quantity:1,maxExposure:100}));s.reserveOperation(request);return {dir,s,path:join(dir,'backup.sqlite')};}
test('online backup preserves committed WAL reservation and UNKNOWN outbox during isolated restore',async()=>{
  const {dir,s,path}=setup();try{const worker=s.claimSimulation('op');s.finishSimulation('op',worker.token,{outcome:'UNKNOWN'});
    const manifest=await createBackup(s.db,path);assert.equal(manifest.positions[0].exposure,80);assert.equal(manifest.operations[0].status,'UNKNOWN');
    const result=await restoreDrill(path,{expectedDigest:manifest.sha256});assert.equal(result.isolatedRestoreVerified,true);assert.equal(result.positions[0].reserved,80);assert.equal(result.operations[0].status,'UNKNOWN');assert.equal(result.activationAllowed,false);assert.equal(result.retrySpendAllowed,false);assert.equal(result.releaseExposureAllowed,false);assert.equal(s.operation('op').status,'UNKNOWN');assert.throws(()=>s.claimSimulation('op'));assert.equal(s.reserveOperation(request).decision,'DEFER');
  }finally{s.close();rmSync(dir,{recursive:true,force:true});}
});
test('READY or interrupted backup cannot claim restore dispatch authorization; later changes do not rewrite backup',async()=>{
  const {dir,s,path}=setup();try{const manifest=await createBackup(s.db,path);s.claimSimulation('op');assert.equal(inspectBackup(path).operations[0].status,'READY');const restored=await restoreDrill(path,{expectedDigest:manifest.sha256});assert.equal(restored.dispatchAllowed,false);assert.equal(restored.reconciliationRequired,true);assert.equal(s.operation('op').status,'DISPATCHING');}finally{s.close();rmSync(dir,{recursive:true,force:true});}
});
test('existing backup never overwritten; corruption and untrusted digest rejected',async()=>{
  const {dir,s,path}=setup();try{const manifest=await createBackup(s.db,path),bytes=readFileSync(path);await assert.rejects(createBackup(s.db,path));assert.deepEqual(readFileSync(path),bytes);assert.throws(()=>inspectBackup(path,{expectedDigest:'a'.repeat(64)}));writeFileSync(path,'not SQLite');await assert.rejects(restoreDrill(path,{expectedDigest:manifest.sha256}));assert.throws(()=>inspectBackup(path));}finally{s.close();rmSync(dir,{recursive:true,force:true});}
});
