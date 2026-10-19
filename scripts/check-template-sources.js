import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { cataloguePath, validateCatalogue } from './template-catalogue.js';
import { fiscalSourcesPath, validateFiscalSources, staleGroups } from './fiscal-sources.js';
import {
  emptyAlerts,
  reconcileAlerts,
  reviewAlert,
  openAlerts,
  alertSummary,
  applyReviewDecisions,
  readReviewDecisions,
} from './source-alerts.js';
import { inspectArchive, sourceArchivesPath } from './source-archives.js';

const RETRYABLE_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
]);
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const SUPPORTED_TYPES = /application\/pdf|text\/html|text\/plain|application\/(?:[\w.+-]+\+)?(?:xml|json)|text\/xml/i;

// Cloudflare changes the XOR key in email/share links on each response. Decode
// only those tokens, keeping their underlying bytes and all article text hashed.
export function normalizeProtectedEmails(html) {
  return html.replace(/(\/cdn-cgi\/l\/email-protection#|data-cfemail=["'])([a-f0-9]+)/gi, (match, prefix, hex) => {
    if (hex.length < 4 || hex.length % 2) return match;
    const bytes = Buffer.from(hex, 'hex');
    const decoded = bytes.subarray(1).map((byte) => byte ^ bytes[0]);
    return `${prefix}decoded:${decoded.toString('hex')}`;
  });
}

export function classifySource(previous, current) {
  if (current.error) return 'unavailable';
  if (!previous) return 'baseline-needed';
  if (previous.url !== current.url) return 'changed';
  if (previous.fingerprintMethod !== current.fingerprintMethod) return 'changed';
  return previous.sha256 === current.sha256 ? 'unchanged' : 'changed';
}

export async function inspectSource(url, fetcher = fetch, { retryDelayMs = 500 } = {}) {
  // At most two 15-second attempts: retry transient transport/server failures,
  // while preserving blocked, invalid or changed documents as review findings.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetcher(url, {
        signal: AbortSignal.timeout(15000),
        headers: {
          'User-Agent': 'SalaryCalculatorESP-source-monitor/1.0',
          Accept: 'application/xml, application/json;q=0.9, application/pdf, text/html;q=0.8, */*;q=0.5',
        },
      });
      if (!response.ok) {
        await response.body?.cancel();
        const error = new Error(`HTTP ${response.status}`);
        error.retryable = RETRYABLE_STATUSES.has(response.status);
        throw error;
      }
      const contentType = response.headers.get('content-type') ?? '';
      if (new URL(url).pathname.toLowerCase().endsWith('.pdf') && !/application\/pdf/i.test(contentType))
        throw new Error('Expected PDF; server returned another document');
      if (!SUPPORTED_TYPES.test(contentType)) throw new Error('Unsupported content type');
      const reader = response.body.getReader();
      const hash = createHash('sha256');
      const normalize = new URL(url).hostname === 'www.pp.es' && /text\/html/i.test(contentType);
      const chunks = [];
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
        if (normalize) chunks.push(Buffer.from(value));
      }
      if (!bytes) throw new Error('Empty source');
      if (/application\/pdf/i.test(contentType) && prefix.toString() !== '%PDF-')
        throw new Error('Invalid PDF signature');
      const rawSha256 = hash.digest('hex');
      const fingerprint = normalize
        ? {
            fingerprintMethod: 'sha256:cf-email-v1',
            rawSha256,
            sha256: createHash('sha256')
              .update(normalizeProtectedEmails(Buffer.concat(chunks).toString('utf8')))
              .digest('hex'),
          }
        : { sha256: rawSha256 };
      return { url, finalUrl: response.url, contentType, bytes, ...fingerprint, attempts: attempt };
    } catch (error) {
      const code = error.cause?.code;
      const retryable = error.retryable || RETRYABLE_CODES.has(code) || error.name === 'TimeoutError';
      if (attempt < 2 && retryable) {
        await wait(retryDelayMs);
        continue;
      }
      return { url, error: `${error.message}${RETRYABLE_CODES.has(code) ? ` (${code})` : ''}`, attempts: attempt };
    }
  }
}

export function nextBaseline(baseline, results, acceptChanges = false) {
  const next = { ...baseline };
  for (const r of results) {
    const accepted = acceptChanges === true || (acceptChanges instanceof Set && acceptChanges.has(r.id));
    if (r.status === 'unavailable' || (r.status === 'changed' && !accepted)) continue;
    next[r.id] = {
      url: r.url,
      sha256: r.sha256,
      ...(r.fingerprintMethod ? { fingerprintMethod: r.fingerprintMethod } : {}),
    };
  }
  return next;
}

/**
 * Fingerprints every party proposal and every enacted-law source that has a
 * `monitorUrl`. Enacted-law results are keyed `fiscal:<id>` in the baseline.
 */
