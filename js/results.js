// Result cards, difference summary and payslip breakdown table.

import { t, helpTip } from './i18n/index.js';
import { formatEuros, formatSignedEuros, formatPercent, formatPoints, escapeHtml } from './format.js';

const EPSILON = 0.005;

const mainNet = (r) => (r.payments === 14 ? r.netRegularPayment : r.netMonthlyAverage);

/** Badge showing the change versus the reference. `higherIsBetter` drives its colour. */
function deltaBadge(value, reference, { format = formatSignedEuros, higherIsBetter = true } = {}) {
  if (reference === undefined || Math.abs(value - reference) < EPSILON) return '';
  const better = value > reference === higherIsBetter;
  return `<span class="delta ${better ? 'positive' : 'negative'}">${format(value - reference)}</span>`;
}

function resultCard(kind, name, r, reference, { showRefund, showInKind, showPension }) {
  const rateDelta = (value, ref) => deltaBadge(value, ref, { format: formatPoints, higherIsBetter: false });
  const metric = (label, value, delta = '') => `<div><dt>${label}</dt><dd>${value} ${delta}</dd></div>`;

  return `
    <article class="result result-${kind}">
      <header>
        <span class="chip chip-${kind}">${t(kind)}</span>
        <h3>${escapeHtml(name)}</h3>
      </header>
      <p class="headline">
        <span class="headline-label">${t(r.payments === 14 ? 'netPerPayment' : 'netMonthly')}</span>
        <strong>${formatEuros(mainNet(r))}</strong>
        ${reference ? deltaBadge(mainNet(r), mainNet(reference)) : ''}
      </p>
      <dl class="metrics">
        ${metric(t('netAnnual'), formatEuros(r.netAnnual), deltaBadge(r.netAnnual, reference?.netAnnual))}
        ${metric(t('rowNetAfterReturn'), formatEuros(r.netAnnualAfterReturn), deltaBadge(r.netAnnualAfterReturn, reference?.netAnnualAfterReturn))}
        ${r.payments === 14 ? metric(t('extraPayment'), formatEuros(r.netExtraPayment), deltaBadge(r.netExtraPayment, reference?.netExtraPayment)) : ''}
        ${showRefund ? metric(t('refund'), formatSignedEuros(r.incomeTax.refund), deltaBadge(r.incomeTax.refund, reference?.incomeTax.refund)) : ''}
        ${showInKind ? metric(t('inKind'), formatEuros(r.flexible.total)) : ''}
        ${showPension ? metric(t('pensions'), formatEuros(r.pension.total)) : ''}
        ${metric(t('withholding'), formatPercent(r.incomeTax.rate), rateDelta(r.incomeTax.rate, reference?.incomeTax.rate))}
        ${metric(t('effectiveRate'), formatPercent(r.effectiveRate), rateDelta(r.effectiveRate, reference?.effectiveRate))}
        ${metric(t('employerCost'), formatEuros(r.employerCost))}
      </dl>
      <p class="muted result-tax-scope">${t('payrollAnnualScope')}</p>
    </article>`;
}

/** Compact side-by-side comparison, shown instead of reading two stacked cards on mobile. */
function summaryStrip(names, current, simulation) {
  const row = (label, a, b) => {
    const diff = b - a;
    const tone = Math.abs(diff) < EPSILON ? '' : diff > 0 ? 'positive' : 'negative';
    return `<tr><th scope="row">${label}</th><td>${formatEuros(a)}</td><td>${formatEuros(b)}</td><td class="${tone}">${Math.abs(diff) < EPSILON ? '—' : formatSignedEuros(diff)}</td></tr>`;
  };
  return `
    <table class="summary-strip">
      <thead><tr><th></th><th scope="col">${escapeHtml(names.current)}</th><th scope="col">${escapeHtml(names.simulation)}</th><th scope="col">${t('difference')}</th></tr></thead>
      <tbody>
        ${row(t(current.payments === 14 ? 'netPerPayment' : 'netMonthly'), mainNet(current), mainNet(simulation))}
        ${row(t('rowNetAfterReturn'), current.netAnnualAfterReturn, simulation.netAnnualAfterReturn)}
      </tbody>
    </table>`;
}

