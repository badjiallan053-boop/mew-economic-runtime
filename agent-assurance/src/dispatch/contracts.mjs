import { createHash } from 'node:crypto';

export const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export function integer(value, name, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) throw new Error(name + ' must be a safe integer >= ' + min);
  return value;
}
export function text(value, name) {
  if (typeof value !== 'string' || !value.trim() || value.length > 512) throw new Error(name + ' must be a bounded nonempty string');
  return value;
}
export function requestContract(input) {
  const out = {};
  for (const key of ['effectId', 'objectiveId', 'principal', 'semanticKey', 'provider', 'recipient', 'asset']) out[key] = text(input[key], key);
  out.amount = integer(input.amount, 'amount');
  return out;
}
