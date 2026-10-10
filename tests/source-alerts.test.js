import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { emptyAlerts, reconcileAlerts, reviewAlert, openAlerts, validateAlerts } from '../scripts/source-alerts.js';

const first = '2026-10-10T08:00:00Z';
const later = '2026-10-11T08:00:00Z';
const changed = {
  id: 'fiscal:lirpf',
  url: 'https://example.org/law',
  sha256: 'new',
  status: 'changed',
  covers: ['state.scale'],
};
const report = (results = [changed], checkedAt = first, staleGroups = []) => ({ results, checkedAt, staleGroups });
const review = (ledger, status = 'reviewed', evidence = 'Read the original text; metadata only.') =>
  reviewAlert(ledger, { id: 'changed:fiscal:lirpf', status, evidence, actor: 'reviewer' }, ledger.checkedAt);

test('repeated findings share an id and preserve first detection, affected groups and input', () => {
  const original = emptyAlerts();
  const one = reconcileAlerts(original, report());
  const two = reconcileAlerts(one, report([changed], later));
  assert.equal(original.alerts.length, 0);
  assert.equal(one.alerts[0].occurrences, 1);
  assert.equal(two.alerts.length, 1);
  assert.equal(two.alerts[0].occurrences, 2);
  assert.equal(two.alerts[0].firstSeen, first);
  assert.equal(two.alerts[0].lastSeen, later);
  assert.deepEqual(two.alerts[0].groups, ['state.scale']);
});

test('accepting a fingerprint or recovering a source does not close its review case', () => {
  const one = reconcileAlerts(emptyAlerts(), report());
  const two = reconcileAlerts(one, report([{ ...changed, status: 'unchanged' }], later));
  assert.equal(openAlerts(two).length, 1);
  assert.equal(two.alerts[0].active, false);
  assert.equal(two.alerts[0].status, 'pending');
});

test('explicit no-change review stays closed for the same bytes and reopens for new bytes or URLs', () => {
  const closed = review(reconcileAlerts(emptyAlerts(), report()));
  assert.equal(openAlerts(reconcileAlerts(closed, report([changed], later))).length, 0);
  for (const finding of [
    { ...changed, sha256: 'newer' },
    { ...changed, url: 'https://example.org/reissued' },
  ]) {
    const reopened = reconcileAlerts(closed, report([finding], later));
    assert.equal(openAlerts(reopened).length, 1);
    assert.equal(reopened.alerts[0].history.at(-1).action, 'reopened');
    assert.equal(reopened.alerts[0].history[1].actor, 'reviewer');
  }
});

test('implementation-needed survives healthy downloads and implementation records a PR', () => {
  const needed = review(reconcileAlerts(emptyAlerts(), report()), 'implementation-needed');
  const healthy = reconcileAlerts(needed, report([], later));
  assert.equal(healthy.alerts[0].status, 'implementation-needed');
  assert.throws(() => review(healthy, 'implemented', 'Fixed in an unspecified change'));
  const done = review(healthy, 'implemented', 'https://github.com/molinero95/SalaryCalculatorESP/pull/123');
  assert.equal(openAlerts(done).length, 0);
  assert.equal(done.alerts[0].history.at(-1).action, 'implemented');
});

test('unavailable sources update one case even when the failure reason changes', () => {
  const failed = { ...changed, status: 'unavailable', error: 'HTTP 502' };
  const one = reconcileAlerts(emptyAlerts(), report([failed]));
  const two = reconcileAlerts(one, report([{ ...failed, error: 'timeout' }], later));
  assert.equal(two.alerts.length, 1);
  assert.equal(two.alerts[0].evidence.error, 'timeout');
  assert.throws(() =>
    reviewAlert(
      two,
      { id: 'unavailable:fiscal:lirpf', status: 'reviewed', evidence: 'Source is still down.', actor: 'person' },
      later,
    ),
  );
  const recovered = reconcileAlerts(two, report([], '2026-10-12T08:00:00Z'));
  const closed = reviewAlert(
    recovered,
    {
      id: 'unavailable:fiscal:lirpf',
      status: 'reviewed',
      evidence: 'Source recovered and its text was checked.',
      actor: 'person',
    },
    recovered.checkedAt,
  );
  assert.equal(openAlerts(closed).length, 0);
  assert.equal(openAlerts(reconcileAlerts(closed, report([failed], '2026-10-13T08:00:00Z'))).length, 1);
});

