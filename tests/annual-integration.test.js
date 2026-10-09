import { test } from 'node:test';
import assert from 'node:assert/strict';
import { annualTax } from '../js/tax.js';
import { computePayroll } from '../js/calc.js';
import { DEFAULT_INPUT, CURRENT_SCENARIO } from '../js/defaults.js';
// LIRPF art.63: official state base/quota rows, before personal-minimum deduction.
for (const [base, quota] of [
  [12450, 1182.75],
  [20200, 2112.75],
  [35200, 4362.75],
  [60000, 8950.75],
  [300000, 62950.75],
  [300001, 62950.995],
]) {
  test(`official state annual scale at ${base}`, () => {
    const result = annualTax(DEFAULT_INPUT, CURRENT_SCENARIO.incomeTax, base, 500000);
    assert.ok(Math.abs(result.stateTax - (quota - 527.25)) < 1e-8);
  });
}
// Independently worked Madrid quota from published row at 19,004.63 and 12.8% remainder.
for (const [pensionIndividual, base, tax] of [
  [0, 26050, 4598.02],
  [1500, 24550, 4181.02],
]) {
  test(`Madrid annual integration with pension ${pensionIndividual}`, () => {
    const result = computePayroll({ ...DEFAULT_INPUT, region: 'madrid', pensionIndividual }, CURRENT_SCENARIO);
    assert.equal(result.incomeTax.annualBase, base);
    assert.equal(result.incomeTax.annualTax, tax);
    assert.equal(result.incomeTax.withheld, 4926);
    assert.ok(Math.abs(result.incomeTax.refund - (4926 - tax)) < 1e-8);
  });
}

for (const rate of [0, 5, 20, 20.005]) {
  test(`custom combined flat ${rate}% preserves its annual total`, () => {
    const p = { ...CURRENT_SCENARIO.incomeTax, brackets: [{ upTo: null, rate }] };
    const result = annualTax(DEFAULT_INPUT, p, 100000, 100000);
    assert.equal(result.tax, Math.round((100000 - 5550) * rate) / 100);
  });
}
