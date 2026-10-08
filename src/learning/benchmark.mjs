import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
export function verifyFrozenBenchmark(raw,manifest){
 if(sha(raw)!==manifest.sha256)throw Error('Frozen benchmark changed');
 const b=JSON.parse(raw);if(b.schema!=='mew.frozen-benchmark.v1'||sha(JSON.stringify(b.sources))!==b.sourceSnapshotDigest||b.sourceSnapshotDigest!==manifest.sourceSnapshotDigest)throw Error('Frozen source snapshot changed');
 const sources=new Map();for(const s of b.sources){if(sources.has(s.id)||sha(s.text)!==s.sha256)throw Error('Frozen source changed');sources.set(s.id,s);}
 const ids=new Set();for(const c of b.cases){if(ids.has(c.id)||c.trainingEligible!==false||!['en','fr'].includes(c.language)||!c.supportingEvidenceSpans.length)throw Error('Invalid frozen case');ids.add(c.id);for(const span of c.supportingEvidenceSpans){const s=sources.get(span.sourceId);if(!s||s.sha256!==span.sourceSha256||!Number.isSafeInteger(span.start)||!Number.isSafeInteger(span.end)||span.start<0||span.end<=span.start||span.end>s.text.length||s.text.slice(span.start,span.end)!==span.quote)throw Error('Frozen evidence span changed');}}
 return b;
}
