// Pure income-tax rules. Withholding and annual assessment use distinct allowances.
import { GENERAL_REGIONAL_SCALE, combineScales } from './defaults.js';
import { REGIONAL_SCALES, REGIONAL_ALLOWANCES } from './data/regions.js';
const round2 = (x) => Math.round(x * 100) / 100;

/** Applies a progressive bracket scale to `base`. */
export function applyScale(brackets, base) {
  let tax = 0;
  let from = 0;
  for (const { upTo, rate } of brackets) {
    const ceiling = upTo ?? Infinity;
    if (base <= from) break;
    tax += (Math.min(base, ceiling) - from) * (rate / 100);
    from = ceiling;
  }
  return tax;
}

export function employmentReduction(netEarnings, p) {
  if (netEarnings <= p.reductionThreshold1) return p.reductionMax;
  if (netEarnings <= p.reductionThreshold2) {
    return Math.max(0, p.reductionMax - p.reductionSlope1 * (netEarnings - p.reductionThreshold1));
  }
  if (netEarnings < p.reductionThreshold3) {
    return Math.max(0, p.reductionValue2 - p.reductionSlope2 * (netEarnings - p.reductionThreshold2));
  }
  return 0;
}

function minWageCredit(
  grossEarnings,
  { minWageCredit: amount, minWageCreditFullUpTo: full, minWageCreditEndsAt: end },
) {
  if (amount <= 0 || grossEarnings >= end) return 0;
  if (grossEarnings <= full) return amount;
  return amount * ((end - grossEarnings) / (end - full));
}

export function personalAllowance(input, p, annual = false) {
  let personal = p.personalAllowance;
  if (annual ? input.age > 65 : input.age >= 65) personal += p.ageOver65Allowance;
  if (annual ? input.age > 75 : input.age >= 75) personal += p.ageOver75Allowance;

  const perChild = [p.child1Allowance, p.child2Allowance, p.child3Allowance, p.child4Allowance];
  let children = 0;
  for (let i = 0; i < input.children; i++) children += perChild[Math.min(i, perChild.length - 1)];
  children += Math.min(input.childrenUnder3, input.children) * p.childUnder3Allowance;
  // Without the "fully counted" flag the allowance is shared between both parents
  if (!input.childrenFullyCounted) children /= 2;

  const dependents =
    (input.dependents65 + input.dependents75) * p.dependent65Allowance + input.dependents75 * p.dependent75Allowance;

  let disability = 0;
  if (input.disability >= 65) disability = p.disability65Allowance + p.careAllowance;
  else if (input.disability >= 33) disability = p.disability33Allowance;

  return { personal, children, dependents, disability, total: personal + children + dependents + disability };
}

/**
 * Estimated tax due in the annual return. The scenario's brackets are the
 * combined state + general regional scale. Each annual quota uses its own
 * scale and minimum, independently of payroll withholding.
 */
export function annualTax(input, p, base, grossEarnings) {
  const allowance = personalAllowance(input, p, true);
  const regionalParameters = { ...p, ...REGIONAL_ALLOWANCES[input.region] };
  if (input.region === 'balearic' && input.age > 65) regionalParameters.personalAllowance = 6105;
  const regionalAllowance = personalAllowance(input, regionalParameters, true);
  const regionalScale = REGIONAL_SCALES[input.region]?.brackets ?? GENERAL_REGIONAL_SCALE;
  const stateScale = combineScales(
    p.brackets,
    GENERAL_REGIONAL_SCALE.map((b) => ({ ...b, rate: -b.rate })),
    false,
  );
  // Each quota is independently nonnegative; a regional minimum cannot offset state tax.
  const stateQuota = applyScale(stateScale, base) - applyScale(stateScale, Math.min(base, allowance.total));
  // An explicitly edited combined scale can be below the reference regional share.
  // Preserve that hypothetical total instead of silently raising its tax.
  const stateTax = stateScale.some((b) => b.rate < 0) ? stateQuota : Math.max(0, stateQuota);
  const regionalTax = Math.max(
    0,
    applyScale(regionalScale, base) - applyScale(regionalScale, Math.min(base, regionalAllowance.total)),
  );
  const credit = Math.min(Math.max(0, stateTax + regionalTax), minWageCredit(grossEarnings, p));
  return {
    allowance,
    regionalAllowance,
    stateTax,
    regionalTax,
    credit,
    tax: round2(Math.max(0, stateTax + regionalTax - credit)),
  };
}

/** Income below which no tax is withheld (art. 81 RIRPF). */
function withholdingFreeMinimum(input, p) {
  const children = Math.min(input.children, 2);
  // Situation 1 (single parent) only exists with children
  const situation = input.familySituation === 1 && children === 0 ? 3 : input.familySituation;
  return p[`withholdingFreeMin${situation}_${children}`];
}

/** Net employment earnings and deductions shared by both tax procedures. */
export function employmentIncome(input, p, taxableGross, socialSecurity) {
  const netEarnings = Math.max(0, taxableGross - socialSecurity);

  let otherExpenses = p.generalExpenses;
  if (input.disability >= 65) otherExpenses += p.disability65Expenses;
  else if (input.disability >= 33) otherExpenses += p.disability33Expenses;

  otherExpenses = Math.min(netEarnings, otherExpenses);
  const reduction = round2(employmentReduction(netEarnings, p));
  return { netEarnings, otherExpenses, reduction };
}

/** Income tax withholding following the general procedure (arts. 82-86 RIRPF). */
export function withholding(input, p, taxableGross, socialSecurity) {
  const { netEarnings, otherExpenses, reduction } = employmentIncome(input, p, taxableGross, socialSecurity);
  // Art. 83.3 RIRPF: only the withholding base gets this reduction.
  const largeFamilyReduction = input.children > 2 ? 600 : 0;
  const base = Math.max(0, netEarnings - otherExpenses - reduction - largeFamilyReduction);
  const allowance = personalAllowance(input, p);
  const scale = p.useSeparateWithholding ? p.withholdingBrackets : p.brackets;
  const taxOnBase = applyScale(scale, base);
  const taxOnAllowance = applyScale(scale, allowance.total);
  const freeMinimum = withholdingFreeMinimum(input, p);

  let amount = Math.max(0, taxOnBase - taxOnAllowance);
  if (taxableGross <= freeMinimum) amount = 0;
  else if (taxableGross <= 35200) amount = Math.min(amount, ((taxableGross - freeMinimum) * p.withholdingCap) / 100);

  let rate = taxableGross > 0 ? Math.floor((amount / taxableGross) * 10000) / 100 : 0;
  if (input.contract === 'temporary' && taxableGross > 0) rate = Math.max(rate, p.temporaryMinRate);

  return {
    netEarnings,
    otherExpenses,
    reduction,
    largeFamilyReduction,
    withholdingBase: base,
    allowance,
    taxOnBase,
    taxOnAllowance,
    freeMinimum,
    amount,
    rate,
    withheld: round2((taxableGross * rate) / 100),
  };
}
