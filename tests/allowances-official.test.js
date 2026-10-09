import { test } from 'node:test';
import assert from 'node:assert/strict';
import { personalAllowance, annualTax } from '../js/tax.js';
import { CURRENT_SCENARIO, DEFAULT_INPUT } from '../js/defaults.js';
const p = CURRENT_SCENARIO.incomeTax;
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
// LIRPF arts.57–60 and AEAT 2026 withholding algorithm p.24: distinct age rules.
for (const age of [64, 65, 66, 74, 75, 76, 100]) {
  test(`annual and withholding personal minimum at age ${age}`, () => {
    const input = { ...DEFAULT_INPUT, age };
    assert.equal(personalAllowance(input, p, true).personal, 5550 + (age > 65 ? 1150 : 0) + (age > 75 ? 1400 : 0));
    assert.equal(personalAllowance(input, p).personal, 5550 + (age >= 65 ? 1150 : 0) + (age >= 75 ? 1400 : 0));
  });
}
for (const [children, total] of [
  [0, 0],
  [1, 2400],
  [2, 5100],
  [3, 9100],
  [4, 13600],
  [5, 18100],
  [6, 22600],
]) {
  for (const shared of [true, false]) {
    test(`descendant order ${children}, shared ${shared}`, () => {
      const result = personalAllowance(
        { ...DEFAULT_INPUT, children, childrenUnder3: children, childrenFullyCounted: !shared },
        p,
        true,
      );
      assert.equal(result.children, (total + 2800 * children) / (shared ? 2 : 1));
    });
  }
}
for (const [disability, allowance] of [
  [0, 0, 2000],
  [33, 3000, 5500],
  [65, 12000, 9750],
]) {
  test(`state disability allowance at ${disability}%`, () => {
    assert.equal(personalAllowance({ ...DEFAULT_INPUT, disability }, p, true).disability, allowance);
  });
}
// AEAT chapter14 regional minimum table; rows list basic, age increments,
// first-fourth descendant, under3, ascendant increments, disability and assistance.
const rows = {
  general: [5550, 1150, 1400, 2400, 2700, 4000, 4500, 2800, 1150, 1400, 3000, 9000, 3000],
  andalusia: [5790, 1200, 1460, 2510, 2820, 4170, 4700, 2920, 1200, 1460, 3130, 9390, 3130],
  asturias: [6105, 1265, 1540, 2640, 2970, 4400, 4950, 3080, 1265, 1540, 3300, 9900, 3300],
  valencia: [6105, 1265, 1540, 2640, 2970, 4400, 4950, 3080, 1265, 1540, 3300, 9900, 3300],
  canary: [5606, 1162, 1414, 2424, 2727, 4040, 4545, 2828, 1162, 1414, 3030, 9090, 3030],
  galicia: [5789, 1199, 1460, 2503, 2816, 4172, 4694, 2920, 1199, 1460, 3129, 9387, 3129],
  madrid: [
    5956.65, 1234.26, 1502.58, 2575.85, 2897.83, 4400, 4950, 3005.16, 1234.26, 1502.58, 3219.81, 9659.44, 3219.81,
  ],
  balearic: [5550, 1265, 1540, 2400, 2970, 4400, 4950, 2800, 1265, 1540, 3300, 9900, 3300],
};
for (const [region, row] of Object.entries(rows)) {
  for (const age of [65, 66, 75, 76]) {
    for (const disability of [0, 33, 65]) {
      test(`published ${region} minimum: age ${age}, disability ${disability}`, () => {
        const input = {
          ...DEFAULT_INPUT,
          region,
          age,
          disability,
          children: 5,
          childrenUnder3: 2,
          dependents65: 1,
          dependents75: 1,
        };
        const result = annualTax(input, p, 100000, 100000).regionalAllowance;
        const basic = region === 'balearic' && age > 65 ? 6105 : row[0];
        close(result.personal, basic + (age > 65 ? row[1] : 0) + (age > 75 ? row[2] : 0));
        close(result.children, (row[3] + row[4] + row[5] + 2 * row[6] + 2 * row[7]) / 2);
        close(result.dependents, 2 * row[8] + row[9]);
        close(result.disability, disability === 65 ? row[11] + row[12] : disability === 33 ? row[10] : 0);
      });
    }
  }
}
