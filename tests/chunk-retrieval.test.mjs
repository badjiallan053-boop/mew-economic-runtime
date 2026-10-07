import test from 'node:test';
import assert from 'node:assert/strict';
import {paragraphChunks, fitChunkRetrieval, searchChunks} from '../src/learning/chunk-retrieval.mjs';
test('chunks retain exact offsets across CRLF, Unicode and long paragraphs', () => {
 const source = {id: 'doc', text: 'First é😀 paragraph.\r\n\r\n' + 'payment evidence '.repeat(90)};
 const chunks = paragraphChunks([source], 100);
 assert.ok(chunks.length > 2);
 for(const c of chunks) { assert.equal(c.text, source.text.slice(c.start,c.end)); assert.ok(c.end-c.start<=100); }
 assert.throws(()=>paragraphChunks([source,source]), /source/);
});
test('retrieval selects evidence beyond former document truncation without labels', () => {
 const sources = [{id:'a',text: 'generic introduction '.repeat(250)+'\n\nImmutable reconciliation retains exposure until verified refund.'},{id:'b',text:'Independent marketing reporting.'}];
 const results = searchChunks(fitChunkRetrieval(sources), 'reconciliation verified refund', 3);
 assert.equal(results[0].sourceId,'a'); assert.ok(results[0].start > 4000); assert.match(results[0].text,/retains exposure/);
});
test('accent normalization, stable ties and empty matches',()=>{
 const model=fitChunkRetrieval([{id:'a',text:'Économie reconciliée.'},{id:'b',text:'Économie reconciliée.'}]);
 assert.equal(searchChunks(model,'economie')[0].sourceId,'a');
 assert.deepEqual(searchChunks(model,'unrelated'),[]);
 assert.throws(()=>searchChunks(model,'query',0),/query/);
});
