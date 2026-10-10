import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOUSING_RULES, HOUSING_RESEARCH } from '../js/data/housing-rules.js';
import {
  normalizeHousing,
  housingRulesFor,
  assessHousing,
  housingWithholdingPoints,
  HOUSING_TENURES,
} from '../js/domain/housing.js';
import { normalizeInput } from '../js/domain/payroll-input.js';
import { computePayroll } from '../js/calc.js';
import { CURRENT_SCENARIO, DEFAULT_INPUT, clone } from '../js/defaults.js';

// The 15 common-regime communities, listed independently of the data files.
const COMMON_REGIONS = [
  'andalusia',
  'aragon',
  'asturias',
  'balearic',
  'canary',
  'cantabria',
  'castillaLaMancha',
  'castillaLeon',
  'catalonia',
  'extremadura',
  'galicia',
  'madrid',
  'murcia',
  'rioja',
  'valencia',
];

test('the catalogue covers the 2026 research with unique ids and valid metadata', () => {
  assert.equal(HOUSING_RESEARCH.fiscalYear, 2026);
  const ids = HOUSING_RULES.map((rule) => rule.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const rule of HOUSING_RULES) {
    assert.ok(rule.region === null || COMMON_REGIONS.includes(rule.region), rule.id);
    assert.ok(['tenant', 'buyer', 'landlord', 'any'].includes(rule.side), rule.id);
    assert.ok(['L1', 'L2', 'L3'].includes(rule.level), rule.id);
    assert.ok(['inForce', 'provisional'].includes(rule.legalStatus), rule.id);
    assert.equal(new URL(rule.url).protocol, 'https:', rule.id);
    assert.ok(rule.article.trim(), rule.id);
  }
});

test('every common-regime community has at least one tenant rule, as the research found', () => {
  for (const region of COMMON_REGIONS)
    assert.ok(
      HOUSING_RULES.some((rule) => rule.region === region && rule.side === 'tenant'),
      region,
    );
});

test('research facts are kept: four state rules, only DT 18ª touches payroll, the new rent deduction is provisional', () => {
  assert.deepEqual(
    HOUSING_RULES.filter((rule) => rule.region === null).map((rule) => rule.id),
    ['S1', 'S2', 'S3', 'S4'],
  );
  assert.deepEqual(
    HOUSING_RULES.filter((rule) => rule.payrollEffect).map((rule) => rule.id),
    ['S3'],
  );
  assert.deepEqual(
    HOUSING_RULES.filter((rule) => rule.legalStatus === 'provisional').map((rule) => rule.id),
    ['S1'],
  );
  // Regional rules stay at the compendium level unless their regional text was checked.
  assert.deepEqual(
    HOUSING_RULES.filter((rule) => rule.region !== null && rule.level === 'L1').map((rule) => rule.id),
    [
      'AND-1',
      'AST-1',
      'BAL-1',
      'CLM-1',
      'CLM-2',
      'CLM-3',
      'CLM-4',
      'CAT-1',
      'EXT-1',
      'GAL-1',
      'RIO-1',
      'MAD-1',
      'MUR-1',
    ],
  );
  assert.ok(HOUSING_RULES.filter((rule) => rule.region !== null).every((rule) => ['L1', 'L2'].includes(rule.level)));
});

test('housing input defaults to "not provided" and rejects invalid values', () => {
  assert.equal(DEFAULT_INPUT.housingTenure, 'notProvided');
  assert.equal(DEFAULT_INPUT.housingRentPaid, 0);
  assert.deepEqual(HOUSING_TENURES, ['notProvided', 'tenant', 'owner', 'other']);
  for (const [tenure, rent, expected] of [
    ['squatter', 500, ['notProvided', 500]],
    [undefined, -1, ['notProvided', 0]],
    ['tenant', Number.NaN, ['tenant', 0]],
    ['owner', '1200.5', ['owner', 1200.5]],
    ['tenant', 1e12, ['tenant', 1e9]],
  ]) {
    const input = normalizeHousing({ housingTenure: tenure, housingRentPaid: rent });
    assert.deepEqual([input.housingTenure, input.housingRentPaid], expected);
  }
});

