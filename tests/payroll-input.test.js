import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeInput, INPUT_LIMITS } from '../js/domain/payroll-input.js';
import { DEFAULT_INPUT, clone } from '../js/defaults.js';

for (const [field, lower, upper] of [
  ['age', 16, 100],
  ['partTime', 1, 100],
  ['children', 0, 20],
  ['childrenUnder3', 0, 20],
  ['dependents65', 0, 10],
  ['dependents75', 0, 10],
  ['workingDays', 0, 366],
  ['flexHealthPeople', 1, 15],
]) {
  test(`${field} bounds and fractional counts are normalized without a DOM`, () => {
    assert.equal(normalizeInput({ ...clone(DEFAULT_INPUT), [field]: -10 })[field], lower);
    assert.equal(normalizeInput({ ...clone(DEFAULT_INPUT), [field]: 1e10 })[field], upper);
    assert.equal(normalizeInput({ ...clone(DEFAULT_INPUT), [field]: lower + 0.9 })[field], lower);
  });
}

test('annual monetary values preserve cents and cap excessive amounts', () => {
  const input = normalizeInput({ ...clone(DEFAULT_INPUT), salary: 45000.55, flexMeal: 1234.56, pensionEmployer: 1e12 });
  assert.equal(input.salary, 45000.55);
  assert.equal(input.flexMeal, 1234.56);
  assert.equal(input.pensionEmployer, 1e9);
});

test('unsupported enum values use existing defaults', () => {
  const input = normalizeInput({
    ...clone(DEFAULT_INPUT),
    period: 'weekly',
    payments: 99,
    contract: 'other',
    region: 'unknown',
    disability: 45,
    familySituation: 0,
    flexPeriod: 'weekly',
    pensionPeriod: 'weekly',
  });
  for (const key of [
    'period',
    'payments',
    'contract',
    'region',
    'disability',
    'familySituation',
    'flexPeriod',
    'pensionPeriod',
  ]) {
    assert.equal(input[key], DEFAULT_INPUT[key]);
  }
});

test('domain bounds match the numeric controls, preventing silent HTML/model drift', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const seen = new Set();
  for (const [tag] of html.matchAll(/<input\b[^>]*>/g)) {
    if (!tag.includes('type="number"')) continue;
    const field = tag.match(/name="([^"]+)"/)[1];
    const rule = INPUT_LIMITS[field];
    assert.ok(rule, `Missing rule for ${field}`);
    seen.add(field);
    const min = Number(tag.match(/min="([^"]+)"/)?.[1] ?? 0);
    const max = Number(tag.match(/max="([^"]+)"/)?.[1] ?? 1e9);
    assert.equal(rule.min ?? 0, min, field);
    assert.equal(rule.max ?? 1e9, max, field);
  }
  assert.deepEqual([...seen].sort(), Object.keys(INPUT_LIMITS).sort());
});
