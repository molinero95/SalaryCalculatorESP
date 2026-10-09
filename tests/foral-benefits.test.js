import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_INPUT, CURRENT_SCENARIO, clone } from '../js/defaults.js';
import { computePayroll } from '../js/calc.js';
import { pensionPlan } from '../js/domain/pension.js';
import { foralAnnualTax, foralWithholding } from '../js/foral-tax.js';
import { createSession } from '../js/application/simulation-session.js';
const regions = ['bizkaia', 'gipuzkoa', 'alava', 'navarra'];
const input = (region, extra = {}) => ({ ...DEFAULT_INPUT, region, ...extra });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.0051, `${actual} != ${expected}`);
// Fictional realistic profiles, independently worked from the official 2026 laws.
// €30,000 salary, €1,950 SS: Basque base €25,050, quota €6,110; Navarre
// base €28,050, quota €6,516.63 and credits €1,084 + €326.28 + €700.
for (const region of regions) {
  for (const familySituation of [1, 2, 3])
    test(`${region}: family situation ${familySituation} retains the individual assessment`, () => {
      close(
        computePayroll(input(region, { familySituation }), CURRENT_SCENARIO).incomeTax.annualTax,
        region === 'navarra' ? 4406.35 : 4495,
      );
    });
  for (const [age, expected] of region === 'navarra'
    ? [
        [64, 4406.35],
        [65, 4142.35],
        [74, 4142.35],
        [75, 3821.35],
      ]
    : [
        [65, 4495],
        [66, 4300.47],
        [75, 4300.47],
        [76, 4141.57],
      ]) {
    test(`${region}: active employee aged ${age}`, () =>
      close(computePayroll(input(region, { age }), CURRENT_SCENARIO).incomeTax.annualTax, expected));
  }
  for (const [share, expected] of region === 'navarra'
    ? [
        [1, 4142.35],
        [2, 4274.35],
      ]
    : region === 'alava'
      ? [
          [1, 4071.28],
          [2, 4283.14],
        ]
      : [
          [1, 4167],
          [2, 4331],
        ]) {
    test(`${region}: eligible 70-year-old ascendant shared by ${share}`, () => {
      const result = computePayroll(
        input(region, { dependents65: 1, foralAscendantsConfirmed: true, foralAscendantClaimants: share }),
        CURRENT_SCENARIO,
      );
      close(result.incomeTax.annualTax, expected);
      close(result.incomeTax.withheld, region === 'navarra' ? 4380 : 4500);
    });
  }
  test(`${region}: €1,500 individual pension reduces the annual base, never withholding`, () => {
    const result = computePayroll(input(region, { pensionIndividual: 1500 }), CURRENT_SCENARIO);
    close(result.pension.deductible, 1500);
    close(result.incomeTax.annualTax, region === 'navarra' ? 3986.35 : 4075);
    close(result.incomeTax.withheld, region === 'navarra' ? 4380 : 4500);
    close(result.pension.taxSaved, 420);
  });
  test(`${region}: health insurance follows its own exemption rule`, () => {
    const result = computePayroll(input(region, { flexHealth: 500 }), CURRENT_SCENARIO);
    close(result.flexible.exempt, region === 'navarra' ? 500 : 0);
    close(result.incomeTax.annualTax, region === 'navarra' ? 4266.35 : 4495);
  });
  test(`${region}: meal, transport, childcare and training exemptions still pay SS`, () => {
    const result = computePayroll(
      input(region, { flexMeal: 2500, flexTransport: 1700, flexChildcare: 1000, flexTraining: 500 }),
      CURRENT_SCENARIO,
    );
    close(result.flexible.exempt, 5420);
    close(result.employee.total, 1950);
    close(result.taxableGross, 24580);
  });
  test(`${region}: short temporary employment has at least 2% withholding and temporary SS`, () => {
    const result = computePayroll(input(region, { salary: 10000, contract: 'temporary' }), CURRENT_SCENARIO);
    close(result.incomeTax.rate, 2);
    close(result.incomeTax.withheld, 200);
    close(result.employee.items.unemployment, 273.4848);
  });
  test(`${region}: common income-tax, flexible and pension settings cannot replace foral law`, () => {
    const scenario = clone(CURRENT_SCENARIO);
    scenario.flexible = {
      mealDailyLimit: 0,
      transportLimit: 0,
      healthLimit: 0,
      healthDisabilityLimit: 0,
      inKindCap: 30,
    };
    scenario.pension = { individualLimit: 0, employmentLimit: 0, netIncomeShareLimit: 0, highIncomeThreshold: 0 };
    scenario.incomeTax.brackets = [{ upTo: null, rate: 0 }];
    const i = input(region, {
      flexMeal: 1000,
      flexHealth: 500,
      pensionIndividual: 1500,
      pensionEmployee: 1000,
      pensionEmployer: 1000,
    });
    assert.deepEqual(computePayroll(i, scenario), computePayroll(i, CURRENT_SCENARIO));
  });
}
for (const region of regions.slice(0, 3)) {
  for (const [individual, employee, employer, expected] of [
    [6000, 0, 0, 5000],
    [5000, 5000, 5000, 10000],
    [0, 8000, 0, 8000],
    [0, 0, 9000, 8000],
  ]) {
    test(`${region}: EPSV/ordinary plan limits ${individual}/${employee}/${employer}`, () =>
      close(
        pensionPlan(
          input(region, { pensionIndividual: individual, pensionEmployee: employee, pensionEmployer: employer }),
          CURRENT_SCENARIO.pension,
          30000,
          25050,
        ).deductible,
        expected,
      ));
  }
  test(`${region}: pension reduction cannot create a negative base`, () =>
    close(
      pensionPlan(input(region, { pensionIndividual: 5000 }), CURRENT_SCENARIO.pension, 5000, 800).deductible,
      800,
    ));
  for (const [age, base, credit] of [
    [65, 20000, 0],
    [66, 20000, 393],
    [66, 25000, 196.5],
    [76, 25000, 357],
    [76, 30000, 0],
  ]) {
    test(`${region}: age credit at ${age}/${base} uses base before pension`, () => {
      close(foralAnnualTax(input(region, { age }), 10000, { baseBeforePension: base }).credit, 1615 + credit);
    });
  }
}
test('Álava rural ascendant credit applies its own 15% supplement', () =>
  close(
    computePayroll(
      input('alava', { dependents65: 1, foralAscendantsConfirmed: true, foralAlavaRural: true }),
      CURRENT_SCENARIO,
    ).incomeTax.annualTax,
    4007.72,
  ));
