// Ordinary active employee plans; separate foral limits from common-regime scenario settings.
/**
 * Largest employee contribution to an employment plan that reduces the tax base,
 * based on the employer contribution (art. 52.1.b LIRPF).
 */
function employeeContributionCap(employer, grossEarnings, highIncomeThreshold) {
  if (grossEarnings > highIncomeThreshold || employer > 1500) return employer;
  if (employer <= 500) return employer * 2.5;
  return 1250 + 0.25 * (employer - 500);
}

/** Pension contributions and how much of them reduces the tax base. */
export function pensionPlan(input, limits, grossEarnings, netEarnings) {
  const { pensionIndividual: individual, pensionEmployee: employee, pensionEmployer: employer } = input;
  if (input.region === 'bizkaia' || input.region === 'gipuzkoa' || input.region === 'alava') {
    const employment = Math.min(employee + employer, 8000);
    const deductible = Math.min(netEarnings, 10000, employment + Math.min(individual, 5000));
    return { individual, employee, employer, total: individual + employee + employer, deductible };
  }
  if (input.region === 'navarra')
    limits = { individualLimit: 1500, employmentLimit: 8500, netIncomeShareLimit: 30, highIncomeThreshold: 60000 };
  const employeeCap = employeeContributionCap(employer, grossEarnings, limits.highIncomeThreshold);
  const employment = Math.min(employer + Math.min(employee, employeeCap), limits.employmentLimit);
  const eligibleTotal = Math.min(individual, limits.individualLimit) + employee + employer;
  const deductible = Math.min(
    Math.min(eligibleTotal, limits.individualLimit + employment),
    (netEarnings * (input.region === 'navarra' && input.age > 50 ? 50 : limits.netIncomeShareLimit)) / 100,
  );
  return { individual, employee, employer, total: individual + employee + employer, deductible };
}
