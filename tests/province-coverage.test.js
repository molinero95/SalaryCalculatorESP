import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CITIES } from '../js/data/cities.js';
import { DEFAULT_INPUT, CURRENT_SCENARIO, clone } from '../js/defaults.js';
import { createSession } from '../js/application/simulation-session.js';
import { resolveResidence } from '../js/domain/residence.js';
import { computePayroll } from '../js/calc.js';

// Independent INE inventory, not generated from the application city list.
const { territories } = JSON.parse(readFileSync(new URL('./fixtures/province-coverage.json', import.meta.url)));

test('audit accounts for all 50 provinces plus both autonomous cities', () => {
  assert.equal(territories.length, 52);
  assert.deepEqual(
    territories.map(({ code }) => code),
    Array.from({ length: 52 }, (_, i) => String(i + 1).padStart(2, '0')),
  );
  assert.equal(territories.filter(({ region }) => region).length, 50);
  assert.deepEqual(
    territories.filter(({ region }) => !region).map(({ province }) => province),
    ['Ceuta', 'Melilla'],
  );
});

for (const { province, capital, region } of territories.filter(({ region }) => region)) {
  test(`${province}: provincial capital retains its expected jurisdiction and calculates payroll`, () => {
    assert.equal(CITIES.find(({ id }) => id === capital)?.region, region);
    assert.deepEqual(resolveResidence(`city:${capital}`), { city: capital, region });
    for (const salary of [18000, 30000, 45000, 73000, 100000]) {
      const session = createSession({ input: { ...clone(DEFAULT_INPUT), salary, region, city: capital } });
      assert.equal(session.input.region, region);
      assert.equal(session.input.city, capital);
      const result = computePayroll(session.input, clone(CURRENT_SCENARIO));
      for (const amount of [
        result.netAnnual,
        result.netAnnualAfterReturn,
        result.incomeTax.withheld,
        result.incomeTax.annualTax,
      ]) {
        assert.ok(Number.isFinite(amount), `${province} at ${salary}`);
      }
      assert.ok(result.incomeTax.annualTax >= 0);
    }
  });
}

for (const region of ['ceuta', 'melilla']) {
  test(`${region}: coverage must not imply an implemented special regime`, () => {
    assert.equal(resolveResidence(`region:${region}`), null);
    assert.equal(resolveResidence(`city:${region}`), null);
    // Existing unknown-region compatibility normalizes imports to general;
    // it is not support for the missing city or its statutory relief.
    assert.equal(createSession({ input: { region } }).input.region, 'general');
  });
}
