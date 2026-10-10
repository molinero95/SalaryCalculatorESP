import { test } from 'node:test';
import assert from 'node:assert/strict';
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
