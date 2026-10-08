import {createHash} from 'node:crypto';
export const MASUMI_SPEC_PIN='5fccf58b0f30873085b59ee540c67b4ae8433cd0';
export const MASUMI_SPEC_SHA256='4e1372584ae025b9b83cecf5253a028bbe5bbd2018489ac66f735386f565e950';
export const MASUMI_SPEC_URL=`https://raw.githubusercontent.com/masumi-network/masumi-payment-service/${MASUMI_SPEC_PIN}/src/utils/generator/swagger-generator/openapi-docs.json`;
const hash=v=>createHash('sha256').update(v).digest('hex');
const readPost=new Set(['/payment/resolve-blockchain-identifier','/purchase/resolve-blockchain-identifier']);
const paymentWrite=new Set(['/payment/','/payment/submit-result','/payment/authorize-refund','/purchase/','/purchase/request-refund','/purchase/cancel-refund-request']);
function shape(schema){if(!schema)return null;return {sha256:hash(JSON.stringify(schema)),type:schema.type??null,required:schema.required??[],fields:Object.entries(schema.properties??{}).map(([name,v])=>({name,type:v.type??null,nullable:v.nullable===true,...(v.enum?{enum:v.enum}:{})}))};}
/** Parse ONLY the reviewed raw byte digest. No requests, credentials or payment calls. */
export function inspectMasumiContract(raw,{sourceUrl=MASUMI_SPEC_URL}={}){
  if(sourceUrl!==MASUMI_SPEC_URL)throw new Error('Unreviewed Masumi source pin');
  if(typeof raw!=='string'&&!Buffer.isBuffer(raw))throw new Error('Raw specification bytes required');
  const bytes=Buffer.from(raw);if(bytes.length>1000000||hash(bytes)!==MASUMI_SPEC_SHA256)throw new Error('Masumi specification digest mismatch');
  const spec=JSON.parse(bytes.toString('utf8'));
  if(spec.openapi!=='3.0.0'||spec.info?.title!=='Masumi Payment Service API'||spec.servers?.length!==1||spec.servers[0].url!=='./../api/v1/')throw new Error('Unexpected Masumi schema');
  const auth=spec.components?.securitySchemes?.['API-Key'];
  if(auth?.type!=='apiKey'||auth.in!=='header'||auth.name!=='token')throw new Error('Unexpected Masumi authentication');
  const operations=[];
  for(const [path,methods]of Object.entries(spec.paths))for(const[method,op]of Object.entries(methods)){
    if(!['get','post','put','patch','delete'].includes(method))continue;
    const security=op.security??spec.security??[];
    const publicHealth=method==='get'&&path==='/health/';
    if(!publicHealth&&JSON.stringify(security)!=='[{"API-Key":[]}]')throw new Error('Unexpected operation security');
    const category=method==='get'||readPost.has(path)?'read':paymentWrite.has(path)?'payment-write':'administrative-write';
    operations.push({method:method.toUpperCase(),path,category,authentication:publicHealth?'public':'token-header',paymentAuthority:false,parameters:(op.parameters??[]).map(p=>({name:p.name,in:p.in,required:p.required===true,schema:shape(p.schema)})),request:shape(op.requestBody?.content?.['application/json']?.schema),responses:Object.fromEntries(Object.entries(op.responses??{}).map(([status,r])=>[status,shape(r.content?.['application/json']?.schema)]))});
  }
  return {schema:'mew.masumi-contract-evidence.v1',sourceUrl,pin:MASUMI_SPEC_PIN,rawSha256:MASUMI_SPEC_SHA256,sourceBytes:bytes.length,openapi:spec.openapi,publishedApiVersion:spec.info.version,serverPath:spec.servers[0].url,authentication:{type:auth.type,in:auth.in,name:auth.name},liveVerified:false,paymentsEnabled:false,operations};
}
/** Return an offline description only; even known write operations grant no authority. */
export function describeMasumiOperation(manifest,method,path){
  if(manifest?.schema!=='mew.masumi-contract-evidence.v1'||manifest.pin!==MASUMI_SPEC_PIN||manifest.rawSha256!==MASUMI_SPEC_SHA256||manifest.sourceUrl!==MASUMI_SPEC_URL||manifest.paymentsEnabled!==false)throw new Error('Unreviewed contract manifest');
  if(hash(JSON.stringify(manifest))!=='28ba0fe7935be043ef223e9bb7f6728c1d0194eb256c8961ceb4842df440758f')throw new Error('Contract manifest integrity mismatch');
  const operation=manifest.operations?.find(o=>o.method===method&&o.path===path);
  if(!operation||operation.paymentAuthority!==false)throw new Error('Unknown or unsafe operation');
  return structuredClone(operation);
}
