import { test } from 'node:test';
import assert from 'node:assert/strict';

import { applyScale, computePayroll } from '../js/calc.js';
import { CURRENT_SCENARIO, DEFAULT_INPUT, combineScales, clone } from '../js/defaults.js';

const close = (actual, expected, tolerance = 0.01) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${expected}, got ${actual}`);

test('applyScale splits the base across brackets', () => {
  const brackets = [
    { upTo: 10000, rate: 10 },
    { upTo: 20000, rate: 20 },
    { upTo: null, rate: 30 },
  ];
  assert.equal(applyScale(brackets, 0), 0);
  close(applyScale(brackets, 5000), 500);
  close(applyScale(brackets, 15000), 2000);
  close(applyScale(brackets, 30000), 6000);
});

test('30,000 € single employee, 14 payments', () => {
  const r = computePayroll(DEFAULT_INPUT, CURRENT_SCENARIO);

  close(r.employee.total, 1950); // 6.50 % of 30,000
  close(r.incomeTax.withholdingBase, 26050);
  assert.equal(r.incomeTax.rate, 16.42);
  close(r.netAnnual, 23124);
  close(r.netRegularPayment, 1628.5);
  close(r.netExtraPayment, 1791);
});

test('income below the withholding-free minimum pays no income tax', () => {
  const r = computePayroll({ ...DEFAULT_INPUT, salary: 15000 }, CURRENT_SCENARIO);
  assert.equal(r.incomeTax.rate, 0);
});

test('temporary contracts withhold at least the minimum rate', () => {
  const r = computePayroll({ ...DEFAULT_INPUT, salary: 16500, contract: 'temporary' }, CURRENT_SCENARIO);
  assert.ok(r.incomeTax.rate >= CURRENT_SCENARIO.incomeTax.temporaryMinRate);
});

test('contribution base is capped and solidarity applies above it', () => {
  const r = computePayroll({ ...DEFAULT_INPUT, salary: 100000 }, CURRENT_SCENARIO);
  assert.equal(r.employee.monthlyBase, CURRENT_SCENARIO.socialSecurity.maxBase);
  assert.ok(r.employee.items.solidarity > 0);
});

test('children lower the withholding rate', () => {
  const withoutChildren = computePayroll(DEFAULT_INPUT, CURRENT_SCENARIO);
  const withChildren = computePayroll({ ...DEFAULT_INPUT, children: 2, childrenUnder3: 1 }, CURRENT_SCENARIO);
  assert.ok(withChildren.incomeTax.rate < withoutChildren.incomeTax.rate);
});

test('monthly salary input is converted using the number of payments', () => {
  const annual = computePayroll(DEFAULT_INPUT, CURRENT_SCENARIO);
  const monthly = computePayroll({ ...DEFAULT_INPUT, salary: 30000 / 14, period: 'perPayment' }, CURRENT_SCENARIO);
  close(monthly.netAnnual, annual.netAnnual);
});

test('lowering every rate raises take-home pay', () => {
  const proposal = clone(CURRENT_SCENARIO);
  proposal.incomeTax.brackets.forEach((b) => (b.rate -= 1));
  const current = computePayroll(DEFAULT_INPUT, CURRENT_SCENARIO);
  const simulated = computePayroll(DEFAULT_INPUT, proposal);
  assert.ok(simulated.netAnnual > current.netAnnual);
});

test('combineScales adds rates over the union of limits', () => {
  const combined = combineScales(
    [{ upTo: 10, rate: 1 }, { upTo: null, rate: 2 }],
    [{ upTo: 20, rate: 10 }, { upTo: null, rate: 20 }],
  );
  assert.deepEqual(combined, [
    { upTo: 10, rate: 11 },
    { upTo: 20, rate: 12 },
    { upTo: null, rate: 22 },
  ]);
});
