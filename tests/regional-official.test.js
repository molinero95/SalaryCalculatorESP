import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePayroll } from '../js/calc.js';
import { applyScale, annualTax } from '../js/tax.js';
import { REGIONAL_SCALES } from '../js/data/regions.js';
import { CURRENT_SCENARIO, DEFAULT_INPUT } from '../js/defaults.js';
import { REGIONAL_ROWS } from './fixtures/regional-scales.js';
const close = (actual, expected, tolerance = 0.01) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

// Independent evaluation from published quota + remainder * rate.
function publishedQuota(rows, base) {
  const [from, quota, rate] = rows.findLast(([from]) => from <= base);
  return quota + ((base - from) * rate) / 100;
}
for (const [region, rows] of Object.entries(REGIONAL_ROWS)) {
  for (const [i, [base, quota, rate]] of rows.entries()) {
    test(`official ${region} quota and marginal rate at ${base}`, () => {
      const brackets = REGIONAL_SCALES[region].brackets;
      close(applyScale(brackets, base), quota);
      close(applyScale(brackets, base + 1) - applyScale(brackets, base), rate / 100, 1e-8);
      if (i) {
        const previousRate = rows[i - 1][2];
        close(applyScale(brackets, base) - applyScale(brackets, base - 0.01), previousRate / 10000, 1e-8);
      }
    });
  }
  for (const base of [0, 4000, 15000, 30000, 80000, 400000]) {
    test(`annual state + ${region} quota at base ${base}`, () => {
      const result = annualTax({ ...DEFAULT_INPUT, region }, CURRENT_SCENARIO.incomeTax, base, 500000);
      const expectedRegional = Math.max(
        0,
        publishedQuota(rows, base) - publishedQuota(rows, Math.min(base, result.regionalAllowance.total)),
      );
      close(result.regionalTax, expectedRegional);
      assert.ok(result.stateTax >= 0);
      close(result.tax, result.stateTax + expectedRegional, 0.015);
    });
  }
}

test('a regional minimum larger than the base cannot erase the state quota', () => {
  const result = annualTax({ ...DEFAULT_INPUT, region: 'asturias' }, CURRENT_SCENARIO.incomeTax, 5800, 30000);
  close(result.regionalTax, 0);
  close(result.stateTax, 23.75);
  close(result.tax, 23.75);
});

// Realistic fictional payroll in every common-regime community. Independent
// published quota rows above and independently recorded 2026 personal minima.
// €30,000 salary - €1,950 SS - €2,000 expenses = €26,050 annual base.
// State quota: €2,112.75 + €5,850 × 15% - €5,550 × 9.5% = €2,463.
const personalMinima = {
  andalusia: 5790,
  asturias: 6105,
  canary: 5606,
  valencia: 6105,
  galicia: 5789,
  madrid: 5956.65,
};
for (const [region, rows] of Object.entries(REGIONAL_ROWS)) {
  test(`${region}: independently worked €30,000 employee payroll`, () => {
    const r = computePayroll({ ...DEFAULT_INPUT, region }, CURRENT_SCENARIO);
    const regional = publishedQuota(rows, 26050) - publishedQuota(rows, personalMinima[region] ?? 5550);
    close(r.employee.total, 1950);
    close(r.incomeTax.annualBase, 26050);
    close(r.incomeTax.stateTax, 2463);
    close(r.incomeTax.annualTax, 2463 + regional, 0.015);
    close(r.incomeTax.withheld, 4926);
    close(r.netAnnualAfterReturn, 28050 - r.incomeTax.annualTax);
  });
}
