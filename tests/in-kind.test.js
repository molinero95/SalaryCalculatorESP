// Taxable pay in kind on top of the cash salary (common regime). Expected values are
// hand calculations: art. 147.1 LGSS (contribution base), AEAT withholding algorithm
// (RETRIB includes pay in kind), art. 102 RIRPF (ingreso a cuenta) and art. 43.2 LIRPF.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePayroll } from '../js/calc.js';
import { DEFAULT_INPUT, CURRENT_SCENARIO, clone } from '../js/defaults.js';
import { foralProfileIssues, fiscalProfileIssues } from '../js/domain/fiscal-profile.js';
import { createSession, importSession } from '../js/application/simulation-session.js';

const cents = (x) => Math.round(x * 100) / 100;
const run = (input) =>
  computePayroll(
    { ...clone(DEFAULT_INPUT), salary: 30000, inKindContribution: 3000, inKindContributionConfirmed: true, ...input },
    clone(CURRENT_SCENARIO),
  );

test('contribution valuation is required and confirmed independently of the tax value', () => {
  for (const extra of [
    {},
    { inKindContribution: 3000 },
    { inKindContribution: NaN, inKindContributionConfirmed: true },
    { inKindContribution: -1, inKindContributionConfirmed: true },
  ]) {
    const input = { ...clone(DEFAULT_INPUT), salary: 30000, inKindTaxable: 3000, ...extra };
    assert.deepEqual(fiscalProfileIssues(input), ['inKindContributionMissing']);
    assert.throws(() => computePayroll(input, clone(CURRENT_SCENARIO)), /Unsupported fiscal profile/);
  }
  const restored = createSession({ input: { inKindTaxable: 3000 } });
  assert.deepEqual(fiscalProfileIssues(restored.input), ['inKindContributionMissing']);
  for (const value of [undefined, null, '2000', -1, 1e10, NaN]) {
    const invalid = createSession({
      input: { inKindTaxable: 3000, inKindContribution: value, inKindContributionConfirmed: true },
    });
    assert.deepEqual(fiscalProfileIssues(invalid.input), ['inKindContributionMissing']);
  }
  const valid = createSession({
    input: { inKindTaxable: 3000, inKindContribution: 2000, inKindContributionConfirmed: true },
  });
  assert.deepEqual(fiscalProfileIssues(valid.input), []);
  importSession(valid, { input: { inKindTaxable: 3100 }, simulation: {} });
  assert.deepEqual(fiscalProfileIssues(valid.input), ['inKindContributionMissing']);
});

test('independent contribution valuation controls SS and the deductible expense, not tax valuation', () => {
  const r = run({ inKindTaxable: 3000, inKindContribution: 2000 });
  // Confirmed cotizable remuneration: 30,000 + 2,000; employee 6.5%, employer 32.15%.
  assert.equal(cents(r.employee.total), 2080);
  assert.equal(cents(r.employer.total), 10288);
  // IRPF remains based on 33,000: 33,000 - 2,080 - 2,000 = 28,920;
  // quota 6,841.50 - 1,054.50 = 5,787; truncated rate 17.53%.
  assert.equal(r.incomeTax.rate, 17.53);
  assert.equal(cents(r.incomeTax.annualTax), 5787);
  assert.equal(r.incomeTax.inKindAdvance, 525.9);
  assert.equal(cents(r.netAnnual), 22135.1);
  const borne = run({ inKindTaxable: 3000, inKindContribution: 2000, inKindAdvanceBorne: true });
  assert.equal(cents(borne.employee.total), 2080);
  assert.equal(cents(borne.incomeTax.annualTax), 5944.77);
  assert.equal(cents(borne.netAnnual), 22661);
});

test('confirmed contribution amount may include an applicable advance adjustment or a zero valuation', () => {
  // The engine uses the independently confirmed figure; it does not infer the legal adjustment.
  assert.equal(
    cents(run({ inKindTaxable: 3000, inKindContribution: 3500, inKindAdvanceBorne: true }).employee.total),
    2177.5,
  );
  assert.equal(cents(run({ inKindTaxable: 3000, inKindContribution: 0 }).employee.total), 1950);
});

