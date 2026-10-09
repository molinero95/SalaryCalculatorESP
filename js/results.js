// Result cards, difference summary and payslip breakdown table.

import { t } from './i18n/index.js';
import { formatEuros, formatSignedEuros, formatPercent, formatPoints, escapeHtml } from './format.js';

const EPSILON = 0.005;

const mainNet = (r) => (r.payments === 14 ? r.netRegularPayment : r.netMonthlyAverage);

/** Badge showing the change versus the reference. `higherIsBetter` drives its colour. */
function deltaBadge(value, reference, { format = formatSignedEuros, higherIsBetter = true } = {}) {
  if (reference === undefined || Math.abs(value - reference) < EPSILON) return '';
  const better = value > reference === higherIsBetter;
  return `<span class="delta ${better ? 'positive' : 'negative'}">${format(value - reference)}</span>`;
}

function resultCard(kind, name, r, reference) {
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
        ${r.payments === 14 ? metric(t('extraPayment'), formatEuros(r.netExtraPayment), deltaBadge(r.netExtraPayment, reference?.netExtraPayment)) : ''}
        ${metric(t('withholding'), formatPercent(r.incomeTax.rate), rateDelta(r.incomeTax.rate, reference?.incomeTax.rate))}
        ${metric(t('effectiveRate'), formatPercent(r.effectiveRate), rateDelta(r.effectiveRate, reference?.effectiveRate))}
        ${metric(t('employerCost'), formatEuros(r.employerCost))}
      </dl>
    </article>`;
}

export function renderResults({ cards, summary }, { names, current, simulation }) {
  cards.innerHTML =
    resultCard('current', names.current, current) + resultCard('simulation', names.simulation, simulation, current);

  const diff = simulation.netAnnual - current.netAnnual;
  const unchanged = Math.abs(diff) < 0.5;
  summary.className = `difference ${unchanged ? 'neutral' : diff > 0 ? 'positive' : 'negative'}`;
  summary.textContent = unchanged
    ? t('diffNone')
    : t(diff > 0 ? 'diffMore' : 'diffLess', {
        yearly: formatEuros(Math.abs(diff)),
        monthly: formatEuros(Math.abs(diff) / 12),
      });
}

const BREAKDOWN_ROWS = [
  { section: 'sectionSocialSecurity' },
  { label: 'rowContributionBase', value: (r) => r.employee.monthlyBase },
  { label: 'rowCommonContingencies', value: (r) => r.employee.items.commonContingencies },
  { label: 'rowUnemployment', value: (r) => r.employee.items.unemployment },
  { label: 'rowTraining', value: (r) => r.employee.items.training },
  { label: 'rowMei', value: (r) => r.employee.items.mei },
  { label: 'rowSolidarity', value: (r) => r.employee.items.solidarity },
  { label: 'rowSocialSecurityTotal', value: (r) => r.employee.total, total: true },

  { section: 'sectionIncomeTax' },
  { label: 'rowNetEarnings', value: (r) => r.incomeTax.netEarnings },
  { label: 'rowOtherExpenses', value: (r) => -r.incomeTax.otherExpenses },
  { label: 'rowEmploymentReduction', value: (r) => -r.incomeTax.reduction },
  { label: 'rowWithholdingBase', value: (r) => r.incomeTax.withholdingBase },
  { label: 'rowPersonalAllowance', value: (r) => r.incomeTax.allowance.total },
  { label: 'rowMinWageCredit', value: (r) => r.incomeTax.minWageCredit },
  { label: 'rowWithholdingAmount', value: (r) => r.incomeTax.amount },
  { label: 'rowWithholdingRate', value: (r) => r.incomeTax.rate, format: formatPercent, formatDiff: formatPoints },
  { label: 'rowIncomeTax', value: (r) => r.incomeTax.withheld, total: true },

  { section: 'sectionResult' },
  { label: 'rowGross', value: (r) => r.grossAnnual },
  { label: 'rowSocialSecurityTotal', value: (r) => -r.employee.total },
  { label: 'rowIncomeTax', value: (r) => -r.incomeTax.withheld },
  { label: 'rowNet', value: (r) => r.netAnnual, total: true, highlight: true },

  { section: 'sectionEmployer' },
  { label: 'rowEmployerContributions', value: (r) => r.employer.total },
  { label: 'rowEmployerCost', value: (r) => r.employerCost, total: true },
  { label: 'rowTaxWedge', value: (r) => r.taxWedge, format: formatPercent, formatDiff: formatPoints },
];

function breakdownRow(row, current, simulation) {
  if (row.section) return `<tr class="section"><th colspan="4" scope="colgroup">${t(row.section)}</th></tr>`;

  const { format = formatEuros, formatDiff = formatSignedEuros } = row;
  const a = row.value(current);
  const b = row.value(simulation);
  const unchanged = Math.abs(b - a) < EPSILON;
  const classes = [row.total && 'total', row.highlight && 'highlight'].filter(Boolean).join(' ');

  return `
    <tr class="${classes}">
      <th scope="row">${t(row.label)}</th>
      <td>${format(a)}</td>
      <td>${format(b)}</td>
      <td class="${unchanged ? 'muted' : ''}">${unchanged ? '—' : formatDiff(b - a)}</td>
    </tr>`;
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
      <tbody>${BREAKDOWN_ROWS.map((row) => breakdownRow(row, current, simulation)).join('')}</tbody>
    </table>`;
}
