// Default parameters: Spanish payroll rules in force (common territory, 2026).
// Amounts are in euros and rates in percent. See README for sources.

export const CURRENT_SCENARIO = {
  name: '',
  proposal: '', // id in PROPOSALS when the scenario comes from a party proposal
  incomeTax: {
    useSeparateWithholding: false,
    withholdingBrackets: [
      { upTo: 12450, rate: 19 },
      { upTo: 20200, rate: 24 },
      { upTo: 35200, rate: 30 },
      { upTo: 60000, rate: 37 },
      { upTo: 300000, rate: 45 },
      { upTo: null, rate: 47 },
    ],
    // Withholding scale (state + general regional, art. 101 LIRPF).
    // `upTo: null` marks the open-ended top bracket.
    brackets: [
      { upTo: 12450, rate: 19 },
      { upTo: 20200, rate: 24 },
      { upTo: 35200, rate: 30 },
      { upTo: 60000, rate: 37 },
      { upTo: 300000, rate: 45 },
      { upTo: null, rate: 47 },
    ],

    // Personal and family allowance (arts. 57-61 LIRPF)
    childRateReduction: 0, // percentage points per child, state share only
    personalAllowance: 5550,
    ageOver65Allowance: 1150,
    ageOver75Allowance: 1400,
    child1Allowance: 2400,
    child2Allowance: 2700,
    child3Allowance: 4000,
    child4Allowance: 4500,
    childUnder3Allowance: 2800,
    dependent65Allowance: 1150,
    dependent75Allowance: 1400,
    disability33Allowance: 3000,
    disability65Allowance: 9000,
    careAllowance: 3000,

    // Deductible expenses (art. 19 LIRPF)
    generalExpenses: 2000,
    disability33Expenses: 3500,
    disability65Expenses: 7750,

    // Employment income reduction (art. 20 LIRPF)
    reductionMax: 7302,
    reductionThreshold1: 14852,
    reductionSlope1: 1.75,
    reductionThreshold2: 17673.52,
    reductionValue2: 2364.34,
    reductionSlope2: 1.14,
    reductionThreshold3: 19747.5,

    // Tax credit for low earners (DA 61ª LIRPF, RDL 5/2026). Based on gross
    // employment income and applied in the annual return, not in withholding.
    minWageCredit: 590.89,
    minWageCreditFullUpTo: 17094,
    minWageCreditEndsAt: 20048.45,

    // Income below which there is no withholding (art. 81 RIRPF), by family
    // situation (1: single parent, 2: spouse without income, 3: other) and
    // number of children (0, 1, 2 or more)
    withholdingFreeMin1_1: 17644,
    withholdingFreeMin1_2: 18694,
    withholdingFreeMin2_0: 17197,
    withholdingFreeMin2_1: 18130,
    withholdingFreeMin2_2: 19262,
    withholdingFreeMin3_0: 15876,
    withholdingFreeMin3_1: 16342,
    withholdingFreeMin3_2: 16867,

    // Other withholding rules (IRPF Regulation, arts. 85-86)
    withholdingCap: 43,
    // Single-payer employees below this income don't have to file a return (art. 96 LIRPF)
    filingThreshold: 22000,
    temporaryMinRate: 2,
  },
  // Tax-exempt limits for flexible compensation (art. 42 LIRPF, art. 45-46 RIRPF)
  flexible: {
    mealDailyLimit: 11,
    transportLimit: 1500,
    healthLimit: 500,
    healthDisabilityLimit: 1500,
    inKindCap: 30, // max % of salary paid in kind (art. 26.1 Workers' Statute)
  },
  // Pension plan contributions reducing the tax base (arts. 51-52 LIRPF)
  pension: {
    individualLimit: 1500,
    employmentLimit: 8500, // extra room for employment plans (employer + employee)
    netIncomeShareLimit: 30, // max % of net employment income
    highIncomeThreshold: 60000, // above this, employee contributions can't exceed the employer's
  },
  // Contribution bases (Orden PJC/297/2026)
  socialSecurity: {
    minBase: 1424.4,
    maxBase: 5101.2,
    // Solidarity contribution bands, as % above the maximum base
    solidarityBand1Limit: 10,
    solidarityBand2Limit: 50,
  },
  employee: {
    commonContingencies: 4.7,
    unemploymentPermanent: 1.55,
    unemploymentTemporary: 1.6,
    training: 0.1,
    mei: 0.15,
    solidarity1: 0.19,
    solidarity2: 0.21,
    solidarity3: 0.24,
  },
  employer: {
    commonContingencies: 23.6,
    unemploymentPermanent: 5.5,
    unemploymentTemporary: 6.7,
    training: 0.6,
    fogasa: 0.2,
    mei: 0.75,
    workAccidents: 1.5,
    solidarity1: 0.96,
    solidarity2: 1.04,
    solidarity3: 1.22,
  },
};

