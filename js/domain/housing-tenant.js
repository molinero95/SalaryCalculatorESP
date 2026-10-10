// Regional tenant rental deductions for the general profiles (housing phase 2).
// Each rule was checked against the regional consolidated text; provenance,
// assumptions and the groups that are not collected are listed in
// docs/housing-regional-tenant.md.
//
// Every rule receives the same income context:
//   generalBase  base imponible general (before pension reductions)
//   savingsBase  base imponible del ahorro, entered by the person; the common-regime
//                engine does not tax savings income, it is used only in these tests
//   generalLiquidBase  base liquidable general (after pension reductions)
//   minimum      mínimo personal y familiar of the annual return (state amounts:
//                none of the communities that test it has its own minima)
//   descendantMinimum  the descendant part of that minimum
// and returns either `{ regional }` (amount before the quota limit) or `{ reason }`.

const rate = (rent, percent, cap) => Math.min((rent * percent) / 100, cap);
/** Days of the 2026 tax period, for caps prorated by the days a lease was in force. */
export const DAYS_IN_PERIOD = 365;

/** Shared tenant facts derived from the input. */
function facts(input) {
  return {
    age: Number(input.age) || 0,
    disability: Number(input.disability) || 0,
    rent: input.housingRentPaid,
    unsubsidisedRent: Math.max(0, input.housingRentPaid - input.housingRentAid),
    largeFamily: input.housingLargeFamily === true,
    singleParent: input.housingSingleParent === true,
    // Taxpayers entitled to the deduction for the same lease or dwelling, this one included.
    claimants: Math.max(1, Math.floor(Number(input.housingCoTenants) || 1)),
    leaseDays: Math.min(DAYS_IN_PERIOD, Math.max(0, Math.floor(Number(input.housingLeaseDays) || 0))),
  };
}

/**
 * Comunidad de Madrid, TR D.Leg. 1/2010 arts. 8 and 18 (consolidated 10-07-2026).
 * Each taxpayer deducts the rent they pay; the text sets no per-dwelling split.
 */
export const MADRID_RENT = {
  maxAgeExclusive: 40,
  percent: 30,
  cap: 1237.2,
  incomeLimit: 26414.22,
  rentShareOfIncome: 20,
  familyUnitLimit: 61860,
};
function madrid(input, ctx) {
  const f = facts(input);
  const p = MADRID_RENT;
  if (!(f.age < p.maxAgeExclusive)) return { reason: 'notEligible' };
  const income = ctx.generalBase + ctx.savingsBase;
  if (income > p.incomeLimit) return { reason: 'incomeAboveLimit' };
  if (!input.housingFamilyUnitConfirmed) return { reason: 'familyIncomeNotProvided' };
  if (income + input.housingFamilyUnitOtherBase > p.familyUnitLimit) return { reason: 'familyIncomeAboveLimit' };
  if (!(f.rent > (income * p.rentShareOfIncome) / 100)) return { reason: 'rentBelowIncomeShare' };
  return { regional: rate(f.rent, p.percent, p.cap) };
}

/**
 * Cataluña, art. 612-3 Código tributario (D.Leg. 1/2024). One dwelling cannot give
 * more than 1,000 € in total; with several entitled taxpayers it is divided.
 */
export const CATALONIA_RENT = {
  maxAge: 35,
  percent: 10,
  cap: 500,
  familyCap: 1000,
  dwellingCap: 1000,
  incomeLimit: 30000,
};
function catalonia(input, ctx) {
  const f = facts(input);
  const p = CATALONIA_RENT;
  const family = f.largeFamily || f.singleParent;
  if (!(f.age <= p.maxAge || f.disability >= 65 || family)) return { reason: 'notEligible' };
  if (ctx.generalBase + ctx.savingsBase - ctx.minimum > p.incomeLimit) return { reason: 'incomeAboveLimit' };
  return { regional: rate(f.rent, p.percent, Math.min(family ? p.familyCap : p.cap, p.dwellingCap / f.claimants)) };
}

/**
 * Extremadura, TR D.Leg. 1/2018 art. 9 (urban cap; the rural cap is phase 3). With
 * several entitled taxpayers the amount is divided equally.
 */
