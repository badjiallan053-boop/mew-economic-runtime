import {createHash} from 'node:crypto';
const hash = text => createHash('sha256').update(text).digest('hex');
// Takes source text and ranked hits only. Gold labels and benchmark cases are not inputs.
export function selectParentContexts(sources, rankings, {maxParents = 3, maxChars = 20000} = {}) {
  if (!Array.isArray(sources) || !sources.length || !Array.isArray(rankings) || !rankings.length || !Number.isSafeInteger(maxParents) || maxParents < 1 || maxParents > 20 || !Number.isSafeInteger(maxChars) || maxChars < 1) throw Error('Invalid parent context policy');
  const corpus = new Map();
  for (const s of sources) {
    if (typeof s?.id !== 'string' || !s.id || typeof s.text !== 'string' || !s.text || corpus.has(s.id)) throw Error('Invalid parent source');
    corpus.set(s.id, {...s, sourceSha256: hash(s.text)});
  }
  const scores = new Map();
  for (const list of rankings) {
    if (!Array.isArray(list)) throw Error('Invalid ranking');
    const seen = new Set();
    for (const [rank, hit] of list.entries()) {
      const s = corpus.get(hit?.sourceId);
      if (!s || hit.sourceSha256 !== s.sourceSha256 || !Number.isSafeInteger(hit.start) || !Number.isSafeInteger(hit.end) || hit.start < 0 || hit.end <= hit.start || hit.end > s.text.length || hit.text !== s.text.slice(hit.start, hit.end) || !Number.isFinite(hit.score)) throw Error('Unbound ranking hit');
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      scores.set(s.id, (scores.get(s.id) ?? 0) + 1 / (60 + rank + 1));
    }
  }
  const order = [...scores].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0])).slice(0,maxParents);
  const contexts = [], omitted = [];let usedChars = 0;
  for (const [id,score] of order) {
    const s = corpus.get(id);
    // Skip whole parents that cannot fit: never silently truncate evidence.
    if (usedChars + s.text.length > maxChars) {omitted.push({sourceId:id,reason:'parent-exceeds-budget'});continue;}
    contexts.push({sourceId:id,sourceSha256:s.sourceSha256,start:0,end:s.text.length,text:s.text,score});usedChars += s.text.length;
  }
  return {contexts,omitted,usedChars,maxChars,maxParents,authority:'advisory-only',selectionUsesGoldLabels:false};
}
