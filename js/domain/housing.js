// Housing deductions: input model, the state transitional rules and the record of
// which researched rules apply (docs/housing-deductions-2026.md).
// Phase 1 calculates only the frozen state transitional regimes (DT 15ª rent,
// DT 18ª purchase and its withholding reduction). Every other candidate rule is
// reported as skipped with the reason it was not applied.
import { HOUSING_RULES, DT18_REGIONAL_RATE_PENDING } from '../data/housing-rules.js';
import { REGIONAL_SCALES } from '../data/regions.js';
import { isForal } from './fiscal-profile.js';

/** 'notProvided' keeps housing out of the estimate until the person says otherwise. */
export const HOUSING_TENURES = ['notProvided', 'tenant', 'owner', 'other'];

/**
 * DT 15ª LIRPF applies art. 68.7 as worded on 31-12-2014 (BOE consolidated text,
 * version of 28-09-2013). The reference is frozen, so these values cannot change.
 * Arts. 67.1.b and 77.1.a of that wording split the deduction 50 % state, 50 % regional.
 */
export const TRANSITIONAL_RENT = {
  rate: 10.05,
  incomeLimit: 24107.2,
  fullBaseUpTo: 17707.2,
  maxBase: 9040,
  slope: 1.4125,
};

/**
 * DT 18ª LIRPF applies arts. 67.1, 68.1 and 78 as worded on 31-12-2012: 7.5 % state
 * share on a base of up to 9,040 €, plus the regional share approved by the
 * community, 7.5 % by default (art. 78.2.a).
 */
export const TRANSITIONAL_PURCHASE = { stateRate: 7.5, defaultRegionalRate: 7.5, maxBase: 9040 };

/** Art. 86.1 RIRPF: 2 points less withholding for DT 18ª buyers financing with a loan. */
export const TRANSITIONAL_WITHHOLDING = { payLimit: 33007.2, points: 2 };

const MAX_AMOUNT = 1e9;
const amount = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(MAX_AMOUNT, Math.max(0, number)) : 0;
};

/** Normalizes the housing fields in place; unknown or invalid values fall back to "not provided". */
export function normalizeHousing(input) {
  input.housingTenure = HOUSING_TENURES.includes(input.housingTenure) ? input.housingTenure : 'notProvided';
  input.housingRentPaid = amount(input.housingRentPaid);
  input.housingInvestment = amount(input.housingInvestment);
  for (const flag of ['housingLeaseBefore2015', 'housingPurchaseBefore2013', 'housingLoanWithholding'])
    input[flag] = input[flag] === true;
  return input;
}

/** State rules plus those of the selected common-regime community. Foral territories have their own regime. */
export function housingRulesFor(region) {
  if (isForal(region)) return [];
  const community = Object.hasOwn(REGIONAL_SCALES, region) ? region : null;
  return HOUSING_RULES.filter((rule) => rule.region === null || rule.region === community);
}

const SIDES_BY_TENURE = { tenant: ['tenant', 'any'], owner: ['buyer', 'any'], other: [] };
const tenureOf = (input) => (HOUSING_TENURES.includes(input.housingTenure) ? input.housingTenure : 'notProvided');

/** Points by which DT 18ª reduces the payroll withholding rate (0 when it does not apply). */
export function housingWithholdingPoints(input, taxableGross) {
  const eligible =
    !isForal(input.region) &&
    tenureOf(input) === 'owner' &&
    input.housingPurchaseBefore2013 === true &&
    input.housingLoanWithholding === true &&
    Number(input.housingInvestment) > 0 &&
    taxableGross < TRANSITIONAL_WITHHOLDING.payLimit;
  return eligible ? TRANSITIONAL_WITHHOLDING.points : 0;
}

/** DT 15ª: amount before the quota limits, or the reason it is not applied. */
function transitionalRent(input, baseImponible) {
  if (!input.housingLeaseBefore2015) return { reason: 'notEligible' };
  if (!(baseImponible < TRANSITIONAL_RENT.incomeLimit)) return { reason: 'incomeAboveLimit' };
  const { fullBaseUpTo, maxBase, slope, rate } = TRANSITIONAL_RENT;
  const cap = baseImponible <= fullBaseUpTo ? maxBase : maxBase - slope * (baseImponible - fullBaseUpTo);
  const total = (Math.min(amount(input.housingRentPaid), cap) * rate) / 100;
  if (total <= 0) return { reason: 'noAmount' };
  return { state: total / 2, regional: total / 2 };
}

/** DT 18ª: amount before the quota limits, or the reason it is not applied. */
function transitionalPurchase(input) {
  if (!input.housingPurchaseBefore2013) return { reason: 'notEligible' };
  if (DT18_REGIONAL_RATE_PENDING.includes(input.region)) return { reason: 'regionalRatePending' };
  const base = Math.min(amount(input.housingInvestment), TRANSITIONAL_PURCHASE.maxBase);
  if (base <= 0) return { reason: 'noAmount' };
  return {
    state: (base * TRANSITIONAL_PURCHASE.stateRate) / 100,
    regional: (base * TRANSITIONAL_PURCHASE.defaultRegionalRate) / 100,
  };
}

function evaluate(rule, input, tenure, baseImponible) {
  if (rule.side === 'landlord') return { reason: 'requiresRentalIncome' };
  if (tenure === 'notProvided') return { reason: 'housingNotProvided' };
  if (!SIDES_BY_TENURE[tenure].includes(rule.side)) return { reason: 'notApplicableToTenure' };
  if (rule.id === 'S1') return { reason: 'provisionalLaw' };
  if (rule.id === 'S2') return transitionalRent(input, baseImponible);
  if (rule.id === 'S3') return transitionalPurchase(input);
  return { reason: 'notImplemented' };
}

/**
 * Housing deductions claimed by this profile and every rule skipped, with its reason.
 * `baseImponible` is the general taxable base (before pension reductions); rules that
 * depend on it are skipped when it is not provided. Amounts are claims before the
 * quota limits: the annual assessment caps them so no quota becomes negative.
 */
export function assessHousing(input, { baseImponible = Number.NaN, taxableGross = Number.NaN } = {}) {
  const tenure = tenureOf(input);
  const scope = isForal(input.region)
    ? 'foralTerritory'
    : Object.hasOwn(REGIONAL_SCALES, input.region)
      ? 'stateAndRegional'
      : 'stateOnly';
  const applied = [];
  const skipped = [];
  for (const rule of housingRulesFor(input.region)) {
    const result = evaluate(rule, input, tenure, baseImponible);
    if (result.reason) skipped.push({ id: rule.id, reason: result.reason });
    else applied.push({ id: rule.id, state: result.state, regional: result.regional });
  }
  const state = applied.reduce((total, rule) => total + rule.state, 0);
  const regional = applied.reduce((total, rule) => total + rule.regional, 0);
  return {
    modelled: applied.length > 0,
    scope,
    tenure,
    state,
    regional,
    claimed: state + regional,
    withholdingPoints: Number.isFinite(taxableGross) ? housingWithholdingPoints(input, taxableGross) : 0,
    applied,
    skipped,
  };
}
