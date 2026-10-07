import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const origin='https://mew-demo-production.up.railway.app';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const checks=[];
for(const path of ['/api/health','/index.html','/home.html','/home.js','/home.css','/studio.html','/studio.js','/studio.css','/formation.js','/assets/mew-formation.png','/company.html','/company.js','/company.css','/campaign.html','/campaign.js','/research.html','/research.js','/research-snapshot.json','/design-studio.html','/design-studio.js','/design-studio.css','/site-shell.js','/site-shell.css']){
 try{
  const response=await fetch(origin+path,{redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error(`HTTP ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>3145728)throw Error('Oversized response');
  if(path==='/api/health'){
   const health=JSON.parse(bytes);if(health.ok!==true||health.mode!=='demo'||health.paymentsEnabled!==false||health.persistence!=='sqlite')throw Error('Unexpected health boundary');
  }else{
   const local=await readFile(`public${path}`);if(digest(local)!==digest(bytes))throw Error('Hosted asset differs from checkout');
  }
  checks.push({path,status:'verified'});
 }catch(error){checks.push({path,status:'failed',reason:error.message});}
}
console.log(JSON.stringify({origin,checks,limitations:'Read-only HTTP and asset checks; no claim of wallet execution, model inference or persistence after redeploy.'},null,2));
if(checks.some(c=>c.status!=='verified'))process.exitCode=1;
