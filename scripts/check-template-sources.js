import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { cataloguePath, validateCatalogue } from './template-catalogue.js';
import { fiscalSourcesPath, validateFiscalSources, staleGroups } from './fiscal-sources.js';

const SUPPORTED_TYPES = /application\/pdf|text\/html|text\/plain|application\/(?:[\w.+-]+\+)?(?:xml|json)|text\/xml/i;

export function classifySource(previous, current) {
  if (current.error) return 'unavailable';
  if (!previous) return 'baseline-needed';
  if (previous.url !== current.url) return 'changed';
  return previous.sha256 === current.sha256 ? 'unchanged' : 'changed';
}

export async function inspectSource(url, fetcher = fetch) {
  try {
    const response = await fetcher(url, {
      signal: AbortSignal.timeout(30000),
      headers: {
        'User-Agent': 'SalaryCalculatorESP-source-monitor/1.0',
        Accept: 'application/xml, application/json;q=0.9, application/pdf, text/html;q=0.8, */*;q=0.5',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') ?? '';
    if (new URL(url).pathname.toLowerCase().endsWith('.pdf') && !/application\/pdf/i.test(contentType))
      throw new Error('Expected PDF; server returned another document');
    if (!SUPPORTED_TYPES.test(contentType)) throw new Error('Unsupported content type');
    const reader = response.body.getReader();
    const hash = createHash('sha256');
    let bytes = 0;
    let prefix = Buffer.alloc(0);
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (prefix.length < 5) prefix = Buffer.concat([prefix, Buffer.from(value)]).subarray(0, 5);
      if (bytes > 20 * 1024 * 1024) {
        await reader.cancel();
        throw new Error('Source exceeds 20 MiB');
      }
      hash.update(value);
    }
    if (!bytes) throw new Error('Empty source');
    if (/application\/pdf/i.test(contentType) && prefix.toString() !== '%PDF-')
      throw new Error('Invalid PDF signature');
    return { url, finalUrl: response.url, contentType, bytes, sha256: hash.digest('hex') };
  } catch (error) {
    return { url, error: error.message };
  }
}

export function nextBaseline(baseline, results, acceptChanges = false) {
  const next = { ...baseline };
  for (const r of results) {
    if (r.status === 'unavailable' || (r.status === 'changed' && !acceptChanges)) continue;
    next[r.id] = { url: r.url, sha256: r.sha256 };
  }
  return next;
}

/**
 * Fingerprints every party proposal and every enacted-law source that has a
 * `monitorUrl`. Enacted-law results are keyed `fiscal:<id>` in the baseline.
 */
export async function checkSources(catalogue, baseline, fetcher = fetch, fiscalSources = null) {
  validateCatalogue(catalogue);
  if (fiscalSources) validateFiscalSources(fiscalSources);
  const targets = [
    ...catalogue.proposals.map((p) => ({ id: p.id, party: p.party, sourceType: p.sourceType, url: p.url })),
    ...(fiscalSources?.sources ?? [])
      .filter((s) => s.monitorUrl)
      .map((s) => ({ id: `fiscal:${s.id}`, sourceType: 'enacted', url: s.monitorUrl })),
  ];
  const results = [];
  for (const target of targets) {
    const source = await inspectSource(target.url, fetcher);
    results.push({ ...target, ...source, status: classifySource(baseline[target.id], source) });
  }
  return { checkedAt: new Date().toISOString(), results };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const catalogue = JSON.parse(await readFile(cataloguePath, 'utf8'));
  const fiscalSources = JSON.parse(await readFile(fiscalSourcesPath, 'utf8'));
  let baseline = {};
  try {
    baseline = JSON.parse(await readFile('.source-monitor/baseline.json', 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const report = await checkSources(catalogue, baseline, fetch, fiscalSources);
  report.staleGroups = staleGroups(fiscalSources, report.checkedAt.slice(0, 10));
  await mkdir('.source-monitor', { recursive: true });
  await writeFile('.source-monitor/report.json', JSON.stringify(report, null, 2));
  const summary = [
    '# Template source review',
    '',
    'Source fingerprints detect document changes, not verified fiscal changes. HTML layout and PDF metadata can cause false positives.',
    '',
    ...report.results.map((r) => `- ${r.id}: **${r.status}** (${r.sourceType})${r.error ? ` — ${r.error}` : ''}`),
    '',
    '## Parameter verification',
    '',
    ...(report.staleGroups.length
      ? [
          'These parameter groups have no source verified in the last year for the current fiscal year. Review them and update `data/fiscal-sources.json`:',
          '',
          ...report.staleGroups.map((group) => `- **stale**: ${group}`),
        ]
      : ['Every parameter group has a current, verified source.']),
    '',
  ].join('\n');
  await writeFile('.source-monitor/report.md', summary);
  if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' });
  const unavailable = report.results.some((r) => r.status === 'unavailable');
  const changed = report.results.some((r) => r.status === 'changed');
  const next = nextBaseline(baseline, report.results, process.env.ACCEPT_SOURCE_BASELINE === 'true');
  await writeFile('.source-monitor/baseline.json', JSON.stringify(next, null, 2));
  // Accepting fingerprints never clears staleness: that needs a reviewed verifiedAt update.
  if (unavailable || report.staleGroups.length || (changed && process.env.ACCEPT_SOURCE_BASELINE !== 'true'))
    process.exitCode = 1;
}
