import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {verifyFrozenBenchmark} from '../src/learning/benchmark.mjs';
import {fitChunkRetrieval, searchChunks} from '../src/learning/chunk-retrieval.mjs';
const dir = process.argv[2];
if (!dir) throw Error('Frozen benchmark directory required');
const raw = await readFile(`${dir}/benchmark.json`), manifest = JSON.parse(await readFile(`${dir}/manifest.json`));
const benchmark = verifyFrozenBenchmark(raw, manifest), model = fitChunkRetrieval(benchmark.sources);
const cases = benchmark.cases.map(c => {
  // Ranking uses question and source text only; labels are consulted after retrieval.
  const results = searchChunks(model, c.question, 3);
  const expected = c.supportingEvidenceSpans;
  const rank = results.findIndex(r => expected.some(s => s.sourceId === r.sourceId));
  const spanRank = results.findIndex(r => expected.some(s => s.sourceId === r.sourceId && r.start <= s.start && r.end >= s.end));
  const selectedContexts = results.map(({id, sourceId, sourceSha256, start, end, text}) => ({id, sourceId, sourceSha256, start, end, text}));
  const coveredSpans = expected.filter(s => results.some(r => s.sourceId === r.sourceId && r.start <= s.start && r.end >= s.end)).length;
  return {id: c.id, language: c.language, results, selectedContexts, evidenceSpanRecallAt3: coveredSpans / expected.length, sourceHitAt3: rank >= 0, exactSpanHitAt3: spanRank >= 0, exactSpanReciprocalRank: spanRank < 0 ? 0 : 1 / (spanRank + 1)};
});
const metrics = language => {
  const rows = cases.filter(c => !language || c.language === language);
  return {cases: rows.length, sourceHitsAt3: rows.filter(c => c.sourceHitAt3).length, exactSpanHitsAt3: rows.filter(c => c.exactSpanHitAt3).length, meanEvidenceSpanRecallAt3: rows.reduce((n, c) => n + c.evidenceSpanRecallAt3, 0) / rows.length, exactSpanMrrAt3: rows.reduce((n, c) => n + c.exactSpanReciprocalRank, 0) / rows.length};
};
const contextsSha256 = createHash('sha256').update(JSON.stringify(cases.map(c => ({id: c.id, selectedContexts: c.selectedContexts})))).digest('hex');
const report = {sourceSnapshotDigest: benchmark.sourceSnapshotDigest, contextsSha256, offsetUnit: 'UTF-16 code units', schema: 'mew.chunk-retrieval-evaluation.v1', benchmarkSha256: manifest.sha256, algorithm: model.algorithm, chunkCount: model.documents.length, languageModelInvoked: false, overall: metrics(), byLanguage: {en: metrics('en'), fr: metrics('fr')}, cases, limitations: ['Development benchmark; not independent customer holdout.', 'Lexical retrieval does not translate French queries.', 'Exact-span hit measures evidence selection, not answer quality.', 'No frozen benchmark questions or labels used to fit or train the retriever.']};
await writeFile(`${dir}/chunk-retrieval-evaluation.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({overall: report.overall, byLanguage: report.byLanguage, chunkCount: report.chunkCount}, null, 2));
