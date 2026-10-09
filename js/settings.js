// Settings form for one scenario: income tax brackets and every other parameter.

import { BRACKET_PRESETS, clone } from './defaults.js';
import { t } from './i18n/index.js';
import { formatNumber, escapeHtml } from './format.js';

const EUR = '€';
const PCT = '%';
const NEW_BRACKET_WIDTH = 20000;

/** Field groups: each field is [section, key, unit]. */
const GROUPS = [
  {
    title: 'groupAllowances',
    fields: [
      ['incomeTax', 'personalAllowance', EUR],
      ['incomeTax', 'ageOver65Allowance', EUR],
      ['incomeTax', 'ageOver75Allowance', EUR],
      ['incomeTax', 'child1Allowance', EUR],
      ['incomeTax', 'child2Allowance', EUR],
      ['incomeTax', 'child3Allowance', EUR],
      ['incomeTax', 'child4Allowance', EUR],
      ['incomeTax', 'childUnder3Allowance', EUR],
      ['incomeTax', 'dependent65Allowance', EUR],
      ['incomeTax', 'dependent75Allowance', EUR],
      ['incomeTax', 'disability33Allowance', EUR],
      ['incomeTax', 'disability65Allowance', EUR],
      ['incomeTax', 'careAllowance', EUR],
    ],
  },
  {
    title: 'groupEmployment',
    fields: [
      ['incomeTax', 'generalExpenses', EUR],
      ['incomeTax', 'disability33Expenses', EUR],
      ['incomeTax', 'disability65Expenses', EUR],
      ['incomeTax', 'reductionMax', EUR],
      ['incomeTax', 'reductionThreshold1', EUR],
      ['incomeTax', 'reductionSlope1', ''],
      ['incomeTax', 'reductionThreshold2', EUR],
      ['incomeTax', 'reductionValue2', EUR],
      ['incomeTax', 'reductionSlope2', ''],
      ['incomeTax', 'reductionThreshold3', EUR],
      ['incomeTax', 'minWageCredit', EUR],
      ['incomeTax', 'minWageCreditFullUpTo', EUR],
      ['incomeTax', 'minWageCreditEndsAt', EUR],
    ],
  },
  {
    title: 'groupWithholding',
    fields: [
      ['incomeTax', 'withholdingFreeMinimum', EUR],
      ['incomeTax', 'withholdingCap', PCT],
      ['incomeTax', 'temporaryMinRate', PCT],
    ],
  },
  {
    title: 'groupEmployee',
    fields: [
      ['employee', 'commonContingencies', PCT],
      ['employee', 'unemploymentPermanent', PCT],
      ['employee', 'unemploymentTemporary', PCT],
      ['employee', 'training', PCT],
      ['employee', 'mei', PCT],
      ['socialSecurity', 'minBase', EUR],
      ['socialSecurity', 'maxBase', EUR],
      ['employee', 'solidarity1', PCT],
      ['employee', 'solidarity2', PCT],
      ['employee', 'solidarity3', PCT],
      ['socialSecurity', 'solidarityBand1Limit', PCT],
      ['socialSecurity', 'solidarityBand2Limit', PCT],
    ],
  },
  {
    title: 'groupEmployer',
    fields: [
      ['employer', 'commonContingencies', PCT],
      ['employer', 'unemploymentPermanent', PCT],
      ['employer', 'unemploymentTemporary', PCT],
      ['employer', 'training', PCT],
      ['employer', 'fogasa', PCT],
      ['employer', 'mei', PCT],
      ['employer', 'workAccidents', PCT],
      ['employer', 'solidarity1', PCT],
      ['employer', 'solidarity2', PCT],
      ['employer', 'solidarity3', PCT],
    ],
  },
];

const sameBrackets = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sortBrackets = (brackets) => brackets.sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity));
const unitSuffix = (unit) => (unit ? `<span class="unit">${unit}</span>` : '');

/**
 * Renders the settings of `scenario` into `container`, highlighting values that
 * differ from `reference`. `onChange` runs after every edit.
 */
export function renderSettings(container, { scenario, reference, onChange }) {
  const openGroups = new Set([...container.querySelectorAll('details[open]')].map((d) => d.dataset.group));
  if (!container.children.length) openGroups.add('groupBrackets');

  container.innerHTML =
    groupHtml('groupBrackets', openGroups, '<div class="brackets" data-brackets></div>') +
    GROUPS.map((group) => groupHtml(group.title, openGroups, fieldsHtml(group.fields, scenario, reference))).join('');

  const bracketsContainer = container.querySelector('[data-brackets]');
  const renderBracketEditor = () =>
    renderBrackets(bracketsContainer, scenario, reference, {
      recalculate: onChange,
      rerender: () => {
        renderBracketEditor();
        onChange();
      },
    });
  renderBracketEditor();

  container.querySelectorAll('input[data-field]').forEach((input) => {
    input.addEventListener('input', () => {
      const value = parseFloat(input.value);
      if (Number.isNaN(value)) return;
      const [section, key] = input.dataset.field.split('.');
      scenario[section][key] = value;
      input.closest('.field').classList.toggle('changed', value !== reference[section][key]);
      onChange();
    });
  });
}

