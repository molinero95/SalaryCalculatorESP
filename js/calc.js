// Payroll engine. Pure functions with no DOM dependencies.

const round2 = (x) => Math.round(x * 100) / 100;
const sum = (values) => values.reduce((a, b) => a + b, 0);

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

/** Annual social security contributions for one set of rates (employee or employer). */
function contributions(grossAnnual, socialSecurity, rates, contract) {
  const { minBase, maxBase, solidarityBand1Limit, solidarityBand2Limit } = socialSecurity;
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
  const healthCap =
    (input.disability >= 33 ? limits.healthDisabilityLimit : limits.healthLimit) +
    Math.max(0, input.flexHealthPeople - 1) * limits.healthLimit;

  const total = sum([input.flexMeal, input.flexTransport, input.flexHealth, input.flexChildcare, input.flexTraining]);
  const exempt = sum([
    Math.min(input.flexMeal, limits.mealDailyLimit * input.workingDays),
    Math.min(input.flexTransport, limits.transportLimit),
    Math.min(input.flexHealth, healthCap),
    input.flexChildcare,
    input.flexTraining,
  ]);

  return { total, exempt, overCap: total > (gross * limits.inKindCap) / 100 };
}

function employmentReduction(netEarnings, p) {
  if (netEarnings <= p.reductionThreshold1) return p.reductionMax;
  if (netEarnings <= p.reductionThreshold2) {
    return Math.max(0, p.reductionMax - p.reductionSlope1 * (netEarnings - p.reductionThreshold1));
  }
  if (netEarnings <= p.reductionThreshold3) {
    return Math.max(0, p.reductionValue2 - p.reductionSlope2 * (netEarnings - p.reductionThreshold2));
  }
  return 0;
}

function minWageCredit(grossEarnings, { minWageCredit: amount, minWageCreditFullUpTo: full, minWageCreditEndsAt: end }) {
  if (amount <= 0 || grossEarnings >= end) return 0;
  if (grossEarnings <= full) return amount;
  return amount * ((end - grossEarnings) / (end - full));
}

function personalAllowance(input, p) {
  let personal = p.personalAllowance;
  if (input.age > 65) personal += p.ageOver65Allowance;
  if (input.age > 75) personal += p.ageOver75Allowance;

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

/** Income below which no tax is withheld (art. 81 RIRPF). */
function withholdingFreeMinimum(input, p) {
  const children = Math.min(input.children, 2);
  // Situation 1 (single parent) only exists with children
  const situation = input.familySituation === 1 && children === 0 ? 3 : input.familySituation;
  return p[`withholdingFreeMin${situation}_${children}`];
}

/** Income tax withholding following the general procedure (arts. 82-86 RIRPF). */
function withholding(input, p, taxableGross, socialSecurity) {
  const netEarnings = Math.max(0, taxableGross - socialSecurity);

  let otherExpenses = p.generalExpenses;
  if (input.disability >= 65) otherExpenses += p.disability65Expenses;
  else if (input.disability >= 33) otherExpenses += p.disability33Expenses;

  const reduction = employmentReduction(netEarnings, p);
  const base = Math.max(0, netEarnings - otherExpenses - reduction);
  const allowance = personalAllowance(input, p);
  const taxOnBase = applyScale(p.brackets, base);
  const taxOnAllowance = applyScale(p.brackets, allowance.total);
  const freeMinimum = withholdingFreeMinimum(input, p);

  let amount = Math.max(0, taxOnBase - taxOnAllowance);
  amount = taxableGross <= freeMinimum ? 0 : Math.min(amount, ((taxableGross - freeMinimum) * p.withholdingCap) / 100);

  let rate = taxableGross > 0 ? round2((amount / taxableGross) * 100) : 0;
  if (input.contract === 'temporary' && taxableGross > freeMinimum) rate = Math.max(rate, p.temporaryMinRate);

  return {
    netEarnings,
    otherExpenses,
    reduction,
    withholdingBase: base,
    allowance,
    taxOnBase,
    taxOnAllowance,
    freeMinimum,
    amount,
    rate,
    withheld: (taxableGross * rate) / 100,
  };
}

export const grossAnnualOf = (input) => (input.period === 'perPayment' ? input.salary * input.payments : input.salary);

/**
 * Computes a full payslip for `input` under `scenario`.
 * `grossAnnual` can be overridden to evaluate other salary levels with the same profile.
 */
export function computePayroll(input, scenario, grossAnnual = grossAnnualOf(input)) {
  const gross = Math.max(0, grossAnnual);

  const employee = contributions(gross, scenario.socialSecurity, scenario.employee, input.contract);
  const employer = contributions(gross, scenario.socialSecurity, scenario.employer, input.contract);

  const flexible = flexibleCompensation(input, scenario.flexible, gross);
  const taxableGross = gross - flexible.exempt;
  const incomeTax = withholding(input, scenario.incomeTax, taxableGross, employee.total);
  const taxWithoutFlexible = flexible.exempt > 0 ? withholding(input, scenario.incomeTax, gross, employee.total).withheld : incomeTax.withheld;

  // The low-earner credit is only applied in the annual return, so it shows
  // up as an estimated refund (capped at what was withheld).
  const credit = minWageCredit(taxableGross, scenario.incomeTax);
  const refund = Math.min(credit, incomeTax.withheld);

  const netAnnual = gross - flexible.total - employee.total - incomeTax.withheld;
  const netAnnualAfterReturn = netAnnual + refund;

  // With 14 payments, social security and flexible compensation are spread over
  // the 12 regular months; the two extra payments only carry income tax.
  const grossPerPayment = gross / input.payments;
  const hasExtraPayments = input.payments === 14;
  const taxPerExtraPayment = hasExtraPayments ? (grossPerPayment * incomeTax.rate) / 100 : 0;
  const taxPerRegularPayment = (incomeTax.withheld - 2 * taxPerExtraPayment) / 12;

  return {
    grossAnnual: gross,
    taxableGross,
    employee,
    employer,
    employerCost: gross + employer.total,
    flexible: { ...flexible, taxSaved: taxWithoutFlexible - incomeTax.withheld },
    incomeTax: { ...incomeTax, minWageCredit: credit, refund },
    netAnnual,
    netAnnualAfterReturn,
    netMonthlyAverage: netAnnual / 12,
    payments: input.payments,
    netRegularPayment: grossPerPayment - (employee.total + flexible.total) / 12 - taxPerRegularPayment,
    netExtraPayment: hasExtraPayments ? grossPerPayment - taxPerExtraPayment : 0,
    effectiveRate: gross > 0 ? ((employee.total + incomeTax.withheld - refund) / gross) * 100 : 0,
    taxWedge:
      gross > 0 ? ((employer.total + employee.total + incomeTax.withheld - refund) / (gross + employer.total)) * 100 : 0,
  };
}
