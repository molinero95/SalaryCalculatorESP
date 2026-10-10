// Provenance catalogue for enacted-law parameters (data/fiscal-sources.json).
// It is maintenance metadata: the calculator never reads it at runtime.
import { REGIONAL_SCALES } from '../js/data/regions.js';
import { FORAL_TERRITORIES } from '../js/data/foral.js';

export const fiscalSourcesPath = new URL('../data/fiscal-sources.json', import.meta.url);

// Parameter groups that must each be backed by at least one source.
export const REQUIRED_GROUPS = [
  'state.scale',
  'state.allowances',
  'state.employmentIncome',
  'state.minWageCredit',
  'state.filingThreshold',
  'withholding',
  'flexible',
  'pension',
  'socialSecurity',
  'regionalAllowances',
  ...Object.keys(REGIONAL_SCALES).map((region) => `regional.${region}`),
  ...Object.keys(FORAL_TERRITORIES).map((territory) => `foral.${territory}`),
];

const isDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

function assertPublicHttps(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Source must be public HTTPS');
}

export function validateFiscalSources(catalogue) {
  if (catalogue.schemaVersion !== 1 || !Array.isArray(catalogue.sources) || !catalogue.sources.length)
    throw new Error('Invalid fiscal source catalogue');
  const ids = new Set();
  const covered = new Set();
  for (const s of catalogue.sources) {
    if (!/^[a-z][a-z0-9]+$/.test(s.id) || ids.has(s.id)) throw new Error('Invalid or duplicate source id');
    ids.add(s.id);
    if (typeof s.title !== 'string' || !s.title.trim()) throw new Error(`Missing title: ${s.id}`);
    assertPublicHttps(s.url);
    if (s.monitorUrl !== undefined) assertPublicHttps(s.monitorUrl);
    if (!Number.isInteger(s.fiscalYear) || s.fiscalYear < 2000) throw new Error(`Invalid fiscal year: ${s.id}`);
    if (!isDate(s.verifiedAt)) throw new Error(`Invalid verifiedAt: ${s.id}`);
    if (!Array.isArray(s.covers) || !s.covers.length) throw new Error(`Missing covers: ${s.id}`);
    for (const group of s.covers) {
      if (!REQUIRED_GROUPS.includes(group)) throw new Error(`Unknown parameter group ${group}: ${s.id}`);
      covered.add(group);
    }
  }
  const missing = REQUIRED_GROUPS.filter((group) => !covered.has(group));
  if (missing.length) throw new Error(`Parameter groups without a source: ${missing.join(', ')}`);
  return catalogue;
}

/**
 * Parameter groups with no current source on `today`. A source is current when a
 * human verified it within `maxAgeDays` and it applies to the current fiscal year.
 * Until `graceDays` into January the previous fiscal year is still accepted, since
 * new-year rules are often published in late December or early January.
 */
export function staleGroups(catalogue, today, { maxAgeDays = 365, graceDays = 31 } = {}) {
  if (!isDate(today)) throw new Error('Invalid monitoring date');
  const now = new Date(`${today}T00:00:00Z`);
  const year = now.getUTCFullYear();
  const dayOfYear = (now - Date.UTC(year, 0, 1)) / 86400000;
  const minimumYear = dayOfYear < graceDays ? year - 1 : year;
  const isCurrent = (s) => {
    const age = (now - new Date(`${s.verifiedAt}T00:00:00Z`)) / 86400000;
    return s.fiscalYear >= minimumYear && s.fiscalYear <= year && isDate(s.verifiedAt) && age >= 0 && age <= maxAgeDays;
  };

  return REQUIRED_GROUPS.filter((group) => !catalogue.sources.some((s) => s.covers.includes(group) && isCurrent(s)));
}