export const EXTREMADURA_RENT = { maxAgeExclusive: 36, percent: 30, cap: 1000, incomeLimit: 30000 };
function extremadura(input, ctx) {
  const f = facts(input);
  const p = EXTREMADURA_RENT;
  if (!(f.age < p.maxAgeExclusive || f.largeFamily || f.disability >= 65)) return { reason: 'notEligible' };
  if (ctx.generalBase + ctx.savingsBase > p.incomeLimit) return { reason: 'incomeAboveLimit' };
  return { regional: rate(f.rent, p.percent, p.cap / f.claimants) };
}

/**
 * Castilla-La Mancha, Ley 8/2013 arts. 9, 9 ter, 9 quáter and 9 quinquies (caps set
 * by Ley 1/2026 with effect from the 2025 tax period, DF 6ª). Art. 13.3.f makes them
 * incompatible, so the most favourable one applies. Art. 9 (under 36) has the full
 * cap; arts. 9 ter, 9 quáter and 9 quinquies prorate it by the days the lease was in
 * force in the period and divide it equally among the taxpayers entitled to it.
 */
export const CASTILLA_LA_MANCHA_RENT = { maxAgeExclusive: 36, percent: 15, cap: 500, incomeLimit: 12500 };
function castillaLaMancha(input, ctx) {
  const f = facts(input);
  const p = CASTILLA_LA_MANCHA_RENT;
  const eligible = f.age < p.maxAgeExclusive || f.largeFamily || f.singleParent || f.disability >= 65;
  if (!eligible) return { reason: 'notEligible' };
  if (ctx.generalBase + ctx.savingsBase - ctx.descendantMinimum > p.incomeLimit) return { reason: 'incomeAboveLimit' };
  if (f.age < p.maxAgeExclusive) return { regional: rate(f.rent, p.percent, p.cap) };
  if (!(f.leaseDays > 0)) return { reason: 'leaseDaysNotProvided' };
  return { regional: rate(f.rent, p.percent, (p.cap * f.leaseDays) / DAYS_IN_PERIOD / f.claimants) };
}

/** Galicia, TR D.Leg. 1/2011 art. 5.Siete. The cap is per lease, shared equally. */
export const GALICIA_RENT = {
  maxAge: 35,
  percent: 10,
  cap: 300,
  twoMinorsPercent: 20,
  twoMinorsCap: 600,
  incomeLimit: 22000,
};
function galicia(input, ctx) {
  const f = facts(input);
  const p = GALICIA_RENT;
  if (!(f.age <= p.maxAge)) return { reason: 'notEligible' };
  if (ctx.generalBase + ctx.savingsBase > p.incomeLimit) return { reason: 'incomeAboveLimit' };
  const twoMinors = input.housingTwoMinorChildren === true;
  // "As contías" are doubled for a tenant with a disability of 33 % or more.
  const cap = (twoMinors ? p.twoMinorsCap : p.cap) * (f.disability >= 33 ? 2 : 1);
  return { regional: rate(f.rent, twoMinors ? p.twoMinorsPercent : p.percent, cap / f.claimants) };
}

/** Illes Balears, TR D.Leg. 1/2014 art. 3 bis (Ley 4/2026). */
export const BALEARIC_RENT = {
  generalMaxAgeExclusive: 36,
  generalPercent: 15,
  generalCap: 530,
  enhancedMaxAgeExclusive: 30,
  enhancedPercent: 20,
  enhancedCap: 650,
  incomeLimit: 33000,
  familyIncrease: 20,
};
function balearic(input, ctx) {
  const f = facts(input);
  const p = BALEARIC_RENT;
  const family = f.largeFamily || f.singleParent;
  const enhanced = f.age < p.enhancedMaxAgeExclusive || f.disability >= 33 || family;
  // The over-65 group requires not working; this calculator models employees.
  if (!(enhanced || f.age < p.generalMaxAgeExclusive)) return { reason: 'notEligible' };
  const limit = p.incomeLimit * (family ? 1 + p.familyIncrease / 100 : 1);
  if (ctx.generalBase + ctx.savingsBase > limit) return { reason: 'incomeAboveLimit' };
  return {
    regional: enhanced ? rate(f.rent, p.enhancedPercent, p.enhancedCap) : rate(f.rent, p.generalPercent, p.generalCap),
  };
}