export function renderResults({ cards, summary, sticky }, { names, current, simulation }) {
  const options = {
    showRefund: Math.abs(current.incomeTax.refund) >= 0.5 || Math.abs(simulation.incomeTax.refund) >= 0.5,
    showInKind: simulation.flexible.total > 0,
    showPension: simulation.pension.total > 0,
  };
  cards.innerHTML =
    summaryStrip(names, current, simulation) +
    resultCard('current', names.current, current, undefined, options) +
    resultCard('simulation', names.simulation, simulation, current, options);

  const diff = simulation.netAnnualAfterReturn - current.netAnnualAfterReturn;
  const unchanged = Math.abs(diff) < 0.5;
  const tone = unchanged ? 'neutral' : diff > 0 ? 'positive' : 'negative';

  summary.className = `difference ${tone}`;
  summary.textContent = unchanged
    ? t('diffNone')
    : t(diff > 0 ? 'diffMore' : 'diffLess', {
        yearly: formatEuros(Math.abs(diff)),
        monthly: formatEuros(Math.abs(diff) / 12),
      });

  sticky.className = tone;
  sticky.textContent = `${formatSignedEuros(diff)} / ${t('annual').toLowerCase()}`;
}

/**
 * Breakdown sections. Rows marked `optional` are hidden when they are zero in
 * both scenarios, rows with `showIf` only render when it returns true, and a
 * section with no visible rows is hidden entirely.
 */
const BREAKDOWN = [
  {
    title: 'sectionSocialSecurity',
    rows: [
      { label: 'rowContributionBase', help: 'helpContributionBase', value: (r) => r.employee.monthlyBase },
      { label: 'rowCommonContingencies', value: (r) => r.employee.items.commonContingencies },
      { label: 'rowUnemployment', value: (r) => r.employee.items.unemployment },
      { label: 'rowTraining', value: (r) => r.employee.items.training },
      { label: 'rowMei', help: 'helpMei', value: (r) => r.employee.items.mei },
      { label: 'rowSolidarity', help: 'helpSolidarity', value: (r) => r.employee.items.solidarity, optional: true },
      { label: 'rowSocialSecurityTotal', value: (r) => r.employee.total, total: true },
    ],
  },
  {
    title: 'sectionFlexible',
    rows: [
      { label: 'rowFlexTotal', value: (r) => r.flexible.total, optional: true },
      { label: 'rowFlexExempt', value: (r) => r.flexible.exempt, optional: true },
      { label: 'rowFlexSavings', value: (r) => r.flexible.taxSaved, optional: true, total: true },
    ],
  },
  {
    title: 'sectionPension',
    rows: [
      { label: 'rowPensionTotal', value: (r) => r.pension.total, optional: true },
      { label: 'rowPensionReduction', value: (r) => r.pension.deductible, optional: true },
      { label: 'rowPensionSavings', value: (r) => r.pension.taxSaved, optional: true, total: true },
    ],
  },
  {
    title: 'sectionIncomeTax',
    rows: [
      { label: 'rowTaxableGross', value: (r) => r.taxableGross },
      { label: 'rowNetEarnings', value: (r) => r.incomeTax.netEarnings },
      { label: 'rowOtherExpenses', value: (r) => -r.incomeTax.otherExpenses },
      {
        label: 'rowEmploymentReduction',
        help: 'helpEmploymentReduction',
        value: (r) => -r.incomeTax.reduction,
        optional: true,
      },
      { label: 'rowLargeFamilyReduction', value: (r) => -r.incomeTax.largeFamilyReduction, optional: true },
      { label: 'rowWithholdingBase', value: (r) => r.incomeTax.withholdingBase },
      { label: 'rowPersonalAllowance', help: 'helpPersonalAllowance', value: (r) => r.incomeTax.allowance.total },
      { label: 'rowWithholdingAmount', value: (r) => r.incomeTax.amount },
      {
        label: 'rowWithholdingRate',
        help: 'helpWithholdingRate',
        value: (r) => r.incomeTax.rate,
        format: formatPercent,
        formatDiff: formatPoints,
      },
      { label: 'rowIncomeTax', value: (r) => r.incomeTax.withheld, total: true },
      { label: 'rowMinWageCredit', value: (r) => r.incomeTax.minWageCredit, optional: true },
      { label: 'rowAnnualBase', value: (r) => r.incomeTax.annualBase },
      { label: 'rowStateTax', value: (r) => r.incomeTax.stateTax },
      { label: 'rowRegionalTax', value: (r) => r.incomeTax.regionalTax },
      { label: 'rowAnnualTax', help: 'helpAnnualTax', value: (r) => r.incomeTax.annualTax, total: true },
    ],
  },
  {
    title: 'sectionResult',
    rows: [
      { label: 'rowGross', value: (r) => r.grossAnnual },
      { label: 'rowSocialSecurityTotal', value: (r) => -r.employee.total },
      { label: 'rowIncomeTax', value: (r) => -r.incomeTax.withheld },
      { label: 'rowFlexTotal', value: (r) => -r.flexible.total, optional: true },
      { label: 'rowPensionEmployee', value: (r) => -r.pension.employee, optional: true },
      { label: 'rowNetCash', value: (r) => r.netAnnual, total: true, highlight: true },
      {
        label: 'refund',
        value: (r) => r.incomeTax.refund,
        formatDiff: formatSignedEuros,
        format: formatSignedEuros,
        optional: true,
      },
      { label: 'rowPensionIndividual', value: (r) => -r.pension.individual, optional: true },
      {
        label: 'rowNetAfterReturn',
        value: (r) => r.netAnnualAfterReturn,
        total: true,
        highlight: true,
        showIf: (a, b) =>
          Math.abs(a.netAnnualAfterReturn - a.netAnnual) > 0 || Math.abs(b.netAnnualAfterReturn - b.netAnnual) > 0,
      },
    ],
  },
  {
    title: 'sectionEmployer',
    rows: [
      { label: 'rowEmployerContributions', value: (r) => r.employer.total },
      { label: 'rowEmployerCost', value: (r) => r.employerCost, total: true },
      {
        label: 'rowTaxWedge',
        help: 'helpTaxWedge',
        value: (r) => r.taxWedge,
        format: formatPercent,
        formatDiff: formatPoints,
      },
    ],
  },
];

