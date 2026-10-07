import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {verifyFrozenBenchmark} from '../src/learning/benchmark.mjs';
import {paragraphChunks} from '../src/learning/chunk-retrieval.mjs';
const dir = process.argv[2];
if (!dir) throw Error('Frozen benchmark directory required');
const raw = await readFile(`${dir}/benchmark.json`), manifest = JSON.parse(await readFile(`${dir}/manifest.json`));
const benchmark = verifyFrozenBenchmark(raw, manifest);
const chunks = paragraphChunks(benchmark.sources);
for (const chunk of chunks) {
  const source = benchmark.sources.find(s => s.id === chunk.sourceId);
  if (source.text.slice(chunk.start, chunk.end) !== chunk.text) throw Error('Invalid source offsets');
}
const rankingInput = {schema: 'mew.multilingual-ranking-input.v1', benchmarkSha256: manifest.sha256, sourceSnapshotDigest: benchmark.sourceSnapshotDigest, offsetUnit: 'UTF-16 code units', chunks, queries: benchmark.cases.map(({id, language, question}) => ({id, language, question}))};
const bytes = JSON.stringify(rankingInput, null, 2) + '\n';
if (process.argv.includes('--stdout')) {
  process.stdout.write(bytes);
} else {
await writeFile(`${dir}/multilingual-ranking-input.json`, bytes);
console.log(JSON.stringify({chunks: chunks.length, queries: rankingInput.queries.length, sha256: createHash('sha256').update(bytes).digest('hex')}));
}
