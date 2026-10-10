import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  discoveryDates,
  matchFiscalTitle,
  parseBoeSummary,
  fetchBoeDate,
  discoverBoe,
} from '../scripts/discover-boe.js';
import { emptyAlerts, reconcileAlerts, reviewAlert, openAlerts } from '../scripts/source-alerts.js';

const date = '2026-10-09';
const provision = (title, id = 'BOE-A-2026-20823') => ({
  identificador: id,
  titulo: title,
  url_html: 'https://untrusted.example/ignored',
});
const payload = (item = provision('Ley de modificación del IRPF')) => ({
  status: { code: '200' },
  data: {
    sumario: {
      metadatos: { publicacion: 'BOE', fecha_publicacion: '20261009' },
      diario: { seccion: { codigo: '1', departamento: { epigrafe: { item } } } },
    },
  },
});
const json = (value) => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });

test('14-day discovery window crosses month and year boundaries and rejects invalid dates', () => {
  const dates = discoveryDates('2027-01-05');
  assert.equal(dates.length, 14);
  assert.equal(dates[0], '2026-12-23');
  assert.equal(dates.at(-1), '2027-01-05');
  for (const invalid of ['2026-02-30', '2026-13-01', '2026-1-01', 'unknown'])
    assert.throws(() => discoveryDates(invalid));
});

test('title rules detect relevant and broad fiscal candidates without claiming all reforms', () => {
  for (const title of [
    'IMPUESTO SOBRE LA RENTA DE LAS PERSONAS FÍSICAS',
    'Cotización a la Seguridad Social',
    'Medidas fiscales y administrativas',
    'Presupuestos generales',
    'Planes de pensiones',
    'Medidas urgentes para la protección de la función social de la vivienda',
  ])
    assert.ok(matchFiscalTitle(title).length, title);
  for (const title of ['Nombramientos', 'Ayudas a la exportación', 'Retenciones de vehículos'])
    assert.deepEqual(matchFiscalTitle(title), []);
});

