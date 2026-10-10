// Regional tenant rent deductions (housing phase 2). Expected values are hand
// calculations from the regional texts listed in docs/housing-deductions-2026.md,
// not from the production constants.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessHousing, hasRegionalTenantRule } from '../js/domain/housing.js';
import { computePayroll } from '../js/calc.js';
import { DEFAULT_INPUT, CURRENT_SCENARIO, clone } from '../js/defaults.js';

const tenant = (region, input = {}) => ({
  ...clone(DEFAULT_INPUT),
  region,
  housingTenure: 'tenant',
  housingRegionalConfirmed: true,
  housingFamilyUnitConfirmed: true,
  ...input,
});

/** Regional amount claimed for `id`, or the reason it was skipped. */
function claim(id, region, input, { bi = 20000, bl = bi, minimum = 5550, descendants = 0 } = {}) {
  const result = assessHousing(tenant(region, input), {
    baseImponible: bi,
    baseLiquidable: bl,
    minimum,
    descendantMinimum: descendants,
  });
  const applied = result.applied.find((rule) => rule.id === id);
  if (applied) return Math.round(applied.regional * 100) / 100;
  return result.skipped.find((rule) => rule.id === id).reason;
}

const cases = {
  madrid: [
    ['30 % capped', 'MAD-1', { age: 30, housingRentPaid: 9600 }, { bi: 25000 }, 1237.2],
    ['30 % below the cap', 'MAD-1', { age: 30, housingRentPaid: 2500 }, { bi: 10000 }, 750],
    ['age 40', 'MAD-1', { age: 40, housingRentPaid: 9600 }, { bi: 25000 }, 'notEligible'],
    ['income at the limit', 'MAD-1', { age: 39, housingRentPaid: 9600 }, { bi: 26414.22 }, 1237.2],
    ['income above the limit', 'MAD-1', { age: 39, housingRentPaid: 9600 }, { bi: 26414.23 }, 'incomeAboveLimit'],
    [
      'savings count in the income test',
      'MAD-1',
      { age: 30, housingRentPaid: 9600, housingSavingsBase: 2000 },
      { bi: 25000 },
      'incomeAboveLimit',
    ],
    ['rent equal to 20 %', 'MAD-1', { age: 30, housingRentPaid: 5000 }, { bi: 25000 }, 'rentBelowIncomeShare'],
    ['rent above 20 %', 'MAD-1', { age: 30, housingRentPaid: 5000.01 }, { bi: 25000 }, 1237.2],
    [
      'family unit at 61,860',
      'MAD-1',
      { age: 30, housingRentPaid: 9600, housingFamilyUnitOtherBase: 36860 },
      { bi: 25000 },
      1237.2,
    ],
    [
      'family unit above 61,860',
      'MAD-1',
      { age: 30, housingRentPaid: 9600, housingFamilyUnitOtherBase: 36860.01 },
      { bi: 25000 },
      'familyIncomeAboveLimit',
    ],
    [
      'family unit not entered',
      'MAD-1',
      { age: 30, housingRentPaid: 9600, housingFamilyUnitConfirmed: false },
      { bi: 25000 },
      'familyIncomeNotProvided',
    ],
  ],
  catalonia: [
    ['10 % capped', 'CAT-1', { age: 30, housingRentPaid: 9600 }, { bi: 25000 }, 500],
    ['10 %', 'CAT-1', { age: 30, housingRentPaid: 3000 }, { bi: 25000 }, 300],
    ['age 36', 'CAT-1', { age: 36, housingRentPaid: 3000 }, { bi: 25000 }, 'notEligible'],
    ['large family cap', 'CAT-1', { age: 36, housingRentPaid: 12000, housingLargeFamily: true }, {}, 1000],
    ['base minus minimum at 30,000', 'CAT-1', { age: 30, housingRentPaid: 3000 }, { bi: 35550 }, 300],
    [
      'base minus minimum above 30,000',
      'CAT-1',
      { age: 30, housingRentPaid: 3000 },
      { bi: 35550.01 },
      'incomeAboveLimit',
    ],
  ],
  valencia: [
    ['no condition: 20 %', 'VAL-1', { age: 40, housingRentPaid: 3000 }, { bl: 20000 }, 600],
    ['age 35: 25 %', 'VAL-1', { age: 35, housingRentPaid: 3000 }, { bl: 20000 }, 750],
    ['two conditions: 30 % capped', 'VAL-1', { age: 30, disability: 65, housingRentPaid: 6000 }, { bl: 20000 }, 1100],
    ['cap halved at 28,500', 'VAL-1', { age: 30, housingRentPaid: 3000 }, { bl: 28500 }, 475],
    ['cap zero at 30,000', 'VAL-1', { age: 30, housingRentPaid: 3000 }, { bl: 30000 }, 'noAmount'],
    ['above 30,000', 'VAL-1', { age: 30, housingRentPaid: 3000 }, { bl: 30000.01 }, 'incomeAboveLimit'],
    ['liquid base, not taxable base', 'VAL-1', { age: 40, housingRentPaid: 3000 }, { bi: 31000, bl: 26000 }, 600],
  ],
  extremadura: [
    ['30 % capped', 'EXT-1', { age: 30, housingRentPaid: 4000 }, { bi: 25000 }, 1000],
    ['30 %', 'EXT-1', { age: 30, housingRentPaid: 2000 }, { bi: 25000 }, 600],
    ['age 36', 'EXT-1', { age: 36, housingRentPaid: 4000 }, { bi: 25000 }, 'notEligible'],
    ['large family', 'EXT-1', { age: 45, housingRentPaid: 2000, housingLargeFamily: true }, { bi: 25000 }, 600],
    ['above 30,000', 'EXT-1', { age: 30, housingRentPaid: 4000 }, { bi: 30000.01 }, 'incomeAboveLimit'],
  ],
  castillaLaMancha: [
    ['15 % capped', 'CLM-1', { age: 30, housingRentPaid: 4800 }, { bi: 12000 }, 500],
    ['15 %', 'CLM-1', { age: 30, housingRentPaid: 2000 }, { bi: 12000 }, 300],
    ['above 12,500', 'CLM-1', { age: 30, housingRentPaid: 2000 }, { bi: 12500.01 }, 'incomeAboveLimit'],
    [
      'descendant minimum is subtracted',
      'CLM-1',
      { age: 30, housingRentPaid: 2000 },
      { bi: 14000, descendants: 1500 },
      300,
    ],
    [
      'single parent over 36',
      'CLM-1',
      { age: 40, housingRentPaid: 2000, housingSingleParent: true },
      { bi: 12000 },
      300,
    ],
    ['over 36 without a group', 'CLM-1', { age: 40, housingRentPaid: 2000 }, { bi: 12000 }, 'notEligible'],
    [
      'one compatible deduction only',
      'CLM-2',
      { age: 30, housingRentPaid: 2000 },
      { bi: 12000 },
      'coveredByCombinedRule',
    ],
  ],
  galicia: [
    ['10 %', 'GAL-1', { age: 35, housingRentPaid: 2400 }, {}, 240],
    ['10 % capped', 'GAL-1', { age: 35, housingRentPaid: 6000 }, {}, 300],
    ['two minors: 20 % capped', 'GAL-1', { age: 35, housingRentPaid: 6000, housingTwoMinorChildren: true }, {}, 600],
    ['disability doubles the cap', 'GAL-1', { age: 35, disability: 33, housingRentPaid: 6000 }, {}, 600],
    [
      'two minors and disability',
      'GAL-1',
      { age: 35, disability: 33, housingRentPaid: 9000, housingTwoMinorChildren: true },
      {},
      1200,
    ],
    ['age 36', 'GAL-1', { age: 36, housingRentPaid: 2400 }, {}, 'notEligible'],
    ['above 22,000', 'GAL-1', { age: 35, housingRentPaid: 2400 }, { bi: 22000.01 }, 'incomeAboveLimit'],
  ],
  balearic: [
    ['under 36: 15 %', 'BAL-1', { age: 33, housingRentPaid: 3000 }, { bi: 25000 }, 450],
    ['under 36: capped', 'BAL-1', { age: 33, housingRentPaid: 5000 }, { bi: 25000 }, 530],
    ['under 30: 20 %', 'BAL-1', { age: 28, housingRentPaid: 3000 }, { bi: 25000 }, 600],
    ['under 30: capped', 'BAL-1', { age: 28, housingRentPaid: 4000 }, { bi: 25000 }, 650],
    [
      'large family limit 39,600',
      'BAL-1',
      { age: 40, housingRentPaid: 3000, housingLargeFamily: true },
      { bi: 39600 },
      600,
    ],
    [
      'above the large family limit',
      'BAL-1',
      { age: 40, housingRentPaid: 3000, housingLargeFamily: true },
      { bi: 39600.01 },
      'incomeAboveLimit',
    ],
    ['over 36 without a group', 'BAL-1', { age: 40, housingRentPaid: 3000 }, { bi: 25000 }, 'notEligible'],
    ['above 33,000', 'BAL-1', { age: 33, housingRentPaid: 3000 }, { bi: 33000.01 }, 'incomeAboveLimit'],
  ],
  andalusia: [
    ['15 %', 'AND-1', { age: 30, housingRentPaid: 6000 }, {}, 900],
    ['15 % capped', 'AND-1', { age: 30, housingRentPaid: 10000 }, {}, 1200],
    ['disability cap', 'AND-1', { age: 40, disability: 33, housingRentPaid: 12000 }, {}, 1500],
    ['age 35', 'AND-1', { age: 35, housingRentPaid: 6000 }, {}, 'notEligible'],
    ['over 65', 'AND-1', { age: 66, housingRentPaid: 6000 }, {}, 900],
    ['above 25,000', 'AND-1', { age: 30, housingRentPaid: 6000 }, { bi: 25000.01 }, 'incomeAboveLimit'],
  ],
  asturias: [
    ['general 10 % capped', 'AST-1', { age: 45, housingRentPaid: 6000 }, { bi: 30000 }, 500],
    ['up to 35: 30 % capped', 'AST-1', { age: 30, housingRentPaid: 6000 }, { bi: 30000 }, 1500],
    ['age 35: 30 %', 'AST-1', { age: 35, housingRentPaid: 3000 }, { bi: 30000 }, 900],
    ['above 35,000', 'AST-1', { age: 45, housingRentPaid: 6000 }, { bi: 35000.01 }, 'incomeAboveLimit'],
  ],
  murcia: [
    ['10 % capped', 'MUR-1', { age: 40, housingRentPaid: 4000 }, { bi: 34000 }, 300],
    ['aid is not deductible', 'MUR-1', { age: 40, housingRentPaid: 4000, housingRentAid: 2000 }, { bi: 34000 }, 200],
    [
      'savings above 1,800',
      'MUR-1',
      { age: 40, housingRentPaid: 4000, housingSavingsBase: 1800.01 },
      {},
      'incomeAboveLimit',
    ],
    [
      'base minus minimum equal to 40,000',
      'MUR-1',
      { age: 40, housingRentPaid: 4000 },
      { bi: 45550 },
      'incomeAboveLimit',
    ],
    ['base minus minimum below 40,000', 'MUR-1', { age: 40, housingRentPaid: 4000 }, { bi: 45549.99 }, 300],
    ['age 41', 'MUR-1', { age: 41, housingRentPaid: 4000 }, {}, 'notEligible'],
  ],
  rioja: [
    ['10 %', 'RIO-1', { age: 30, housingRentPaid: 2500 }, { bl: 15000 }, 250],
    ['10 % capped', 'RIO-1', { age: 30, housingRentPaid: 4000 }, { bl: 15000 }, 300],
    ['aid is not deductible', 'RIO-1', { age: 30, housingRentPaid: 2500, housingRentAid: 1000 }, { bl: 15000 }, 150],
    ['above 18,030', 'RIO-1', { age: 30, housingRentPaid: 2500 }, { bl: 18030.01 }, 'incomeAboveLimit'],
    [
      'savings above 1,800',
      'RIO-1',
      { age: 30, housingRentPaid: 2500, housingSavingsBase: 1800.01 },
      { bl: 15000 },
      'incomeAboveLimit',
    ],
    ['age 36', 'RIO-1', { age: 36, housingRentPaid: 2500 }, { bl: 15000 }, 'notEligible'],
  ],
};