test('3,000 € in kind deducted from pay: contributions, withholding and annual return', () => {
  const r = run({ inKindTaxable: 3000 });
  // Contribution base (30,000 + 3,000) / 12 = 2,750 €/month at 6.5 % employee rates.
  assert.equal(cents(r.employee.total), 2145);
  // Base 33,000 − 2,145 − 2,000 = 28,855; quota 6,822 − 1,054.50 = 5,767.50; rate 17.477 % → 17.47 %.
  assert.equal(r.incomeTax.rate, 17.47);
  assert.equal(cents(r.incomeTax.withheld), 5765.1);
  assert.equal(r.incomeTax.inKindAdvance, 524.1);
  assert.equal(cents(r.netAnnual), 22089.9);
  assert.equal(cents(r.incomeTax.annualTax), 5767.5);
  assert.equal(cents(r.incomeTax.refund), -2.4);
});

test('an ingreso a cuenta borne by the employer is taxed as pay in kind and not deducted', () => {
  const r = run({ inKindTaxable: 3000, inKindAdvanceBorne: true });
  assert.equal(cents(r.incomeTax.withheld), 5765.1);
  // Net pay only loses the cash withholding: 30,000 − 2,145 − 5,241.
  assert.equal(cents(r.netAnnual), 22614);
  // Annual base 33,524.10 − 2,145 − 2,000 = 29,379.10; quota 6,979.23 − 1,054.50.
  assert.equal(cents(r.incomeTax.annualTax), 5924.73);
  assert.equal(cents(r.incomeTax.refund), -159.63);
});

test('without pay in kind nothing changes', () => {
  const r = run({});
  assert.equal(r.incomeTax.inKind, 0);
  assert.equal(r.incomeTax.inKindAdvance, 0);
  assert.equal(r.incomeTax.withheldFromPay, r.incomeTax.withheld);
});

test('pay in kind counts towards the 30 % in-kind limit of the Workers’ Statute', () => {
  // 3,000 flexible + 10,000 taxable in kind = 13,000 > 30 % of 40,000.
  assert.equal(run({ flexMeal: 3000, inKindTaxable: 10000 }).flexible.overCap, true);
  assert.equal(run({ flexMeal: 3000, inKindTaxable: 5000 }).flexible.overCap, false);
});

test('foral profiles explain that pay in kind is not modelled', () => {
  assert.deepEqual(foralProfileIssues({ ...DEFAULT_INPUT, region: 'bizkaia', inKindTaxable: 1000 }), [
    'foralIssueInKind',
  ]);
  assert.throws(() => run({ region: 'bizkaia', inKindTaxable: 1000 }));
});

test('employer-borne advance does not create pension savings without a pension', () => {
  const r = run({ inKindTaxable: 3000, inKindAdvanceBorne: true });
  assert.equal(r.pension.taxSaved, 0);
});

test('pension savings use the same employer-borne income on both sides', () => {
  const r = run({ inKindTaxable: 3000, inKindAdvanceBorne: true, pensionIndividual: 1500 });
  // No-pension tax 5,924.73; a 1,500 deduction at the 30 % marginal rate saves 450.
  assert.equal(cents(r.incomeTax.annualTax), 5474.73);
  assert.equal(cents(r.pension.taxSaved), 450);
});

test('employer cost includes the entered in-kind value and any borne advance', () => {
  // Employer contributions on 33,000 at 32.15 % = 10,609.50.
  assert.equal(cents(run({ inKindTaxable: 3000 }).employerCost), 43609.5);
  const r = run({ inKindTaxable: 3000, inKindAdvanceBorne: true });
  assert.equal(cents(r.employerCost), 44133.6);
  // Tax + employee SS = 5,924.73 + 2,145 = 8,069.73; compensation includes 524.10.
  assert.equal(cents(r.effectiveRate), 24.07);
  // Total tax/contributions 18,679.23 over 44,133.60 of estimated employer cost.
  assert.equal(cents(r.taxWedge), 42.32);
});
