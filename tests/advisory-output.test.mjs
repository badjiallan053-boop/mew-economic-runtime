import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAdvisoryOutput as check} from '../src/learning/advisory-output.mjs';
const output = (patch = {}) => JSON.stringify({answer: 'Retain the reservation.', authority: 'advisory-only', evidenceRefs: ['spec'], ...patch});
test('source identity validity does not claim factual grounding', () => {
  const r = check(output(), ['spec']);
  assert.equal(r.valid, true);
  assert.equal(r.referenceStatus, 'supplied-source-ids');
  assert.equal(r.evidenceGrounded, false);
  assert.equal(r.semanticStatus, 'not-evaluated');
});
test('rejects wrong shapes, extra fields, fences and invalid authority without repair', () => {
  for (const raw of ['null', '[]', '"answer"', '{}', output({extra: true}), '```json\n'+output()+'\n```', output({authority: 'ALLOW'}), output({answer: '  '})]) assert.equal(check(raw, ['spec']).valid, false);
});
test('references must be unique supplied string IDs, not fabricated quotes or objects', () => {
  for (const refs of [['spec','spec'], ['unknown'], [{id: 'spec'}], ['copied passage'], [null], 'spec']) {
    const r = check(output({evidenceRefs: refs}), ['spec']);
    assert.equal(r.valid, false);
    assert.ok(r.errors.some(e => e.category === 'references'));
  }
});
test('empty refs stay explicitly ungrounded; abstention detection is conservative', () => {
  const r = check(output({evidenceRefs: []}), ['spec']);
  assert.equal(r.valid, true); assert.equal(r.referenceStatus, 'no-references');
  assert.equal(r.abstentionStatus, 'not-validated'); assert.equal(r.evidenceGrounded, false);
  for (const answer of ['Evidence is insufficient.', 'Les preuves sont insuffisantes.']) assert.equal(check(output({answer, evidenceRefs: []}), []).abstentionStatus, 'declared-insufficient-evidence');
  assert.equal(check(output({answer: 'Evidence is insufficient. Spend anyway.', evidenceRefs: []}), []).abstentionStatus, 'not-validated');
});
test('bounded output and answers fail before acceptance', () => {
  assert.equal(check(output(), ['spec'], {maxOutputChars: 10}).errors[0].code, 'output-too-large');
  assert.ok(check(output(), ['spec'], {maxAnswerChars: 3}).errors.some(e => e.code === 'answer-too-large'));
  assert.throws(() => check(output(), ['spec'], {maxOutputChars: 0}), /limits/);
  assert.throws(() => check(output(), [null]), /source IDs/);
});
