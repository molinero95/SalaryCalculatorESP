// Reviewed single-payer employee model. Fiscal scope is checked by the caller.
import { FORAL_TERRITORIES } from './data/foral.js';
import {
  BASQUE_FAMILY_WITHHOLDING,
  NAVARRE_FAMILY_WITHHOLDING,
  BASQUE_DISABILITY_WITHHOLDING,
  NAVARRE_DISABILITY_WITHHOLDING,
  BASQUE_FAMILY_CREDITS,
} from './data/foral-family.js';
import { applyScale } from './tax.js';
const round2 = (value) => Math.round(value * 100) / 100;
const noAllowance = () => ({ personal: 0, children: 0, dependents: 0, disability: 0, total: 0 });

export function foralEmploymentIncome(input, taxableGross, socialSecurity) {
  const netEarnings = Math.max(0, taxableGross - socialSecurity);
  let reduction = 0;
  if (input.region !== 'navarra') {
    reduction = netEarnings <= 14800 ? 8000 : netEarnings <= 23000 ? 8000 - 0.6098 * (netEarnings - 14800) : 3000;
  }
  if (input.region !== 'navarra' && input.disability >= 33)
    reduction *= input.disability >= 65 || input.foralReducedMobility ? 3.5 : 2;
  return { netEarnings, otherExpenses: 0, reduction: Math.min(netEarnings, reduction) };
}

export function foralWithholding(input, taxableGross, socialSecurity) {
  let rate;
  if (input.region === 'navarra') {
    rate =
      NAVARRE_FAMILY_WITHHOLDING.filter(([from]) => taxableGross > from).at(-1)?.[1][Math.min(10, input.children)] ?? 0;
  } else {
    rate = BASQUE_FAMILY_WITHHOLDING.find(([upTo]) => upTo === null || taxableGross <= upTo)[1][
      Math.min(6, input.children)
    ];
  }
  if (input.disability >= 33) {
    const table = input.region === 'navarra' ? NAVARRE_DISABILITY_WITHHOLDING : BASQUE_DISABILITY_WITHHOLDING;
    const severe = input.disability >= 65 || (input.region !== 'navarra' && input.foralReducedMobility);
    rate = Math.max(0, rate - table.find(([upTo]) => upTo === null || taxableGross <= upTo)[severe ? 2 : 1]);
  }
  return {
    ...foralEmploymentIncome(input, taxableGross, socialSecurity),
    largeFamilyReduction: 0,
    withholdingBase: taxableGross,
    allowance: noAllowance(),
    taxOnBase: (taxableGross * rate) / 100,
    taxOnAllowance: 0,
    freeMinimum: input.region === 'navarra' ? 17000 : 20000,
    amount: (taxableGross * rate) / 100,
    rate,
    withheld: round2((taxableGross * rate) / 100),
  };
}

export function foralAnnualTax(input, base) {
  let credit = 1615;
  if (input.region === 'navarra') {
    let workCredit =
      base <= 12500
        ? 1400
        : base <= 17500
          ? 1400 - 0.14 * (base - 12500)
          : base <= 35000
            ? 700
            : base <= 50000
              ? 700 - 0.02 * (base - 35000)
              : 400;
    const personalExtra =
      base <= 17500
        ? 1280
        : base <= 30000
          ? 1280 - 0.0904 * (base - 17500)
          : base <= 32000
            ? 150 - 0.075 * (base - 30000)
            : 0;
    workCredit *= input.disability >= 65 ? 2 : input.disability >= 33 ? 1.5 : 1;
    const disabilityCredit = input.disability >= 65 ? 2757 : input.disability >= 33 ? 766 : 0;
    credit = 1084 + personalExtra + workCredit + disabilityCredit;
  }
  credit += foralDescendantCredit(input, base);
  if (input.region !== 'navarra' && input.disability >= 33)
    credit += BASQUE_FAMILY_CREDITS[input.region].disability[input.disability >= 65 ? 1 : 0];
  const quota = applyScale(FORAL_TERRITORIES[input.region].brackets, base);
  return {
    allowance: noAllowance(),
    regionalAllowance: noAllowance(),
    stateTax: 0,
    regionalTax: quota,
    credit: Math.min(quota, credit),
    tax: round2(Math.max(0, quota - credit)),
  };
}

/** Individual annual credit: sharing affects the credit, never the withholding child column. */
export function foralDescendantCredit(input, income) {
  const count = input.children ?? 0;
  const share = input.childrenFullyCounted ? 1 : 0.5;
  const navarra = input.region === 'navarra';
  const rules = BASQUE_FAMILY_CREDITS[input.region];
  const amounts = navarra ? [483, 512, 732, 981, 1111, 1286] : rules.descendants;
  let credit = 0;
  for (let i = 0; i < count; i++) credit += amounts[Math.min(i, amounts.length - 1)];
  if (navarra) {
    credit += (input.childrenUnder3 ?? 0) * 644;
    const percentage = income <= 20000 ? 40 : income <= 30000 ? round2(40 - (50 * (income - 20000)) / 20000) : 0;
    return credit * share * (1 + percentage / 100);
  }
  if (input.region === 'alava' && input.foralAlavaRural) credit *= 1.15;
  credit += (input.childrenUnder6 ?? 0) * rules.under6 + (input.children6to15 ?? 0) * rules.age6to15;
  return credit * share;
}