test('Basque ascendants under 65 qualify without applying Navarre age thresholds', () => {
  close(
    computePayroll(input('bizkaia', { foralAscendantsUnder65: 1, foralAscendantsConfirmed: true }), CURRENT_SCENARIO)
      .incomeTax.annualTax,
    4167,
  );
  close(computePayroll(input('navarra', { foralAscendantsUnder65: 1 }), CURRENT_SCENARIO).incomeTax.annualTax, 4406.35);
});
for (const age of [50, 51])
  test(`Navarra: pension income-share limit at age ${age}`, () => {
    close(
      pensionPlan(
        input('navarra', { age, pensionIndividual: 1500, pensionEmployee: 2000, pensionEmployer: 2000 }),
        CURRENT_SCENARIO.pension,
        10000,
        10000,
      ).deductible,
      age === 50 ? 3000 : 5000,
    );
  });
test('Navarra: part-time ordinary employment has a 2% minimum; Basque ordinary employment does not', () => {
  close(foralWithholding(input('navarra', { partTime: 50 }), 10000, 650).rate, 2);
  close(foralWithholding(input('bizkaia', { partTime: 50 }), 10000, 650).rate, 0);
});
test('Navarra: pensions never increase personal or descendant income-dependent credits', () => {
  const i = input('navarra', { children: 1, childrenUnder3: 1, foralChildrenConfirmed: true });
  close(computePayroll({ ...i, pensionIndividual: 1500 }, CURRENT_SCENARIO).incomeTax.annualTax, 3310.83);
});
test('imported ascendant eligibility and sharing survive normalization', () => {
  const session = createSession({
    input: { region: 'bizkaia', dependents65: 1, foralAscendantsConfirmed: true, foralAscendantClaimants: 2 },
  });
  close(computePayroll(session.input, CURRENT_SCENARIO).incomeTax.annualTax, 4331);
  assert.equal(createSession({ input: { foralAscendantClaimants: 0 } }).input.foralAscendantClaimants, 1);
  assert.equal(createSession({ input: { foralAscendantsUnder65: 3.9 } }).input.foralAscendantsUnder65, 3);
});
for (const claimants of [0, -1, 1.5, 11])
  test(`invalid direct claimant count ${claimants} is rejected`, () =>
    assert.throws(
      () => computePayroll(input('bizkaia', { foralAscendantClaimants: claimants }), CURRENT_SCENARIO),
      /Unsupported foral/,
    ));
