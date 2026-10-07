import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {verifyFrozenBenchmark} from '../src/learning/benchmark.mjs';
const dir=new URL('../research/learning/frozen-0ab4d24bf6c71ab8/',import.meta.url),raw=readFileSync(new URL('benchmark.json',dir)),manifest=JSON.parse(readFileSync(new URL('manifest.json',dir)));
test('frozen benchmark binds labels, source bytes and exact evidence spans',()=>{const b=verifyFrozenBenchmark(raw,manifest);assert.equal(b.cases.length,12);assert.ok(b.cases.every(c=>c.trainingEligible===false));assert.throws(()=>verifyFrozenBenchmark(Buffer.concat([raw,Buffer.from(' ')]),manifest));});
test('a recomputed top-level digest cannot hide an invalid evidence span',()=>{const b=JSON.parse(raw);b.cases[0].supportingEvidenceSpans[0].quote='Fabricated';const changed=JSON.stringify(b);assert.throws(()=>verifyFrozenBenchmark(changed,{...manifest,sha256:createHash('sha256').update(changed).digest('hex')}),/span/);});

test('evidence offsets cannot extend beyond the frozen document',()=>{const b=JSON.parse(raw);const span=b.cases[0].supportingEvidenceSpans[0];const source=b.sources.find(s=>s.id===span.sourceId);span.start=0;span.end=source.text.length+1;span.quote=source.text;const changed=JSON.stringify(b);assert.throws(()=>verifyFrozenBenchmark(changed,{...manifest,sha256:createHash('sha256').update(changed).digest('hex')}),/span/);});