test('parser handles array/singleton and direct/epigraph provisions across extraordinary editions', () => {
  const data = payload();
  const ordinary = data.data.sumario.diario;
  data.data.sumario.diario = [
    ordinary,
    {
      seccion: [
        { codigo: '1', departamento: [{ item: [provision('Orden de cotización', 'BOE-A-2026-20824')] }] },
        { codigo: '2A', departamento: { item: provision('IRPF: appointment ignored', 'BOE-A-2026-20825') } },
      ],
    },
  ];
  const candidates = parseBoeSummary(data, date);
  assert.deepEqual(
    candidates.map((p) => p.id),
    ['BOE-A-2026-20823', 'BOE-A-2026-20824'],
  );
  assert.equal(candidates[0].publishedAt, date);
  assert.equal(candidates[0].url, 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-20823');
  assert.match(candidates[0].signature, /^[a-f0-9]{64}$/);
});

test('live-format texto wrappers in extraordinary editions and departments preserve publications', () => {
  const data = payload();
  data.data.sumario.diario = [
    {
      seccion: {
        codigo: '1',
        texto: {
          departamento: {
            texto: { epigrafe: [{ item: provision('Derogación de medidas de vivienda', 'BOE-A-2026-20526') }] },
          },
        },
      },
    },
    {
      seccion: {
        codigo: '1',
        departamento: { texto: { epigrafe: [{ item: provision('Orden sobre el IRPF', 'BOE-A-2026-20587') }] } },
      },
    },
  ];
  assert.deepEqual(
    parseBoeSummary(data, date).map((p) => p.id),
    ['BOE-A-2026-20526', 'BOE-A-2026-20587'],
  );
});

test('parser deduplicates identical provisions and rejects malformed/conflicting responses', () => {
  assert.equal(parseBoeSummary(payload([provision('IRPF'), provision('IRPF')]), date).length, 1);
  for (const data of [
    payload([provision('IRPF'), provision('Cotización')]),
    payload({ titulo: 'IRPF', identificador: 'invalid' }),
    {},
    { ...payload(), data: { sumario: { ...payload().data.sumario, diario: [] } } },
    { ...payload(), status: { code: '500' } },
  ])
    assert.throws(() => parseBoeSummary(data, date));
  assert.throws(() => parseBoeSummary(payload(), '2026-10-08'));
});

test('download errors, challenge pages, malformed JSON and oversized responses remain explicit failures', async () => {
  for (const fetcher of [
    async () => new Response('', { status: 502 }),
    async () => new Response('challenge', { headers: { 'content-type': 'text/html' } }),
    async () => new Response('{', { headers: { 'content-type': 'application/json' } }),
    async () => json({}),
    async () => {
      throw new Error('timeout');
    },
    async () => new Response(new Uint8Array(5 * 1024 * 1024 + 1), { headers: { 'content-type': 'application/json' } }),
  ]) {
    assert.equal((await fetchBoeDate(date, fetcher)).status, 'unavailable');
  }
  const missing = await fetchBoeDate(date, async () => new Response('', { status: 404 }));
  assert.equal(missing.status, 'no-edition');
  assert.deepEqual(missing.candidates, []);
});

test('scan keeps successful dates when another fails and explicitly reports limited coverage', async () => {
  const report = await discoverBoe(date, async (url, options) => {
    assert.equal(options.headers.Accept, 'application/json');
    if (url.endsWith('20261008')) return new Response('', { status: 502 });
    if (!url.endsWith('20261009')) return new Response('', { status: 404 });
    return json(payload());
  });
  assert.equal(report.scans.length, 14);
  assert.equal(report.publications.length, 1);
  assert.equal(report.results.length, 1);
  assert.equal(report.results[0].id, 'discovery:boe:2026-10-08');
  assert.ok(report.coverage.notCovered.includes('AEAT publication indexes'));
});

test('discovery and known-source scans preserve one another’s active alerts and deduplicate reviewed publications', () => {
  const source = {
    checkedAt: '2026-10-10T08:00:00Z',
    results: [{ id: 'law', status: 'unavailable', url: 'https://example.org/law', error: '502' }],
  };
  const known = reconcileAlerts(emptyAlerts(), source);
  const publication = parseBoeSummary(payload(), date)[0];
  const report = {
    checkedAt: '2026-10-10T08:01:00Z',
    scope: 'boe-discovery',
    results: [],
    publications: [publication],
  };
  const discovered = reconcileAlerts(known, report);
  assert.equal(discovered.alerts[0].active, true);
  assert.equal(openAlerts(discovered).length, 2);
  const closed = reviewAlert(
    discovered,
    {
      id: `publication:${publication.id}`,
      signature: publication.signature,
      status: 'reviewed',
      actor: 'person',
      evidence: 'Reviewed original text; no relevant change.',
    },
    report.checkedAt,
  );
  const repeated = reconcileAlerts(closed, { ...report, checkedAt: '2026-10-10T08:02:00Z' });
  assert.equal(repeated.alerts.length, 2);
  assert.equal(repeated.alerts[1].status, 'reviewed');
  const nextSources = reconcileAlerts(repeated, { ...source, checkedAt: '2026-10-10T08:03:00Z', results: [] });
  assert.equal(nextSources.alerts[1].active, true);
  assert.equal(nextSources.alerts[0].active, false);
  const changed = reconcileAlerts(nextSources, {
    ...report,
    checkedAt: '2026-10-10T08:04:00Z',
    publications: [{ ...publication, signature: 'revised' }],
  });
  assert.equal(changed.alerts[1].status, 'pending');
});

test('discovery CLI persists candidates and reports while preserving existing source cases', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'salary-discovery-'));
  try {
    await mkdir(join(directory, '.source-monitor'));
    const known = reconcileAlerts(emptyAlerts(), {
      checkedAt: '2020-01-01T00:00:00Z',
      results: [{ id: 'known', status: 'unavailable', url: 'https://example.org/known', error: '502' }],
    });
    await writeFile(join(directory, '.source-monitor/alerts.json'), JSON.stringify(known));
    const runner = fileURLToPath(new URL('../scripts/discover-boe.js', import.meta.url));
    const data = payload();
    data.data.sumario.metadatos.fecha_publicacion = '20200110';
    data.data.sumario.diario.seccion.departamento.epigrafe.item.identificador = 'BOE-A-2020-1';
    const code = `globalThis.fetch = async (url) => url.endsWith('20200110') ? new Response(${JSON.stringify(JSON.stringify(data))}, {headers:{'content-type':'application/json'}}) : new Response('', {status:404}); process.argv[1]=${JSON.stringify(runner)}; await import(${JSON.stringify(new URL('../scripts/discover-boe.js', import.meta.url).href)});`;
    const run = () =>
      spawnSync(process.execPath, ['--input-type=module', '-e', code], {
        cwd: directory,
        encoding: 'utf8',
        env: { ...process.env, BOE_DISCOVERY_END: '2020-01-10', GITHUB_STEP_SUMMARY: '' },
      });
    const first = run();
    assert.equal(first.status, 1, first.stderr);
    const ledger = JSON.parse(await readFile(join(directory, '.source-monitor/alerts.json'), 'utf8'));
    assert.equal(ledger.alerts.length, 2);
    assert.equal(ledger.alerts[0].active, true);
    assert.equal(ledger.alerts[1].id, 'publication:BOE-A-2020-1');
    const closed = reviewAlert(
      ledger,
      {
        id: ledger.alerts[1].id,
        signature: ledger.alerts[1].signature,
        status: 'reviewed',
        actor: 'person',
        evidence: 'Original provision reviewed; outside supported scope.',
      },
      ledger.checkedAt,
    );
    await writeFile(join(directory, '.source-monitor/alerts.json'), JSON.stringify(closed));
    assert.equal(run().status, 1); // The unrelated known-source review still remains open.
    const repeated = JSON.parse(await readFile(join(directory, '.source-monitor/alerts.json'), 'utf8'));
    assert.equal(repeated.alerts.length, 2);
    assert.equal(repeated.alerts[1].status, 'reviewed');
    const report = JSON.parse(await readFile(join(directory, '.source-monitor/report-boe.json'), 'utf8'));
    assert.equal(report.scans.length, 14);
    assert.match(await readFile(join(directory, '.source-monitor/report-boe.md'), 'utf8'), /Not covered: AEAT/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
