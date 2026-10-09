import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePayroll } from '../js/calc.js';
import { annualTax, employmentReduction, withholding } from '../js/tax.js';
import { CURRENT_SCENARIO, DEFAULT_INPUT } from '../js/defaults.js';
const payroll = (input) => computePayroll({ ...DEFAULT_INPUT, ...input }, CURRENT_SCENARIO);
const close = (a, b) => assert.ok(Math.abs(a - b) < 0.01, `${a} != ${b}`);
// Art.20 LIRPF. Inputs are net earnings before the art.19.2.f expense.
for (const [net, reduction] of [
  [14851.99, 7302],
  [14852, 7302],
  [14852.01, 7301.9825],
  [17673.52, 2364.34],
  [17673.53, 2364.3286],
  [19747.49, 0.0142],
  [19747.5, 0],
  [19747.51, 0],
]) {
  test(`employment reduction at ${net}`, () => close(employmentReduction(net, CURRENT_SCENARIO.incomeTax), reduction));
}
// DA61 LIRPF: credit limited by the quotas attributable to employment income.
for (const [gross, credit] of [
  [17093.99, 590.89],
  [17094, 590.89],
  [17094.01, 590.888],
  [18000, 409.69],
  [20048.44, 0.002],
  [20048.45, 0],
  [20048.46, 0],
]) {
  test(`low-earner deduction boundary ${gross}`, () =>
    close(annualTax(DEFAULT_INPUT, CURRENT_SCENARIO.incomeTax, 30000, gross).credit, credit));
}
test('low-earner deduction cannot exceed the annual quotas', () => {
  const result = annualTax(DEFAULT_INPUT, CURRENT_SCENARIO.incomeTax, 6000, 17094);
  close(result.credit, 85.5);
  assert.equal(result.tax, 0);
});
// Art.52: shared €1,500 plus employer-linked increment capped at €8,500.
for (const [employer, employee, individual, expected] of [
  [0, 1500, 0, 1500],
  [0, 2000, 0, 1500],
  [500, 3000, 1500, 3250],
  [500.01, 3000, 1500, 3250.0125],
  [1500, 4000, 1500, 4500],
  [1500.01, 4000, 1500, 4500.02],
  [5000, 5000, 1500, 10000],
]) {
  test(`pension limit employer ${employer}, employee ${employee}, individual ${individual}`, () =>
    close(
      payroll({ salary: 50000, pensionEmployer: employer, pensionEmployee: employee, pensionIndividual: individual })
        .pension.deductible,
      expected,
    ));
}
for (const [salary, expected] of [
  [59499.99, 3250],
  [59500, 3250],
  [59500.01, 2500],
]) {
  test(`pension 60,000 gross threshold including employer at ${salary}`, () =>
    close(
      payroll({ salary, pensionEmployer: 500, pensionEmployee: 3000, pensionIndividual: 1500 }).pension.deductible,
      expected,
    ));
}
test('pension 30% cap uses income after deductible expenses, before employment reduction', () => {
  const result = payroll({ salary: 20000, pensionEmployer: 5000, pensionEmployee: 5000, pensionIndividual: 1500 });
  // 25,000 imputed gross - 1,625 employee contributions - 2,000 expenses.
  close(result.pension.deductible, 6412.5);
});
for (const [disability, expenses] of [
  [0, 2000],
  [33, 5500],
  [65, 9750],
]) {
  test(`active employee disability expenses ${disability}`, () =>
    assert.equal(payroll({ salary: 50000, disability }).incomeTax.otherExpenses, expenses));
}
// Art.42 LIRPF and RIRPF arts.45/46bis; annual cap boundaries and exemption only.
for (const [field, cap, extra] of [
  ['flexMeal', 2420, {}],
  ['flexTransport', 1500, {}],
  ['flexHealth', 500, {}],
  ['flexHealth', 1500, { disability: 33 }],
  ['flexHealth', 2000, { disability: 65, flexHealthPeople: 2 }],
]) {
  for (const delta of [-0.01, 0, 0.01]) {
    test(`flexible exemption ${field}, cap ${cap}, delta ${delta}, disability ${extra.disability ?? 0}`, () => {
      const input = { salary: 50000, ...extra, [field]: cap + delta };
      const result = payroll(input);
      close(result.flexible.exempt, Math.min(cap, cap + delta));
      close(result.employee.total, payroll({ salary: 50000, ...extra }).employee.total);
    });
  }
}
for (const field of ['flexChildcare', 'flexTraining']) {
  test(`${field} qualifying employer service has no monetary exemption cap`, () =>
    close(payroll({ salary: 50000, [field]: 5000 }).flexible.exempt, 5000));
}
test('under-three count cannot exceed eligible descendants', () => {
  const result = payroll({ children: 1, childrenUnder3: 5 });
  assert.equal(result.incomeTax.allowance.children, 2600);
});
test('single-parent situation without descendants uses situation 3', () =>
  assert.equal(
    withholding({ ...DEFAULT_INPUT, familySituation: 1 }, CURRENT_SCENARIO.incomeTax, 30000, 1950).freeMinimum,
    15876,
  ));

for (const salary of [0, 1, 15000, 15876, 15876.01]) {
  test(`short-contract minimum applies below the general exemption: ${salary}`, () => {
    assert.equal(payroll({ salary, contract: 'temporary' }).incomeTax.rate, salary > 0 ? 2 : 0);
  });
}
