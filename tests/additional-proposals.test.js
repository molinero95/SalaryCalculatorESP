import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_INPUT, CURRENT_SCENARIO } from '../js/defaults.js';
import { PROPOSALS, UNMODELLED_PROPOSALS } from '../js/data/proposals.js';
import { proposalScenario } from '../js/political.js';
import { annualTax } from '../js/tax.js';
import { computePayroll } from '../js/calc.js';

for (const [base, saving] of [
  [0, 0],
  [5550, 0],
  [5551, 0.01],
  [12449, 68.99],
  [12450, 69],
  [12451, 69],
  [26050, 69],
  [350000, 69],
]) {
  test(`Podemos first-band component independently saves ${saving} at base ${base}`, () => {
    const input = { ...DEFAULT_INPUT, region: 'madrid' };
    const current = annualTax(input, CURRENT_SCENARIO.incomeTax, base, 100000);
    const proposal = annualTax(input, proposalScenario('podemos2019').incomeTax, base, 100000);
    assert.ok(Math.abs(current.tax - proposal.tax - saving) < 0.011);
    assert.equal(proposal.regionalTax, current.regionalTax);
  });
}
for (const region of ['madrid', 'catalonia', 'andalusia', 'general']) {
  test(`${region}: historical first-band component keeps payroll withholding separate`, () => {
    const input = { ...DEFAULT_INPUT, region };
    const current = computePayroll(input, CURRENT_SCENARIO);
    const proposal = computePayroll(input, proposalScenario('podemos2019'));
    assert.equal(proposal.netAnnual, current.netAnnual);
    assert.ok(Math.abs(proposal.netAnnualAfterReturn - current.netAnnualAfterReturn - 69) < 0.01);
  });
}
for (const region of ['navarra', 'bizkaia', 'gipuzkoa', 'alava']) {
  test(`${region}: historical Podemos component cannot substitute foral law`, () => {
    assert.throws(
      () => computePayroll({ ...DEFAULT_INPUT, region }, proposalScenario('podemos2019')),
      /Unsupported foral fiscal scenario/,
    );
  });
}
test('historical source and unquantified deflation remain honestly scoped', () => {
  assert.equal(PROPOSALS.podemos2019.date, '2019-10');
  assert.equal(PROPOSALS.podemos2019.status, 'partial');
  assert.equal(PROPOSALS.podemos2019.sourceType, 'official');
  assert.equal(PROPOSALS.podemos2025, undefined);
  const pp = UNMODELLED_PROPOSALS.find((p) => p.id === 'pp2025deflation');
  assert.equal(pp.sourceType, 'official');
  assert.equal(pp.status, 'unmodelled');
  assert.equal(pp.changes, undefined);
  assert.equal(pp.date, '2025-02-20');
});
