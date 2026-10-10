// BOE title-based discovery produces review candidates, never fiscal parameter updates.
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { emptyAlerts, reconcileAlerts, openAlerts, alertSummary } from './source-alerts.js';

export const BOE_API = 'https://www.boe.es/datosabiertos/api/boe/sumario/';
export const DISCOVERY_DAYS = 14;
const list = (value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]);
// Some live JSON editions wrap child nodes in `texto`, unlike the documentation example.
const children = (node, key, depth = 0) => {
  if (!node || typeof node !== 'object' || depth > 4) throw new Error('Invalid BOE node');
  return [
    ...list(node[key]),
    ...(node.texto && typeof node.texto === 'object' ? children(node.texto, key, depth + 1) : []),
  ];
};
const dateValue = (value) => {
  const date = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || isNaN(date) || date.toISOString().slice(0, 10) !== value)
    throw new Error('Invalid discovery date');
  return date;
};
export function discoveryDates(endDate) {
  const end = dateValue(endDate);
  return Array.from({ length: DISCOVERY_DAYS }, (_, index) =>
    new Date(end.getTime() - (DISCOVERY_DAYS - index - 1) * 86400000).toISOString().slice(0, 10),
  );
}

export function matchFiscalTitle(title) {
  const text = title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
  const matches = [];
  if (/\birpf\b|impuesto sobre la renta de las personas fisicas/.test(text)) matches.push('income-tax');
  if (/cotizaci[oó]n|cotizaciones/.test(text)) matches.push('contributions');
  if (/medidas.*(?:fiscales|tributarias)|presupuestos generales|normas tributarias/.test(text))
    matches.push('broad-fiscal-review');
  if (/planes? de pensiones/.test(text)) matches.push('pensions');
  if (/vivienda/.test(text)) matches.push('housing-review');
  return matches;
}

/** Accepts the BOE's single-object/array forms and all ordinary/extraordinary editions. */
export function parseBoeSummary(payload, date) {
  dateValue(date);
  const summary = payload?.data?.sumario;
  if (
    String(payload?.status?.code) !== '200' ||
    summary?.metadatos?.publicacion !== 'BOE' ||
    summary.metadatos.fecha_publicacion !== date.replaceAll('-', '') ||
    !summary.diario ||
    !list(summary.diario).length
  )
    throw new Error('Invalid BOE summary or mismatched publication date');
  const candidates = new Map();
  for (const edition of list(summary.diario)) {
    const sections = children(edition, 'seccion');
    if (!sections.length) throw new Error('BOE edition is missing sections');
    for (const section of sections) {
      if (String(section.codigo) !== '1') continue;
      const departments = children(section, 'departamento');
      if (!departments.length) throw new Error('BOE general provisions are missing departments');
      for (const department of departments) {
        const items = [
          ...children(department, 'item'),
          ...children(department, 'epigrafe').flatMap((epigraph) => children(epigraph, 'item')),
        ];
        if (!items.length) throw new Error('BOE department is missing provisions');
        for (const item of items) {
          if (typeof item.titulo !== 'string' || !/^BOE-A-\d{4}-\d+$/.test(item.identificador))
            throw new Error('Invalid BOE provision');
          const reasons = matchFiscalTitle(item.titulo);
          if (!reasons.length) continue;
          // Never follow URLs supplied by the feed; derive a canonical official URL from its ID.
          const candidate = {
            id: item.identificador,
            title: item.titulo,
            publishedAt: date,
            publisher: 'Agencia Estatal Boletín Oficial del Estado',
            url: `https://www.boe.es/diario_boe/txt.php?id=${item.identificador}`,
            reasons,
            groups: [],
          };
          candidate.signature = createHash('sha256').update(JSON.stringify(candidate)).digest('hex');
          if (candidates.has(candidate.id) && candidates.get(candidate.id).signature !== candidate.signature)
            throw new Error('Conflicting duplicate BOE provision');
          candidates.set(candidate.id, candidate);
        }
      }
    }
  }
  return [...candidates.values()];
}

