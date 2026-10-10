// Housing deductions: input model and the record of which researched rules apply.
// Phase 0 of docs/housing-deductions-2026.md: no rule changes any amount yet, so
// every candidate rule is reported as skipped with the reason it was not applied.
import { HOUSING_RULES } from '../data/housing-rules.js';
import { REGIONAL_SCALES } from '../data/regions.js';
import { isForal } from './fiscal-profile.js';

/** 'notProvided' keeps housing out of the estimate until the person says otherwise. */
export const HOUSING_TENURES = ['notProvided', 'tenant', 'owner', 'other'];

const MAX_AMOUNT = 1e9;

/** Normalizes the housing fields in place; unknown or invalid values fall back to "not provided". */
export function normalizeHousing(input) {
  input.housingTenure = HOUSING_TENURES.includes(input.housingTenure) ? input.housingTenure : 'notProvided';
  const rent = Number(input.housingRentPaid);
  input.housingRentPaid = Number.isFinite(rent) ? Math.min(MAX_AMOUNT, Math.max(0, rent)) : 0;
  return input;
}

/** State rules plus those of the selected common-regime community. Foral territories have their own regime. */
export function housingRulesFor(region) {
  if (isForal(region)) return [];
  const community = Object.hasOwn(REGIONAL_SCALES, region) ? region : null;
  return HOUSING_RULES.filter((rule) => rule.region === null || rule.region === community);
}

const SIDES_BY_TENURE = { tenant: ['tenant', 'any'], owner: ['buyer', 'any'], other: [] };

function skipReason(rule, tenure) {
  if (rule.side === 'landlord') return 'requiresRentalIncome';
  if (tenure === 'notProvided') return 'housingNotProvided';
  if (!SIDES_BY_TENURE[tenure].includes(rule.side)) return 'notApplicableToTenure';
  return 'notImplemented';
}

/**
 * Which housing rules were applied or skipped, and why. Amounts are never
 * changed in this phase: `applied` is always empty and `deduction` is 0.
 */
export function assessHousing(input) {
  const tenure = HOUSING_TENURES.includes(input.housingTenure) ? input.housingTenure : 'notProvided';
  const scope = isForal(input.region)
    ? 'foralTerritory'
    : Object.hasOwn(REGIONAL_SCALES, input.region)
      ? 'stateAndRegional'
      : 'stateOnly';
  return {
    modelled: false,
    scope,
    tenure,
    deduction: 0,
    applied: [],
    skipped: housingRulesFor(input.region).map((rule) => ({ id: rule.id, reason: skipReason(rule, tenure) })),
  };
}
