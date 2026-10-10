import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_INPUT, CURRENT_SCENARIO } from '../js/defaults.js';
import { foralWithholding, foralEmploymentIncome, foralAnnualTax, foralDescendantCredit } from '../js/foral-tax.js';
import { computePayroll } from '../js/calc.js';
import { createSession } from '../js/application/simulation-session.js';
import { unsupportedFiscalProfile } from '../js/domain/fiscal-profile.js';
const input = (region, extra = {}) => ({ ...DEFAULT_INPUT, region, ...extra });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.0051, `${actual} != ${expected}`);

// Independently transcribed official table rows, not production constants.
const basqueRows = [
  [20000, [0, 0, 0, 0, 0, 0, 0]],
  [20510, [7, 5, 3, 0, 0, 0, 0]],
  [21300, [8, 6, 4, 1, 0, 0, 0]],
  [32610, [15, 14, 13, 10, 8, 4, 0]],
  [56780, [21, 20, 20, 18, 17, 15, 9]],
  [75020, [25, 25, 24, 23, 22, 20, 16]],
  [122030, [32, 32, 31, 31, 30, 29, 26]],
  [236060, [39, 39, 39, 38, 38, 37, 36]],
  [null, [40, 40, 40, 39, 39, 39, 37]],
];
for (const region of ['bizkaia', 'gipuzkoa', 'alava']) {
  test(`${region}: published descendant columns including 6+ and shared credit independence`, () => {
    for (const [upTo, rates] of basqueRows) {
      for (let children = 0; children <= 20; children++) {
        const i = input(region, { children, foralChildrenConfirmed: true });
        assert.equal(foralWithholding(i, upTo ?? 400000, 0).rate, rates[Math.min(children, 6)]);
        assert.equal(
          foralWithholding({ ...i, childrenFullyCounted: true }, upTo ?? 400000, 0).rate,
          rates[Math.min(children, 6)],
        );
      }
    }
    assert.equal(foralWithholding(input(region, { children: 2 }), 20510.01, 0).rate, 4);
    assert.equal(foralWithholding(input(region, { children: 6 }), 236060.01, 0).rate, 37);
  });
  test(`${region}: disability points at all upper boundaries and just above`, () => {
    const rows = [
      [25410, 9, 12],
      [32610, 7, 12],
      [48060, 6, 10],
      [56780, 5, 10],
      [80730, 4, 8],
      [122030, 3, 6],
      [190410, 2, 5],
      [null, 1, 3],
    ];
    for (let n = 0; n < rows.length; n++) {
      const [bound, ordinary, severe] = rows[n];
      for (const gross of bound === null ? [400000] : [bound, bound + 0.01]) {
        const [, a, b] = gross === bound || bound === null ? rows[n] : rows[n + 1];
        const normal = foralWithholding(input(region), gross, 0).rate;
        assert.equal(foralWithholding(input(region, { disability: 33 }), gross, 0).rate, Math.max(0, normal - a));
        assert.equal(foralWithholding(input(region, { disability: 65 }), gross, 0).rate, Math.max(0, normal - b));
        assert.equal(
          foralWithholding(input(region, { disability: 33, foralReducedMobility: true }), gross, 0).rate,
          Math.max(0, normal - b),
        );
      }
      assert.ok(ordinary <= severe);
    }
  });
}

