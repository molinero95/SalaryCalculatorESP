import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_INPUT, CURRENT_SCENARIO } from '../js/defaults.js';
import { proposalScenario } from '../js/political.js';
import { annualTax, withholding } from '../js/tax.js';
import { computePayroll } from '../js/calc.js';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
// Bill 122/000084 p.6: official state quota = 10,500 at 70,000; 25% excess.
for (const [base, expected] of [
  [21999, 0],
  [22000, 0],
  [22001, 0.15],
  [69999, 7199.85],
  [70000, 7200],
  [70001, 7200.25],
  [100000, 14700],
]) {
  test(`Vox annual state quota at base ${base}`, () => {
    close(annualTax(DEFAULT_INPUT, proposalScenario('vox2024').incomeTax, base, 100000).stateTax, expected);
  });
}
for (const region of ['general', 'madrid', 'catalonia', 'andalusia']) {
  test(`article 101 withholding is 15/25 and independent of region: ${region}`, () => {
    const tax = withholding({ ...DEFAULT_INPUT, region }, proposalScenario('vox2024').incomeTax, 30000, 1950);
    assert.equal(tax.withholdingBase, 26050);
    assert.equal(tax.rate, 2.02); // (26,050 - 22,000) * 15% / 30,000, truncated.
    assert.equal(tax.withheld, 606);
  });
}
test('Madrid annual minimum and quota remain regional while national minimum changes', () => {
  const result = annualTax({ ...DEFAULT_INPUT, region: 'madrid' }, proposalScenario('vox2024').incomeTax, 26050, 30000);
  assert.equal(result.allowance.personal, 22000);
  assert.equal(result.regionalAllowance.personal, 5956.65);
  close(result.stateTax, 607.5);
  // Madrid published base 19,004.63, integrated quota 1,739.52622, then 12.8%.
  close(result.regionalTax, 1739.52657 + (26050 - 19004.63) * 0.128 - 5956.65 * 0.085);
  assert.equal(result.tax, 2742.52);
});
test('changing annual combined rates does not silently change an independent withholding scale', () => {
  const s = proposalScenario('vox2024');
  const before = computePayroll(DEFAULT_INPUT, s);
  s.incomeTax.brackets = [{ upTo: null, rate: 50 }];
  const after = computePayroll(DEFAULT_INPUT, s);
  assert.equal(before.incomeTax.withheld, after.incomeTax.withheld);
  assert.notEqual(before.incomeTax.annualTax, after.incomeTax.annualTax);
});
test('legacy scenarios without a separate scale retain their original withholding', () => {
  const legacy = structuredClone(CURRENT_SCENARIO);
  delete legacy.incomeTax.useSeparateWithholding;
  delete legacy.incomeTax.withholdingBrackets;
  assert.equal(
    computePayroll(DEFAULT_INPUT, legacy).incomeTax.withheld,
    computePayroll(DEFAULT_INPUT, CURRENT_SCENARIO).incomeTax.withheld,
  );
});
test('Sumar annual top-rate scenario keeps current payroll withholding', () => {
  const input = { ...DEFAULT_INPUT, salary: 500000 };
  const current = computePayroll(input, CURRENT_SCENARIO);
  const proposed = computePayroll(input, proposalScenario('sumar2023'));
  assert.equal(proposed.incomeTax.withheld, current.incomeTax.withheld);
  assert.ok(proposed.incomeTax.annualTax > current.incomeTax.annualTax);
});