test('payroll input normalization also normalizes housing, including sessions saved before it existed', () => {
  const legacy = clone(DEFAULT_INPUT);
  delete legacy.housingTenure;
  delete legacy.housingRentPaid;
  const input = normalizeInput(legacy);
  assert.equal(input.housingTenure, 'notProvided');
  assert.equal(input.housingRentPaid, 0);
});

test('candidate rules are the state ones plus the selected community; foral territories get none', () => {
  const ids = (region) => housingRulesFor(region).map((rule) => rule.id);
  assert.deepEqual(ids('general'), ['S1', 'S2', 'S3', 'S4']);
  assert.ok(ids('madrid').includes('MAD-1'));
  assert.ok(!ids('madrid').some((id) => id.startsWith('CAT-') || id.startsWith('BAL-')));
  for (const region of ['bizkaia', 'gipuzkoa', 'alava', 'navarra']) assert.deepEqual(ids(region), []);
});

test('without eligibility confirmed nothing is applied, and every skipped rule says why', () => {
  const reasons = (input) =>
    Object.fromEntries(assessHousing({ ...clone(DEFAULT_INPUT), ...input }).skipped.map((s) => [s.id, s.reason]));

  const notProvided = assessHousing({ ...clone(DEFAULT_INPUT), region: 'madrid' });
  assert.equal(notProvided.modelled, false);
  assert.equal(notProvided.scope, 'stateAndRegional');
  assert.equal(notProvided.claimed, 0);
  assert.deepEqual(notProvided.applied, []);
  assert.equal(reasons({ region: 'madrid' })['MAD-1'], 'housingNotProvided');

  const tenant = reasons({ region: 'madrid', housingTenure: 'tenant', housingRentPaid: 9600 });
  assert.equal(tenant['MAD-1'], 'requirementsNotConfirmed');
  assert.equal(tenant.S1, 'provisionalLaw');
  assert.equal(tenant.S2, 'notEligible');
  assert.equal(tenant['MAD-6'], 'notImplemented');
  assert.equal(tenant['MAD-2'], 'notApplicableToTenure');
  assert.equal(tenant['L-MAD-a'], 'requiresRentalIncome');
  assert.equal(tenant.S4, 'requiresRentalIncome');

  const owner = reasons({ region: 'madrid', housingTenure: 'owner' });
  assert.equal(owner.S3, 'notEligible');
  assert.equal(owner['MAD-1'], 'notApplicableToTenure');

  assert.ok(
    Object.values(reasons({ region: 'madrid', housingTenure: 'other' })).every(
      (r) => r === 'notApplicableToTenure' || r === 'requiresRentalIncome',
    ),
  );
  assert.equal(assessHousing({ ...clone(DEFAULT_INPUT), region: 'general' }).scope, 'stateOnly');
  assert.equal(assessHousing({ ...clone(DEFAULT_INPUT), region: 'navarra' }).scope, 'foralTerritory');
});

test('housing inputs without confirmed eligibility leave every payroll and annual amount unchanged', () => {
  const withoutHousing = (result) => {
    const { housing, ...rest } = result;
    assert.equal(housing.deduction, 0);
    return rest;
  };
  for (const region of ['madrid', 'catalonia', 'general', 'bizkaia']) {
    const base = { ...clone(DEFAULT_INPUT), region, salary: 28000 };
    for (const housing of [
      { housingTenure: 'tenant', housingRentPaid: 9600 },
      { housingTenure: 'owner', housingInvestment: 9000, housingLoanWithholding: true },
      { housingTenure: 'other', housingLeaseBefore2015: true, housingPurchaseBefore2013: true },
    ])
      assert.deepEqual(
        withoutHousing(computePayroll({ ...base, ...housing }, CURRENT_SCENARIO)),
        withoutHousing(computePayroll(base, CURRENT_SCENARIO)),
        region,
      );
  }
});

