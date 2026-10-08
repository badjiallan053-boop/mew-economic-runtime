// A syntax/identity check only. Source IDs do not establish citation entailment.
const KEYS = ['answer', 'authority', 'evidenceRefs'];
const ABSTENTIONS = new Set(['Evidence is insufficient.', 'Les preuves sont insuffisantes.']);

export function validateAdvisoryOutput(raw, contextSourceIds, {
  maxOutputChars = 20000, maxAnswerChars = 4000,
} = {}) {
  if (!Array.isArray(contextSourceIds) || contextSourceIds.some(id => typeof id !== 'string' || !id.trim())) {
    throw new TypeError('Context source IDs must be nonempty strings');
  }
  if (![maxOutputChars, maxAnswerChars].every(n => Number.isSafeInteger(n) && n > 0)) {
    throw new TypeError('Output limits must be positive safe integers');
  }
  const errors = [];
  const fail = (category, code) => errors.push({category, code});
  let value;
  if (typeof raw !== 'string') fail('serialization', 'not-string');
  else if (raw.length > maxOutputChars) fail('bounds', 'output-too-large');
  else {
    try { value = JSON.parse(raw); } catch { fail('serialization', 'invalid-json'); }
  }
  if (!errors.length) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
      fail('shape', 'not-plain-object');
    } else {
      if (Object.keys(value).length !== KEYS.length || KEYS.some(key => !Object.hasOwn(value, key))) fail('shape', 'unexpected-keys');
      if (typeof value.answer !== 'string' || !value.answer.trim()) fail('shape', 'invalid-answer');
      else if (value.answer.length > maxAnswerChars) fail('bounds', 'answer-too-large');
      if (value.authority !== 'advisory-only') fail('authority', 'invalid-authority');
      if (!Array.isArray(value.evidenceRefs)) fail('references', 'not-reference-array');
      else {
        const supplied = new Set(contextSourceIds);
        if (value.evidenceRefs.some(ref => typeof ref !== 'string' || !ref.trim())) fail('references', 'invalid-reference');
        if (new Set(value.evidenceRefs).size !== value.evidenceRefs.length) fail('references', 'duplicate-reference');
        if (value.evidenceRefs.some(ref => !supplied.has(ref))) fail('references', 'unknown-reference');
      }
    }
  }
  const valid = errors.length === 0;
  const empty = valid && value.evidenceRefs.length === 0;
  // Only exact, content-free abstentions qualify as declared abstention. This
  // does not prove that abstaining was appropriate for the supplied evidence.
  const declaredAbstention = empty && ABSTENTIONS.has(value.answer.trim());
  return {
    valid, errors, value: valid ? value : null,
    referenceStatus: valid ? (empty ? 'no-references' : 'supplied-source-ids') : 'invalid',
    abstentionStatus: declaredAbstention ? 'declared-insufficient-evidence' : 'not-validated',
    semanticStatus: 'not-evaluated', evidenceGrounded: false,
  };
}
