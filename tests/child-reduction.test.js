import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePayroll, applyScale } from '../js/calc.js';
import { DEFAULT_INPUT, GENERAL_REGIONAL_SCALE, CURRENT_SCENARIO } from '../js/defaults.js';
import { proposalScenario } from '../js/political.js';
import { REGIONAL_SCALES, REGIONAL_ALLOWANCES } from '../js/data/regions.js';

// Minimum of the law in force (arts. 57-58 LIRPF), shared between both parents: the
// Vox bill changes only the state minimum, so the regional quota keeps these amounts.
const currentMinimum = (children) => {
  const perChild = [2400, 2700, 4000, 4500];
  let total = 0;
  for (let i = 0; i < children; i++) total += perChild[Math.min(i, 3)];
  return 5550 + total / 2;
};

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
      assert.equal(minimum, 22000 + (currentMinimum(children) - 5550));
      const regionalMinimum = currentMinimum(children);
      const expected = Math.max(
        0,
        applyScale(state, base) -
          applyScale(state, minimum) +
          applyScale(GENERAL_REGIONAL_SCALE, base) -
          applyScale(GENERAL_REGIONAL_SCALE, regionalMinimum),
      );
      assert.ok(Math.abs(result.incomeTax.annualTax - expected) <= 0.00501);
      assert.ok(Number.isFinite(result.netAnnualAfterReturn));
    });
  }
}

for (const region of ['madrid', 'catalonia', 'andalusia']) {
  if (!REGIONAL_SCALES[region]) continue;
  test(`a fully reduced state share still pays regional tax in ${region}`, () => {
    const input = { ...DEFAULT_INPUT, salary: 120000, children: 7, region };
    const result = computePayroll(input, proposalScenario('vox2024', 'Vox'));
    // Regional quota: the community's own minima, otherwise today's state amounts.
    const own = REGIONAL_ALLOWANCES[region];
    const minimum = own
      ? own.personalAllowance +
        (own.child1Allowance + own.child2Allowance + own.child3Allowance + 4 * own.child4Allowance) / 2
      : currentMinimum(7);
    const expected = Math.max(
      0,
      applyScale(REGIONAL_SCALES[region].brackets, result.incomeTax.annualBase) -
        applyScale(REGIONAL_SCALES[region].brackets, minimum),
    );
    assert.ok(expected > 0);
    assert.ok(Math.abs(result.incomeTax.annualTax - expected) <= 0.00501);
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

test('the Vox minimum leaves every regional quota unchanged and flags the withholding shortfall', () => {
  for (const region of ['general', 'catalonia', 'madrid']) {
    const input = { ...DEFAULT_INPUT, salary: 30000, region };
    const vox = computePayroll(input, proposalScenario('vox2024', 'Vox'));
    const today = computePayroll(input, structuredClone(CURRENT_SCENARIO));
    assert.equal(Math.round(vox.incomeTax.regionalTax * 100), Math.round(today.incomeTax.regionalTax * 100), region);
    // Gross 30,000: base 26,050; state 15 % on 4,050 over the 22,000 minimum.
    assert.equal(Math.round(vox.incomeTax.stateTax * 100) / 100, 607.5, region);
    assert.ok(vox.incomeTax.refund < 0, region);
    assert.equal(vox.incomeTax.withholdingShortfall, -vox.incomeTax.refund, region);
    assert.equal(today.incomeTax.withholdingShortfall, 0, region);
  }
});
