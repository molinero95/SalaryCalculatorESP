import { FORAL_ANNUAL_AMOUNTS } from './foral-assessment.js';
import { unsupportedForalFamily } from './foral-family.js';
import { FORAL_TERRITORIES } from '../data/foral.js';

export const isForal = (region) => Object.hasOwn(FORAL_TERRITORIES, region);

/** Never silently substitute common-regime rules for an unreviewed foral profile. */
export function unsupportedFiscalProfile(input) {
  if (!isForal(input.region)) return false;
  const ascendants =
    (input.dependents65 ?? 0) +
    (input.dependents75 ?? 0) +
    (input.region === 'navarra' ? 0 : (input.foralAscendantsUnder65 ?? 0));
  return (
    FORAL_ANNUAL_AMOUNTS.some((key) => !Number.isFinite(input[key] ?? 0) || (input[key] ?? 0) < 0) ||
    (FORAL_ANNUAL_AMOUNTS.some((key) => (input[key] ?? 0) > 0) && input.foralAnnualConfirmed !== true) ||
    unsupportedForalFamily(input) ||
    [input.dependents65 ?? 0, input.dependents75 ?? 0, input.foralAscendantsUnder65 ?? 0].some(
      (value) => !Number.isInteger(value) || value < 0 || value > 10,
    ) ||
    !Number.isInteger(input.foralAscendantClaimants ?? 1) ||
    (input.foralAscendantClaimants ?? 1) < 1 ||
    (input.foralAscendantClaimants ?? 1) > 10 ||
    (ascendants > 0 && input.foralAscendantsConfirmed !== true)
  );
}
