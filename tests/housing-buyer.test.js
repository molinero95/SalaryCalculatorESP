// Regional purchase deductions without municipality dependence (housing phase 4).
// Expected values are hand calculations from the regional texts listed in
// docs/housing-regional-buyer.md, not from the production constants.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessHousing, regionalBuyerRules } from '../js/domain/housing.js';
import { computePayroll } from '../js/calc.js';
import { DEFAULT_INPUT, CURRENT_SCENARIO, clone } from '../js/defaults.js';

const owner = (region, input = {}) => ({
  ...clone(DEFAULT_INPUT),
  region,
  housingTenure: 'owner',
  housingBuyerConfirmed: true,
  ...input,
});

function claim(id, region, input, { bi = 20000, bl = bi, minimum = 5550 } = {}) {
  const result = assessHousing(owner(region, input), {
    baseImponible: bi,
    baseLiquidable: bl,
    minimum,
    descendantMinimum: 0,
  });
  const applied = result.applied.find((rule) => rule.id === id);
  if (applied) return Math.round(applied.regional * 100) / 100;
  return result.skipped.find((rule) => rule.id === id).reason;
}

const cases = [
  // Madrid art. 12: 25 % of mortgage interest, up to 1,031 €, under 30, no income limit.
  ['madrid', 'MAD-2', '25 % of interest', { age: 29, housingInvestment: 8000, housingInterestPaid: 3000 }, {}, 750],
  ['madrid', 'MAD-2', 'capped', { age: 29, housingInvestment: 9000, housingInterestPaid: 5000 }, {}, 1031],
  ['madrid', 'MAD-2', 'age 30', { age: 30, housingInvestment: 8000, housingInterestPaid: 3000 }, {}, 'notEligible'],
  ['madrid', 'MAD-2', 'no interest', { age: 29, housingInvestment: 5000 }, {}, 'noAmount'],
  [
    'madrid',
    'MAD-2',
    'no income limit',
    { age: 29, housingInvestment: 8000, housingInterestPaid: 3000 },
    { bi: 100000 },
    750,
  ],
  // Andalucía art. 9: 6 % on up to 9,040 €; protected dwelling or under 35.
  ['andalusia', 'AND-2', 'base capped', { age: 30, housingInvestment: 10000 }, {}, 542.4],
  ['andalusia', 'AND-2', '6 %', { age: 30, housingInvestment: 5000 }, {}, 300],
  ['andalusia', 'AND-2', 'age 35, not protected', { age: 35, housingInvestment: 5000 }, {}, 'notEligible'],
  [
    'andalusia',
    'AND-2',
    'protected at 40',
    { age: 40, housingInvestment: 10000, housingProtectedDwelling: true },
    {},
    542.4,
  ],
  ['andalusia', 'AND-2', 'above 25,000', { age: 30, housingInvestment: 5000 }, { bi: 25000.01 }, 'incomeAboveLimit'],
  // Extremadura art. 8: 6 % excluding interest, first protected dwelling, under 36.
  [
    'extremadura',
    'EXT-2',
    'excluding interest',
    {
      age: 30,
      housingInvestment: 10000,
      housingInterestPaid: 2000,
      housingFirstDwelling: true,
      housingProtectedDwelling: true,
    },
    {},
    480,
  ],
  [
    'extremadura',
    'EXT-2',
    'base capped',
    {
      age: 30,
      housingInvestment: 12000,
      housingInterestPaid: 1000,
      housingFirstDwelling: true,
      housingProtectedDwelling: true,
    },
    {},
    542.4,
  ],
  [
    'extremadura',
    'EXT-2',
    'not protected needs the municipality',
    { age: 30, housingInvestment: 10000, housingFirstDwelling: true },
    {},
    'municipalityRequired',
  ],
  [
    'extremadura',
    'EXT-2',
    'not the first dwelling',
    { age: 30, housingInvestment: 10000, housingProtectedDwelling: true },
    {},
    'notEligible',
  ],
  [
    'extremadura',
    'EXT-2',
    'above 30,000',
    { age: 30, housingInvestment: 10000, housingFirstDwelling: true, housingProtectedDwelling: true },
    { bi: 30000.01 },
    'incomeAboveLimit',
  ],
  // Extremadura art. 11 quater: 25 % of interest on a base of up to 1,000 €.
  [
    'extremadura',
    'EXT-4',
    '25 % of interest',
    { age: 30, housingInvestment: 6000, housingInterestPaid: 800, housingFirstDwelling: true },
    {},
    200,
  ],
  [
    'extremadura',
    'EXT-4',
    'base capped at 1,000',
    { age: 30, housingInvestment: 6000, housingInterestPaid: 3000, housingFirstDwelling: true },
    {},
    250,
  ],
  [
    'extremadura',
    'EXT-4',
    'age 36',
    { age: 36, housingInvestment: 6000, housingInterestPaid: 800, housingFirstDwelling: true },
    {},
    'notEligible',
  ],
  // Murcia art. 1.Uno: 5 %, max 300 €, 40 or under, new build.
  ['murcia', 'MUR-2', '5 %', { age: 40, housingInvestment: 4000, housingNewBuild: true }, {}, 200],
  ['murcia', 'MUR-2', 'capped', { age: 40, housingInvestment: 10000, housingNewBuild: true }, {}, 300],
  ['murcia', 'MUR-2', 'not a new build', { age: 40, housingInvestment: 4000 }, {}, 'notEligible'],
  [
    'murcia',
    'MUR-2',
    'base equal to 40,000',
    { age: 40, housingInvestment: 4000, housingNewBuild: true },
    { bi: 40000 },
    'incomeAboveLimit',
  ],
  [
    'murcia',
    'MUR-2',
    'base below 40,000',
    { age: 40, housingInvestment: 4000, housingNewBuild: true },
    { bi: 39999.99 },
    200,
  ],
  [
    'murcia',
    'MUR-2',
    'savings above 1,800',
    { age: 40, housingInvestment: 4000, housingNewBuild: true, housingSavingsBase: 1800.01 },
    {},
    'incomeAboveLimit',
  ],
  [
    'murcia',
    'MUR-2',
    'state DT 18ª base reduces the limit',
    { age: 40, housingInvestment: 8000, housingNewBuild: true, housingPurchaseBefore2013: true },
    {},
    52,
  ],
  // La Rioja art. 32.11: 15 % on up to 9,000 €, under 36, purchases from 2013.
  ['rioja', 'RIO-2', '15 %', { age: 30, housingInvestment: 5000 }, { bl: 15000 }, 750],
  ['rioja', 'RIO-2', 'base capped', { age: 30, housingInvestment: 12000 }, { bl: 15000 }, 1350],
  [
    'rioja',
    'RIO-2',
    'buyers before 2013',
    { age: 30, housingInvestment: 5000, housingPurchaseBefore2013: true },
    { bl: 15000 },
    'transitionalRegimeApplies',
  ],
  ['rioja', 'RIO-2', 'above 18,030', { age: 30, housingInvestment: 5000 }, { bl: 18030.01 }, 'incomeAboveLimit'],
  ['rioja', 'RIO-2', 'age 36', { age: 36, housingInvestment: 5000 }, { bl: 15000 }, 'notEligible'],
];

