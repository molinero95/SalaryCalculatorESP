import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_INPUT, CURRENT_SCENARIO } from '../js/defaults.js';
import { computePayroll } from '../js/calc.js';
import { foralAdditionalIncome, foralSavingsTax, foralHousingCredit } from '../js/domain/foral-assessment.js';
import { foralAnnualTax, foralEmploymentIncome } from '../js/foral-tax.js';
const regions = ['bizkaia', 'gipuzkoa', 'alava', 'navarra'];
const input = (region, extra = {}) => ({ ...DEFAULT_INPUT, region, foralAnnualConfirmed: true, ...extra });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.0051, `${actual} != ${expected}`);
// Published cumulative savings quotas: Basque NF art.76 (2026), Navarre art.60.
for (const region of regions) {
  const rows =
    region === 'navarra'
      ? [
          [6000, 1200],
          [10000, 2080],
          [15000, 3280],
          [200000, 51380],
          [300000, 78380],
          [300001, 78380.28],
        ]
      : [
          [7500, 1425],
          [15000, 2925],
          [30000, 6225],
          [50000, 11025],
          [90000, 21225],
          [120000, 29025],
          [240000, 60825],
          [300000, 77025],
          [300001, 77025.28],
        ];
  for (const [base, quota] of rows)
    test(`${region}: official savings quota at ${base}`, () => close(foralSavingsTax(region, base), quota));
  test(`${region}: one €12,000 permanent-housing lease with €1,000 expenses and €400 insurance`, () => {
    const i = input(region, { foralRentalGross: 12000, foralRentalExpenses: 1000, foralRentalInsurance: 400 });
    const result = computePayroll(i, CURRENT_SCENARIO);
    const baseline = computePayroll(input(region), CURRENT_SCENARIO);
    close(foralAdditionalIncome(i).rental, region === 'navarra' ? 11000 : 7100);
    close(result.incomeTax.annualBase, region === 'navarra' ? 39050 : 25050);
    close(result.incomeTax.savingsBase, region === 'navarra' ? 0 : 7100);
    close(result.incomeTax.annualTax, region === 'navarra' ? 8100.53 : 5844);
    close(result.netAnnual, baseline.netAnnual);
    close(result.incomeTax.withheld, baseline.incomeTax.withheld);
    close(result.pension.taxSaved, 0);
  });
  test(`${region}: public rental programme uses the statutory 70% allowance`, () => {
    const i = input(region, {
      foralRentalGross: 12000,
      foralRentalExpenses: 1000,
      foralRentalInsurance: 400,
      foralRentalPublic: true,
    });
    close(foralAdditionalIncome(i).rental, region === 'navarra' ? 3300 : 2600);
    close(computePayroll(i, CURRENT_SCENARIO).incomeTax.annualTax, region === 'navarra' ? 5656.63 : 4989);
  });
  test(`${region}: financing/property expenses cannot make rental income negative`, () =>
    close(foralAdditionalIncome(input(region, { foralRentalGross: 1000, foralRentalExpenses: 5000 })).rental, 0));
  test(`${region}: €10,000 fiscal business profit changes annual general tax, never payroll cash`, () => {
    const result = computePayroll(input(region, { foralActivityIncome: 10000 }), CURRENT_SCENARIO);
    close(result.incomeTax.annualTax, region === 'navarra' ? 7735.53 : 7295);
    close(result.netAnnual, region === 'navarra' ? 23670 : 23550);
    close(result.pension.taxSaved, 0);
  });
  test(`${region}: prepaid tax is counted exactly once in the annual settlement`, () => {
    const baseline = computePayroll(input(region, { foralSavingsIncome: 1000 }), CURRENT_SCENARIO);
    const result = computePayroll(
      input(region, { foralSavingsIncome: 1000, foralOtherWithholding: 190 }),
      CURRENT_SCENARIO,
    );
    close(result.incomeTax.refund - baseline.incomeTax.refund, 190);
    close(result.netAnnual, baseline.netAnnual);
    close(result.incomeTax.annualTax, region === 'navarra' ? 4696.75 : 4685);
  });
  for (const [age, credit, annual] of region === 'navarra'
    ? [
        [29, 1600, 2806.35],
        [30, 1500, 2906.35],
      ]
    : [
        [35, 2800, 1695],
        [36, 1600, 2895],
      ]) {
    test(`${region}: €10,000 habitual rent paid by an employee aged ${age}`, () => {
      const result = computePayroll(input(region, { age, foralRentPaid: 10000 }), CURRENT_SCENARIO);
      close(result.incomeTax.housingCredit, credit);
      close(result.incomeTax.annualTax, annual);
    });
  }
  test(`${region}: other annual income requires explicit eligibility confirmation`, () =>
    assert.throws(
      () => computePayroll(input(region, { foralAnnualConfirmed: false, foralSavingsIncome: 1000 }), CURRENT_SCENARIO),
      /Unsupported foral/,
    ));
}
for (const region of regions.slice(0, 3)) {
  test(`${region}: €1,615 general reduction cannot consume savings quota`, () =>
    close(foralAnnualTax(input(region), 0, { savingsBase: 1000 }).tax, 190));
  test(`${region}: other-income boundary changes employment bonification above €7,500`, () => {
    close(foralEmploymentIncome(input(region, { foralSavingsIncome: 7500 }), 20000, 1300).reduction, 5621.78);
    close(foralEmploymentIncome(input(region, { foralSavingsIncome: 7500.01 }), 20000, 1300).reduction, 3000);
  });
  for (const [general, savings, expected] of [
    [68000, 0, 2800],
    [68000.01, 0, 0],
    [10000, 68000, 2800],
    [10000, 68000.01, 0],
  ]) {
    test(`${region}: habitual-rent base limits ${general}/${savings}`, () =>
      close(foralHousingCredit(input(region, { foralRentPaid: 10000 }), general, savings, 100000), expected));
  }
}
for (const [income, paid, expected] of [
  [30000, 3000, 0],
  [30000, 3000.01, 450.0015],
  [30000.01, 10000, 0],
]) {
  test(`Navarra: habitual rent strict 10% threshold and income cap ${income}/${paid}`, () =>
    close(foralHousingCredit(input('navarra', { foralRentPaid: paid }), 10000, 0, income), expected));
}
test('Navarra: exempt nonemployment income reduces income-dependent credits, without creating taxable income', () => {
  const result = computePayroll(input('navarra', { foralExemptIncome: 10000 }), CURRENT_SCENARIO);
  close(result.incomeTax.annualBase, 28050);
  close(result.incomeTax.annualTax, 4732.63);
});
test('common-regime residence ignores saved foral annual fields', () => {
  const baseline = computePayroll({ ...DEFAULT_INPUT, region: 'madrid' }, CURRENT_SCENARIO);
  assert.deepEqual(
    computePayroll(
      input('madrid', { foralSavingsIncome: 10000, foralRentalGross: 12000, foralRentPaid: 10000 }),
      CURRENT_SCENARIO,
    ),
    baseline,
  );
});

test('mixed-income profiles do not display wage-only rate/wedge indicators', () => {
  const r = computePayroll(input('bizkaia', { foralOtherWithholding: 10000 }), CURRENT_SCENARIO);
  assert.equal(r.effectiveRate, null);
  assert.equal(r.taxWedge, null);
});
