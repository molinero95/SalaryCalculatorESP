import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fiscalSourcesPath, validateFiscalSources, staleGroups, REQUIRED_GROUPS } from '../scripts/fiscal-sources.js';
import { checkSources } from '../scripts/check-template-sources.js';
import { cataloguePath } from '../scripts/template-catalogue.js';

const fiscal = JSON.parse(await readFile(fiscalSourcesPath, 'utf8'));
const proposals = JSON.parse(await readFile(cataloguePath, 'utf8'));

test('every regional, foral and state parameter group has a recorded source', () => {
  assert.equal(validateFiscalSources(fiscal), fiscal);
  // 15 common-regime communities and 4 foral territories, listed explicitly so a
  // region removed from the data files is noticed here too.
  for (const region of [
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
  ])
    assert.ok(REQUIRED_GROUPS.includes(`regional.${region}`), region);
  for (const territory of ['bizkaia', 'gipuzkoa', 'alava', 'navarra'])
    assert.ok(REQUIRED_GROUPS.includes(`foral.${territory}`), territory);
});

for (const [label, mutate] of [
  ['duplicate id', (c) => c.sources.push(c.sources[0])],
  ['HTTP source', (c) => (c.sources[0].url = 'http://example.org')],
  ['HTTP monitor URL', (c) => (c.sources[0].monitorUrl = 'http://example.org')],
  ['credentials', (c) => (c.sources[0].url = 'https://user:pass@example.org')],
  ['invalid verification date', (c) => (c.sources[0].verifiedAt = '2026-13-40')],
  ['missing fiscal year', (c) => delete c.sources[0].fiscalYear],
  ['unknown parameter group', (c) => c.sources[0].covers.push('regional.atlantis')],
  ['uncovered parameter group', (c) => (c.sources = c.sources.filter((s) => !s.covers.includes('regional.madrid')))],
]) {
  test(`fiscal source catalogue rejects ${label}`, () => {
    const copy = structuredClone(fiscal);
    mutate(copy);
    assert.throws(() => validateFiscalSources(copy));
  });
}

const tiny = {
  schemaVersion: 1,
  sources: [
    { id: 'old', url: 'https://example.org/a', covers: ['state.scale'], fiscalYear: 2025, verifiedAt: '2025-03-01' },
    { id: 'new', url: 'https://example.org/b', covers: ['state.scale'], fiscalYear: 2026, verifiedAt: '2026-02-10' },
    { id: 'pen', url: 'https://example.org/c', covers: ['pension'], fiscalYear: 2026, verifiedAt: '2026-02-10' },
  ],
};
const stale = (today) => staleGroups(tiny, today).filter((g) => ['state.scale', 'pension'].includes(g));

test('a group is current while any covering source is verified for the fiscal year', () => {
  assert.deepEqual(stale('2026-10-10'), []);
  // In January the 2026 sources still count; from February a 2027 source is needed.
  assert.deepEqual(stale('2027-01-15'), []);
  assert.deepEqual(stale('2027-02-01'), ['state.scale', 'pension']);
});

test('a verification older than one year makes the group stale', () => {
  const early = {
    ...tiny,
    sources: [{ ...tiny.sources[1], fiscalYear: 2026, verifiedAt: '2025-12-01' }],
  };
  assert.deepEqual(
    staleGroups(early, '2026-12-01').filter((g) => g === 'state.scale'),
    [],
  );
  assert.deepEqual(
    staleGroups(early, '2026-12-02').filter((g) => g === 'state.scale'),
    ['state.scale'],
  );
});

test('the previous fiscal year is accepted only during the January grace period', () => {
  const onlyOld = { ...tiny, sources: [tiny.sources[0]] };
  assert.deepEqual(
    staleGroups(onlyOld, '2026-01-20').filter((g) => g === 'state.scale'),
    [],
  );
  assert.deepEqual(
    staleGroups(onlyOld, '2026-02-01').filter((g) => g === 'state.scale'),
    ['state.scale'],
  );
});

test('the recorded catalogue is current at the date it was reviewed', () => {
  assert.deepEqual(staleGroups(fiscal, '2026-10-10'), []);
});

test('enacted-law sources with a monitor URL are fingerprinted alongside proposals', async () => {
  const fetcher = async (url) =>
    new URL(url).pathname.toLowerCase().endsWith('.pdf')
      ? new Response('%PDF-x', { headers: { 'content-type': 'application/pdf' } })
      : new Response('<xml/>', { headers: { 'content-type': 'application/xml' } });
  const { results } = await checkSources(proposals, {}, fetcher, fiscal);
  const enacted = results.filter((r) => r.id.startsWith('fiscal:'));
  assert.equal(enacted.length, fiscal.sources.filter((s) => s.monitorUrl).length);
  assert.ok(enacted.every((r) => r.sourceType === 'enacted' && r.status === 'baseline-needed' && !r.error));
  assert.equal(results.length - enacted.length, proposals.proposals.length);
});

for (const date of ['2026-02-30', '2026-02-29', '2026-04-31']) {
  test(`rejects nonexistent calendar date ${date}`, () => {
    const copy = structuredClone(fiscal);
    copy.sources[0].verifiedAt = date;
    assert.throws(() => validateFiscalSources(copy));
  });
}

test('accepts a genuine leap day', () => {
  const copy = structuredClone(fiscal);
  copy.sources[0].verifiedAt = '2024-02-29';
  assert.equal(validateFiscalSources(copy), copy);
});

for (const source of [
  { fiscalYear: 2027, verifiedAt: '2026-10-09' },
  { fiscalYear: 2026, verifiedAt: '2026-10-11' },
  { fiscalYear: 2027, verifiedAt: '2026-01-01' },
]) {
  test(`future metadata is stale: ${JSON.stringify(source)}`, () => {
    const catalogue = { sources: [{ ...tiny.sources[1], ...source }] };
    assert.ok(staleGroups(catalogue, '2026-10-10').includes('state.scale'));
    assert.ok(staleGroups(catalogue, '2026-01-15').includes('state.scale'));
  });
}

test('rejects an impossible monitoring date', () => {
  assert.throws(() => staleGroups(tiny, '2026-02-30'));
});
