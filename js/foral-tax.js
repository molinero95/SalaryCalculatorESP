// Reviewed single-payer employee model. Fiscal scope is checked by the caller.
import { FORAL_TERRITORIES, BASQUE_WITHHOLDING, NAVARRE_WITHHOLDING } from './data/foral.js';
import { applyScale } from './tax.js';
const round2 = (value) => Math.round(value * 100) / 100;
const noAllowance = () => ({ personal: 0, children: 0, dependents: 0, disability: 0, total: 0 });

export function foralEmploymentIncome(input, taxableGross, socialSecurity) {
  const netEarnings = Math.max(0, taxableGross - socialSecurity);
  let reduction = 0;
  if (input.region !== 'navarra') {
    reduction = netEarnings <= 14800 ? 8000 : netEarnings <= 23000 ? 8000 - 0.6098 * (netEarnings - 14800) : 3000;
  }
  return { netEarnings, otherExpenses: 0, reduction: Math.min(netEarnings, reduction) };
}

export function foralWithholding(input, taxableGross, socialSecurity) {
  let rate;
  if (input.region === 'navarra') {
    rate = NAVARRE_WITHHOLDING.filter(([from]) => taxableGross > from).at(-1)?.[1] ?? 0;
  } else {
    rate = BASQUE_WITHHOLDING.find(([upTo]) => upTo === null || taxableGross <= upTo)[1];
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
    const workCredit =
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
    credit = 1084 + personalExtra + workCredit;
  }
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