function groupHtml(title, openGroups, content) {
  return `
    <details class="group" data-group="${title}" ${openGroups.has(title) ? 'open' : ''}>
      <summary>${t(title)}</summary>
      <div class="group-body">${content}</div>
    </details>`;
}

function fieldsHtml(fields, scenario, reference) {
  const items = fields.map(([section, key, unit]) => {
    const value = scenario[section][key];
    const id = `field-${section}-${key}`;
    return `
      <div class="field ${value !== reference[section][key] ? 'changed' : ''}">
        <label for="${id}">${t(`f_${key}`)}</label>
        <div class="input-unit">
          <input id="${id}" type="number" step="any" inputmode="decimal" data-field="${section}.${key}" value="${value}" />
          ${unitSuffix(unit)}
        </div>
      </div>`;
  });
  return `<div class="fields">${items.join('')}</div>`;
}

function bracketRowHtml(bracket, i, brackets) {
  const from = i === 0 ? 0 : brackets[i - 1].upTo;
  const upTo =
    bracket.upTo === null
      ? `<span class="muted">${t('andAbove')}</span>`
      : `<div class="input-unit"><input type="number" step="any" min="0" data-up-to="${i}" value="${bracket.upTo}" aria-label="${t('upTo')}" />${unitSuffix(EUR)}</div>`;
  const remove =
    brackets.length > 1
      ? `<button type="button" class="icon-button" data-remove="${i}" title="${t('removeBracket')}" aria-label="${t('removeBracket')}">✕</button>`
      : '';

  return `
    <tr>
      <td class="num">${formatNumber(from, 2)} €</td>
      <td>${upTo}</td>
      <td><div class="input-unit"><input type="number" step="any" data-rate="${i}" value="${bracket.rate}" aria-label="${t('rate')}" />${unitSuffix(PCT)}</div></td>
      <td class="actions">${remove}</td>
    </tr>`;
}

function renderBrackets(container, scenario, reference, { recalculate, rerender }) {
  const { brackets } = scenario.incomeTax;
  const markChanged = () => container.classList.toggle('changed', !sameBrackets(brackets, reference.incomeTax.brackets));
  const presetOptions = Object.entries(BRACKET_PRESETS)
    .map(([id, preset]) => `<option value="${id}">${escapeHtml(preset.name)}</option>`)
    .join('');

  markChanged();
  container.innerHTML = `
    <p class="help">${t('groupBracketsHelp')}</p>
    <label class="inline-field">${t('template')}
      <select data-preset><option value="">${t('choose')}</option>${presetOptions}</select>
    </label>
    <table class="bracket-table">
      <thead><tr><th>${t('from')}</th><th>${t('upTo')}</th><th>${t('rate')}</th><th></th></tr></thead>
      <tbody>${brackets.map(bracketRowHtml).join('')}</tbody>
    </table>
    <button type="button" class="button secondary" data-add>${t('addBracket')}</button>
    <fieldset class="quick-actions">
      <legend>${t('quickActions')}</legend>
      <label>${t('indexThresholds')} <input type="number" step="any" value="0" data-index /></label>
      <label>${t('addToRates')} <input type="number" step="any" value="0" data-shift /></label>
      <button type="button" class="button secondary" data-apply>${t('apply')}</button>
    </fieldset>`;

  const $ = (selector) => container.querySelector(selector);

  container.querySelectorAll('[data-rate]').forEach((input) =>
    input.addEventListener('input', () => {
      const value = parseFloat(input.value);
      if (Number.isNaN(value)) return;
      brackets[input.dataset.rate].rate = value;
      markChanged();
      recalculate();
    }),
  );

  // Limits are re-sorted once the value is committed, not on every keystroke
  container.querySelectorAll('[data-up-to]').forEach((input) =>
    input.addEventListener('change', () => {
      const value = parseFloat(input.value);
      if (value > 0) brackets[input.dataset.upTo].upTo = value;
      sortBrackets(brackets);
      rerender();
    }),
  );

  container.querySelectorAll('[data-remove]').forEach((button) =>
    button.addEventListener('click', () => {
      const [removed] = brackets.splice(Number(button.dataset.remove), 1);
      if (removed.upTo === null) brackets.at(-1).upTo = null;
      rerender();
    }),
  );

  $('[data-add]').addEventListener('click', () => {
    // Split the top bracket: the new one ends NEW_BRACKET_WIDTH above the previous limit
    const previousLimit = brackets.at(-2)?.upTo ?? 0;
    brackets.splice(-1, 0, { upTo: previousLimit + NEW_BRACKET_WIDTH, rate: brackets.at(-1).rate });
    rerender();
  });

  $('[data-preset]').addEventListener('change', (event) => {
    const preset = BRACKET_PRESETS[event.target.value];
    if (!preset) return;
    scenario.incomeTax.brackets = clone(preset.brackets);
    rerender();
  });

  $('[data-apply]').addEventListener('click', () => {
    const factor = 1 + (parseFloat($('[data-index]').value) || 0) / 100;
    const shift = parseFloat($('[data-shift]').value) || 0;
    for (const bracket of brackets) {
      if (bracket.upTo !== null) bracket.upTo = Math.round(bracket.upTo * factor * 100) / 100;
      bracket.rate = Math.max(0, Math.round((bracket.rate + shift) * 100) / 100);
    }
    rerender();
  });
}