// Expected values below are hand-calculated from art. 68.7 LIRPF as worded on
// 31-12-2014 (DT 15ª) and arts. 68.1/78 as worded on 31-12-2012 (DT 18ª), not
// from the constants in js/domain/housing.js.
const tenantInput = (rent, extra = {}) => ({
  ...clone(DEFAULT_INPUT),
  region: 'madrid',
  housingTenure: 'tenant',
  housingRentPaid: rent,
  housingLeaseBefore2015: true,
  ...extra,
});
const claim = (input, baseImponible) => assessHousing(input, { baseImponible });
const rounded = (x) => Math.round(x * 100) / 100;

for (const [label, base, rent, total] of [
  ['full base below 17,707.20', 17000, 9600, 908.52], // 10.05 % × 9,040
  ['rent below the cap', 17000, 6000, 603], // 10.05 % × 6,000
  ['tapered base (AEAT example base 2,835.17)', 22100, 9600, 284.93], // 9,040 − 1.4125 × 4,392.80
  ['just below the ceiling', 24107.19, 9600, 0], // base 0.014 €
]) {
  test(`DT 15ª rent: ${label}`, () => {
    const result = claim(tenantInput(rent), base);
    assert.equal(rounded(result.claimed), total);
    assert.equal(rounded(result.state), rounded(result.regional));
  });
}

test('DT 15ª rent stops at a taxable base of 24,107.20 € and needs confirmed eligibility', () => {
  const skip = (input, base) => claim(input, base).skipped.find((s) => s.id === 'S2')?.reason;
  assert.equal(skip(tenantInput(9600), 24107.2), 'incomeAboveLimit');
  assert.equal(skip(tenantInput(9600, { housingLeaseBefore2015: false }), 10000), 'notEligible');
  assert.equal(skip(tenantInput(0), 10000), 'noAmount');
  assert.equal(skip(tenantInput(9600), Number.NaN), 'incomeAboveLimit');
});

const ownerInput = (investment, extra = {}) => ({
  ...clone(DEFAULT_INPUT),
  region: 'madrid',
  housingTenure: 'owner',
  housingInvestment: investment,
  housingPurchaseBefore2013: true,
  ...extra,
});

test('DT 18ª purchase: 7.5 % state and 7.5 % default regional share on up to 9,040 €', () => {
  for (const [investment, share] of [
    [10000, 678], // 9,040 × 7.5 %
    [4000, 300],
  ]) {
    const result = assessHousing(ownerInput(investment));
    assert.equal(rounded(result.state), share);
    assert.equal(rounded(result.regional), share);
  }
  assert.equal(rounded(assessHousing(ownerInput(10000, { region: 'general' })).claimed), 1356);
  for (const region of ['catalonia', 'valencia', 'balearic'])
    assert.equal(
      assessHousing(ownerInput(10000, { region })).skipped.find((s) => s.id === 'S3').reason,
      'regionalRatePending',
    );
  assert.deepEqual(assessHousing(ownerInput(10000, { region: 'navarra' })).applied, []);
});

test('DT 18ª withholding reduction needs a reported loan and pay below 33,007.20 €', () => {
  const points = (input, gross) => housingWithholdingPoints(input, gross);
  const loan = ownerInput(9000, { housingLoanWithholding: true });
  assert.equal(points(loan, 30000), 2);
  assert.equal(points(loan, 33007.19), 2);
  assert.equal(points(loan, 33007.2), 0);
  assert.equal(points(ownerInput(9000), 30000), 0);
  assert.equal(points({ ...loan, housingPurchaseBefore2013: false }, 30000), 0);
  assert.equal(points({ ...loan, housingTenure: 'tenant' }, 30000), 0);
  assert.equal(points({ ...loan, region: 'bizkaia' }, 30000), 0);
});

