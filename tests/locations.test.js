import test from 'node:test';
import assert from 'node:assert/strict';
import { CITIES } from '../js/data/cities.js';
import { FORAL_TERRITORIES } from '../js/data/foral.js';
import { REGIONAL_SCALES } from '../js/data/regions.js';
import { DEFAULT_INPUT, CURRENT_SCENARIO, clone } from '../js/defaults.js';
import { normalizeInput } from '../js/domain/payroll-input.js';
import { createSession } from '../js/application/simulation-session.js';
import { computePayroll } from '../js/calc.js';
import { applyScale } from '../js/tax.js';
import { foralEmploymentIncome, foralWithholding, foralAnnualTax } from '../js/foral-tax.js';

const inputFor = (region, overrides = {}) => ({ ...DEFAULT_INPUT, region, ...overrides });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.011, `${actual} != ${expected}`);

test('all 17 communities have city presets and Basque territories remain distinct', () => {
  const communities = new Set(CITIES.map(({ region }) => FORAL_TERRITORIES[region]?.community ?? region));
  assert.equal(communities.size, 17);
  assert.equal(new Set(CITIES.map(({ id }) => id)).size, CITIES.length);
  for (const region of [...Object.keys(REGIONAL_SCALES), ...Object.keys(FORAL_TERRITORIES)]) {
    assert.ok(
      CITIES.some((city) => city.region === region),
      region,
    );
  }
  for (const [id, region] of [
    ['bilbao', 'bizkaia'],
    ['barakaldo', 'bizkaia'],
    ['donostia-san-sebastian', 'gipuzkoa'],
    ['vitoria-gasteiz', 'alava'],
    ['pamplona-iruna', 'navarra'],
    ['vigo', 'galicia'],
    ['cartagena', 'murcia'],
  ]) {
    assert.equal(CITIES.find((city) => city.id === id)?.region, region);
  }
});

for (const city of CITIES) {
  test(`${city.name}: salary examples use the correct residence without nonfinite results`, () => {
    for (const salary of [20000, 30000, 45000, 60000, 90000]) {
      const input = inputFor(city.region, { city: city.id, salary });
      const normalized = normalizeInput(clone(input));
      assert.equal(normalized.city, city.id);
      const result = computePayroll(input, CURRENT_SCENARIO);
      assert.ok(Number.isFinite(result.netAnnualAfterReturn));
      assert.ok(result.incomeTax.annualTax >= 0);
      assert.deepEqual(result, computePayroll({ ...input, city: '' }, CURRENT_SCENARIO));
    }
  });
}

test('imports retain matching locations and discard stale/unknown city ids', () => {
  assert.equal(createSession({ input: { region: 'bizkaia', city: 'bilbao' } }).input.city, 'bilbao');
  assert.equal(createSession({ input: { region: 'madrid', city: 'bilbao' } }).input.city, '');
  assert.equal(createSession({ input: { region: 'navarra', city: '<script>' } }).input.city, '');
  assert.equal(createSession({ input: { region: 'missing', city: 'bilbao' } }).input.region, 'general');
});

// Published cumulative quotas: NF 13/2013, NF 33/2013 and Gipuzkoa NF 6/2025.
const basqueQuotas = [
  [18080, 4158.4],
  [36160, 9220.8],
  [54240, 15548.8],
  [77450, 24832.8],
  [107260, 38247.3],
  [142960, 54669.3],
  [208390, 85421.4],
];
for (const region of ['bizkaia', 'gipuzkoa', 'alava']) {
  for (const [base, quota] of basqueQuotas) {
    test(`${region}: published annual quota at ${base}`, () => {
      close(applyScale(FORAL_TERRITORIES[region].brackets, base), quota);
      close(foralAnnualTax(inputFor(region), base).tax, quota - 1615);
    });
  }
  // Published zero-descendant column, entered independently of production data.
  const upperRows = [
    [20000, 0],
    [20510, 7],
    [21300, 8],
    [22150, 9],
    [23220, 10],
    [24050, 11],
    [25410, 12],
    [27440, 13],
    [29790, 14],
    [32610, 15],
    [36350, 16],
    [40670, 17],
    [44560, 18],
    [48060, 19],
    [52020, 20],
    [56780, 21],
    [61820, 22],
    [65710, 23],
    [70080, 24],
    [75020, 25],
    [80730, 26],
    [86770, 27],
    [92190, 28],
    [98350, 29],
    [105380, 30],
    [113180, 31],
    [122030, 32],
    [132200, 33],
    [144140, 34],
    [157300, 35],
    [172280, 36],
    [190410, 37],
    [212820, 38],
    [236060, 39],
  ];
  for (const [ceiling, before] of upperRows) {
    test(`${region}: withholding changes after inclusive upper bound ${ceiling}`, () => {
      const after = ceiling === 20000 ? 7 : before + 1;
      assert.equal(foralWithholding(inputFor(region), ceiling - 0.01, 0).rate, before);
      assert.equal(foralWithholding(inputFor(region), ceiling, 0).rate, before);
      assert.equal(foralWithholding(inputFor(region), ceiling + 0.01, 0).rate, after);
    });
  }
  test(`${region}: annual bonification has no common €2,000 expense or personal minimum`, () => {
    assert.deepEqual(foralEmploymentIncome(inputFor(region), 14800, 0), {
      netEarnings: 14800,
      otherExpenses: 0,
      reduction: 8000,
    });
    close(foralEmploymentIncome(inputFor(region), 23000, 0).reduction, 2999.64);
    assert.equal(foralEmploymentIncome(inputFor(region), 23000.01, 0).reduction, 3000);
    assert.equal(foralEmploymentIncome(inputFor(region), 1000, 0).reduction, 1000);
    assert.equal(foralAnnualTax(inputFor(region), 0).tax, 0);
  });
  test(`${region}: independently worked €30,000 payroll and annual return`, () => {
    const result = computePayroll(inputFor(region), CURRENT_SCENARIO);
    close(result.employee.total, 1950);
    close(result.incomeTax.annualBase, 25050);
    close(result.incomeTax.withheld, 4500);
    close(result.incomeTax.annualTax, 4495);
    close(result.netAnnualAfterReturn, 23555);
    assert.equal(result.incomeTax.stateTax, 0);
  });
}

