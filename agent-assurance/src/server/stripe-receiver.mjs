import { createServer } from 'node:http';
import { MAX_BODY } from '../adapters/stripe-webhook.mjs';

export function createStripeReceiver(inbox,secrets) {
  return createServer(async(req,res)=>{
    const reply=(status)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:status===200}));};
    if(req.headers.origin)return reply(403);
    if(!/^(127\.0\.0\.1|localhost)(:[0-9]+)?$/.test(req.headers.host??''))return reply(403);
    if(req.method!=='POST'||req.url!=='/stripe/webhook')return reply(404);
    if(req.headers['content-type']?.split(';')[0]!=='application/json')return reply(415);
    let size=0;const chunks=[];
    try {
      for await(const chunk of req){size+=chunk.length;if(size>MAX_BODY){reply(413);req.resume();return;}chunks.push(chunk);}
    }catch{return reply(400);}
    try{inbox.accept(Buffer.concat(chunks),req.headers['stripe-signature'],secrets);reply(200);}
    catch(error){reply(/Invalid|Conflicting/.test(error.message)?400:503);}
  });
}
