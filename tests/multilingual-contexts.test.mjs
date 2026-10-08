import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {verifyFrozenBenchmark} from '../src/learning/benchmark.mjs';
import {paragraphChunks} from '../src/learning/chunk-retrieval.mjs';
const dir = new URL('../research/learning/frozen-0ab4d24bf6c71ab8/', import.meta.url);
test('multilingual ranking input shares frozen BM25 chunks and excludes gold labels', async () => {
  const raw = await readFile(new URL('benchmark.json', dir));
  const manifest = JSON.parse(await readFile(new URL('manifest.json', dir)));
  const benchmark = verifyFrozenBenchmark(raw, manifest);
  const input = JSON.parse(await readFile(new URL('multilingual-ranking-input.json', dir)));
  assert.equal(input.benchmarkSha256, manifest.sha256);
  assert.equal(input.sourceSnapshotDigest, benchmark.sourceSnapshotDigest);
  assert.deepEqual(input.chunks, paragraphChunks(benchmark.sources));
  assert.equal(input.chunks.length, 58);
  assert.deepEqual(input.queries, benchmark.cases.map(({id, language, question}) => ({id, language, question})));
  for (const chunk of input.chunks) {
    const source = benchmark.sources.find(s => s.id === chunk.sourceId);
    assert.equal(source.text.slice(chunk.start, chunk.end), chunk.text);
    assert.equal(createHash('sha256').update(source.text).digest('hex'), chunk.sourceSha256);
  }
});
test('multilingual report preserves reproducible corpus identity and distinguishes visible evidence', async () => {
  const report = JSON.parse(await readFile(new URL('multilingual-retrieval-evaluation.json', dir)));
  const inputBytes = await readFile(new URL('multilingual-ranking-input.json', dir));
  const input = JSON.parse(inputBytes);
  assert.equal(report.rankingInputSha256, createHash('sha256').update(inputBytes).digest('hex'));
  assert.equal(report.chunkCount, input.chunks.length);
  assert.equal(report.model.trustRemoteCode, false);
  assert.match(report.model.revision, /^[a-f0-9]{40}$/);
  assert.equal(report.tokenization.maxSequenceLength, 128);
  assert.equal(report.tokenization.truncatedQueries, 0);
  assert.equal(report.tokenization.fullTokenLengths.length, input.chunks.length + input.queries.length);
  assert.equal(report.tokenization.truncatedInputs, report.tokenization.fullTokenLengths.filter(n => n > 128).length);
  for (const row of report.cases) {
    assert.equal(row.results.length, 3);
    assert.equal(new Set(row.results.map(r => r.id)).size, 3);
    for (const result of row.results) {
      const chunk = input.chunks.find(c => c.id === result.id);
      assert.equal(result.text, chunk.text);
      assert.equal(result.sourceSha256, chunk.sourceSha256);
      assert.ok(result.encoderVisibleEnd >= result.start && result.encoderVisibleEnd <= result.end);
      assert.ok(Number.isFinite(result.score));
    }
    if (row.encoderSpanHitAt3) assert.equal(row.exactSpanHitAt3, true);
  }
});
test('canonical multilingual replay preserves original metrics and input binding', async () => {
  const original = JSON.parse(await readFile(new URL('multilingual-retrieval-evaluation.json', dir)));
  const verified = JSON.parse(await readFile(new URL('multilingual-retrieval-evaluation-canonical-verified.json', dir)));
  assert.equal(verified.canonicalInputVerified, true);
  assert.deepEqual(verified.overall, original.overall);
  assert.deepEqual(verified.byLanguage, original.byLanguage);
  assert.deepEqual(verified.cases, original.cases);
  assert.equal(verified.rankingInputSha256, original.rankingInputSha256);
});