// Published Navarra article 59 table. A one-cent tolerance covers published rounding.
for (const [base, quota] of [
  [4458, 579.54],
  [10030, 1805.38],
  [21175, 4591.63],
  [35663, 8648.27],
  [51266, 14343.37],
  [66869, 20818.61],
  [89159, 30626.21],
  [139310, 54197.18],
  [195034, 81501.94],
  [334344, 151853.49],
]) {
  test(`Navarra: published annual quota at ${base}`, () =>
    close(applyScale(FORAL_TERRITORIES.navarra.brackets, base), quota));
}
// Hacienda Navarra article 71, 2026 wording including January correction.
const navarreRows = [
  [17000, 2],
  [18500, 4],
  [19750, 6],
  [21250, 8.5],
  [23250, 11],
  [25250, 13.3],
  [27500, 14.6],
  [30250, 15.8],
  [32250, 17],
  [35750, 18.1],
  [41250, 20],
  [48000, 22.1],
  [55000, 24.1],
  [62000, 26.1],
  [69250, 28.3],
  [75250, 29.6],
  [82250, 30.8],
  [94750, 32.2],
  [107250, 33.5],
  [120000, 35.1],
  [132750, 36.2],
  [146000, 38],
  [200000, 40],
  [280000, 42],
  [350000, 43],
];
for (const [index, [floor, after]] of navarreRows.entries()) {
  test(`Navarra: withholding changes only above ${floor}`, () => {
    const before = index ? navarreRows[index - 1][1] : 0;
    assert.equal(foralWithholding(inputFor('navarra'), floor - 0.01, 0).rate, before);
    assert.equal(foralWithholding(inputFor('navarra'), floor, 0).rate, before);
    assert.equal(foralWithholding(inputFor('navarra'), floor + 0.01, 0).rate, after);
  });
}
test('Navarra: independently worked €30,000 payroll with personal and work credits', () => {
  const result = computePayroll(inputFor('navarra'), CURRENT_SCENARIO);
  close(result.incomeTax.annualBase, 28050);
  close(result.incomeTax.withheld, 4380);
  close(result.incomeTax.annualTax, 4406.35);
  close(result.netAnnualAfterReturn, 23643.65);
  assert.equal(result.incomeTax.otherExpenses, 0);
});

for (const region of Object.keys(FORAL_TERRITORIES)) {
  test(`${region}: common income-tax scenario changes cannot silently replace foral law`, () => {
    const scenario = clone(CURRENT_SCENARIO);
    scenario.incomeTax.brackets = [{ upTo: null, rate: 0 }];
    scenario.incomeTax.generalExpenses = 100000;
    assert.deepEqual(computePayroll(inputFor(region), scenario), computePayroll(inputFor(region), CURRENT_SCENARIO));
  });
  for (const extra of [
    { children: 1 },
    { childrenUnder3: 1 },
    { age: 65 },
    { disability: 33 },
    { contract: 'temporary' },
    { dependents65: 1 },
    { familySituation: 2 },
    { flexMeal: 1 },
    { pensionIndividual: 1 },
    { pensionEmployer: 1 },
  ]) {
    test(`${region}: unsupported profile ${JSON.stringify(extra)} never uses common rules`, () => {
      assert.throws(() => computePayroll(inputFor(region, extra), CURRENT_SCENARIO), /Unsupported foral/);
    });
  }
}

test('Navarra: €400,000 withholding uses the final 43% band', () => {
  const result = computePayroll(inputFor('navarra', { salary: 400000 }), CURRENT_SCENARIO);
  assert.equal(result.incomeTax.withheld, 172000);
});
test('Navarra: exclusive employment filing exemption is strictly below €17,000 in 2026', () => {
  const scenario = clone(CURRENT_SCENARIO);
  for (const key of Object.keys(scenario.employee)) scenario.employee[key] = 0;
  const below = computePayroll(inputFor('navarra', { salary: 16500 }), scenario);
  close(below.incomeTax.annualTax, 218.88);
  assert.equal(below.incomeTax.refund, 0);
  const edge = computePayroll(inputFor('navarra', { salary: 17000 }), scenario);
  close(edge.incomeTax.annualTax, 413.88);
  close(edge.incomeTax.refund, -413.88);
  assert.equal(computePayroll(inputFor('navarra', { salary: 16999.99 }), scenario).incomeTax.refund, 0);
});
