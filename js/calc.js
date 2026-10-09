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

function minWageCredit(netEarnings, { minWageCredit: amount, minWageCreditFullUpTo: full, minWageCreditEndsAt: end }) {
  if (amount <= 0 || netEarnings >= end) return 0;
  if (netEarnings <= full) return amount;
  return amount * ((end - netEarnings) / (end - full));
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

export const grossAnnualOf = (input) => (input.period === 'perPayment' ? input.salary * input.payments : input.salary);

/**
 * Computes a full payslip for `input` under `scenario`.
 * `grossAnnual` can be overridden to evaluate other salary levels with the same profile.
 */
export function computePayroll(input, scenario, grossAnnual = grossAnnualOf(input)) {
  const gross = Math.max(0, grossAnnual);
  const p = scenario.incomeTax;

  const employee = contributions(gross, scenario.socialSecurity, scenario.employee, input.contract);
  const employer = contributions(gross, scenario.socialSecurity, scenario.employer, input.contract);

  // --- Income tax withholding rate (IRPF Regulation, general procedure) ---
  const netEarnings = Math.max(0, gross - employee.total);

  let otherExpenses = p.generalExpenses;
  if (input.disability >= 65) otherExpenses += p.disability65Expenses;
  else if (input.disability >= 33) otherExpenses += p.disability33Expenses;

  const reduction = employmentReduction(netEarnings, p);
  const withholdingBase = Math.max(0, netEarnings - otherExpenses - reduction);
  const allowance = personalAllowance(input, p);

  const taxOnBase = applyScale(p.brackets, withholdingBase);
  const taxOnAllowance = applyScale(p.brackets, allowance.total);
  const credit = minWageCredit(netEarnings, p);
  let amount = Math.max(0, taxOnBase - taxOnAllowance - credit);

  if (gross <= p.withholdingFreeMinimum) {
    amount = 0;
  } else {
    amount = Math.min(amount, ((gross - p.withholdingFreeMinimum) * p.withholdingCap) / 100);
  }

  let rate = gross > 0 ? round2((amount / gross) * 100) : 0;
  if (input.contract === 'temporary' && gross > p.withholdingFreeMinimum) rate = Math.max(rate, p.temporaryMinRate);
  const incomeTax = (gross * rate) / 100;

  // --- Take-home pay ---
  // With 14 payments, social security is spread over 12 months and the two
  // extra payments only carry income tax.
  const netAnnual = gross - employee.total - incomeTax;
  const grossPerPayment = gross / input.payments;
  const taxPerPayment = (grossPerPayment * rate) / 100;
  const hasExtraPayments = input.payments === 14;

  return {
    grossAnnual: gross,
    employee,
    employer,
    employerCost: gross + employer.total,
    incomeTax: {
      netEarnings,
      otherExpenses,
      reduction,
      withholdingBase,
      allowance,
      taxOnBase,
      taxOnAllowance,
      minWageCredit: credit,
      amount,
      rate,
      withheld: incomeTax,
    },
    netAnnual,
    netMonthlyAverage: netAnnual / 12,
    payments: input.payments,
    netRegularPayment: hasExtraPayments ? grossPerPayment - employee.total / 12 - taxPerPayment : netAnnual / 12,
    netExtraPayment: hasExtraPayments ? grossPerPayment - taxPerPayment : 0,
    effectiveRate: gross > 0 ? ((employee.total + incomeTax) / gross) * 100 : 0,
    taxWedge: gross > 0 ? ((employer.total + employee.total + incomeTax) / (gross + employer.total)) * 100 : 0,
  };
}
