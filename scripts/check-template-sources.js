import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { cataloguePath, validateCatalogue } from './template-catalogue.js';

export function classifySource(previous, current) {
  if (current.error) return 'unavailable';
  if (!previous || previous.url !== current.url) return 'baseline-needed';
  return previous.sha256 === current.sha256 ? 'unchanged' : 'changed';
}

export async function inspectSource(url, fetcher = fetch) {
  try {
    const response = await fetcher(url, {
      signal: AbortSignal.timeout(30000),
      headers: { 'User-Agent': 'SalaryCalculatorESP-source-monitor/1.0' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') ?? '';
    if (new URL(url).pathname.toLowerCase().endsWith('.pdf') && !/application\/pdf/i.test(contentType))
      throw new Error('Expected PDF; server returned another document');
    if (!/application\/pdf|text\/html|text\/plain/i.test(contentType)) throw new Error('Unsupported content type');
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

export async function checkSources(catalogue, baseline, fetcher = fetch) {
  validateCatalogue(catalogue);
  const results = [];
  for (const p of catalogue.proposals) {
    const source = await inspectSource(p.url, fetcher);
    results.push({
      id: p.id,
      party: p.party,
      sourceType: p.sourceType,
      ...source,
      status: classifySource(baseline[p.id], source),
    });
  }
  return { checkedAt: new Date().toISOString(), results };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const catalogue = JSON.parse(await readFile(cataloguePath, 'utf8'));
  let baseline = {};
  try {
    baseline = JSON.parse(await readFile('.source-monitor/baseline.json', 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const report = await checkSources(catalogue, baseline);
  await mkdir('.source-monitor', { recursive: true });
  await writeFile('.source-monitor/report.json', JSON.stringify(report, null, 2));
  const summary = [
    '# Template source review',
    '',
    'Source fingerprints detect document changes, not verified fiscal changes. HTML layout and PDF metadata can cause false positives.',
    '',
    ...report.results.map((r) => `- ${r.id}: **${r.status}** (${r.sourceType})${r.error ? ` — ${r.error}` : ''}`),
    '',
  ].join('\n');
  await writeFile('.source-monitor/report.md', summary);
  if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' });
  const unavailable = report.results.some((r) => r.status === 'unavailable');
  const changed = report.results.some((r) => r.status === 'changed');
  const next = nextBaseline(baseline, report.results, process.env.ACCEPT_SOURCE_BASELINE === 'true');
  await writeFile('.source-monitor/baseline.json', JSON.stringify(next, null, 2));
  if (unavailable || (changed && process.env.ACCEPT_SOURCE_BASELINE !== 'true')) process.exitCode = 1;
}
