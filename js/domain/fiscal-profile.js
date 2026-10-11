import { CURRENT_SCENARIO } from '../defaults.js';
import { FORAL_ANNUAL_AMOUNTS } from './foral-assessment.js';
import { foralFamilyIssues } from './foral-family.js';
import { FORAL_TERRITORIES } from '../data/foral.js';

export const isForal = (region) => Object.hasOwn(FORAL_TERRITORIES, region);

/**
 * Why a foral profile cannot be estimated yet, as message keys (empty when it can).
 * Never silently substitute common-regime rules for an unreviewed foral profile.
 */
export function foralProfileIssues(input) {
  if (!isForal(input.region)) return [];
  const issues = [];
  const annual = FORAL_ANNUAL_AMOUNTS.map((key) => input[key] ?? 0);
  const counts = [input.dependents65 ?? 0, input.dependents75 ?? 0, input.foralAscendantsUnder65 ?? 0];
  const claimants = input.foralAscendantClaimants ?? 1;
  if (
    annual.some((value) => !Number.isFinite(value) || value < 0) ||
    counts.some((value) => !Number.isInteger(value) || value < 0 || value > 10) ||
    !Number.isInteger(claimants) ||
    claimants < 1 ||
    claimants > 10
  )
    issues.push('foralIssueInvalid');
  if (annual.some((value) => value > 0) && input.foralAnnualConfirmed !== true) issues.push('foralIssueAnnual');
  issues.push(...foralFamilyIssues(input));
  const ascendants = counts[0] + counts[1] + (input.region === 'navarra' ? 0 : counts[2]);
  if (ascendants > 0 && input.foralAscendantsConfirmed !== true) issues.push('foralIssueAscendants');
  return [...new Set(issues)];
}

export const unsupportedFiscalProfile = (input) => foralProfileIssues(input).length > 0;

/** These scenario groups are replaced by territorial rules in the foral engine. */
export function unsupportedFiscalScenario(input, scenario) {
  if (!isForal(input.region)) return false;
  if (scenario.proposal) return true;
  const equal = (a, b) => {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((key) => Object.hasOwn(b, key) && equal(a[key], b[key]));
  };
  return ['incomeTax', 'flexible', 'pension'].some((key) => !equal(scenario[key], CURRENT_SCENARIO[key]));
}