for (const [region, list] of Object.entries(cases))
  for (const [label, id, input, context, expected] of list)
    test(`${id} ${label}`, () => assert.equal(claim(id, region, input, context), expected));

test('regional tenant rules need the formal requirements, a rent and the income magnitudes', () => {
  assert.equal(
    claim('MAD-1', 'madrid', { age: 30, housingRentPaid: 9600, housingRegionalConfirmed: false }),
    'requirementsNotConfirmed',
  );
  assert.equal(claim('MAD-1', 'madrid', { age: 30, housingRentPaid: 0 }), 'noAmount');
  const noIncome = assessHousing(tenant('catalonia', { age: 30, housingRentPaid: 3000 }));
  assert.equal(noIncome.skipped.find((rule) => rule.id === 'CAT-1').reason, 'incomeNotProvided');
});

test('rules without a verified definition or primary text stay pending', () => {
  assert.equal(claim('CYL-1', 'castillaLeon', { age: 30, housingRentPaid: 3000 }), 'primaryTextPending');
  assert.equal(claim('CANT-1', 'cantabria', { age: 30, housingRentPaid: 3000 }), 'definitionPending');
  assert.equal(claim('CAN-1', 'canary', { age: 30, housingRentPaid: 3000 }), 'definitionPending');
  assert.equal(hasRegionalTenantRule('castillaLeon'), false);
  assert.equal(hasRegionalTenantRule('madrid'), true);
  assert.equal(hasRegionalTenantRule('general'), false);
  assert.equal(hasRegionalTenantRule('bizkaia'), false);
});