test('Navarra: descendant columns, lower-exclusive thresholds and 10+ saturation', () => {
  const rows = [
    [17000, [2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
    [18500, [4, 3, 2, 0, 0, 0, 0, 0, 0, 0, 0]],
    [27500, [14.6, 13.3, 12.6, 9.9, 9.2, 7.8, 5.8, 3.8, 0.8, 0, 0]],
    [75250, [29.6, 29.2, 28.3, 27.3, 27.2, 26.2, 26.1, 24.5, 23.4, 22.3, 21.3]],
    [350000, [43, 42.9, 42.8, 42.5, 41.5, 41, 40.5, 38.5, 37.5, 36.7, 36]],
  ];
  for (const [from, rates] of rows)
    for (let children = 0; children <= 20; children++) {
      assert.equal(
        foralWithholding(input('navarra', { children }), from + 0.01, 0).rate,
        rates[Math.min(children, 10)],
      );
    }
  assert.equal(foralWithholding(input('navarra', { children: 1 }), 17000, 0).rate, 0);
  assert.equal(foralWithholding(input('navarra', { children: 1 }), 18500, 0).rate, 1);
  assert.equal(foralWithholding(input('navarra', { children: 1 }), 75250, 0).rate, 27.7);
});

test('Navarra: disability reductions at each upper boundary, above, and nonnegative floor', () => {
  const rows = [
    [23250, 5, 15],
    [41250, 3, 15],
    [94750, 2, 8],
    [null, 2, 5],
  ];
  for (let n = 0; n < rows.length; n++)
    for (const gross of rows[n][0] === null ? [400000] : [rows[n][0], rows[n][0] + 0.01]) {
      const row = rows[n][0] === null || gross === rows[n][0] ? rows[n] : rows[n + 1];
      const normal = foralWithholding(input('navarra'), gross, 0).rate;
      assert.equal(foralWithholding(input('navarra', { disability: 33 }), gross, 0).rate, Math.max(0, normal - row[1]));
      assert.equal(foralWithholding(input('navarra', { disability: 65 }), gross, 0).rate, Math.max(0, normal - row[2]));
    }
});

for (const [region, first, second, third, fourth, fifth, under6, age6to15] of [
  ['bizkaia', 682, 844, 1421, 1680, 2195, 394, 0],
  ['gipuzkoa', 682, 844, 1421, 1680, 2195, 394, 0],
  ['alava', 734.8, 909.7, 1532.3, 1811.7, 2366.1, 424.6, 68.2],
]) {
  test(`${region}: separate official annual child credits, sharing and age supplements`, () => {
    const i = input(region, {
      children: 6,
      childrenUnder6: 2,
      childrenUnder3: 1,
      children6to15: 1,
      foralChildrenConfirmed: true,
      childrenFullyCounted: true,
    });
    const full = first + second + third + fourth + 2 * fifth + 2 * under6 + age6to15;
    close(foralDescendantCredit(i, 28050), full);
    close(foralDescendantCredit({ ...i, childrenFullyCounted: false }, 28050), full / 2);
    close(foralDescendantCredit({ ...i, childrenUnder3: 2 }, 28050), full);
  });
}

test('Álava: 15% rural uplift applies only to the ordinal child credit, not age supplements', () => {
  close(
    foralDescendantCredit(
      input('alava', { children: 1, childrenUnder6: 1, childrenFullyCounted: true, foralAlavaRural: true }),
      28050,
    ),
    1269.62,
  );
  close(
    foralDescendantCredit(input('bizkaia', { children: 1, childrenFullyCounted: true, foralAlavaRural: true }), 28050),
    682,
  );
});

test('Navarra: income-dependent child increment, rounded percentage and sharing exactly once', () => {
  const i = input('navarra', { children: 1, childrenFullyCounted: true });
  for (const [income, expected] of [
    [19999.99, 676.2],
    [20000, 676.2],
    [20000.01, 676.2],
    [25000, 615.825],
    [30000, 555.45],
    [30000.01, 483],
  ]) {
    close(foralDescendantCredit(i, income), expected);
    close(foralDescendantCredit({ ...i, childrenFullyCounted: false }, income), expected / 2);
  }
  close(foralDescendantCredit({ ...i, childrenUnder3: 1 }, 28050), 1351.0476);
  close(foralDescendantCredit({ ...i, children: 7 }, 35000), 6391);
});

for (const [region, disability, expectedReduction, expectedTax, expectedRate] of [
  ['bizkaia', 33, 6000, 2749, 8],
  ['gipuzkoa', 33, 6000, 2749, 8],
  ['alava', 33, 6000, 2629.36, 8],
  ['bizkaia', 65, 10500, 1127.5, 3],
  ['gipuzkoa', 65, 10500, 1127.5, 3],
  ['alava', 65, 10500, 956.96, 3],
  ['navarra', 33, 0, 3290.35, 11.6],
  ['navarra', 65, 0, 949.35, 0],
]) {
  test(`${region}: independently worked €30k disability ${disability} payroll`, () => {
    const i = input(region, { disability });
    const earnings = foralEmploymentIncome(i, 30000, 1950);
    close(earnings.reduction, expectedReduction);
    close(foralAnnualTax(i, 28050 - expectedReduction).tax, expectedTax);
    close(foralWithholding(i, 30000, 1950).rate, expectedRate);
    const r = computePayroll(i, CURRENT_SCENARIO);
    close(r.netAnnualAfterReturn, 30000 - 1950 - expectedTax);
  });
}

test('Basque disability bonification multiplies the declining formula and caps at net earnings', () => {
  close(foralEmploymentIncome(input('bizkaia', { disability: 33 }), 23000, 0).reduction, 5999.28);
  close(foralEmploymentIncome(input('bizkaia', { disability: 65 }), 23000, 0).reduction, 10498.74);
  close(foralEmploymentIncome(input('alava', { disability: 65 }), 10000, 0).reduction, 10000);
  assert.equal(foralAnnualTax(input('alava', { disability: 65 }), 0).tax, 0);
});

for (const region of ['bizkaia', 'gipuzkoa', 'alava', 'navarra']) {
  test(`${region}: require family confirmation, reject inconsistent ages, preserve guards`, () => {
    assert.equal(unsupportedFiscalProfile(input(region, { children: 1 })), true);
    assert.equal(unsupportedFiscalProfile(input(region, { children: 1, foralChildrenConfirmed: true })), false);
    for (const extra of [
      { childrenUnder3: 2 },
      ...(region === 'navarra' ? [] : [{ childrenUnder6: 2 }]),
      ...(region === 'navarra' ? [] : [{ children6to15: 2 }]),
      { dependents65: 1 },
    ]) {
      assert.throws(
        () => computePayroll(input(region, { children: 1, foralChildrenConfirmed: true, ...extra }), CURRENT_SCENARIO),
        /Unsupported foral/,
      );
    }
    assert.equal(unsupportedFiscalProfile(input(region, { disability: 33 })), false);
  });
}

test('Basque age groups cannot double count children or silently infer under-six children', () => {
  for (const extra of [
    { childrenUnder3: 1, childrenUnder6: 0 },
    { childrenUnder6: 1, children6to15: 1 },
  ]) {
    assert.equal(
      unsupportedFiscalProfile(input('bizkaia', { children: 1, foralChildrenConfirmed: true, ...extra })),
      true,
    );
  }
});

test('restored state retains new eligibility and age fields, old state requires confirmation', () => {
  const s = createSession({
    input: {
      region: 'bizkaia',
      children: 1,
      childrenUnder6: 1,
      foralChildrenConfirmed: true,
      foralReducedMobility: true,
      children6to15: 99,
    },
  });
  assert.equal(s.input.children6to15, 20);
  assert.equal(s.input.foralChildrenConfirmed, true);
  assert.equal(s.input.foralReducedMobility, true);
  assert.equal(createSession({ input: { region: 'bizkaia', children: 1 } }).input.foralChildrenConfirmed, false);
});

test('foral family inputs never change common-regime calculations', () => {
  const a = input('madrid', { children: 1, disability: 33 });
  const b = {
    ...a,
    foralChildrenConfirmed: true,
    foralReducedMobility: true,
    foralAlavaRural: true,
    childrenUnder6: 1,
    children6to15: 1,
  };
  assert.deepEqual(computePayroll(a, CURRENT_SCENARIO), computePayroll(b, CURRENT_SCENARIO));
});

test('Álava rural confirmation is inconsistent with Vitoria-Gasteiz residence', () => {
  assert.equal(
    unsupportedFiscalProfile(
      input('alava', { city: 'vitoria-gasteiz', children: 1, foralChildrenConfirmed: true, foralAlavaRural: true }),
    ),
    true,
  );
});

// Fixtures were extracted from official publications, never from runtime tables.
for (const region of ['bizkaia', 'gipuzkoa', 'alava', 'navarra']) {
  test(`${region}: every published descendant cell at both sides of every boundary`, () => {
    const navarra = region === 'navarra';
    const fixture = JSON.parse(
      readFileSync(
        new URL(`./fixtures/${navarra ? 'navarre' : 'basque'}-family-withholding.json`, import.meta.url),
        'utf8',
      ),
    );
    const rows = navarra ? fixture.lowerExclusive : fixture.upperInclusive;
    for (let n = 0; n < rows.length; n++) {
      const [boundary, rates] = rows[n];
      for (let children = 0; children < rates.length; children++) {
        const i = input(region, { children });
        if (navarra) {
          close(foralWithholding(i, boundary + 0.01, 0).rate, rates[children]);
          close(foralWithholding(i, boundary, 0).rate, n ? rows[n - 1][1][children] : 0);
        } else {
          close(foralWithholding(i, boundary ?? 400000, 0).rate, rates[children]);
          if (boundary !== null) close(foralWithholding(i, boundary + 0.01, 0).rate, rows[n + 1][1][children]);
        }
      }
    }
  });
}

for (const [region, tax, rate] of [
  ['bizkaia', 3957, 14],
  ['gipuzkoa', 3957, 14],
  ['alava', 3915.3, 14],
  ['navarra', 3730.83, 13.3],
]) {
  test(`${region}: independently worked €30k payroll with one shared child under three`, () => {
    const i = input(region, { children: 1, childrenUnder3: 1, childrenUnder6: 1, foralChildrenConfirmed: true });
    const r = computePayroll(i, CURRENT_SCENARIO);
    close(r.incomeTax.annualTax, tax);
    close(r.incomeTax.rate, rate);
    close(r.netAnnualAfterReturn, 28050 - tax);
  });
}

test('invalid direct foral descendant counts cannot index a missing withholding column', () => {
  for (const children of [-1, 0.5, 21, NaN, Infinity])
    assert.throws(
      () => computePayroll(input('bizkaia', { children, foralChildrenConfirmed: true }), CURRENT_SCENARIO),
      /Unsupported foral/,
    );
});

test('a blocked foral profile names every reason, so the interface can say what is missing', async () => {
  const { foralProfileIssues } = await import('../js/domain/fiscal-profile.js');
  const { DEFAULT_INPUT } = await import('../js/defaults.js');
  const base = { ...DEFAULT_INPUT, region: 'bizkaia' };
  assert.deepEqual(foralProfileIssues(base), []);
  assert.deepEqual(foralProfileIssues({ ...base, region: 'madrid', children: 2 }), []);
  // A leftover under-3 count with no children blocks the estimate.
  assert.deepEqual(foralProfileIssues({ ...base, childrenUnder3: 1 }), ['foralIssueAgeGroups']);
  assert.deepEqual(foralProfileIssues({ ...base, children: 1 }), ['foralIssueChildren']);
  assert.deepEqual(foralProfileIssues({ ...base, dependents65: 1 }), ['foralIssueAscendants']);
  assert.deepEqual(foralProfileIssues({ ...base, foralRentalGross: 6000 }), ['foralIssueAnnual']);
  assert.deepEqual(foralProfileIssues({ ...base, region: 'alava', city: 'vitoria-gasteiz', foralAlavaRural: true }), [
    'foralIssueAlavaRural',
  ]);
  assert.deepEqual(foralProfileIssues({ ...base, children: 1.5 }), ['foralIssueInvalid', 'foralIssueChildren']);
});
