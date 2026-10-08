import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {liveReadiness} from '../src/company/live-readiness.mjs';
import {checkCardanoConnection} from '../src/adapters/cardano-connection.mjs';
// Capture CLI output privately; never forward identity payloads or credentials.
const account=spawnSync(process.execPath,[fileURLToPath(new URL('./tools.mjs',import.meta.url)),'sokosumi','--preprod','auth','whoami','--json'],{encoding:'utf8',timeout:15000,maxBuffer:65536});
const result=await liveReadiness({env:process.env,accountAuthenticated:account.status===0,
  readHostedHealth:async()=>{const r=await fetch('https://mew-demo-production.up.railway.app/api/health',{redirect:'error',signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('Hosted health unavailable');return r.json();},
  checkChain:()=>checkCardanoConnection()
});
console.log(JSON.stringify(result,null,2));process.exitCode=1;
