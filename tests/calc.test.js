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

test('low earners get the minimum wage credit back in the annual return', () => {
  const r = computePayroll({ ...DEFAULT_INPUT, salary: 17094 }, CURRENT_SCENARIO);
  close(r.incomeTax.minWageCredit, 590.89);
  close(r.incomeTax.refund, Math.min(590.89, r.incomeTax.withheld));
  close(r.netAnnualAfterReturn, r.netAnnual + r.incomeTax.refund);
});

test('minimum wage credit phases out at 20,048.45 € of gross income', () => {
  const r = computePayroll({ ...DEFAULT_INPUT, salary: 20048.45 }, CURRENT_SCENARIO);
  assert.equal(r.incomeTax.minWageCredit, 0);
});

test('withholding-free minimum depends on family situation', () => {
  const single = computePayroll({ ...DEFAULT_INPUT, salary: 17000 }, CURRENT_SCENARIO);
  const spouseNoIncome = computePayroll({ ...DEFAULT_INPUT, salary: 17000, familySituation: 2 }, CURRENT_SCENARIO);
  assert.equal(single.incomeTax.freeMinimum, 15876);
  assert.equal(spouseNoIncome.incomeTax.freeMinimum, 17197);
  assert.equal(spouseNoIncome.incomeTax.rate, 0);
});

test('flexible compensation lowers income tax but not social security', () => {
  const flex = { flexMeal: 2000, flexTransport: 1500, flexHealth: 600 };
  const plain = computePayroll(DEFAULT_INPUT, CURRENT_SCENARIO);
  const withFlex = computePayroll({ ...DEFAULT_INPUT, ...flex }, CURRENT_SCENARIO);

  close(withFlex.flexible.total, 4100);
  close(withFlex.flexible.exempt, 4000); // health insurance capped at 500 €
  close(withFlex.employee.total, plain.employee.total);
  assert.ok(withFlex.incomeTax.withheld < plain.incomeTax.withheld);
  close(withFlex.flexible.taxSaved, plain.incomeTax.withheld - withFlex.incomeTax.withheld);
  // Cash + in-kind value is higher than the plain net salary
  assert.ok(withFlex.netAnnual + withFlex.flexible.total > plain.netAnnual);
});

test('14 payments add up to the annual net salary', () => {
  const r = computePayroll({ ...DEFAULT_INPUT, flexMeal: 1200 }, CURRENT_SCENARIO);
  close(12 * r.netRegularPayment + 2 * r.netExtraPayment, r.netAnnual);
});

test('individual pension contributions are refunded in the return up to the limit', () => {
  const plain = computePayroll(DEFAULT_INPUT, CURRENT_SCENARIO);
  const r = computePayroll({ ...DEFAULT_INPUT, pensionIndividual: 3000 }, CURRENT_SCENARIO);

  assert.equal(r.pension.deductible, 1500);
  close(r.pension.taxSaved, 1500 * 0.3); // 30 % marginal rate at 30,000 €
  close(r.netAnnual, plain.netAnnual); // paid outside payroll
  close(r.netAnnualAfterReturn, plain.netAnnualAfterReturn - 3000 + 450);
});

test('employee contributions to a company plan are capped by the employer coefficient', () => {
  const r = computePayroll({ ...DEFAULT_INPUT, pensionEmployer: 400, pensionEmployee: 2000 }, CURRENT_SCENARIO);
  close(r.pension.deductible, 400 + 1000); // 2.5 × 400
});

test('employer pension contributions raise the contribution base and employer cost', () => {
  const plain = computePayroll(DEFAULT_INPUT, CURRENT_SCENARIO);
  const r = computePayroll({ ...DEFAULT_INPUT, pensionEmployer: 1200 }, CURRENT_SCENARIO);
  assert.ok(r.employee.total > plain.employee.total);
  close(r.employerCost, plain.employerCost + 1200 + (r.employer.total - plain.employer.total));
  close(r.pension.taxSaved, 0);
});

test('payments still add up with pension contributions deducted in payroll', () => {
  const r = computePayroll({ ...DEFAULT_INPUT, pensionEmployee: 600 }, CURRENT_SCENARIO);
  close(12 * r.netRegularPayment + 2 * r.netExtraPayment, r.netAnnual);
});

test('part-time workers contribute on their actual salary, not the full-time minimum base', () => {
  const fullTime = computePayroll({ ...DEFAULT_INPUT, salary: 12000 }, CURRENT_SCENARIO);
  const halfTime = computePayroll({ ...DEFAULT_INPUT, salary: 12000, partTime: 50 }, CURRENT_SCENARIO);

  assert.equal(fullTime.employee.monthlyBase, CURRENT_SCENARIO.socialSecurity.minBase);
  close(halfTime.employee.monthlyBase, 1000);
  close(halfTime.employee.total, 12000 * 0.065);
});
