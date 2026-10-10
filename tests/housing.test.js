import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOUSING_RULES, HOUSING_RESEARCH } from '../js/data/housing-rules.js';
import { normalizeHousing, housingRulesFor, assessHousing, HOUSING_TENURES } from '../js/domain/housing.js';
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
  assert.ok(HOUSING_RULES.filter((rule) => rule.region !== null).every((rule) => rule.level === 'L2'));
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

test('nothing is applied and every skipped rule says why', () => {
  const reasons = (input) =>
    Object.fromEntries(assessHousing({ ...clone(DEFAULT_INPUT), ...input }).skipped.map((s) => [s.id, s.reason]));

  const notProvided = assessHousing({ ...clone(DEFAULT_INPUT), region: 'madrid' });
  assert.equal(notProvided.modelled, false);
  assert.equal(notProvided.scope, 'stateAndRegional');
  assert.equal(notProvided.deduction, 0);
  assert.deepEqual(notProvided.applied, []);
  assert.equal(reasons({ region: 'madrid' })['MAD-1'], 'housingNotProvided');

  const tenant = reasons({ region: 'madrid', housingTenure: 'tenant', housingRentPaid: 9600 });
  assert.equal(tenant['MAD-1'], 'notImplemented');
  assert.equal(tenant.S1, 'notImplemented');
  assert.equal(tenant['MAD-6'], 'notImplemented');
  assert.equal(tenant['MAD-2'], 'notApplicableToTenure');
  assert.equal(tenant['L-MAD-a'], 'requiresRentalIncome');
  assert.equal(tenant.S4, 'requiresRentalIncome');

  const owner = reasons({ region: 'madrid', housingTenure: 'owner' });
  assert.equal(owner.S3, 'notImplemented');
  assert.equal(owner['MAD-1'], 'notApplicableToTenure');

  assert.ok(Object.values(reasons({ region: 'madrid', housingTenure: 'other' })).every((r) => r !== 'notImplemented'));
  assert.equal(assessHousing({ ...clone(DEFAULT_INPUT), region: 'general' }).scope, 'stateOnly');
  assert.equal(assessHousing({ ...clone(DEFAULT_INPUT), region: 'navarra' }).scope, 'foralTerritory');
});

test('housing inputs never change any payroll or annual amount in this phase', () => {
  const withoutHousing = (result) => {
    const { housing, ...rest } = result;
    assert.equal(housing.deduction, 0);
    return rest;
  };
  for (const region of ['madrid', 'catalonia', 'general', 'bizkaia']) {
    const base = { ...clone(DEFAULT_INPUT), region, salary: 28000 };
    const renting = { ...base, housingTenure: 'tenant', housingRentPaid: 9600 };
    assert.deepEqual(
      withoutHousing(computePayroll(renting, CURRENT_SCENARIO)),
      withoutHousing(computePayroll(base, CURRENT_SCENARIO)),
      region,
    );
  }
});
