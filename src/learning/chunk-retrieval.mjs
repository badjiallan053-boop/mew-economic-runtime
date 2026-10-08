import {createHash} from 'node:crypto';
const hash = text => createHash('sha256').update(text).digest('hex');
const tokens = text => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [];

// Offsets refer to exact UTF-16 slices of the original source, including whitespace.
export function paragraphChunks(sources, maxChars = 1000) {
  if (!Array.isArray(sources) || !sources.length || !Number.isSafeInteger(maxChars) || maxChars < 80 || maxChars > 8000) throw Error('Invalid chunk corpus');
  const ids = new Set(), chunks = [];
  for (const source of sources) {
    if (!source || typeof source.id !== 'string' || !source.id || ids.has(source.id) || typeof source.text !== 'string' || !source.text.trim()) throw Error('Invalid chunk source');
    ids.add(source.id);
    const sourceSha256 = hash(source.text);
    for (const paragraph of source.text.matchAll(/[^\r\n]+(?:\r?\n(?!\r?\n)[^\r\n]+)*/g)) {
      let start = paragraph.index, end = start + paragraph[0].length;
      while (start < end) {
        let stop = Math.min(end, start + maxChars);
        if (stop < end) {
          const space = source.text.lastIndexOf(' ', stop);
          if (space > start + Math.floor(maxChars / 2)) stop = space;
        }
        const text = source.text.slice(start, stop);
        if (text.trim()) chunks.push({id: `${source.id}:${start}:${stop}`, sourceId: source.id, sourceSha256, start, end: stop, text});
        start = stop;
      }
    }
  }
  return chunks;
}
export function fitChunkRetrieval(sources, maxChars = 1000) {
  const chunks = paragraphChunks(sources, maxChars), frequencies = Object.create(null);
  const documents = chunks.map(chunk => {
    const terms = tokens(chunk.text), counts = Object.create(null);
    for (const term of terms) counts[term] = (counts[term] ?? 0) + 1;
    for (const term of Object.keys(counts)) frequencies[term] = (frequencies[term] ?? 0) + 1;
    return {...chunk, length: terms.length, counts};
  });
  return {schema: 'mew.paragraph-bm25.v1', algorithm: 'paragraph BM25, Unicode accent normalization', documents, frequencies, averageLength: documents.reduce((n, d) => n + d.length, 0) / documents.length, paymentAuthority: false, languageModelTrained: false};
}
export function searchChunks(model, query, limit = 3) {
  if (model?.schema !== 'mew.paragraph-bm25.v1' || typeof query !== 'string' || !Number.isSafeInteger(limit) || limit < 1 || limit > 20) throw Error('Invalid chunk query');
  const terms = [...new Set(tokens(query))], n = model.documents.length;
  return model.documents.map(({counts, length, ...chunk}) => {
    let score = 0;
    for (const term of terms) {
      const tf = counts[term] ?? 0, df = model.frequencies[term] ?? 0;
      if (tf) score += Math.log(1 + (n - df + .5) / (df + .5)) * tf * 2.2 / (tf + 1.2 * (.25 + .75 * length / (model.averageLength || 1)));
    }
    return {...chunk, score};
  }).filter(c => c.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, limit);
}