for (const [region, id, label, input, context, expected] of cases)
  test(`${id} ${label}`, () => assert.equal(claim(id, region, input, context), expected));

test('regional purchase rules need the formal requirements and an amount paid', () => {
  assert.equal(
    claim('AND-2', 'andalusia', { age: 30, housingInvestment: 5000, housingBuyerConfirmed: false }),
    'requirementsNotConfirmed',
  );
  assert.equal(claim('AND-2', 'andalusia', { age: 30, housingInvestment: 0 }), 'noAmount');
});

test('unverified, municipality-dependent and undefined purchase rules stay pending', () => {
  assert.equal(claim('VAL-3', 'valencia', { age: 30, housingInvestment: 5000 }), 'primaryTextPending');
  assert.equal(claim('CANT-3', 'cantabria', { age: 30, housingInvestment: 5000 }), 'primaryTextPending');
  assert.equal(claim('CLM-7', 'castillaLaMancha', { age: 30, housingInvestment: 5000 }), 'primaryTextPending');
  assert.equal(claim('BAL-2', 'balearic', { age: 30, housingInvestment: 5000 }), 'requirementsPending');
  assert.equal(claim('CAN-3', 'canary', { age: 30, housingInvestment: 5000 }), 'definitionPending');
  assert.equal(claim('AST-2', 'asturias', { age: 30, housingInvestment: 5000 }), 'municipalityRequired');
  assert.deepEqual(regionalBuyerRules('madrid'), ['MAD-2']);
  assert.deepEqual(regionalBuyerRules('extremadura'), ['EXT-2', 'EXT-4']);
  assert.deepEqual(regionalBuyerRules('valencia'), []);
  assert.deepEqual(regionalBuyerRules('navarra'), []);
});

test('payroll: a young Madrid buyer lowers the annual tax, not the withholding', () => {
  const input = owner('madrid', { salary: 30000, age: 29, housingInvestment: 8000, housingInterestPaid: 3000 });
  const withPurchase = computePayroll(input, clone(CURRENT_SCENARIO));
  const without = computePayroll({ ...input, housingTenure: 'notProvided' }, clone(CURRENT_SCENARIO));
  assert.equal(withPurchase.incomeTax.housingDeduction, 750);
  assert.equal(Math.round((without.incomeTax.annualTax - withPurchase.incomeTax.annualTax) * 100) / 100, 750);
  assert.equal(withPurchase.incomeTax.withheld, without.incomeTax.withheld);
});
