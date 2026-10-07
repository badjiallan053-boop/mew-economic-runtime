import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const origin='https://mew-demo-production.up.railway.app';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const checks=[];
for(const path of ['/api/health','/index.html','/home.html','/home.js','/journey.js','/motion.js','/motion.css','/journey.css','/mandate-art.js','/mandate-art.css','/home.css','/studio.html','/studio.js','/studio.css','/formation.js','/protocol.html','/protocol.css','/protocol.js','/pilot.html','/pilot.css','/pilot.js','/pilot-plan.js','/assets/mew-formation.png','/company.html','/company.js','/company.css','/campaign.html','/campaign.js','/research.html','/research.js','/research-snapshot.json','/design-studio.html','/design-studio.js','/design-studio.css','/site-shell.js','/site-shell.css','/core/mew.mjs','/knowledge.html','/knowledge.css','/education-snapshot.json','/robots.txt','/sitemap.xml','/assets/mew-social.png','/assets/fonts/instrument.css',...Array.from({length:6},(_,i)=>`/assets/fonts/instrument-${i}.ttf`)]){
 try{
  const response=await fetch(origin+path,{redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error(`HTTP ${response.status}`);
  if(response.headers.get('x-content-type-options')!=='nosniff'||response.headers.get('referrer-policy')!=='strict-origin-when-cross-origin'||!response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"))throw Error('Security headers missing');
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>3145728)throw Error('Oversized response');
  if(path==='/api/health'){
   const health=JSON.parse(bytes);if(health.ok!==true||health.mode!=='demo'||health.paymentsEnabled!==false||health.persistence!=='sqlite')throw Error('Unexpected health boundary');
  }else{
   const local=await readFile(path.startsWith('/core/')?`src${path}`:`public${path}`);if(digest(local)!==digest(bytes))throw Error('Hosted asset differs from checkout');
   if(path==='/robots.txt'&&!response.headers.get('content-type')?.startsWith('text/plain'))throw Error('robots MIME mismatch');
   if(path==='/sitemap.xml'&&!response.headers.get('content-type')?.startsWith('application/xml'))throw Error('sitemap MIME mismatch');
   if(path==='/studio.html'&&response.headers.get('x-robots-tag')!=='noindex')throw Error('Workspace indexing boundary missing');
  }
  checks.push({path,status:'verified'});
 }catch(error){checks.push({path,status:'failed',reason:error.message});}
}
console.log(JSON.stringify({origin,checks,limitations:'Read-only HTTP and asset checks; no claim of wallet execution, model inference or persistence after redeploy.'},null,2));
if(checks.some(c=>c.status!=='verified'))process.exitCode=1;