function breakdownRow(row, a, b) {
  const { format = formatEuros, formatDiff = formatSignedEuros } = row;
  const unchanged = Math.abs(b - a) < EPSILON;
  const classes = [row.total && 'total', row.highlight && 'highlight'].filter(Boolean).join(' ');

  return `
    <tr class="${classes}">
      <th scope="row">${t(row.label)}${row.help ? helpTip(row.help) : ''}</th>
      <td>${format(a)}</td>
      <td>${format(b)}</td>
      <td class="${unchanged ? 'muted' : ''}">${unchanged ? '—' : formatDiff(b - a)}</td>
    </tr>`;
}

function breakdownSection({ title, rows }, current, simulation) {
  const visible = rows
    .filter((row) => !row.showIf || row.showIf(current, simulation))
    .map((row) => ({ row, a: row.value(current), b: row.value(simulation) }))
    .filter(({ row, a, b }) => !row.optional || Math.abs(a) >= EPSILON || Math.abs(b) >= EPSILON);
  if (!visible.length) return '';

  return (
    `<tr class="section"><th colspan="4" scope="colgroup">${t(title)}</th></tr>` +
    visible.map(({ row, a, b }) => breakdownRow(row, a, b)).join('')
  );
}

export function renderBreakdown(container, { names, current, simulation }) {
  container.innerHTML = `
    <table class="table breakdown-table">
      <thead>
        <tr>
          <th scope="col">${t('item')}</th>
          <th scope="col">${escapeHtml(names.current)}</th>
          <th scope="col">${escapeHtml(names.simulation)}</th>
          <th scope="col">${t('difference')}</th>
        </tr>
      </thead>
      <tbody>${BREAKDOWN.map((section) => breakdownSection(section, current, simulation)).join('')}</tbody>
    </table>`;
}