export async function checkSources(catalogue, baseline, fetcher = fetch, fiscalSources = null, archives = {}) {
  validateCatalogue(catalogue);
  if (fiscalSources) validateFiscalSources(fiscalSources);
  const targets = [
    ...catalogue.proposals.map((p) => ({ id: p.id, party: p.party, sourceType: p.sourceType, url: p.url, covers: [] })),
    ...(fiscalSources?.sources ?? [])
      .filter((s) => s.monitorUrl)
      .map((s) => ({ id: `fiscal:${s.id}`, sourceType: 'enacted', url: s.monitorUrl, covers: s.covers })),
  ];
  const results = [];
  for (const target of targets) {
    let source = await inspectSource(target.url, fetcher);
    // Only an explicit 403 on a reviewed historical proposal can use its pinned
    // copy. Other failures and successful changed downloads still require review.
    if (archives[target.id]) {
      const archived = await inspectArchive(
        catalogue.proposals.find((p) => p.id === target.id) ?? target,
        archives[target.id],
      );
      if (archived.error) source = { ...source, error: archived.error };
      else if (source.error === 'HTTP 403')
        source = { ...archived, remoteError: source.error, attempts: source.attempts };
    }
    results.push({
      ...target,
      ...source,
      previousSha256: baseline[target.id]?.sha256,
      status: classifySource(baseline[target.id], source),
    });
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
  let alerts = emptyAlerts();
  try {
    alerts = JSON.parse(await readFile('.source-monitor/alerts.json', 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const archives = JSON.parse(await readFile(sourceArchivesPath, 'utf8'));
  const report = await checkSources(catalogue, baseline, fetch, fiscalSources, archives);
  report.staleGroups = staleGroups(fiscalSources, report.checkedAt.slice(0, 10));
  alerts = reconcileAlerts(alerts, report);
  const decisions = applyReviewDecisions(
    alerts,
    await readReviewDecisions(),
    'sources',
    process.env.GITHUB_ACTOR ?? process.env.SOURCE_ALERT_ACTOR ?? 'committed-review',
    report.checkedAt,
  );
  alerts = decisions.ledger;
  report.deferredReviews = decisions.deferred;
  await mkdir('.source-monitor', { recursive: true });
  // Persist new findings even if a requested review action is invalid.
  await writeFile('.source-monitor/alerts.json', JSON.stringify(alerts, null, 2));
  if (process.env.SOURCE_ALERT_ID) {
    try {
      alerts = reviewAlert(
        alerts,
        {
          id: process.env.SOURCE_ALERT_ID,
          signature: process.env.SOURCE_ALERT_SIGNATURE,
          status: process.env.SOURCE_ALERT_STATUS,
          evidence: process.env.SOURCE_ALERT_EVIDENCE,
          actor: process.env.GITHUB_ACTOR ?? process.env.SOURCE_ALERT_ACTOR,
        },
        report.checkedAt,
      );
      await writeFile('.source-monitor/alerts.json', JSON.stringify(alerts, null, 2));
    } catch (error) {
      report.reviewError = error.message;
    }
  }

  report.openAlerts = openAlerts(alerts);

  await writeFile('.source-monitor/report.json', JSON.stringify(report, null, 2));
  const summary = [
    '# Template source review',
    '',
    alertSummary(alerts),
    ...(report.reviewError ? [`Review action rejected: ${report.reviewError}`, ''] : []),
    ...report.deferredReviews.map((reason) => `Committed review deferred: ${reason}`),
    '',
    'Source fingerprints detect document changes, not verified fiscal changes. HTML layout and PDF metadata can cause false positives.',
    '',
    ...report.results.map(
      (r) =>
        `- ${r.id}: **${r.status}** (${r.sourceType})${r.error ? ` — ${r.error}` : ''}${r.archive ? ` — reviewed archive ${r.archive.file}; original download: ${r.remoteError}` : ''}`,
    ),
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
  const acceptance = process.env.ACCEPT_SOURCE_BASELINE === 'true' ? true : decisions.acceptedFingerprints;
  const next = nextBaseline(baseline, report.results, acceptance);
  await writeFile('.source-monitor/baseline.json', JSON.stringify(next, null, 2));
  // Accepting fingerprints never clears staleness: that needs a reviewed verifiedAt update.
  if (
    report.reviewError ||
    // BOE cases are reconciled/reviewed by the following discovery step. Do not
    // fail this earlier step for cases that it is not responsible for resolving.
    openAlerts(alerts).some((alert) => (alert.scope ?? 'sources') === 'sources') ||
    unavailable ||
    report.staleGroups.length ||
    (changed && report.results.some((r) => r.status === 'changed' && acceptance !== true && !acceptance.has(r.id)))
  )
    process.exitCode = 1;
}
