// Payroll engine. Pure functions with no DOM dependencies.

import { foralAdditionalIncome } from './domain/foral-assessment.js';
import { pensionPlan } from './domain/pension.js';
import { GENERAL_REGIONAL_SCALE, combineScales } from './defaults.js';
import { applyScale, withholding, annualTax, employmentIncome } from './tax.js';
import { isForal, unsupportedFiscalProfile, unsupportedFiscalScenario } from './domain/fiscal-profile.js';
import { foralEmploymentIncome, foralWithholding, foralAnnualTax } from './foral-tax.js';
export { applyScale } from './tax.js';

const round2 = (x) => Math.round(x * 100) / 100;
const sum = (values) => values.reduce((a, b) => a + b, 0);

/**
 * Annual social security contributions for one set of rates (employee or employer).
 * Part-time workers have the minimum base reduced in proportion to their hours.
 */
function contributions(grossAnnual, socialSecurity, rates, { contract, partTime }) {
  const { maxBase, solidarityBand1Limit, solidarityBand2Limit } = socialSecurity;
  const minBase = (socialSecurity.minBase * partTime) / 100;
  const monthly = grossAnnual / 12;
  const base = Math.min(Math.max(monthly, minBase), maxBase);
  const unemployment = contract === 'temporary' ? rates.unemploymentTemporary : rates.unemploymentPermanent;

  const monthlyItems = {
    commonContingencies: (base * rates.commonContingencies) / 100,
    unemployment: (base * unemployment) / 100,
    training: (base * rates.training) / 100,
    mei: (base * rates.mei) / 100,
    fogasa: (base * (rates.fogasa ?? 0)) / 100,
    workAccidents: (base * (rates.workAccidents ?? 0)) / 100,
    // Solidarity contribution on earnings above the maximum base
    solidarity: applyScale(
      [
        { upTo: (maxBase * solidarityBand1Limit) / 100, rate: rates.solidarity1 },
        { upTo: (maxBase * solidarityBand2Limit) / 100, rate: rates.solidarity2 },
        { upTo: null, rate: rates.solidarity3 },
      ],
      Math.max(0, monthly - maxBase),
    ),
  };

  const items = Object.fromEntries(Object.entries(monthlyItems).map(([key, value]) => [key, value * 12]));
  return { monthlyBase: base, items, total: sum(Object.values(items)) };
}

/**
 * Flexible compensation: part of the gross salary paid in kind. Exempt amounts
 * don't pay income tax, but everything still pays social security.
 */
function flexibleCompensation(input, limits, gross) {
  if (['bizkaia', 'gipuzkoa', 'alava', 'navarra'].includes(input.region))
    limits = { mealDailyLimit: 11, transportLimit: 1500, healthLimit: 500, healthDisabilityLimit: 1500, inKindCap: 30 };
  const healthCap =
    (input.disability >= 33 ? limits.healthDisabilityLimit : limits.healthLimit) +
    Math.max(0, input.flexHealthPeople - 1) * limits.healthLimit;

  const total = sum([input.flexMeal, input.flexTransport, input.flexHealth, input.flexChildcare, input.flexTraining]);
  const exempt = sum([
    Math.min(input.flexMeal, limits.mealDailyLimit * input.workingDays),
    Math.min(input.flexTransport, limits.transportLimit),
    ['bizkaia', 'gipuzkoa', 'alava'].includes(input.region) ? 0 : Math.min(input.flexHealth, healthCap),
    input.flexChildcare,
    input.flexTraining,
  ]);

  return { total, exempt, overCap: total > (gross * limits.inKindCap) / 100 };
}

export const grossAnnualOf = (input) => (input.period === 'perPayment' ? input.salary * input.payments : input.salary);

/**
 * Computes a full payslip for `input` under `scenario`.
 * `grossAnnual` can be overridden to evaluate other salary levels with the same profile.
 */
