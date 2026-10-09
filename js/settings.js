// Settings form for one scenario: income tax brackets and every other parameter.

import { BRACKET_PRESETS, clone } from './defaults.js';
import { t } from './i18n/index.js';
import { formatEuros, escapeHtml } from './format.js';

const EUR = '€';
const PCT = '%';
const NEW_BRACKET_WIDTH = 20000;

/** Field groups: each field is [section, key, unit]. */
const GROUPS = [
  {
    title: 'groupAllowances',
    fields: [
      ['incomeTax', 'childRateReduction', 'pp'],
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
      ['incomeTax', 'withholdingFreeMin3_0', EUR],
      ['incomeTax', 'withholdingFreeMin3_1', EUR],
      ['incomeTax', 'withholdingFreeMin3_2', EUR],
      ['incomeTax', 'withholdingFreeMin2_0', EUR],
      ['incomeTax', 'withholdingFreeMin2_1', EUR],
      ['incomeTax', 'withholdingFreeMin2_2', EUR],
      ['incomeTax', 'withholdingFreeMin1_1', EUR],
      ['incomeTax', 'withholdingFreeMin1_2', EUR],
      ['incomeTax', 'withholdingCap', PCT],
      ['incomeTax', 'temporaryMinRate', PCT],
    ],
  },
  {
    title: 'groupFlexible',
    fields: [
      ['flexible', 'mealDailyLimit', EUR],
      ['flexible', 'transportLimit', EUR],
      ['flexible', 'healthLimit', EUR],
      ['flexible', 'healthDisabilityLimit', EUR],
      ['flexible', 'inKindCap', PCT],
    ],
  },
  {
    title: 'groupPension',
    fields: [
      ['pension', 'individualLimit', EUR],
      ['pension', 'employmentLimit', EUR],
      ['pension', 'netIncomeShareLimit', PCT],
      ['pension', 'highIncomeThreshold', EUR],
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
const matchingPreset = (brackets) =>
  Object.keys(BRACKET_PRESETS).find((id) => sameBrackets(brackets, BRACKET_PRESETS[id].brackets)) ?? '';
const sortBrackets = (brackets) => brackets.sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity));
const unitSuffix = (unit) => (unit ? `<span class="unit">${unit}</span>` : '');

/**
 * Renders the settings of `scenario` into `container`, highlighting values that
 * differ from `reference`. `onChange` runs after every edit. `idPrefix` keeps
 * element ids unique when several panels are on the page.
 */
export function renderSettings(container, { scenario, reference, onChange, idPrefix, openByDefault = [] }) {
  const isFirstRender = !container.children.length;
  const openGroups = new Set(
    isFirstRender ? openByDefault : [...container.querySelectorAll('details[open]')].map((d) => d.dataset.group),
  );

  container.innerHTML =
    groupHtml('groupBrackets', openGroups, '<div class="brackets" data-brackets></div>') +
    (scenario.incomeTax.useSeparateWithholding
      ? groupHtml(
          'groupWithholdingBrackets',
          openGroups,
          '<p class="muted">' +
            t('separateWithholdingHelp') +
            '</p><div class="brackets" data-withholding-brackets></div>',
        )
      : '') +
    GROUPS.map((group) =>
      groupHtml(group.title, openGroups, fieldsHtml(group.fields, scenario, reference, idPrefix)),
    ).join('');

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
  if (scenario.incomeTax.useSeparateWithholding) {
    const editor = container.querySelector('[data-withholding-brackets]');
    const render = () =>
      renderBrackets(
        editor,
        scenario,
        reference,
        {
          recalculate: onChange,
          rerender: () => {
            render();
            onChange();
          },
        },
        'withholdingBrackets',
      );
    render();
  }

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

function fieldsHtml(fields, scenario, reference, idPrefix) {
  const items = fields.map(([section, key, unit]) => {
    const value = scenario[section][key];
    const id = `${idPrefix}-${section}-${key}`;
    return `
      <div class="field ${value !== reference[section][key] ? 'changed' : ''}">
        <label for="${id}">${t(`f_${key}`)}</label>
        <div class="input-unit">
          <input id="${id}" type="number" step="any" inputmode="decimal" data-field="${section}.${key}" value="${escapeHtml(value)}" />
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
      : `<div class="input-unit"><input type="number" step="any" min="0" data-up-to="${i}" value="${escapeHtml(bracket.upTo)}" aria-label="${t('upTo')}" />${unitSuffix(EUR)}</div>`;
  const remove =
    brackets.length > 1
      ? `<button type="button" class="icon-button" data-remove="${i}" title="${t('removeBracket')}" aria-label="${t('removeBracket')}">✕</button>`
      : '';

  return `
    <tr>
      <td class="num">${formatEuros(from, Number.isInteger(from) ? 0 : 2)}</td>
      <td>${upTo}</td>
      <td><div class="input-unit"><input type="number" step="any" data-rate="${i}" value="${escapeHtml(bracket.rate)}" aria-label="${t('rate')}" />${unitSuffix(PCT)}</div></td>
      <td class="actions">${remove}</td>
    </tr>`;
}

function renderBrackets(container, scenario, reference, { recalculate, rerender }, bracketKey = 'brackets') {
  const brackets = scenario.incomeTax[bracketKey];
  const presetOptions = Object.entries(BRACKET_PRESETS)
    .map(([id, preset]) => `<option value="${id}">${escapeHtml(preset.name)}</option>`)
    .join('');

  container.innerHTML = `
    <p class="help">${t('groupBracketsHelp')}</p>
    <label class="inline-field">${t('template')}
      <select data-preset><option value="">${t('custom')}</option>${presetOptions}</select>
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

  // Highlights changes and shows the template matching the brackets ("custom" otherwise)
  const markChanged = () => {
    container.classList.toggle('changed', !sameBrackets(brackets, reference.incomeTax[bracketKey]));
    $('[data-preset]').value = matchingPreset(brackets);
  };
  markChanged();

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
    scenario.incomeTax[bracketKey] = clone(preset.brackets);
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
