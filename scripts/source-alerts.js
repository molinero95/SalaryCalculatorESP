// Persistent maintenance cases. No fiscal parameters or verification dates are changed here.
const OPEN = new Set(['pending', 'implementation-needed']);
const STATUSES = new Set([...OPEN, 'reviewed', 'implemented']);
const KINDS = new Set(['changed', 'unavailable', 'stale']);
const validTime = (value) => typeof value === 'string' && !isNaN(Date.parse(value));

export const emptyAlerts = () => ({ schemaVersion: 1, checkedAt: null, alerts: [] });

export function validateAlerts(ledger) {
  if (ledger?.schemaVersion !== 1 || !Array.isArray(ledger.alerts)) throw new Error('Invalid alert ledger');
  if (ledger.checkedAt !== null && !validTime(ledger.checkedAt)) throw new Error('Invalid ledger date');
  const ids = new Set();
  for (const alert of ledger.alerts) {
    if (
      typeof alert.id !== 'string' ||
      alert.id !== `${alert.kind}:${alert.target}` ||
      ids.has(alert.id) ||
      !KINDS.has(alert.kind) ||
      !STATUSES.has(alert.status) ||
      typeof alert.active !== 'boolean' ||
      !validTime(alert.firstSeen) ||
      !validTime(alert.lastSeen) ||
      !Number.isInteger(alert.occurrences) ||
      alert.occurrences < 1 ||
      !Array.isArray(alert.history) ||
      typeof alert.signature !== 'string' ||
      !Array.isArray(alert.groups)
    )
      throw new Error('Invalid alert record');
    ids.add(alert.id);
  }
  return ledger;
}

/** Repeated findings update one case; recovery never silently approves an open case. */
export function reconcileAlerts(previous, report) {
  validateAlerts(previous);
  if (!validTime(report.checkedAt)) throw new Error('Invalid report date');
  if (previous.checkedAt && Date.parse(report.checkedAt) < Date.parse(previous.checkedAt))
    throw new Error('Cannot apply an older report');
  const ledger = structuredClone(previous);
  ledger.checkedAt = report.checkedAt;
  const findings = [
    ...report.results
      .filter((r) => ['changed', 'unavailable'].includes(r.status))
      .map((r) => ({
        kind: r.status,
        target: r.id,
        url: r.url,
        groups: r.covers ?? [],
        signature: r.status === 'changed' ? JSON.stringify([r.url, r.sha256]) : r.url,
        evidence:
          r.status === 'changed'
            ? { sha256: r.sha256, previousSha256: r.previousSha256, url: r.url }
            : { error: r.error, url: r.url },
      })),
    ...(report.staleGroups ?? []).map((group) => ({
      kind: 'stale',
      target: group,
      groups: [group],
      signature: report.checkedAt.slice(0, 4),
      evidence: { fiscalYear: Number(report.checkedAt.slice(0, 4)) },
    })),
  ];
  for (const alert of ledger.alerts) alert.active = false;
  for (const finding of findings) {
    const id = `${finding.kind}:${finding.target}`;
    let alert = ledger.alerts.find((item) => item.id === id);
    if (!alert) {
      alert = { ...finding, id, firstSeen: report.checkedAt, occurrences: 0, status: 'pending', history: [] };
      ledger.alerts.push(alert);
      alert.history.push({ at: report.checkedAt, action: 'detected', evidence: finding.evidence });
    } else if (alert.signature !== finding.signature || !OPEN.has(alert.status)) {
      // A reviewed changed document remains acknowledged until its bytes/URL change again.
      if (alert.signature !== finding.signature || finding.kind !== 'changed') {
        alert.status = 'pending';
        alert.history.push({ at: report.checkedAt, action: 'reopened', evidence: finding.evidence });
      }
    }
    Object.assign(alert, finding, { active: true, lastSeen: report.checkedAt });
    alert.occurrences += 1;
  }
  return validateAlerts(ledger);
}

/** An explicit review records a person and evidence; accepting fingerprints is separate. */
export function reviewAlert(previous, { id, status, evidence, actor }, at) {
  validateAlerts(previous);
  if (!validTime(at) || (previous.checkedAt && Date.parse(at) < Date.parse(previous.checkedAt)))
    throw new Error('Invalid review date');
  if (!['reviewed', 'implementation-needed', 'implemented'].includes(status)) throw new Error('Invalid review status');
  if (typeof evidence !== 'string' || evidence.trim().length < 8 || evidence.length > 2000)
    throw new Error('Review evidence is required (8–2000 characters)');
  if (typeof actor !== 'string' || !actor.trim()) throw new Error('Reviewer is required');
  const ledger = structuredClone(previous);
  const alert = ledger.alerts.find((item) => item.id === id);
  if (!alert) throw new Error('Unknown alert id');
  if (!OPEN.has(alert.status)) throw new Error('Alert is already closed');
  if (status === 'implemented' && !/^https:\/\/github\.com\/molinero95\/SalaryCalculatorESP\/pull\/\d+$/.test(evidence))
    throw new Error('Implementation evidence must link to a repository PR');
  if (status !== 'implementation-needed' && alert.kind !== 'changed' && alert.active)
    throw new Error('Resolve source availability or stale parameters before closing this alert');
  alert.status = status;
  alert.history.push({ at, action: status, actor: actor.trim(), evidence: evidence.trim() });
  return ledger;
}

export const openAlerts = (ledger) => ledger.alerts.filter((alert) => OPEN.has(alert.status));

export function alertSummary(ledger) {
  return [
    '## Persistent review cases',
    '',
    'Recovery and accepting fingerprints do not close pending reviews. Evidence and review history are retained in alerts.json on monitor-state.',
    '',
    ...(openAlerts(ledger).length
      ? openAlerts(ledger).map(
          (a) =>
            `- ${a.id}: **${a.status}**; ${a.active ? 'currently detected' : 'no longer detected, review pending'}; first seen ${a.firstSeen}; occurrences ${a.occurrences}`,
        )
      : ['No open review cases. This does not establish complete fiscal coverage.']),
    '',
  ].join('\n');
}
