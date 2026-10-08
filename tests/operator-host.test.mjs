import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,chmodSync,symlinkSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {OperationStore} from '../src/server/operation-store.mjs';
import {operatorTokenDigest} from '../src/server/operator-service.mjs';
import {loadOperatorConfiguration,startOperatorHost} from '../src/server/operator-host.mjs';
const token='synthetic-local-host-'.repeat(4);
function fixture(mode='live'){
 const dir=mkdtempSync(join(tmpdir(),'mew-private-host-'));chmodSync(dir,0o700);
 const dbPath=join(dir,'economic.sqlite'),configPath=join(dir,'operator.json');
 const store=new OperationStore(dbPath,{mode});store.transact(k=>k.createObjective({id:'fixture',principal:'owner',semanticKey:'fixture',quantity:1,maxExposure:100}));store.close();chmodSync(dbPath,0o600);
 const config={version:1,policy:[{principal:'owner',tokenDigest:operatorTokenDigest(token),expiresAtMs:Date.now()+60000,revoked:false,actions:['read']}],providerKeys:[]};
 writeFileSync(configPath,JSON.stringify(config),{mode:0o600});return {dir,dbPath,configPath,config};
}
test('private host boots existing live ledger on loopback and closes idempotently',async()=>{
 const f=fixture();let host;try{host=await startOperatorHost({...f,port:0});const response=await fetch(`http://127.0.0.1:${host.port}/operator/position?objectiveId=fixture`,{headers:{authorization:`Bearer ${token}`}});assert.equal(response.status,200);assert.equal((await response.json()).exposure,0);await Promise.all([host.close(),host.close()]);}finally{await host?.close();rmSync(f.dir,{recursive:true,force:true});}
});
test('config rejects loose permissions, symbolic links, secrets-as-keys and unknown fields',()=>{
 const f=fixture();try{chmodSync(f.configPath,0o644);assert.throws(()=>loadOperatorConfiguration(f.configPath),/configuration rejected/);chmodSync(f.configPath,0o600);const link=join(f.dir,'link.json');symlinkSync(f.configPath,link);assert.throws(()=>loadOperatorConfiguration(link));writeFileSync(f.configPath,JSON.stringify({...f.config,token}));assert.throws(()=>loadOperatorConfiguration(f.configPath));writeFileSync(f.configPath,JSON.stringify({...f.config,providerKeys:[{provider:'v',keyId:'k',publicKeyPem:'-----BEGIN PRIVATE KEY-----',notBeforeMs:0,expiresAtMs:1000,revoked:false}]}));assert.throws(()=>loadOperatorConfiguration(f.configPath));}finally{rmSync(f.dir,{recursive:true,force:true});}
});
test('demo ledger and insecure private directory cannot start an operator host',async()=>{
 for(const mode of ['demo','live']){const f=fixture(mode);try{if(mode==='live')chmodSync(f.dir,0o755);await assert.rejects(startOperatorHost({...f,port:0}));const store=new OperationStore(f.dbPath,{mode});assert.equal(store.read().position('fixture').exposure,0);store.close();}finally{rmSync(f.dir,{recursive:true,force:true});}}
});
