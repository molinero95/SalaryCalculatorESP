// Positive, current-year individual income. Loss offsets and prior-year balances
// require separate integration rules and are intentionally not inferred here.
import { applyScale } from '../tax.js';
const BASQUE_SAVINGS = [
  { upTo: 7500, rate: 19 },
  { upTo: 15000, rate: 20 },
  { upTo: 30000, rate: 22 },
  { upTo: 50000, rate: 24 },
  { upTo: 90000, rate: 25.5 },
  { upTo: 120000, rate: 26 },
  { upTo: 240000, rate: 26.5 },
  { upTo: 300000, rate: 27 },
  { upTo: null, rate: 28 },
];
const NAVARRE_SAVINGS = [
  { upTo: 6000, rate: 20 },
  { upTo: 10000, rate: 22 },
  { upTo: 15000, rate: 24 },
  { upTo: 200000, rate: 26 },
  { upTo: 300000, rate: 27 },
  { upTo: null, rate: 28 },
];
export const FORAL_ANNUAL_AMOUNTS = [
  'foralExemptIncome',
  'foralRentalGross',
  'foralRentalExpenses',
  'foralRentalInsurance',
  'foralActivityIncome',
  'foralSavingsIncome',
  'foralOtherWithholding',
  'foralRentPaid',
];
export function foralAdditionalIncome(input) {
  const navarra = input.region === 'navarra';
  const gross = input.foralRentalGross ?? 0;
  const expenses = input.foralRentalExpenses ?? 0;
  // One ordinary permanent-housing lease, not a rental business. Basque
  // expenses are financing costs and capped nonpayment insurance only;
  // Navarre expenses are the legally deductible property expenses.
  const rental = navarra
    ? Math.max(0, gross - expenses) * (input.foralRentalPublic ? 0.3 : 1)
    : Math.max(
        0,
        gross * (input.foralRentalPublic ? 0.3 : 0.7) -
          expenses -
          (input.foralRentalPublic ? 0 : Math.min(input.foralRentalInsurance ?? 0, 300)),
      );
  const activity = input.foralActivityIncome ?? 0;
  const savings = (input.foralSavingsIncome ?? 0) + (navarra ? 0 : rental);
  const incomeForCredits =
    activity +
    (navarra ? Math.max(0, gross - expenses) + (input.foralExemptIncome ?? 0) : rental) +
    (input.foralSavingsIncome ?? 0);
  return {
    rental,
    activity,
    incomeForCredits,
    general: activity + (navarra ? rental : 0),
    savings,
    total: activity + rental + (input.foralSavingsIncome ?? 0),
  };
}
export function foralSavingsTax(region, base) {
  return applyScale(region === 'navarra' ? NAVARRE_SAVINGS : BASQUE_SAVINGS, base);
}
export function foralHousingCredit(input, generalBase, savingsBase, income) {
  const paid = input.foralRentPaid ?? 0;
  if (input.region === 'navarra') {
    if (income > 30000 || paid <= income * 0.1) return 0;
    const enhanced = input.age < 30 || input.foralRentEnhanced;
    return Math.min(paid * (enhanced ? 0.2 : 0.15), enhanced ? 1600 : 1500);
  }
  if (generalBase > 68000 || savingsBase > 68000) return 0;
  const enhanced = input.age < 36 || input.disability >= 65 || input.foralRentEnhanced;
  return Math.min(paid * (enhanced ? 0.35 : 0.2), enhanced ? 2800 : 1600);
}
