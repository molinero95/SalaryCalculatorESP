import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CURRENT_SCENARIO, DEFAULT_INPUT, clone } from '../js/defaults.js';
import { unsupportedFiscalScenario } from '../js/domain/fiscal-profile.js';
import { computePayroll } from '../js/calc.js';
import { proposalScenario, indexedScenario } from '../js/political.js';

for (const region of ['navarra', 'bizkaia', 'gipuzkoa', 'alava']) {
  const input = { ...DEFAULT_INPUT, region };
  for (const proposal of ['vox2024', 'sumar2023']) {
    test(`${region}: ${proposal} never returns an unchanged fake comparison`, () => {
      assert.equal(unsupportedFiscalScenario(input, proposalScenario(proposal)), true);
      assert.throws(() => computePayroll(input, proposalScenario(proposal)), /Unsupported foral fiscal scenario/);
    });
  }
  for (const group of ['incomeTax', 'flexible', 'pension']) {
    test(`${region}: changed ${group} is unsupported but names and property order are irrelevant`, () => {
      const scenario = clone(CURRENT_SCENARIO);
      scenario.name = 'Renamed';
      scenario[group] = Object.fromEntries(Object.entries(scenario[group]).reverse());
      assert.equal(unsupportedFiscalScenario(input, scenario), false);
      const numeric = Object.keys(scenario[group]).find((key) => typeof scenario[group][key] === 'number');
      scenario[group][numeric] += 1;
      assert.equal(unsupportedFiscalScenario(input, scenario), true);
      assert.throws(() => computePayroll(input, scenario), /Unsupported foral fiscal scenario/);
    });
  }
  test(`${region}: supported employee contribution changes still affect payroll`, () => {
    const scenario = clone(CURRENT_SCENARIO);
    scenario.employee.commonContingencies += 1;
    assert.equal(unsupportedFiscalScenario(input, scenario), false);
    const current = computePayroll(input, CURRENT_SCENARIO);
    const result = computePayroll(input, scenario);
    assert.equal(result.employee.total - current.employee.total, 300);
    assert.notEqual(result.netAnnual, current.netAnnual);
  });
  test(`${region}: common inflation-indexing is explicitly unsupported`, () => {
    assert.equal(unsupportedFiscalScenario(input, indexedScenario(CURRENT_SCENARIO, 10, 'Indexed')), true);
  });
}
test('Madrid retains the independently worked Vox payroll and annual figures', () => {
  const input = { ...DEFAULT_INPUT, region: 'madrid' };
  const scenario = proposalScenario('vox2024');
  assert.equal(unsupportedFiscalScenario(input, scenario), false);
  const result = computePayroll(input, scenario);
  assert.equal(result.netAnnual, 27444);
  assert.equal(result.netAnnualAfterReturn, 25307.48);
});
