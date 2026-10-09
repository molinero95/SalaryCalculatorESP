import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePayroll } from '../js/calc.js';
import { DEFAULT_INPUT, CURRENT_SCENARIO } from '../js/defaults.js';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
// Orden PJC/297/2026, arts.2–4,17 and 32: common regime, monthly groups 4–7.
for (const monthly of [
  1424.39, 1424.4, 1424.41, 5101.19, 5101.2, 5101.21, 5611.31, 5611.32, 5611.33, 7651.79, 7651.8, 7651.81, 10000,
]) {
  for (const contract of ['permanent', 'temporary']) {
    test(`official employee/employer contributions: monthly ${monthly}, ${contract}`, () => {
      const result = computePayroll({ ...DEFAULT_INPUT, salary: monthly * 12, contract }, CURRENT_SCENARIO);
      const base = Math.min(5101.2, Math.max(1424.4, monthly));
      close(result.employee.monthlyBase, base);
      close(result.employee.items.commonContingencies, base * 0.047 * 12);
      close(result.employee.items.unemployment, base * (contract === 'temporary' ? 0.016 : 0.0155) * 12);
      close(result.employee.items.training, base * 0.001 * 12);
      close(result.employee.items.mei, base * 0.0015 * 12);
      close(result.employer.items.commonContingencies, base * 0.236 * 12);
      close(result.employer.items.unemployment, base * (contract === 'temporary' ? 0.067 : 0.055) * 12);
      close(result.employer.items.training, base * 0.006 * 12);
      close(result.employer.items.mei, base * 0.0075 * 12);
      close(result.employer.items.fogasa, base * 0.002 * 12);
      const band1 = Math.max(0, Math.min(monthly, 5611.32) - 5101.2);
      const band2 = Math.max(0, Math.min(monthly, 7651.8) - 5611.32);
      const band3 = Math.max(0, monthly - 7651.8);
      close(result.employee.items.solidarity, 12 * (band1 * 0.0019 + band2 * 0.0021 + band3 * 0.0024));
      close(result.employer.items.solidarity, 12 * (band1 * 0.0096 + band2 * 0.0104 + band3 * 0.0122));
    });
  }
}
