import {openSync,closeSync,readFileSync,fstatSync,constants,lstatSync} from 'node:fs';
import {isAbsolute,dirname} from 'node:path';
import {createPublicKey} from 'node:crypto';
import {OperationStore} from './operation-store.mjs';
import {OperatorService} from './operator-service.mjs';
import {makeOperatorServer} from './operator-http.mjs';

const exact=(v,fields)=>{if(!v||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).sort().join(',')!==[...fields].sort().join(','))throw Error('Invalid private configuration');};
function privateFile(path){
 if(!isAbsolute(path))throw Error('Absolute private path required');
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{const stat=fstatSync(fd);if(!stat.isFile()||(stat.mode&0o077)!==0||stat.size>65536||stat.uid!==process.getuid())throw Error('Private owned file required');return readFileSync(fd,'utf8');}finally{closeSync(fd);}
}
export function loadOperatorConfiguration(path){
 try{
  const config=JSON.parse(privateFile(path));exact(config,['version','policy','providerKeys']);
  if(config.version!==1||!Array.isArray(config.policy)||!Array.isArray(config.providerKeys)||config.providerKeys.length>100)throw Error('Invalid private configuration');
  const providerKeys=config.providerKeys.map(k=>{exact(k,['provider','keyId','publicKeyPem','notBeforeMs','expiresAtMs','revoked']);if(typeof k.publicKeyPem!=='string'||k.publicKeyPem.length>4096||!k.publicKeyPem.startsWith('-----BEGIN PUBLIC KEY-----'))throw Error('Public key required');const {publicKeyPem,...fields}=k;return {...fields,publicKey:createPublicKey(publicKeyPem)};});
  // Validate all policy and key rules before opening a database or listener.
  new OperatorService({store:{mode:'live'},policy:config.policy,providerKeys});
  return {policy:config.policy,providerKeys};
 }catch{throw Error('Private operator configuration rejected');}
}
export async function startOperatorHost({configPath,dbPath,port=3040}={}){
 if(!Number.isSafeInteger(port)||port<0||port>65535)throw Error('Invalid private port');
 const config=loadOperatorConfiguration(configPath);
 // Require a separately provisioned ledger, not a new or public demo database.
 if(!isAbsolute(dbPath))throw Error('Absolute private database path required');
 const dir=lstatSync(dirname(dbPath)),file=lstatSync(dbPath);
 if(!dir.isDirectory()||dir.isSymbolicLink()||(dir.mode&0o077)!==0||dir.uid!==process.getuid()||!file.isFile()||file.isSymbolicLink()||(file.mode&0o077)!==0||file.uid!==process.getuid())throw Error('Private owned database and directory required');
 const store=new OperationStore(dbPath,{mode:'live'});
 let server;
 try{
  if(!store.read().snapshot().objectives.length)throw Error('Provisioned objectives required');
  const service=new OperatorService({store,...config});server=makeOperatorServer({service});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{server.removeListener('error',reject);resolve();});});
  let closing;
  return {port:server.address().port,close(){return closing??=new Promise(resolve=>{server.close(()=>{store.close();resolve();});server.closeAllConnections();});}};
 }catch(error){server?.close();store.close();throw error;}
}
