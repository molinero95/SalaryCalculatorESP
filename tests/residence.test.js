import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveResidence, residenceValue } from '../js/domain/residence.js';
import { CITIES } from '../js/data/cities.js';
import { residenceSources } from '../js/data/residence-sources.js';

test('single residence choice distinguishes city ids from territory ids', () => {
  assert.deepEqual(resolveResidence('city:madrid'), { city: 'madrid', region: 'madrid' });
  assert.deepEqual(resolveResidence('region:madrid'), { city: '', region: 'madrid' });
  assert.deepEqual(resolveResidence('city:bilbao'), { city: 'bilbao', region: 'bizkaia' });
  assert.deepEqual(resolveResidence('region:general'), { city: '', region: 'general' });
});

test('unknown, malformed and inherited keys cannot select a jurisdiction', () => {
  for (const value of [
    null,
    4,
    '',
    'bilbao',
    'city:missing',
    'region:missing',
    'region:__proto__',
    'region:constructor',
  ]) {
    assert.equal(resolveResidence(value), null);
  }
});

test('old saved city/region pairs restore safely without changing their shape', () => {
  assert.equal(residenceValue({ city: 'bilbao', region: 'bizkaia' }), 'city:bilbao');
  assert.equal(residenceValue({ city: 'bilbao', region: 'madrid' }), 'region:madrid');
  assert.equal(residenceValue({ region: 'navarra' }), 'region:navarra');
  assert.equal(residenceValue({ region: 'missing' }), 'region:general');
});

test('every city has a round-trip residence choice and an official fiscal source', () => {
  for (const city of CITIES) {
    const input = resolveResidence(`city:${city.id}`);
    assert.equal(input.region, city.region);
    assert.equal(residenceValue(input), `city:${city.id}`);
    for (const source of residenceSources(city.region)) {
      assert.ok(source.label);
      assert.match(
        source.url,
        /^https:\/\/(?:www\.)?(?:hacienda\.gob\.es|boe\.es|bizkaia\.eus|www7\.gipuzkoa\.net|web\.araba\.eus|lexnavarra\.navarra\.es)\//,
      );
    }
  }
});

test('2026 scale amendments and each separate foral administration have specific sources', () => {
  assert.ok(residenceSources('valencia').some(({ url }) => url.includes('2026-19331')));
  assert.ok(residenceSources('extremadura').some(({ url }) => url.includes('2026-17839')));
  assert.match(residenceSources('bizkaia')[0].url, /bizkaia/);
  assert.match(residenceSources('gipuzkoa')[0].url, /gipuzkoa/);
  assert.match(residenceSources('alava')[0].url, /araba/);
  assert.match(residenceSources('navarra')[0].url, /navarra/);
});