/** Andalucía, Ley 5/2021 art. 10. Each taxpayer deducts their own payments within the caps (10.4). */
export const ANDALUSIA_RENT = {
  maxAgeExclusive: 35,
  minAgeExclusive: 65,
  percent: 15,
  cap: 1200,
  disabilityCap: 1500,
  incomeLimit: 25000,
};
function andalusia(input, ctx) {
  const f = facts(input);
  const p = ANDALUSIA_RENT;
  const disabled = f.disability >= 33;
  if (!(f.age < p.maxAgeExclusive || f.age > p.minAgeExclusive || disabled)) return { reason: 'notEligible' };
  if (ctx.generalBase + ctx.savingsBase > p.incomeLimit) return { reason: 'incomeAboveLimit' };
  return { regional: rate(f.rent, p.percent, disabled ? p.disabilityCap : p.cap) };
}

/**
 * Principado de Asturias, TR D.Leg. 2/2014 art. 7.1 and 7.3 (7.2 depends on the
 * council: phase 3). Art. 7.7 divides the cap equally among entitled taxpayers.
 */
export const ASTURIAS_RENT = {
  percent: 10,
  cap: 500,
  enhancedMaxAge: 35,
  enhancedPercent: 30,
  enhancedCap: 1500,
  incomeLimit: 35000,
};
function asturias(input, ctx) {
  const f = facts(input);
  const p = ASTURIAS_RENT;
  if (ctx.generalBase + ctx.savingsBase > p.incomeLimit) return { reason: 'incomeAboveLimit' };
  const enhanced = f.age <= p.enhancedMaxAge || f.largeFamily || f.singleParent;
  return {
    regional: enhanced
      ? rate(f.rent, p.enhancedPercent, p.enhancedCap / f.claimants)
      : rate(f.rent, p.percent, p.cap / f.claimants),
  };
}

/** Región de Murcia, TR D.Leg. 1/2010 art. 1.Trece. The cap is per lease, shared equally. */
export const MURCIA_RENT = { maxAge: 40, percent: 10, cap: 300, incomeLimit: 40000, savingsLimit: 1800 };
function murcia(input, ctx) {
  const f = facts(input);
  const p = MURCIA_RENT;
  if (!(f.age <= p.maxAge || f.largeFamily || f.disability >= 65)) return { reason: 'notEligible' };
  if (!(ctx.generalBase - ctx.minimum < p.incomeLimit) || ctx.savingsBase > p.savingsLimit)
    return { reason: 'incomeAboveLimit' };
  return { regional: rate(f.unsubsidisedRent, p.percent, p.cap / f.claimants) };
}

/** La Rioja, Ley 10/2017 art. 32.12 (urban rate; small municipalities are phase 3). Cap per lease, shared. */
export const RIOJA_RENT = { maxAgeExclusive: 36, percent: 10, cap: 300, incomeLimit: 18030, savingsLimit: 1800 };
function rioja(input, ctx) {
  const f = facts(input);
  const p = RIOJA_RENT;
  if (!(f.age < p.maxAgeExclusive)) return { reason: 'notEligible' };
  if (ctx.generalLiquidBase > p.incomeLimit || ctx.savingsBase > p.savingsLimit) return { reason: 'incomeAboveLimit' };
  return { regional: rate(f.unsubsidisedRent, p.percent, p.cap / f.claimants) };
}

/** Calculated regional tenant rules by rule id. */
export const REGIONAL_TENANT_RULES = {
  'MAD-1': madrid,
  'CAT-1': catalonia,
  'EXT-1': extremadura,
  'CLM-1': castillaLaMancha,
  'GAL-1': galicia,
  'BAL-1': balearic,
  'AND-1': andalusia,
  'AST-1': asturias,
  'MUR-1': murcia,
  'RIO-1': rioja,
};

/**
 * General-profile tenant rules deliberately not calculated in phase 2, with the
 * reason. CLM-2 to CLM-4 (arts. 9 ter, 9 quáter, 9 quinquies) are covered by CLM-1,
 * which applies the single compatible deduction of the group.
 */
export const PENDING_TENANT_RULES = {
  // Art. 4.Uno.n) refers to the income limits of art. 4.Cuatro, which could not be read
  // in the 2026 consolidated text; the compendium figures alone are not enough.
  'VAL-1': 'primaryTextPending',
  'CYL-1': 'primaryTextPending',
  'CANT-1': 'definitionPending',
  'CAN-1': 'definitionPending',
  'CLM-2': 'coveredByCombinedRule',
  'CLM-3': 'coveredByCombinedRule',
  'CLM-4': 'coveredByCombinedRule',
};