test('payroll: Madrid, 20,000 € gross, pre-2015 lease with 6,000 € rent', () => {
  // SS 6.5 % = 1,300; net 18,700; other expenses 2,000; reduction
  // 2,364.34 − 1.14 × (18,700 − 17,673.52) = 1,194.15; taxable base 15,505.85.
  // State quota: 1,182.75 + 3,055.85 × 12 % − 527.25 = 1,022.20.
  // Madrid quota: 1,135.79 + 2,143.63 × 10.7 % − 506.32 = 858.84.
  // Employment credit (DA 61ª): 590.89 − 0.2 × 2,906 = 9.69.
  // Without housing: 1,871.35. Rent deduction 10.05 % × 6,000 = 603 → 1,268.35.
  const base = { ...clone(DEFAULT_INPUT), region: 'madrid', salary: 20000 };
  const renting = { ...base, housingTenure: 'tenant', housingRentPaid: 6000, housingLeaseBefore2015: true };
  const without = computePayroll(base, CURRENT_SCENARIO);
  const withRent = computePayroll(renting, CURRENT_SCENARIO);
  assert.equal(without.incomeTax.annualTax, 1871.35);
  assert.equal(withRent.incomeTax.annualTax, 1268.35);
  assert.equal(withRent.incomeTax.housingDeduction, 603);
  assert.equal(withRent.housing.deduction, 603);
  assert.equal(withRent.incomeTax.withheld, without.incomeTax.withheld);
  // Below 22,000 € a single-payer employee need not file: no payment is shown without
  // housing, while the deduction turns the result into a refund worth filing for.
  assert.equal(without.incomeTax.refund, 0);
  assert.equal(rounded(withRent.incomeTax.refund), rounded(withRent.incomeTax.withheld - 1268.35));
  assert.ok(withRent.incomeTax.refund > 0);
});

test('payroll: DT 18ª with a reported loan lowers the withholding rate by exactly 2 points', () => {
  const base = { ...clone(DEFAULT_INPUT), region: 'madrid', salary: 30000 };
  const owner = { ...ownerInput(10000, { housingLoanWithholding: true }), salary: 30000 };
  const without = computePayroll(base, CURRENT_SCENARIO);
  const withLoan = computePayroll(owner, CURRENT_SCENARIO);
  assert.equal(rounded(without.incomeTax.rate - withLoan.incomeTax.rate), 2);
  assert.equal(withLoan.incomeTax.housingDeduction, 1356);
  assert.equal(rounded(without.incomeTax.annualTax - withLoan.incomeTax.annualTax), 1356);
});

test('DT 18ª makes filing compulsory, so a payment due is no longer hidden', () => {
  // 20,000 € in Madrid: the annual tax (1,871.35 €) exceeds withholding, but filing is
  // not compulsory below 22,000 €, so the engine shows no payment. Claiming DT 18ª
  // (100 € paid → 15 € deduction) with a reported loan lowers withholding by 2
  // points and makes filing compulsory, so the payment due must appear.
  const base = { ...clone(DEFAULT_INPUT), region: 'madrid', salary: 20000 };
  const owner = { ...ownerInput(100, { housingLoanWithholding: true }), salary: 20000 };
  const without = computePayroll(base, CURRENT_SCENARIO);
  const result = computePayroll(owner, CURRENT_SCENARIO);
  assert.equal(without.incomeTax.refund, 0);
  assert.equal(result.incomeTax.annualTax, 1856.35);
  assert.equal(rounded(without.incomeTax.rate - result.incomeTax.rate), 2);
  assert.equal(rounded(result.incomeTax.refund), rounded(result.incomeTax.withheld - 1856.35));
  assert.ok(result.incomeTax.refund < 0);
});

test('the withholding reduction also needs amounts paid for the home', () => {
  assert.equal(housingWithholdingPoints(ownerInput(0, { housingLoanWithholding: true }), 30000), 0);
});

test('a housing deduction never makes a liquid quota negative', () => {
  const lowIncome = {
    ...clone(DEFAULT_INPUT),
    region: 'madrid',
    salary: 15000,
    housingTenure: 'tenant',
    housingRentPaid: 9000,
    housingLeaseBefore2015: true,
  };
  const result = computePayroll(lowIncome, CURRENT_SCENARIO);
  assert.ok(result.incomeTax.housingDeduction <= result.incomeTax.stateTax + result.incomeTax.regionalTax + 0.01);
  assert.ok(result.incomeTax.annualTax >= 0);
});