export function computePayroll(input, scenario, grossAnnual = grossAnnualOf(input)) {
  if (unsupportedFiscalProfile(input)) throw new RangeError('Unsupported foral fiscal profile');
  if (unsupportedFiscalScenario(input, scenario)) throw new RangeError('Unsupported foral fiscal scenario');
  const foral = isForal(input.region);
  const calculateWithholding = foral ? (i, p, gross, ss) => foralWithholding(i, gross, ss) : withholding;
  const calculateEarnings = foral ? (i, p, gross, ss) => foralEmploymentIncome(i, gross, ss) : employmentIncome;
  const calculateAnnual = foral ? (i, p, base, gross, context) => foralAnnualTax(i, base, context) : annualTax;
  // Reduce only the state share; preserve the general regional share and its floor.
  const reduction = Math.max(0, scenario.incomeTax.childRateReduction ?? 0) * Math.max(0, input.children);
  if (!foral && reduction > 0) {
    const brackets = combineScales(
      scenario.incomeTax.brackets,
      GENERAL_REGIONAL_SCALE.map((b) => ({ ...b, rate: -b.rate })),
    );
    const reduced = brackets.map((b) => ({ ...b, rate: Math.max(0, b.rate - reduction) }));
    scenario = {
      ...scenario,
      incomeTax: { ...scenario.incomeTax, brackets: combineScales(reduced, GENERAL_REGIONAL_SCALE) },
    };
  }
  const gross = round2(Math.max(0, grossAnnual));

  // Employer pension contributions are part of the contribution base
  const contributionBase = gross + input.pensionEmployer;
  const employee = contributions(contributionBase, scenario.socialSecurity, scenario.employee, input);
  const employer = contributions(contributionBase, scenario.socialSecurity, scenario.employer, input);

  const flexible = flexibleCompensation(input, scenario.flexible, gross);
  const taxableGross = gross - flexible.exempt;
  const incomeTax = calculateWithholding(input, scenario.incomeTax, taxableGross, employee.total);
  const taxWithoutFlexible =
    flexible.exempt > 0
      ? calculateWithholding(input, scenario.incomeTax, gross, employee.total).withheld
      : incomeTax.withheld;

  // --- Annual return ---
  // Employer pension contributions are imputed as income and reduced again, so
  // only the deductible amount beyond them lowers the base.
  const additional = foral
    ? foralAdditionalIncome(input)
    : { general: 0, savings: 0, total: 0, activity: 0, incomeForCredits: 0 };
  const annualGross = taxableGross + input.pensionEmployer;
  const annualEarnings = calculateEarnings(input, scenario.incomeTax, annualGross, employee.total);
  const pension = pensionPlan(
    input,
    scenario.pension,
    annualGross,
    Math.max(
      0,
      annualEarnings.netEarnings +
        additional.activity -
        annualEarnings.otherExpenses -
        (foral && input.region !== 'navarra' ? annualEarnings.reduction : 0),
    ),
  );
  const annualEmploymentBase = Math.max(0, incomeTax.netEarnings - incomeTax.otherExpenses - incomeTax.reduction);
  const annualBase = Math.max(
    0,
    annualEarnings.netEarnings +
      additional.general -
      annualEarnings.otherExpenses -
      annualEarnings.reduction -
      pension.deductible,
  );
  const annual = calculateAnnual(input, scenario.incomeTax, annualBase, annualGross, {
    netEmploymentIncome:
      input.region === 'navarra'
        ? Math.max(0, gross + input.pensionEmployer - employee.total)
        : annualEarnings.netEarnings,
    taxableIncome:
      (input.region === 'navarra'
        ? Math.max(0, gross + input.pensionEmployer - employee.total)
        : annualEarnings.netEarnings) + additional.incomeForCredits,
    baseBeforePension: annualEarnings.netEarnings + additional.general + additional.savings - annualEarnings.reduction,
    savingsBase: additional.savings,
  });
  const pensionTaxSaved =
    calculateAnnual(input, scenario.incomeTax, annualEmploymentBase + additional.general, taxableGross, {
      netEmploymentIncome: input.region === 'navarra' ? Math.max(0, gross - employee.total) : incomeTax.netEarnings,
      taxableIncome:
        (input.region === 'navarra' ? Math.max(0, gross - employee.total) : incomeTax.netEarnings) +
        additional.incomeForCredits,
      baseBeforePension: annualEmploymentBase + additional.general + additional.savings,
      savingsBase: additional.savings,
    }).tax - annual.tax;

  // Positive: refund. Negative: to pay, unless the employee doesn't have to file.
  let refund = incomeTax.withheld + (foral ? (input.foralOtherWithholding ?? 0) : 0) - annual.tax;
  const exemptFromFiling = foral
    ? input.region === 'navarra'
      ? taxableGross < 17000
      : taxableGross <= 20000
    : taxableGross <= scenario.incomeTax.filingThreshold;
  if (refund < 0 && exemptFromFiling && (!foral || ((input.foralRentalGross ?? 0) === 0 && additional.total === 0)))
    refund = 0;

  const mixedIncome =
    foral &&
    ((input.foralRentalGross ?? 0) > 0 ||
      additional.total > 0 ||
      (input.foralExemptIncome ?? 0) > 0 ||
      (input.foralOtherWithholding ?? 0) > 0);
  const netAnnual = gross - flexible.total - employee.total - incomeTax.withheld - pension.employee;
  const netAnnualAfterReturn = netAnnual + refund - pension.individual;

  // With 14 payments, social security, flexible compensation and pension
  // contributions are spread over the 12 regular months; the two extra
  // payments only carry income tax.
  const grossPerPayment = gross / input.payments;
  const hasExtraPayments = input.payments === 14;
  const taxPerExtraPayment = hasExtraPayments ? (grossPerPayment * incomeTax.rate) / 100 : 0;
  const taxPerRegularPayment = (incomeTax.withheld - 2 * taxPerExtraPayment) / 12;

  return {
    grossAnnual: gross,
    taxableGross,
    employee,
    employer,
    employerCost: gross + employer.total + pension.employer,
    flexible: { ...flexible, taxSaved: taxWithoutFlexible - incomeTax.withheld },
    pension: { ...pension, taxSaved: pensionTaxSaved },
    incomeTax: {
      ...incomeTax,
      foral,
      annualAllowance: annual.allowance,
      regionalAllowance: annual.regionalAllowance,
      stateTax: annual.stateTax,
      regionalTax: annual.regionalTax,
      annualBase,
      savingsBase: additional.savings,
      savingsTax: annual.savingsTax ?? 0,
      housingCredit: annual.housingCredit ?? 0,
      minWageCredit: foral ? 0 : annual.credit,
      foralCredit: foral ? annual.credit : 0,
      annualTax: annual.tax,
      refund,
    },
    netAnnual,
    netAnnualAfterReturn,
    netMonthlyAverage: netAnnual / 12,
    payments: input.payments,
    netRegularPayment:
      grossPerPayment - (employee.total + flexible.total + pension.employee) / 12 - taxPerRegularPayment,
    netExtraPayment: hasExtraPayments ? grossPerPayment - taxPerExtraPayment : 0,
    effectiveRate: mixedIncome ? null : gross > 0 ? ((employee.total + incomeTax.withheld - refund) / gross) * 100 : 0,
    taxWedge: mixedIncome
      ? null
      : gross > 0
        ? ((employer.total + employee.total + incomeTax.withheld - refund) / (gross + employer.total)) * 100
        : 0,
  };
}
