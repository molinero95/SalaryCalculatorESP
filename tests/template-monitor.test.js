import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateCatalogue, renderCatalogue, cataloguePath } from '../scripts/template-catalogue.js';
import { inspectSource, classifySource, checkSources, nextBaseline } from '../scripts/check-template-sources.js';
const catalogue = JSON.parse(await readFile(cataloguePath, 'utf8'));
test('catalogue validates and generates both modelled proposals and notes', () => {
  assert.equal(validateCatalogue(catalogue), catalogue);
  assert.match(renderCatalogue(catalogue), /export const UNMODELLED_PROPOSALS/);
});
for (const [label, mutate] of [
  ['duplicate id', (c) => c.proposals.push(c.proposals[0])],
  ['HTTP source', (c) => (c.proposals[0].url = 'http://example.org')],
  ['credentials', (c) => (c.proposals[0].url = 'https://user:pass@example.org')],
  ['secondary simulation', (c) => (c.proposals[0].sourceType = 'secondary')],
  ['missing history', (c) => (c.proposals[0].history = [])],
  ['unsupported parameter', (c) => (c.proposals[0].changes.incomeTax.unknown = 1)],
  ['negative rate', (c) => (c.proposals[0].changes.incomeTax.brackets[0].rate = -1)],
  ['unordered brackets', (c) => (c.proposals[0].changes.incomeTax.brackets[1].upTo = 1)],
  ['closed final bracket', (c) => (c.proposals[0].changes.incomeTax.brackets.at(-1).upTo = 999999)],
  ['missing partial limitations', (c) => (c.proposals[1].limitations = [])],
]) {
  test(`rejects ${label}`, () => {
    const copy = structuredClone(catalogue);
    mutate(copy);
    assert.throws(() => validateCatalogue(copy));
  });
}
const fakeFetch = async () => new Response('%PDF-source text', { headers: { 'content-type': 'application/pdf' } });
test('hashes source bytes and distinguishes changed, unchanged, new URLs and errors', async () => {
  const current = await inspectSource('https://example.org', fakeFetch);
  assert.match(current.sha256, /^[a-f0-9]{64}$/);
  assert.equal(classifySource(current, current), 'unchanged');
  assert.equal(classifySource({ ...current, sha256: 'other' }, current), 'changed');
  assert.equal(classifySource(undefined, current), 'baseline-needed');
  assert.equal(classifySource({ ...current, url: 'https://other.org' }, current), 'changed');
  assert.equal(classifySource(current, { error: 'HTTP 404' }), 'unavailable');
});
for (const [label, fetcher] of [
  ['HTTP failure', async () => new Response('', { status: 404 })],
  ['empty source', async () => new Response('', { headers: { 'content-type': 'text/html' } })],
  ['wrong type', async () => new Response('image', { headers: { 'content-type': 'image/png' } })],
  [
    'network failure',
    async () => {
      throw new Error('timeout');
    },
  ],
  [
    'oversized source',
    async () => new Response(new Uint8Array(20 * 1024 * 1024 + 1), { headers: { 'content-type': 'application/pdf' } }),
  ],
])
  test(`source monitor reports ${label}`, async () =>
    assert.ok((await inspectSource('https://example.org', fetcher)).error));
test('all catalogue sources are inspected without changing verified dates or calculations', async () => {
  const before = JSON.stringify(catalogue);
  const first = await checkSources(catalogue, {}, fakeFetch);
  const baseline = Object.fromEntries(first.results.map((r) => [r.id, r]));
  const second = await checkSources(catalogue, baseline, fakeFetch);
  assert.equal(second.results.length, catalogue.proposals.length);
  assert.ok(second.results.every((r) => r.status === 'unchanged'));
  assert.equal(JSON.stringify(catalogue), before);
});

test('PDF URLs reject HTML challenge pages and spoofed PDF content', async () => {
  assert.ok(
    (
      await inspectSource(
        'https://example.org/a.pdf',
        async () => new Response('challenge', { headers: { 'content-type': 'text/html' } }),
      )
    ).error,
  );
  assert.ok(
    (
      await inspectSource(
        'https://example.org/a.pdf',
        async () => new Response('challenge', { headers: { 'content-type': 'application/pdf' } }),
      )
    ).error,
  );
});

test('one failing source does not block healthy baselines or approve changed ones', () => {
  const baseline = { changed: { url: 'old', sha256: 'old' }, failed: { url: 'failed', sha256: 'old' } };
  const results = [
    { id: 'new', url: 'new', sha256: 'new', status: 'baseline-needed' },
    { id: 'changed', url: 'old', sha256: 'new', status: 'changed' },
    { id: 'failed', url: 'failed', error: '404', status: 'unavailable' },
  ];
  assert.deepEqual(nextBaseline(baseline, results), { ...baseline, new: { url: 'new', sha256: 'new' } });
  assert.equal(nextBaseline(baseline, results, true).changed.sha256, 'new');
  assert.equal(nextBaseline(baseline, results, true).failed.sha256, 'old');
});
