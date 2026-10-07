import {createHash} from 'node:crypto';
const tokens=text=>text.toLowerCase().match(/[a-z][a-z0-9]{2,}/g)??[];
const digest=text=>createHash('sha256').update(text).digest('hex');
export function fitRetrieval(documents){
 if(!documents.length||documents.some(d=>typeof d.id!=='string'||!d.id||typeof d.text!=='string'||!d.text.trim())||new Set(documents.map(d=>d.id)).size!==documents.length)throw Error('Invalid retrieval corpus');
 const frequency=new Map();for(const d of documents)for(const token of new Set(tokens(d.text)))frequency.set(token,(frequency.get(token)??0)+1);
 const idf=Object.fromEntries([...frequency].sort().map(([token,n])=>[token,Math.log((1+documents.length)/(1+n))+1]));
 return {schema:'mew.tfidf.v1',algorithm:'smoothed TF-IDF cosine',idf,documents:documents.map(d=>({id:d.id,sha256:digest(d.text),text:d.text,vector:vector(d.text,idf)})),languageModelTrained:false,paymentAuthority:false};
}
function vector(text,idf){const counts=Object.create(null);for(const token of tokens(text))if(Object.hasOwn(idf,token))counts[token]=(counts[token]??0)+1;let norm=0;for(const token of Object.keys(counts)){counts[token]=(1+Math.log(counts[token]))*idf[token];norm+=counts[token]**2;}if(norm)for(const token of Object.keys(counts))counts[token]/=Math.sqrt(norm);return counts;}
export function searchRetrieval(model,query,limit=3){
 if(model.schema!=='mew.tfidf.v1'||typeof query!=='string'||!Number.isSafeInteger(limit)||limit<1||limit>20)throw Error('Invalid retrieval request');
 const q=vector(query,model.idf);return model.documents.map(d=>({id:d.id,sha256:d.sha256,score:Object.entries(q).reduce((sum,[t,v])=>sum+v*(d.vector[t]??0),0)})).filter(d=>d.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,limit);
}