test('stale groups cannot be closed while stale and do not silently close after verification', () => {
  const one = reconcileAlerts(emptyAlerts(), report([], first, ['withholding']));
  const action = {
    id: 'stale:withholding',
    status: 'reviewed',
    evidence: 'Verified against current algorithm.',
    actor: 'person',
  };
  assert.throws(() => reviewAlert(one, action, first));
  const verified = reconcileAlerts(one, report([], later));
  assert.equal(openAlerts(verified).length, 1);
  assert.equal(openAlerts(reviewAlert(verified, action, later)).length, 0);
});

test('invalid reviews, corrupted state and older reports fail rather than losing state', () => {
  const one = reconcileAlerts(emptyAlerts(), report());
  for (const patch of [{ id: 'unknown' }, { actor: '' }, { evidence: '' }, { status: 'closed' }])
    assert.throws(() =>
      reviewAlert(
        one,
        {
          id: 'changed:fiscal:lirpf',
          status: 'reviewed',
          evidence: 'Reviewed original source.',
          actor: 'person',
          ...patch,
        },
        first,
      ),
    );
  assert.throws(() => reconcileAlerts(one, report([], '2026-10-09T08:00:00Z')));
  assert.throws(() => validateAlerts({ ...one, alerts: [...one.alerts, one.alerts[0]] }));
  assert.throws(() => validateAlerts({ schemaVersion: 2, alerts: [] }));
  assert.equal(one.alerts[0].status, 'pending');
});

test('CLI persists open cases across accepted baselines and explicit reviews without network access', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'salary-alerts-'));
  try {
    await mkdir(join(directory, '.source-monitor'));
    await writeFile(
      join(directory, '.source-monitor/baseline.json'),
      JSON.stringify({ vox2024: { url: 'https://old.org', sha256: 'old' } }),
    );
    const runner = fileURLToPath(new URL('../scripts/check-template-sources.js', import.meta.url));
    const script = `globalThis.fetch = async () => new Response('%PDF-fake', { headers: { 'content-type': 'application/pdf' } }); process.argv[1] = ${JSON.stringify(runner)}; await import(${JSON.stringify(new URL('../scripts/check-template-sources.js', import.meta.url).href)});`;
    const run = (extra = {}) =>
      spawnSync(process.execPath, ['--input-type=module', '-e', script], {
        cwd: directory,
        encoding: 'utf8',
        env: { ...process.env, GITHUB_STEP_SUMMARY: '', SOURCE_ALERT_ID: '', ACCEPT_SOURCE_BASELINE: 'true', ...extra },
      });
    const initial = run();
    assert.equal(initial.status, 1, initial.stderr);
    const ledger = JSON.parse(await readFile(join(directory, '.source-monitor/alerts.json'), 'utf8'));
    assert.equal(ledger.alerts[0].id, 'changed:vox2024');
    const invalid = run({
      SOURCE_ALERT_ID: 'changed:vox2024',
      SOURCE_ALERT_STATUS: 'reviewed',
      SOURCE_ALERT_EVIDENCE: '',
      GITHUB_ACTOR: 'reviewer',
    });
    assert.equal(invalid.status, 1);
    assert.match(
      JSON.parse(await readFile(join(directory, '.source-monitor/report.json'), 'utf8')).reviewError,
      /evidence/,
    );
    const second = run();
    assert.equal(second.status, 1, second.stderr);
    const healthy = JSON.parse(await readFile(join(directory, '.source-monitor/alerts.json'), 'utf8'));
    assert.equal(healthy.alerts[0].active, false);
    const final = run({
      SOURCE_ALERT_ID: 'changed:vox2024',
      SOURCE_ALERT_STATUS: 'reviewed',
      SOURCE_ALERT_EVIDENCE: 'Checked programme text; formatting only.',
      GITHUB_ACTOR: 'reviewer',
    });
    assert.equal(final.status, 0, final.stderr);
    const done = JSON.parse(await readFile(join(directory, '.source-monitor/alerts.json'), 'utf8'));
    assert.equal(done.alerts[0].status, 'reviewed');
    assert.match(await readFile(join(directory, '.source-monitor/report.md'), 'utf8'), /No open review cases/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
