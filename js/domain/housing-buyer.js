// Regional deductions for buying the habitual dwelling that do not depend on the
// municipality (housing phase 4). Provenance, assumptions and pending rules are in
// docs/housing-regional-buyer.md. Same income context as housing-tenant.js; each rule
// returns `{ regional }` (amount before the quota limit) or `{ reason }`.
//
// `housingInvestment` is what the person paid in the year for the dwelling
// (principal, interest and costs) and `housingInterestPaid` the interest part.

/** Annual state base limit of the habitual-dwelling deduction as worded on 31-12-2012. */
export const STATE_2012_MAX_BASE = 9040;

const percentOf = (amount, percent) => (amount * percent) / 100;

function facts(input) {
  const investment = input.housingInvestment;
  const interest = Math.min(investment, input.housingInterestPaid);
  return {
    age: Number(input.age) || 0,
    investment,
    interest,
    withoutInterest: Math.max(0, investment - interest),
    firstDwelling: input.housingFirstDwelling === true,
    protectedDwelling: input.housingProtectedDwelling === true,
    newBuild: input.housingNewBuild === true,
    beforeDT18: input.housingPurchaseBefore2013 === true,
  };
}

/** Comunidad de Madrid, TR D.Leg. 1/2010 art. 12: mortgage interest, under 30. No income limit. */
export const MADRID_YOUNG_INTEREST = { maxAgeExclusive: 30, percent: 25, cap: 1031 };
function madridInterest(input) {
  const f = facts(input);
  const p = MADRID_YOUNG_INTEREST;
  // Interest counts until the month before turning 30; the age entered is the age on
  // 31 December, so a person who turned 30 during the year is not modelled.
  if (!(f.age < p.maxAgeExclusive)) return { reason: 'notEligible' };
  if (!(f.interest > 0)) return { reason: 'noAmount' };
  return { regional: Math.min(percentOf(f.interest, p.percent), p.cap) };
}

/** Andalucía, Ley 5/2021 art. 9: protected dwelling or buyer under 35. */
export const ANDALUSIA_PURCHASE = { maxAgeExclusive: 35, percent: 6, maxBase: STATE_2012_MAX_BASE, incomeLimit: 25000 };
function andalusiaPurchase(input, ctx) {
  const f = facts(input);
  const p = ANDALUSIA_PURCHASE;
  if (!(f.protectedDwelling || f.age < p.maxAgeExclusive)) return { reason: 'notEligible' };
  if (ctx.generalBase + ctx.savingsBase > p.incomeLimit) return { reason: 'incomeAboveLimit' };
  return { regional: percentOf(Math.min(f.investment, p.maxBase), p.percent) };
}

/**
 * Extremadura, TR D.Leg. 1/2018 art. 8: first protected dwelling, under 36, excluding
 * interest. The 10 % rate without protection depends on the municipality (phase 3).
 */
export const EXTREMADURA_PURCHASE = {
  maxAgeExclusive: 36,
  percent: 6,
  maxBase: STATE_2012_MAX_BASE,
  incomeLimit: 30000,
};
function extremaduraPurchase(input, ctx) {
  const f = facts(input);
  const p = EXTREMADURA_PURCHASE;
  if (!(f.age < p.maxAgeExclusive) || !f.firstDwelling) return { reason: 'notEligible' };
  if (!f.protectedDwelling) return { reason: 'municipalityRequired' };
  if (ctx.generalBase + ctx.savingsBase > p.incomeLimit) return { reason: 'incomeAboveLimit' };
  return { regional: percentOf(Math.min(f.withoutInterest, p.maxBase), p.percent) };
}

/** Extremadura, TR D.Leg. 1/2018 art. 11 quater: 25 % of interest, base up to 1,000 €. */
export const EXTREMADURA_YOUNG_INTEREST = { maxAgeExclusive: 36, percent: 25, maxBase: 1000, incomeLimit: 30000 };
function extremaduraInterest(input, ctx) {
  const f = facts(input);
  const p = EXTREMADURA_YOUNG_INTEREST;
  if (!(f.age < p.maxAgeExclusive) || !f.firstDwelling) return { reason: 'notEligible' };
  if (ctx.generalBase + ctx.savingsBase > p.incomeLimit) return { reason: 'incomeAboveLimit' };
  if (!(f.interest > 0)) return { reason: 'noAmount' };
  return { regional: percentOf(Math.min(f.interest, p.maxBase), p.percent) };
}

