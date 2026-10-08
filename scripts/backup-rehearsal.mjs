import {mkdtempSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {OperationStore} from '../src/server/operation-store.mjs';
import {createBackup,restoreDrill} from '../src/server/backup.mjs';
const dir=mkdtempSync(join(tmpdir(),'mew-backup-rehearsal-'));let store;
try{
  store=new OperationStore(join(dir,'synthetic.sqlite'));
  store.transact(k=>k.createObjective({id:'fixture',principal:'synthetic',semanticKey:'one-report',quantity:1,maxExposure:1000000}));
  store.reserveOperation({operationId:'fixture-op',principal:'synthetic',objectiveId:'fixture',proposedEffect:{id:'fixture-effect',semanticKey:'one-report',provider:'fixture',type:'payment',amount:800000,agent:'fixture'}});
  const worker=store.claimSimulation('fixture-op');store.finishSimulation('fixture-op',worker.token,{outcome:'UNKNOWN'});
  const path=join(dir,'backup.sqlite'),manifest=await createBackup(store.db,path);
  const restored=await restoreDrill(path,{expectedDigest:manifest.sha256});
  console.log(JSON.stringify({mode:'synthetic-offline',backup:manifest,restore:restored},null,2));
}finally{store?.close();rmSync(dir,{recursive:true,force:true});}