test('regional amounts go only to the regional quota and never to payroll withholding', () => {
  const result = assessHousing(tenant('madrid', { age: 30, housingRentPaid: 9600 }), {
    baseImponible: 25000,
    baseLiquidable: 25000,
    minimum: 5550,
    descendantMinimum: 0,
    taxableGross: 20000,
  });
  assert.equal(result.state, 0);
  assert.equal(result.regional, 1237.2);
  assert.equal(result.withholdingPoints, 0);
});

test('payroll: a Madrid tenant on 30,000 € lowers the annual tax by the full 1,237.20 €', () => {
  // Gross 30,000; employee contributions 6.5 % = 1,950; minus 2,000 € expenses and no
  // employment reduction: general base 26,050 €, within 26,414.22 €; rent 9,600 € > 20 %.
  const input = tenant('madrid', { salary: 30000, age: 30, housingRentPaid: 9600 });
  const withRent = computePayroll(input, clone(CURRENT_SCENARIO));
  const without = computePayroll({ ...input, housingTenure: 'notProvided' }, clone(CURRENT_SCENARIO));
  assert.equal(withRent.incomeTax.annualBase, 26050);
  assert.equal(withRent.incomeTax.housingDeduction, 1237.2);
  assert.equal(Math.round((without.incomeTax.annualTax - withRent.incomeTax.annualTax) * 100) / 100, 1237.2);
  assert.equal(withRent.incomeTax.withheld, without.incomeTax.withheld);
});

test('payroll: the regional deduction is limited to the regional quota', () => {
  const input = tenant('madrid', { salary: 20000, age: 30, housingRentPaid: 9600 });
  const result = computePayroll(input, clone(CURRENT_SCENARIO));
  assert.equal(result.housing.regional, 1237.2);
  assert.ok(result.incomeTax.housingDeduction < 1237.2);
  assert.equal(result.incomeTax.housingDeduction, Math.round(result.incomeTax.regionalTax * 100) / 100);
});
