import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePayroll, applyScale } from '../js/calc.js';
import { DEFAULT_INPUT, GENERAL_REGIONAL_SCALE } from '../js/defaults.js';
import { proposalScenario } from '../js/political.js';
import { REGIONAL_SCALES, REGIONAL_ALLOWANCES } from '../js/data/regions.js';

for (const children of [0, 1, 2, 4, 7]) {
  for (const salary of [30000, 73000, 120000]) {
    test(`Vox state reduction matches independently calculated tax: ${children} children, ${salary} gross`, () => {
      const scenario = proposalScenario('vox2024', 'Vox');
      const input = { ...DEFAULT_INPUT, children, salary };
      const result = computePayroll(input, scenario);
      const state = [
        { upTo: 70000, rate: Math.max(0, 15 - 4 * children) },
        { upTo: null, rate: Math.max(0, 25 - 4 * children) },
      ];
      const base = result.incomeTax.annualBase;
      const minimum = result.incomeTax.allowance.total;
      const expected = Math.max(
        0,
        applyScale(state, base) -
          applyScale(state, minimum) +
          applyScale(GENERAL_REGIONAL_SCALE, base) -
          applyScale(GENERAL_REGIONAL_SCALE, minimum),
      );
      assert.ok(Math.abs(result.incomeTax.annualTax - expected) < 0.000001);
      assert.ok(Number.isFinite(result.netAnnualAfterReturn));
    });
  }
}

for (const region of ['madrid', 'catalonia', 'andalusia']) {
  if (!REGIONAL_SCALES[region]) continue;
  test(`a fully reduced state share still pays regional tax in ${region}`, () => {
    const input = { ...DEFAULT_INPUT, salary: 120000, children: 7, region };
    const result = computePayroll(input, proposalScenario('vox2024', 'Vox'));
    const regional = { ...proposalScenario('vox2024', 'Vox').incomeTax, ...REGIONAL_ALLOWANCES[region] };
    const minimum =
      regional.personalAllowance +
      (regional.child1Allowance + regional.child2Allowance + regional.child3Allowance + 4 * regional.child4Allowance) /
        2;
    const expected = Math.max(
      0,
      applyScale(REGIONAL_SCALES[region].brackets, result.incomeTax.annualBase) -
        applyScale(REGIONAL_SCALES[region].brackets, minimum),
    );
    assert.ok(expected > 0);
    assert.ok(Math.abs(result.incomeTax.annualTax - expected) < 0.000001);
  });
}

test('a custom child reduction works without selecting a political proposal', () => {
  const scenario = proposalScenario('vox2024', 'Custom');
  scenario.proposal = '';
  scenario.incomeTax.childRateReduction = 2;
  const input = { ...DEFAULT_INPUT, children: 2, salary: 73000 };
  const custom = computePayroll(input, scenario);
  const original = computePayroll(input, { ...scenario, incomeTax: { ...scenario.incomeTax, childRateReduction: 0 } });
  assert.ok(custom.incomeTax.annualTax < original.incomeTax.annualTax);
});
