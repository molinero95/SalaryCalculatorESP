import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyScale, computePayroll } from '../js/calc.js';
import { CURRENT_SCENARIO, DEFAULT_INPUT } from '../js/defaults.js';

// AEAT 2026 algorithm (effective 10 September), printed p.30, Table 2 and example.
// https://sede.agenciatributaria.gob.es/static_files/Sede/Programas_ayuda/Retenciones/2026/Algoritmo%20Retenciones-2026_10sept.pdf
// These are official scale fixtures, not a certification of the full payroll engine.
for (const [base, quota] of [
  [0, 0],
  [12450, 2365.5],
  [20200, 4225.5],
  [24000, 5365.5],
  [35200, 8725.5],
  [60000, 17901.5],
  [300000, 125901.5],
]) {
  test(`AEAT published scale: base ${base} gives quota ${quota}`, () => {
    assert.ok(Math.abs(applyScale(CURRENT_SCENARIO.incomeTax.brackets, base) - quota) < 0.000001);
  });
}

for (const threshold of [12450, 20200, 35200, 60000, 300000]) {
  test(`tax scale is continuous at ${threshold}`, () => {
    const below = applyScale(CURRENT_SCENARIO.incomeTax.brackets, threshold - 0.01);
    const above = applyScale(CURRENT_SCENARIO.incomeTax.brackets, threshold + 0.01);
    assert.ok(above >= below);
    assert.ok(above - below <= 0.01);
  });
}

for (const age of [64, 65, 74, 75, 100]) {
  test(`AEAT personal allowance includes age threshold ${age}`, () => {
    const result = computePayroll({ ...DEFAULT_INPUT, age }, CURRENT_SCENARIO);
    assert.equal(result.incomeTax.allowance.personal, 5550 + (age >= 65 ? 1150 : 0) + (age >= 75 ? 1400 : 0));
  });
}

for (const salary of [0, 1, 15876, 17094, 20048.45, 30000, 61214.4, 100000, 1000000]) {
  test(`12 and 14 payments reconcile at ${salary} gross`, () => {
    const twelve = computePayroll({ ...DEFAULT_INPUT, salary, payments: 12 }, CURRENT_SCENARIO);
    const fourteen = computePayroll({ ...DEFAULT_INPUT, salary, payments: 14 }, CURRENT_SCENARIO);
    for (const result of [twelve, fourteen]) {
      assert.ok(Number.isFinite(result.netAnnual));
      assert.ok(Math.abs(result.netRegularPayment * 12 + result.netExtraPayment * 2 - result.netAnnual) < 0.000001);
      assert.ok(result.incomeTax.withheld >= 0);
    }
    assert.ok(Math.abs(twelve.netAnnual - fourteen.netAnnual) < 0.000001);
  });
}
