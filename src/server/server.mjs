import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, sep } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { Store } from './store.mjs';
import { verifyCardanoSettlement } from '../adapters/cardano.mjs';

export const demoObjective = {id:'mission-report',principal:'demo-founder',description:'Buy exactly one verified market report',semanticKey:'report-v1',quantity:1,maxExposure:1000000};
const root = fileURLToPath(new URL('../../',import.meta.url));
const tokenEqual=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length && timingSafeEqual(x,y);};

export function makeServer({dbPath=process.env.MEW_DB_PATH || resolve(root,'data/mew.sqlite'),demo=process.env.MEW_DEMO_MODE!=='false',token=process.env.MEW_API_TOKEN || '',verify=verifyCardanoSettlement}={}) {
  if(!demo && token.length<32) throw new Error('Live mode requires MEW_API_TOKEN with at least 32 characters');
  const store=new Store(dbPath);
  if(demo && !store.read().snapshot().objectives.length) store.transact(k=>k.createObjective(demoObjective));
  const state=()=>{const k=store.read();const s=k.snapshot();return {...s,positions:s.objectives.map(o=>k.position(o.id)),mode:demo?'demo':'live',persistence:'sqlite'};};
  const server=createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'");
    const json=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
    try {
      const url=new URL(req.url,'http://localhost');
      if(url.pathname==='/api/health' && req.method==='GET') return json(200,{ok:true,mode:demo?'demo':'live',persistence:'sqlite',paymentsEnabled:false});
      if(url.pathname.startsWith('/api/')) {
        if(!demo && !tokenEqual(req.headers.authorization || '',`Bearer ${token}`)) return json(401,{error:'A valid Bearer token is required'});
        if(req.method==='GET' && url.pathname==='/api/state') return json(200,state());
        if(req.method!=='POST') return json(405,{error:'Method not allowed'});
        // A web page on another origin cannot mutate this local service.
        if(req.headers.origin && new URL(req.headers.origin).host!==req.headers.host) return json(403,{error:'Cross-origin mutation rejected'});
        if(!(req.headers['content-type'] || '').startsWith('application/json')) return json(415,{error:'Use application/json'});
        let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>65536) return json(413,{error:'Payload too large'});}
        const body=JSON.parse(raw || '{}');
        if(url.pathname==='/api/demo/reset') {
          if(!demo) return json(403,{error:'Demo reset is disabled in live mode'});
          store.reset({...demoObjective,maxExposure:body.maxExposure ?? demoObjective.maxExposure});return json(200,state());
        }
        if(url.pathname==='/api/objectives') return json(201,store.transact(k=>k.createObjective(body)));
        if(url.pathname==='/api/evaluate') return json(200,store.transact(k=>k.evaluate(body)));
        if(url.pathname==='/api/simulate') return json(200,store.read().simulate(body));
        if(url.pathname==='/api/observe') {
          if(!demo) return json(403,{error:'Arbitrary claims are disabled. Use a verified adapter.'});
          const claim={...body,evidence:{verified:true,simulated:true}};
          return json(200,store.transact(k=>k.observe(claim)));
        }
        if(url.pathname==='/api/cardano/verify') {
          if(demo) return json(403,{error:'Start in live mode for verified Cardano observations'});
          const effect=store.read().snapshot().effects.find(e=>e.id===body.effectId);
          if(!effect) return json(404,{error:'Unknown reserved effect'});
          const claim=await verify({txHash:body.txHash,effect});
          return json(200,store.transact(k=>{
            if(k.snapshot().claims.some(c=>c.evidence?.txHash?.toLowerCase()===body.txHash.toLowerCase() && c.effectId!==body.effectId)) throw new Error('Transaction already attributed to a different effect');
            return k.observe(claim);
          }));
        }
        return json(404,{error:'Unknown endpoint'});
      }
      if(req.method!=='GET' && req.method!=='HEAD') return json(405,{error:'Method not allowed'});
      const requested=decodeURIComponent(url.pathname);
      const base=requested.startsWith('/core/')?resolve(root,'src/core'):resolve(root,'public');
      const name=requested.startsWith('/core/')?requested.slice(6):requested==='/'?'index.html':requested.slice(1);
      const path=resolve(base,name);
      if(!path.startsWith(base+sep)) return json(403,{error:'Forbidden'});
      const bytes=readFileSync(path);
      const ext=path.split('.').at(-1);
      const mime={html:'text/html',css:'text/css',js:'text/javascript',mjs:'text/javascript',svg:'image/svg+xml',json:'application/json'}[ext] || 'application/octet-stream';
      res.writeHead(200,{'Content-Type':`${mime}; charset=utf-8`});res.end(req.method==='HEAD'?undefined:bytes);
    } catch(error) {
      if(error.code==='ENOENT') return json(404,{error:'Not found'});
      json(400,{error:error.message});
    }
  });
  server.on('close',()=>store.close());
  return server;
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const host=process.env.HOST || '127.0.0.1',port=Number(process.env.PORT || 3000);
  makeServer().listen(port,host,()=>console.log(`MEW running at http://${host}:${port} (${process.env.MEW_DEMO_MODE==='false'?'live evidence':'simulated demo'})`));
}