export async function fetchBoeDate(date, fetcher = fetch) {
  dateValue(date);
  const url = BOE_API + date.replaceAll('-', '');
  try {
    const response = await fetcher(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30000),
    });
    // The API documents 404 as no summary for the requested date; report it explicitly.
    if (response.status === 404) return { date, status: 'no-edition', url, candidates: [] };
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!/application\/json/i.test(response.headers.get('content-type') ?? '')) throw new Error('Expected BOE JSON');
    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 5 * 1024 * 1024) {
        await reader.cancel();
        throw new Error('BOE summary exceeds 5 MiB');
      }
      chunks.push(value);
    }
    const candidates = parseBoeSummary(JSON.parse(Buffer.concat(chunks).toString()), date);
    return { date, status: 'checked', url, candidates };
  } catch (error) {
    return { date, status: 'unavailable', url, error: error.message, candidates: [] };
  }
}

export async function discoverBoe(endDate, fetcher = fetch) {
  const dates = discoveryDates(endDate);
  const scans = [];
  // Limit parallel requests while bounding a failed 14-day scan below the workflow timeout.
  for (let index = 0; index < dates.length; index += 3)
    scans.push(...(await Promise.all(dates.slice(index, index + 3).map((date) => fetchBoeDate(date, fetcher)))));
  return {
    checkedAt: new Date().toISOString(),
    scope: 'boe-discovery',
    window: { from: dates[0], through: endDate },
    publications: scans.flatMap((scan) => scan.candidates),
    results: scans
      .filter((scan) => scan.status === 'unavailable')
      .map((scan) => ({ ...scan, id: `discovery:boe:${scan.date}` })),
    scans: scans.map(({ candidates, ...scan }) => ({ ...scan, candidateCount: candidates.length })),
    coverage: {
      implemented: ['BOE general-provision titles within the requested 14-day window'],
      notCovered: [
        'AEAT publication indexes',
        'original regional/foral bulletins',
        'party indexes',
        'provisions without matching titles',
        'dates before this window unless manually backfilled',
      ],
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const today = new Date().toISOString().slice(0, 10);
  const endDate =
    process.env.BOE_DISCOVERY_END || new Date(dateValue(today).getTime() - 86400000).toISOString().slice(0, 10);
  if (dateValue(endDate) >= dateValue(today)) throw new Error('Scan only completed days before today (UTC)');
  let ledger = emptyAlerts();
  try {
    ledger = JSON.parse(await readFile('.source-monitor/alerts.json', 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const report = await discoverBoe(endDate);
  ledger = reconcileAlerts(ledger, report);
  report.openAlerts = openAlerts(ledger);
  await mkdir('.source-monitor', { recursive: true });
  await writeFile('.source-monitor/alerts.json', JSON.stringify(ledger, null, 2));
  await writeFile('.source-monitor/report-boe.json', JSON.stringify(report, null, 2));
  const escape = (text) => text.replace(/[\r\n]/g, ' ').replace(/[<>&`*_[\]\\]/g, (char) => `&#${char.charCodeAt(0)};`);
  const summary = [
    '# BOE publication discovery',
    '',
    `Window: ${report.window.from} through ${report.window.through}. Title matches are unverified review candidates, not confirmed fiscal changes.`,
    '',
    ...report.publications.map((p) => `- ${p.id} (${p.publishedAt}): ${escape(p.title)} — ${p.url}`),
    '',
    '## Scan coverage',
    '',
    ...report.scans.map((scan) => `- ${scan.date}: ${scan.status}${scan.error ? ` — ${escape(scan.error)}` : ''}`),
    '',
    ...report.coverage.notCovered.map((area) => `- Not covered: ${area}`),
    '',
    'A successful scan does not prove exhaustive detection. Interrupted schedules longer than 14 days require manual backfill.',
    '',
    alertSummary(ledger),
  ].join('\n');
  await writeFile('.source-monitor/report-boe.md', summary);
  if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' });
  if (report.results.length || openAlerts(ledger).length) process.exitCode = 1;
}