/**
 * Región de Murcia, TR D.Leg. 1/2010 art. 1.Uno: 40 or under, new build. The base
 * limit is the 2012 state limit minus the state DT 18ª base used by the same taxpayer.
 */
export const MURCIA_PURCHASE = {
  maxAge: 40,
  percent: 5,
  cap: 300,
  maxBase: STATE_2012_MAX_BASE,
  incomeLimit: 40000,
  savingsLimit: 1800,
};
function murciaPurchase(input, ctx) {
  const f = facts(input);
  const p = MURCIA_PURCHASE;
  if (!(f.age <= p.maxAge) || !f.newBuild) return { reason: 'notEligible' };
  if (!(ctx.generalBase + ctx.savingsBase < p.incomeLimit) || ctx.savingsBase > p.savingsLimit)
    return { reason: 'incomeAboveLimit' };
  const stateBase = f.beforeDT18 ? Math.min(f.investment, p.maxBase) : 0;
  const base = Math.min(f.investment, Math.max(0, p.maxBase - stateBase));
  return { regional: Math.min(percentOf(base, p.percent), p.cap) };
}

/**
 * La Rioja, Ley 10/2017 art. 32.11: under 36, base up to 9,000 €. Buyers before 2013
 * keep the transitional regional deductions instead (art. 32.11 and DT 1ª).
 */
export const RIOJA_PURCHASE = {
  maxAgeExclusive: 36,
  percent: 15,
  maxBase: 9000,
  incomeLimit: 18030,
  savingsLimit: 1800,
};
function riojaPurchase(input, ctx) {
  const f = facts(input);
  const p = RIOJA_PURCHASE;
  if (f.beforeDT18) return { reason: 'transitionalRegimeApplies' };
  if (!(f.age < p.maxAgeExclusive)) return { reason: 'notEligible' };
  if (ctx.generalLiquidBase > p.incomeLimit || ctx.savingsBase > p.savingsLimit) return { reason: 'incomeAboveLimit' };
  return { regional: percentOf(Math.min(f.investment, p.maxBase), p.percent) };
}

/** Calculated regional buyer rules by rule id. */
export const REGIONAL_BUYER_RULES = {
  'MAD-2': madridInterest,
  'AND-2': andalusiaPurchase,
  'EXT-2': extremaduraPurchase,
  'EXT-4': extremaduraInterest,
  'MUR-2': murciaPurchase,
  'RIO-2': riojaPurchase,
};

/** Buyer rules deliberately not calculated in phase 4, with the reason. */
export const PENDING_BUYER_RULES = {
  // Depend on the municipality or on regional lists of municipalities (phase 3).
  'ARA-2': 'municipalityRequired',
  'AST-2': 'municipalityRequired',
  'CAT-4': 'municipalityRequired',
  'CAT-7': 'municipalityRequired',
  'CLM-6': 'municipalityRequired',
  'CYL-2': 'municipalityRequired',
  'EXT-3': 'municipalityRequired',
  'GAL-2': 'municipalityRequired',
  'MAD-5': 'municipalityRequired',
  'MAD-6': 'municipalityRequired',
  'RIO-3': 'municipalityRequired',
  // Primary text not read, or applicability not verified for 2026.
  'VAL-3': 'primaryTextPending',
  'VAL-4': 'primaryTextPending',
  'VAL-5': 'primaryTextPending',
  'CANT-3': 'primaryTextPending',
  'CANT-4': 'primaryTextPending',
  'CLM-7': 'primaryTextPending',
  'CYL-3': 'primaryTextPending',
  // Read, but the text does not state the rate or base (Decreto ley 1/2026).
  'BAL-2': 'requirementsPending',
  // Income definition not verified.
  'CAN-3': 'definitionPending',
};
