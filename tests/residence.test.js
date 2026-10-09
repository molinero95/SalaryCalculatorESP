import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveResidence,
  residenceValue,
  residenceCommunity,
  residenceCities,
  selectResidence,
  RESIDENCE_COMMUNITIES,
} from '../js/domain/residence.js';
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

test('communities collapse the three Basque administrations without hiding Navarra', () => {
  assert.equal(Object.keys(RESIDENCE_COMMUNITIES).length, 17);
  for (const region of ['bizkaia', 'gipuzkoa', 'alava']) assert.equal(residenceCommunity(region), 'basque');
  assert.equal(residenceCommunity('navarra'), 'navarra');
  assert.equal(residenceCommunity('madrid'), 'madrid');
  assert.equal(residenceCommunity('unknown'), 'general');
});

test('cascading selections clear stale cities and reject incompatible choices', () => {
  const input = { region: 'bizkaia', city: 'bilbao' };
  assert.deepEqual(selectResidence(input, 'residence', 'region:basque'), input);
  assert.deepEqual(selectResidence(input, 'residence', 'region:madrid'), { region: 'madrid', city: '' });
  assert.deepEqual(selectResidence(input, 'residenceTerritory', 'region:gipuzkoa'), { region: 'gipuzkoa', city: '' });
  assert.equal(selectResidence(input, 'residenceTerritory', 'region:navarra'), null);
  assert.equal(selectResidence(input, 'residenceCity', 'madrid'), null);
  assert.equal(selectResidence(input, 'residence', 'city:madrid'), null);
  assert.equal(selectResidence(input, 'residence', 'region:alava'), null);
  assert.equal(selectResidence({ region: 'madrid' }, 'residenceTerritory', 'region:bizkaia'), null);
  assert.deepEqual(selectResidence(input, 'residenceCity', ''), { region: 'bizkaia', city: '' });
  assert.deepEqual(selectResidence({ region: 'madrid', city: 'madrid' }, 'residence', 'region:basque'), {
    region: 'bizkaia',
    city: '',
  });
});

test('filtered city options never cross fiscal borders and remain alphabetically sorted', () => {
  for (const city of CITIES) {
    const options = residenceCities(city.region);
    assert.ok(options.some(({ id }) => id === city.id));
    assert.ok(options.every(({ region }) => region === city.region));
    assert.deepEqual(
      options,
      [...options].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    );
    assert.deepEqual(selectResidence({ region: city.region }, 'residenceCity', city.id), {
      region: city.region,
      city: city.id,
    });
  }
  assert.deepEqual(residenceCities('general'), []);
});
