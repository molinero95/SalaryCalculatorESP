// Housing deductions: input model, the state transitional rules and the record of
// which researched rules apply (docs/housing-deductions-2026.md).
// Calculated: the frozen state transitional regimes (DT 15ª rent, DT 18ª purchase
// and its withholding reduction) and the regional tenant deductions for general
// profiles (housing-tenant.js). Every other candidate rule is reported as skipped
// with the reason it was not applied.
import { HOUSING_RULES, DT18_REGIONAL_RATE_PENDING } from '../data/housing-rules.js';
import { REGIONAL_TENANT_RULES, PENDING_TENANT_RULES } from './housing-tenant.js';
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
const HOUSING_AMOUNTS = [
  'housingRentPaid',
  'housingInvestment',
  'housingRentAid',
  'housingSavingsBase',
  'housingFamilyUnitOtherBase',
];
const HOUSING_FLAGS = [
  'housingLeaseBefore2015',
  'housingPurchaseBefore2013',
  'housingLoanWithholding',
  'housingRegionalConfirmed',
  'housingLargeFamily',
  'housingSingleParent',
  'housingTwoMinorChildren',
  'housingFamilyUnitConfirmed',
];
const amount = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(MAX_AMOUNT, Math.max(0, number)) : 0;
};

/**
 * Attestations whose meaning depends on the community (formal requirements, regional
 * family definitions, family-unit data): a change of residence must clear them.
 */
export const REGIONAL_HOUSING_ATTESTATIONS = [
  'housingRegionalConfirmed',
  'housingSingleParent',
  'housingTwoMinorChildren',
  'housingFamilyUnitConfirmed',
];

const integerIn = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.floor(number))) : fallback;
};

/** Normalizes the housing fields in place; unknown or invalid values fall back to "not provided". */
export function normalizeHousing(input) {
  input.housingTenure = HOUSING_TENURES.includes(input.housingTenure) ? input.housingTenure : 'notProvided';
  for (const field of HOUSING_AMOUNTS) input[field] = amount(input[field]);
  for (const flag of HOUSING_FLAGS) input[flag] = input[flag] === true;
  input.housingCoTenants = integerIn(input.housingCoTenants, 1, 10, 1);
  input.housingLeaseDays = integerIn(input.housingLeaseDays, 0, 365, 365);
  return input;
}

/** State rules plus those of the selected common-regime community. Foral territories have their own regime. */
export function housingRulesFor(region) {
  if (isForal(region)) return [];
  const community = Object.hasOwn(REGIONAL_SCALES, region) ? region : null;
  return HOUSING_RULES.filter((rule) => rule.region === null || rule.region === community);
}

/** True when the community has a calculated regional tenant deduction. */
export function hasRegionalTenantRule(region) {
  return housingRulesFor(region).some((rule) => Object.hasOwn(REGIONAL_TENANT_RULES, rule.id));
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

/** Regional tenant rule: common guards, then the community's own test. */
function regionalTenant(rule, input, income) {
  if (!(input.housingRentPaid > 0)) return { reason: 'noAmount' };
  if (!input.housingRegionalConfirmed) return { reason: 'requirementsNotConfirmed' };
  if (!Object.values(income).every(Number.isFinite)) return { reason: 'incomeNotProvided' };
  const result = REGIONAL_TENANT_RULES[rule.id](input, income);
  if (result.reason) return result;
  return result.regional > 0 ? { state: 0, regional: result.regional } : { reason: 'noAmount' };
}

function evaluate(rule, input, tenure, income) {
  if (rule.side === 'landlord') return { reason: 'requiresRentalIncome' };
  if (tenure === 'notProvided') return { reason: 'housingNotProvided' };
  if (!SIDES_BY_TENURE[tenure].includes(rule.side)) return { reason: 'notApplicableToTenure' };
  if (rule.id === 'S1') return { reason: 'provisionalLaw' };
  if (rule.id === 'S2') return transitionalRent(input, income.generalBase + income.savingsBase);
  if (rule.id === 'S3') return transitionalPurchase(input);
  if (Object.hasOwn(PENDING_TENANT_RULES, rule.id)) return { reason: PENDING_TENANT_RULES[rule.id] };
  if (Object.hasOwn(REGIONAL_TENANT_RULES, rule.id)) return regionalTenant(rule, input, income);
  return { reason: 'notImplemented' };
}

/**
 * Housing deductions claimed by this profile and every rule skipped, with its reason.
 * `baseImponible` is the general taxable base (before pension reductions),
 * `baseLiquidable` the general base after them, `minimum` the personal and family
 * minimum of the annual return and `descendantMinimum` its descendant part. Rules
 * that depend on a missing magnitude are skipped. Amounts are claims before the
 * quota limits: the annual assessment caps them so no quota becomes negative.
 */
export function assessHousing(
  input,
  {
    baseImponible = Number.NaN,
    baseLiquidable = Number.NaN,
    minimum = Number.NaN,
    descendantMinimum = Number.NaN,
    taxableGross = Number.NaN,
  } = {},
) {
  const income = {
    generalBase: baseImponible,
    savingsBase: amount(input.housingSavingsBase),
    generalLiquidBase: baseLiquidable,
    minimum,
    descendantMinimum,
  };
  const tenure = tenureOf(input);
  const scope = isForal(input.region)
    ? 'foralTerritory'
    : Object.hasOwn(REGIONAL_SCALES, input.region)
      ? 'stateAndRegional'
      : 'stateOnly';
  const applied = [];
  const skipped = [];
  for (const rule of housingRulesFor(input.region)) {
    const result = evaluate(rule, input, tenure, income);
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