export const DEFAULT_INPUT = {
  salary: 30000,
  period: 'annual', // 'annual' | 'perPayment'
  payments: 14, // 12 | 14
  contract: 'permanent', // 'permanent' | 'temporary'
  partTime: 100, // % of a full-time working week
  region: 'general', // common-regime community or foral territory
  city: '', // optional residence preset; it must match the selected region
  familySituation: 3, // 1 | 2 | 3, see withholdingFreeMin*
  age: 35,
  children: 0,
  childrenUnder3: 0,
  childrenUnder6: 0,
  children6to15: 0,
  foralChildrenConfirmed: false,
  foralReducedMobility: false,
  foralAlavaRural: false,
  childrenFullyCounted: false,
  foralAnnualConfirmed: false,
  foralExemptIncome: 0,
  foralRentalGross: 0,
  foralRentalExpenses: 0,
  foralRentalInsurance: 0,
  foralRentalPublic: false,
  foralActivityIncome: 0,
  foralSavingsIncome: 0,
  foralOtherWithholding: 0,
  foralRentPaid: 0,
  foralRentEnhanced: false,
  foralAscendantsConfirmed: false,
  foralAscendantsUnder65: 0,
  foralAscendantClaimants: 1,
  dependents65: 0,
  dependents75: 0,
  disability: 0, // 0 | 33 | 65
  // Housing (docs/housing-deductions-2026.md): state transitional regimes and regional
  // tenant deductions for general profiles.
  housingTenure: 'notProvided', // 'notProvided' | 'tenant' | 'owner' | 'other'
  housingRentPaid: 0, // annual rent paid for the habitual dwelling, in euros
  housingLeaseBefore2015: false, // confirms DT 15ª eligibility (lease and deduction before 2015)
  housingInvestment: 0, // annual amount paid for the habitual dwelling: principal, interest and costs
  housingPurchaseBefore2013: false, // confirms DT 18ª eligibility (purchase and deduction before 2013)
  housingLoanWithholding: false, // the payer was told about a qualifying loan (form 145)
  housingRentAid: 0, // public rent aid received in the year, in euros
  housingCoTenants: 1, // taxpayers entitled to the deduction for the same lease, this one included
  housingLeaseDays: 365, // days of 2026 with the lease in force (Castilla-La Mancha prorates by them)
  housingRegionalConfirmed: false, // confirms the formal requirements of the regional rent deduction
  housingLargeFamily: false, // holds a large-family title (familia numerosa)
  housingSingleParent: false, // single-parent family as defined by the community
  housingTwoMinorChildren: false, // two or more minor children (Galicia)
  housingSavingsBase: 0, // savings taxable base, used only in housing income tests
  housingFamilyUnitConfirmed: false, // the other family-unit bases were entered (0 if none)
  housingFamilyUnitOtherBase: 0, // sum of the taxable bases of the other family-unit members
  // Flexible compensation and pension plans, stored as annual amounts in euros.
  // `*Period` only controls whether the form shows them per year or per month.
  flexPeriod: 'annual', // 'annual' | 'monthly'
  flexMeal: 0,
  workingDays: 220,
  flexTransport: 0,
  flexHealth: 0,
  flexHealthPeople: 1,
  flexChildcare: 0,
  flexTraining: 0,
  pensionPeriod: 'annual', // 'annual' | 'monthly'
  pensionIndividual: 0,
  pensionEmployee: 0,
  pensionEmployer: 0,
};

// General regional scale that the withholding scale assumes for the regional
// half (art. 74 LIRPF supplementary scale). A region's real scale is applied
// as a difference from this one.
export const GENERAL_REGIONAL_SCALE = [
  { upTo: 12450, rate: 9.5 },
  { upTo: 20200, rate: 12 },
  { upTo: 35200, rate: 15 },
  { upTo: 60000, rate: 18.5 },
  { upTo: null, rate: 22.5 },
];

/** Adds two bracket scales into a single equivalent scale. */
export function combineScales(a, b, roundRates = true) {
  const limits = [...new Set([...a, ...b].map((br) => br.upTo).filter((x) => x !== null))].sort((x, y) => x - y);
  const rateAt = (scale, amount) => scale.find((br) => br.upTo === null || amount < br.upTo).rate;

  let from = 0;
  return [...limits, null].map((upTo) => {
    const probe = upTo === null ? from + 1 : (from + upTo) / 2;
    const rate = rateAt(a, probe) + rateAt(b, probe);
    const bracket = { upTo, rate: roundRates ? +rate.toFixed(2) : rate };
    from = upTo;
    return bracket;
  });
}

export const BRACKET_PRESETS = {
  general: { name: 'Escala vigente 2026', brackets: CURRENT_SCENARIO.incomeTax.brackets },
  flat20: { name: 'Tipo único 20 %', brackets: [{ upTo: null, rate: 20 }] },
};

export const clone = (value) => structuredClone(value);
