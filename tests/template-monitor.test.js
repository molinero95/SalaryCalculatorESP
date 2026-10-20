import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateCatalogue, renderCatalogue, cataloguePath } from '../scripts/template-catalogue.js';
import {
  inspectSource,
  classifySource,
  checkSources,
  nextBaseline,
  normalizeProtectedEmails,
} from '../scripts/check-template-sources.js';
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
  ['invalid withholding mode', (c) => (c.proposals[0].changes.incomeTax.useSeparateWithholding = 'yes')],
  ['invalid allowance scope', (c) => (c.proposals[0].changes.incomeTax.stateOnlyAllowances = 'yes')],
  ['missing separate withholding scale', (c) => delete c.proposals[0].changes.incomeTax.withholdingBrackets],
  ['invalid separate withholding rate', (c) => (c.proposals[0].changes.incomeTax.withholdingBrackets[0].rate = 101)],
]) {
  test(`rejects ${label}`, () => {
    const copy = structuredClone(catalogue);
    mutate(copy);
    assert.throws(() => validateCatalogue(copy));
  });
}
const fakeFetch = async () => new Response('%PDF-source text', { headers: { 'content-type': 'application/pdf' } });
test('random Cloudflare email keys do not change PP fingerprints but changed content and email bytes do', async () => {
  const page = (token, text = 'Proposal text') =>
    `<article>${text}</article><a href="/cdn-cgi/l/email-protection#${token}">Email</a>`;
  const inspect = (body, url = 'https://www.pp.es/article') =>
    inspectSource(url, async () => new Response(body, { headers: { 'content-type': 'text/html' } }));
  // Both tokens decode to the same ASCII 'a' using different XOR keys.
  const first = await inspect(page('0061'));
  const second = await inspect(page('0160'));
  assert.notEqual(first.rawSha256, second.rawSha256);
  assert.equal(classifySource(first, second), 'unchanged');
  assert.equal(classifySource(first, await inspect(page('0163'))), 'changed');
  assert.equal(classifySource(first, await inspect(page('0160', 'Changed proposal'))), 'changed');
  assert.equal(classifySource({ ...first, fingerprintMethod: undefined }, first), 'changed');
  assert.equal(
    normalizeProtectedEmails('<span data-cfemail="0061">'),
    normalizeProtectedEmails('<span data-cfemail="0160">'),
  );
  const other = await inspect(page('0061'), 'https://example.org/article');
  assert.equal(other.fingerprintMethod, undefined);
  assert.equal(
    nextBaseline({}, [{ ...first, id: 'pp2024', status: 'baseline-needed' }]).pp2024.fingerprintMethod,
    'sha256:cf-email-v1',
  );
  assert.equal(
    nextBaseline({ pp2024: { sha256: 'old' } }, [{ ...first, id: 'pp2024', status: 'changed' }], new Set(['other']))
      .pp2024.sha256,
    'old',
  );
});
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

test('a transient transport failure retries once and retains the document fingerprint', async () => {
  let calls = 0;
  const result = await inspectSource(
    'https://example.org/source.pdf',
    async () => {
      calls++;
      if (calls === 1) throw new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } });
      return fakeFetch();
    },
    { retryDelayMs: 0 },
  );
  assert.equal(calls, 2);
  assert.equal(result.attempts, 2);
  assert.equal(result.sha256, (await inspectSource('https://example.org/source.pdf', fakeFetch)).sha256);
});

test('temporary HTTP failures retry once, but 403 blocks and invalid PDFs do not', async () => {
  for (const [status, expectedCalls] of [
    [503, 2],
    [429, 2],
    [403, 1],
    [404, 1],
  ]) {
    let calls = 0;
    const result = await inspectSource(
      'https://example.org/source.pdf',
      async () => {
        calls++;
        return new Response('failure', { status });
      },
      { retryDelayMs: 0 },
    );
    assert.equal(calls, expectedCalls);
    assert.equal(result.error, `HTTP ${status}`);
  }
  let calls = 0;
  const invalid = await inspectSource(
    'https://example.org/source.pdf',
    async () => {
      calls++;
      return new Response('challenge', { headers: { 'content-type': 'application/pdf' } });
    },
    { retryDelayMs: 0 },
  );
  assert.equal(calls, 1);
  assert.equal(invalid.error, 'Invalid PDF signature');
});

test('exhausted transport retries retain the cause code without accepting a baseline', async () => {
  const failed = await inspectSource(
    'https://example.org/source.pdf',
    async () => {
      throw new TypeError('fetch failed', { cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } });
    },
    { retryDelayMs: 0 },
  );
  assert.equal(failed.attempts, 2);
  assert.equal(failed.error, 'fetch failed (UND_ERR_CONNECT_TIMEOUT)');
  assert.equal(classifySource({ sha256: 'old' }, failed), 'unavailable');
  assert.deepEqual(
    nextBaseline(
      { source: { url: failed.url, sha256: 'old' } },
      [{ ...failed, id: 'source', status: 'unavailable' }],
      true,
    ),
    { source: { url: failed.url, sha256: 'old' } },
  );
});
