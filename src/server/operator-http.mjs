import {createServer} from 'node:http';

// Separate private interface. Never mount on the public simulation server.
export function makeOperatorServer({service,maxBodyBytes=262144,requestLimit=60,clock=Date.now}={}) {
  if(!service||!['read','reserve','acceptDelivery'].every(k=>typeof service[k]==='function')||
    !Number.isSafeInteger(maxBodyBytes)||maxBodyBytes<1||maxBodyBytes>1048576||
    !Number.isSafeInteger(requestLimit)||requestLimit<1||typeof clock!=='function')throw Error('Invalid operator host configuration');
  let windowStart=clock(),requests=0;
  const server=createServer(async(req,res)=>{
    const reply=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"});res.end(JSON.stringify(body));};
    try {
      const now=clock();if(!Number.isSafeInteger(now)||now<0)return reply(503,{error:'Service unavailable'});
      if(now-windowStart>=60000){windowStart=now;requests=0;}
      if(++requests>requestLimit){res.setHeader('Retry-After','60');return reply(429,{error:'Request quota exceeded'});}
      // No browser origins or CORS support on the machine-to-machine interface.
      if(req.headers.origin!==undefined)return reply(403,{error:'Browser access denied'});
      const authorization=req.headers.authorization;
      if(typeof authorization!=='string'||!/^Bearer [^\s]{32,1024}$/.test(authorization))return reply(401,{error:'Authorization required'});
      const token=authorization.slice(7),url=new URL(req.url,'http://localhost');
      if(req.method==='GET'&&url.pathname==='/operator/position'){
        if([...url.searchParams.keys()].length!==1||!url.searchParams.has('objectiveId'))return reply(400,{error:'Invalid request'});
        return reply(200,service.read(token,url.searchParams.get('objectiveId')));
      }
      if(req.method!=='POST'||!['/operator/reserve','/operator/delivery'].includes(url.pathname)||url.search)return reply(404,{error:'Route unavailable'});
      if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type']||''))return reply(415,{error:'JSON required'});
      if(req.headers['content-encoding'])return reply(415,{error:'Encoded bodies unsupported'});
      const chunks=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>maxBodyBytes)return reply(413,{error:'Request too large'});chunks.push(chunk);}
      let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return reply(400,{error:'Invalid JSON'});}
      if(url.pathname==='/operator/reserve')return reply(200,service.reserve(token,body));
      if(!body||Object.getPrototypeOf(body)!==Object.prototype||Object.keys(body).sort().join(',')!=='artifactBase64,effectId,envelope'||typeof body.artifactBase64!=='string'||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(body.artifactBase64))return reply(400,{error:'Invalid delivery request'});
      const artifactBytes=Buffer.from(body.artifactBase64,'base64');
      if(artifactBytes.toString('base64')!==body.artifactBase64)return reply(400,{error:'Invalid delivery request'});
      return reply(200,service.acceptDelivery(token,{effectId:body.effectId,envelope:body.envelope,artifactBytes}));
    }catch{return reply(403,{error:'Request rejected'});}
  });
  server.requestTimeout=10000;server.headersTimeout=5000;server.keepAliveTimeout=1000;server.maxHeadersCount=32;
  return server;
}
