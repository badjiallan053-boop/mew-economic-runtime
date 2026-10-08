import test from 'node:test';
import assert from 'node:assert/strict';
import {OperationStore} from '../src/server/operation-store.mjs';
import {OperatorService,operatorTokenDigest} from '../src/server/operator-service.mjs';
import {makeOperatorServer} from '../src/server/operator-http.mjs';
const token='synthetic-http-token-'.repeat(4);
async function fixture(fn,options={}){
 const store=new OperationStore(':memory:',{mode:'live'});
 store.transact(k=>{for(const principal of ['owner','other'])k.createObjective({id:principal,principal,semanticKey:principal,quantity:1,maxExposure:100});});
 const policy=[{principal:'owner',tokenDigest:operatorTokenDigest(token),expiresAtMs:3000,revoked:false,actions:['read','reserve']}];
 const service=new OperatorService({store,policy,providerKeys:[],clock:()=>1500});
 const server=makeOperatorServer({service,...options});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const request=(path,body,headers={})=>fetch(`http://127.0.0.1:${server.address().port}${path}`,{method:body===undefined?'GET':'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});
 try{await fn({store,request,service,policy});}finally{server.closeAllConnections();await new Promise(r=>server.close(r));store.close();}
}
const proposal={operationId:'op',objectiveId:'owner',proposedEffect:{id:'effect',semanticKey:'owner',provider:'vendor',type:'payment',amount:80}};
test('private HTTP reservation derives ownership and replay retains one reservation',()=>fixture(async({store,request})=>{
 assert.equal((await request('/operator/reserve',proposal)).status,200);
 assert.equal((await request('/operator/reserve',proposal)).status,200);
 assert.equal(store.read().position('owner').exposure,80);
 assert.equal((await request('/operator/position?objectiveId=other')).status,403);
 assert.equal((await request('/operator/position?objectiveId=missing')).status,403);
}));
test('browser origin, impersonation, large body and wrong token never reserve',()=>fixture(async({store,request})=>{
 assert.equal((await request('/operator/reserve',proposal,{origin:'https://evil.example'})).status,403);
 assert.equal((await request('/operator/reserve',{...proposal,principal:'other'})).status,403);
 assert.equal((await request('/operator/reserve',proposal,{authorization:'Bearer invalid'})).status,401);
 assert.equal((await request('/operator/reserve',{padding:'x'.repeat(1000)})).status,413);
 assert.equal(store.read().position('owner').exposure,0);
},{maxBodyBytes:512}));
test('bounded shared quota rejects excess requests without exposing private state',()=>fixture(async({request})=>{
 assert.equal((await request('/operator/position?objectiveId=owner')).status,200);
 assert.equal((await request('/operator/position?objectiveId=owner')).status,429);
},{requestLimit:1}));
test('trusted config copies and private fields resist caller mutation',()=>fixture(async({service,policy,request})=>{
 policy[0].principal='other';policy[0].actions.push('dispatch');
 service.policy=[{principal:'other'}];service.store=null;
 assert.equal((await request('/operator/position?objectiveId=owner')).status,200);
 assert.equal((await request('/operator/position?objectiveId=other')).status,403);
}));

test('noncanonical artifact bytes and compressed payloads reject before service acceptance',()=>fixture(async({request,store})=>{assert.equal((await request('/operator/delivery',{effectId:'effect',envelope:{},artifactBase64:'Zh=='})).status,400);assert.equal((await request('/operator/reserve',proposal,{'content-encoding':'gzip'})).status,415);assert.equal(store.read().position('owner').exposure,0);}));
