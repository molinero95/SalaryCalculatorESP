import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePayroll } from '../js/calc.js';
import { CURRENT_SCENARIO, DEFAULT_INPUT, clone } from '../js/defaults.js';

// Independently worked cases using AEAT 2026, pp. 23–34 (printed page numbers).
// https://sede.agenciatributaria.gob.es/static_files/Sede/Programas_ayuda/Retenciones/2026/Algoritmo%20Retenciones-2026_10sept.pdf
// The published document provides the rules; these profiles are derived fixtures.
const payroll = (input, scenario = CURRENT_SCENARIO) => computePayroll({ ...DEFAULT_INPUT, ...input }, scenario);

test('AEAT rate truncates 21.055% to 21.05%, and annual withholding is 9,472.50', () => {
  const result = payroll({ salary: 45000 });
  assert.equal(result.incomeTax.withholdingBase, 40075);
  assert.equal(result.incomeTax.amount, 9474.75);
  assert.equal(result.incomeTax.rate, 21.05);
  assert.equal(result.incomeTax.withheld, 9472.5);
});

test('three descendants reduce withholding base by 600 without reducing annual return base', () => {
  const result = payroll({ salary: 30000, children: 3 });
  assert.equal(result.incomeTax.withholdingBase, 25450);
  assert.equal(result.incomeTax.annualBase, 26050);
  assert.equal(result.incomeTax.amount, 3881.5);
  assert.equal(result.incomeTax.rate, 12.93);
  assert.equal(result.incomeTax.annualTax, 4061.5);
  assert.equal(payroll({ children: 2 }).incomeTax.largeFamilyReduction, 0);
});

for (const [familySituation, children, salary] of [
  [1, 1, 17644],
  [1, 2, 18694],
  [2, 0, 17197],
  [2, 1, 18130],
  [2, 2, 19262],
  [3, 0, 15876],
  [3, 1, 16342],
  [3, 2, 16867],
]) {
  test(`AEAT Table 1 exemption: situation ${familySituation}, ${children} children`, () => {
    assert.equal(payroll({ familySituation, children, salary }).incomeTax.withheld, 0);
  });
}

// An edited high-rate scenario makes the statutory cap observable at its boundary.
for (const salary of [35199.99, 35200, 35200.01]) {
  test(`43% quota limit only applies up to 35,200: salary ${salary}`, () => {
    const scenario = clone(CURRENT_SCENARIO);
    scenario.incomeTax.brackets = [{ upTo: null, rate: 100 }];
    const result = payroll({ salary }, scenario).incomeTax;
    const expected = salary <= 35200 ? (salary - 15876) * 0.43 : result.taxOnBase - result.taxOnAllowance;
    assert.ok(Math.abs(result.amount - expected) < 1e-8);
  });
}

test('deductible expenses cannot exceed net employment income', () => {
  const result = payroll({ salary: 1000, disability: 65 });
  assert.equal(result.incomeTax.otherExpenses, result.incomeTax.netEarnings);
});
