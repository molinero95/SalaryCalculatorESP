import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectArchive, sourceArchivesPath } from '../scripts/source-archives.js';
import { checkSources, nextBaseline } from '../scripts/check-template-sources.js';
import { cataloguePath } from '../scripts/template-catalogue.js';

const catalogue = JSON.parse(await readFile(cataloguePath));
const proposal = catalogue.proposals.find((p) => p.id === 'podemos2019');
const archives = JSON.parse(await readFile(sourceArchivesPath));
const archive = archives.podemos2019;
const historical = { ...catalogue, proposals: [proposal] };
const blocked = async () => new Response('Forbidden', { status: 403 });

test('the actual owner-supplied archive retains its independently recorded fingerprint', async () => {
  const inspected = await inspectArchive(proposal, archive);
  assert.equal(inspected.error, undefined);
  assert.equal(inspected.bytes, 915034);
  assert.equal(inspected.sha256, 'c58695bf26d5e2c38b82b5269e3e854ab8ac908286ba8dc6ddc5ccfa6abf77fa');
});

test('a blocked historical source uses its checked copy and reports the remote failure explicitly', async () => {
  const report = await checkSources(historical, {}, blocked, null, archives);
  const result = report.results[0];
  assert.equal(result.status, 'baseline-needed');
  assert.equal(result.remoteError, 'HTTP 403');
  assert.equal(result.archive.reviewedAt, '2026-10-19');
  const baseline = nextBaseline({}, report.results);
  assert.equal((await checkSources(historical, baseline, blocked, null, archives)).results[0].status, 'unchanged');
});

test('a recovered but changed original never falls back to the old archived document', async () => {
  const baseline = { [proposal.id]: { url: proposal.url, sha256: archive.sha256 } };
  const fetcher = async () => new Response('%PDF-changed', { headers: { 'content-type': 'application/pdf' } });
  const result = (await checkSources(historical, baseline, fetcher, null, archives)).results[0];
  assert.equal(result.status, 'changed');
  assert.equal(result.archive, undefined);
  assert.deepEqual(nextBaseline(baseline, [result]), baseline);
  for (const response of [
    () => new Response('Not found', { status: 404 }),
    () => new Response('challenge', { headers: { 'content-type': 'text/html' } }),
  ]) {
    const failed = (await checkSources(historical, baseline, async () => response(), null, archives)).results[0];
    assert.equal(failed.status, 'unavailable');
    assert.equal(failed.archive, undefined);
  }
});

test('missing, altered or invalid archives cannot resolve a blocked source', async () => {
  for (const read of [
    async () => {
      throw new Error('missing archive');
    },
    async () => Buffer.from('%PDF-altered'),
    async () => Buffer.from('challenge'),
  ])
    assert.ok((await inspectArchive(proposal, archive, read)).error);
  for (const patch of [
    { url: 'https://example.org/other.pdf' },
    { file: '../other.pdf' },
    { sha256: 'invalid' },
    { reviewedAt: '' },
    { evidence: '' },
  ]) {
    const report = await checkSources(historical, {}, blocked, null, { [proposal.id]: { ...archive, ...patch } });
    assert.equal(report.results[0].status, 'unavailable');
  }
  assert.ok((await inspectArchive({ ...proposal, sourceType: 'enacted' }, archive)).error);
  assert.ok((await inspectArchive({ ...proposal, date: '2026-01' }, archive)).error);
});
