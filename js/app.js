import { computePayroll, grossAnnualOf } from './calc.js';
import { CURRENT_SCENARIO, DEFAULT_INPUT, clone } from './defaults.js';
import { LANGUAGES, DEFAULT_LANGUAGE, setLanguage, t, translateDocument } from './i18n/index.js';
import { formatSignedEuros, formatPercent, formatCompactEuros, escapeHtml } from './format.js';
import { renderSettings } from './settings.js';
import { renderChart, renderDataTable } from './chart.js';
import { renderResults, renderBreakdown } from './results.js';
import * as storage from './storage.js';

const $ = (selector) => document.querySelector(selector);

const CHART_RANGE = { from: 12000, to: 150000, step: 1000 };
const CHART_TABLE_EVERY = 5;
const SAVE_DELAY_MS = 300;
const TOAST_MS = 2500;
const MONTHS = 12;

/** Annual amounts that the form can show per year or per month, keyed by the period field controlling them. */
const AMOUNT_FIELDS = {
  flexPeriod: ['flexMeal', 'flexTransport', 'flexHealth', 'flexChildcare', 'flexTraining'],
  pensionPeriod: ['pensionIndividual', 'pensionEmployee', 'pensionEmployer'],
};
const PERIOD_OF_AMOUNT = Object.fromEntries(
  Object.entries(AMOUNT_FIELDS).flatMap(([period, fields]) => fields.map((field) => [field, period])),
);

const NUMERIC_INPUTS = new Set([
  'salary',
  'payments',
  'partTime',
  'familySituation',
  'age',
  'children',
  'childrenUnder3',
  'dependents65',
  'dependents75',
  'disability',
  'workingDays',
  'flexHealthPeople',
  ...Object.keys(PERIOD_OF_AMOUNT),
]);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const isValidBrackets = (brackets) =>
  Array.isArray(brackets) &&
  brackets.length > 0 &&
  brackets.every((b) => Number.isFinite(b?.rate) && (b.upTo === null || Number.isFinite(b.upTo))) &&
  brackets.at(-1).upTo === null;

/**
 * Deep-merges untrusted `override` (saved state, shared link, imported file) into
 * `base`. Unknown keys are dropped and values whose type doesn't match are ignored.
 */
function merge(base, override) {
  if (Array.isArray(base)) return isValidBrackets(override) ? override : base;
  if (isPlainObject(base)) {
    if (!isPlainObject(override)) return base;
    return Object.fromEntries(
      Object.entries(base).map(([key, value]) => [key, key in override ? merge(value, override[key]) : value]),
    );
  }
  if (typeof base === 'number') return Number.isFinite(override) ? override : base;
  return typeof override === typeof base ? override : base;
}

const oneOf = (value, allowed) => (allowed.includes(value) ? value : allowed[0]);

function initialState() {
  const defaults = {
    language: DEFAULT_LANGUAGE,
    chartMode: 'diff',
    input: clone(DEFAULT_INPUT),
    current: clone(CURRENT_SCENARIO),
    simulation: clone(CURRENT_SCENARIO),
  };

  // A shared link (#s=…) takes precedence over the locally saved state
  const shared = location.hash.startsWith('#s=') ? storage.decode(location.hash.slice(3)) : null;
  if (shared) history.replaceState(null, '', location.pathname + location.search);

  const state = merge(defaults, shared ?? storage.loadState() ?? {});
  state.chartMode = oneOf(state.chartMode, ['diff', 'rate']);
  state.input.period = oneOf(state.input.period, ['annual', 'perPayment']);
  state.input.contract = oneOf(state.input.contract, ['permanent', 'temporary']);
  state.input.payments = oneOf(state.input.payments, [14, 12]);
  state.input.familySituation = oneOf(state.input.familySituation, [3, 2, 1]);
  state.input.disability = oneOf(state.input.disability, [0, 33, 65]);
  state.input.partTime = Math.min(100, Math.max(1, state.input.partTime));
  for (const period of Object.keys(AMOUNT_FIELDS)) state.input[period] = oneOf(state.input[period], ['annual', 'monthly']);
  return state;
}

const state = initialState();

const scenarioName = (kind) => state[kind].name || (kind === 'current' ? `${t('current')} · 2026` : t('simulation'));
const scenarioNames = () => ({ current: scenarioName('current'), simulation: scenarioName('simulation') });

/** Records an anonymous GoatCounter event, if the counter has loaded. */
function trackEvent(name) {
  window.goatcounter?.count?.({ path: name, title: name, event: true });
}

let saveTimer;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => storage.saveState(state), SAVE_DELAY_MS);
}

// ---------------------------------------------------------------------------
// Personal details form
// ---------------------------------------------------------------------------

const form = $('#details-form');

/** Divisor to show a stored annual amount in the period chosen in the form. */
const amountDivisor = (field) => (state.input[PERIOD_OF_AMOUNT[field]] === 'monthly' ? MONTHS : 1);

function renderInput() {
  for (const [name, value] of Object.entries(state.input)) {
    const control = form.elements[name];
    if (!control) continue;
    if (control.type === 'checkbox') control.checked = value;
    else if (name in PERIOD_OF_AMOUNT) control.value = String(Math.round((value / amountDivisor(name)) * 100) / 100);
    else control.value = String(value);
  }
  form.elements.salary.step = state.input.period === 'perPayment' ? 10 : 100;
}

form.addEventListener('input', ({ target }) => {
  const { name, type, value, checked } = target;
  if (!(name in state.input)) return;

  const previousGross = grossAnnualOf(state.input);

  if (type === 'checkbox') state.input[name] = checked;
  else if (NUMERIC_INPUTS.has(name)) state.input[name] = Math.max(0, parseFloat(value) || 0);
  else state.input[name] = value;

  // Amounts are always stored per year
  if (name in PERIOD_OF_AMOUNT) state.input[name] *= amountDivisor(name);
  if (name in AMOUNT_FIELDS) renderInput();

  // Switching period or number of payments keeps the same gross annual salary
  if (name === 'period' || name === 'payments') {
    const { period, payments } = state.input;
    state.input.salary = period === 'perPayment' ? Math.round((previousGross / payments) * 100) / 100 : previousGross;
    renderInput();
  }

  update();
});

// ---------------------------------------------------------------------------
// Chart
// ---------------------------------------------------------------------------

function renderComparisonChart() {
  const xs = [];
  for (let x = CHART_RANGE.from; x <= CHART_RANGE.to; x += CHART_RANGE.step) xs.push(x);

  const pairs = xs.map((gross) => [
    computePayroll(state.input, state.current, gross),
    computePayroll(state.input, state.simulation, gross),
  ]);
  const names = scenarioNames();
  const isDiff = state.chartMode === 'diff';

  const series = isDiff
    ? [{ name: t('chartDiff'), className: 'series-1', values: pairs.map(([a, b]) => b.netAnnualAfterReturn - a.netAnnualAfterReturn) }]
    : [
        { name: names.current, className: 'series-1', values: pairs.map(([a]) => a.effectiveRate) },
        { name: names.simulation, className: 'series-2', values: pairs.map(([, b]) => b.effectiveRate) },
      ];

  const options = {
    xs,
    series,
    formatValue: isDiff ? (v) => formatSignedEuros(v, 0) : (v) => formatPercent(v, 1),
    formatAxis: isDiff ? formatCompactEuros : (v) => formatPercent(v, 0),
    marker: grossAnnualOf(state.input),
    includeZero: isDiff,
  };

  $('#chart-description').textContent = t(isDiff ? 'chartDiffDesc' : 'chartRateDesc');
  $('#chart-legend').innerHTML =
    series.length > 1
      ? series
          .map((s) => `<span class="legend-item"><span class="swatch ${s.className}"></span>${escapeHtml(s.name)}</span>`)
          .join('')
      : '';

  renderChart($('#chart'), options);
  renderDataTable($('#chart-table'), { ...options, every: CHART_TABLE_EVERY });
}

$('#chart-mode').addEventListener('change', ({ target }) => {
  state.chartMode = target.value;
  persist();
  renderComparisonChart();
});

let resizeFrame;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(renderComparisonChart);
});

// ---------------------------------------------------------------------------
// Settings and saved scenarios
// ---------------------------------------------------------------------------

function renderSettingsPanels() {
  const nameInput = $('#scenario-name');
  nameInput.value = state.simulation.name;
  nameInput.placeholder = scenarioName('simulation');

  renderSettings($('#settings-simulation'), {
    scenario: state.simulation,
    reference: state.current,
    onChange: update,
    idPrefix: 'simulation',
    openByDefault: ['groupBrackets'],
  });
  renderSettings($('#settings-current'), {
    scenario: state.current,
    reference: CURRENT_SCENARIO,
    // Changing the reference also changes what the simulation is compared to
    onChange: () => {
      renderSimulationHighlights();
      update();
    },
    idPrefix: 'current',
  });
}

/** Re-renders only the simulation panel, e.g. after the reference changed. */
function renderSimulationHighlights() {
  renderSettings($('#settings-simulation'), {
    scenario: state.simulation,
    reference: state.current,
    onChange: update,
    idPrefix: 'simulation',
  });
}

function renderSavedScenarios() {
  const names = Object.keys(storage.listScenarios()).sort((a, b) => a.localeCompare(b));
  $('#saved-scenarios').innerHTML =
    `<option value="">${t('none')}</option>` +
    names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
}

let toastTimer;
function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (element.hidden = true), TOAST_MS);
}

/** Refreshes the settings panels and results after replacing scenario state. */
function refreshScenarios() {
  renderSettingsPanels();
  update();
}

$('#scenario-name').addEventListener('input', ({ target }) => {
  state.simulation.name = target.value.trim();
  update();
});

$('#copy-current').addEventListener('click', () => {
  state.simulation = { ...clone(state.current), name: state.simulation.name };
  refreshScenarios();
});

$('#reset-current').addEventListener('click', () => {
  state.current = clone(CURRENT_SCENARIO);
  refreshScenarios();
});

$('#share').addEventListener('click', async () => {
  const { input, current, simulation } = state;
  const url = `${location.origin}${location.pathname}#s=${storage.encode({ input, current, simulation })}`;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // Clipboard unavailable: expose the link in the address bar instead
    history.replaceState(null, '', url);
  }
  toast(t('linkCopied'));
  trackEvent('share');
});

$('#export').addEventListener('click', () => {
  const { input, current, simulation } = state;
  const blob = new Blob([JSON.stringify({ input, current, simulation }, null, 2)], { type: 'application/json' });
  const slug = scenarioName('simulation').normalize('NFD').replace(/[^\w]+/g, '-').toLowerCase();
  const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${slug}.json` });
  link.click();
  URL.revokeObjectURL(link.href);
  trackEvent('export-json');
});

$('#import').addEventListener('change', async ({ target }) => {
  const [file] = target.files;
  target.value = '';
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!isPlainObject(imported?.simulation)) throw new Error('Invalid scenario file');
    Object.assign(state, merge(state, imported));
    renderInput();
    refreshScenarios();
  } catch {
    toast(t('importError'));
  }
});

$('#save-scenario').addEventListener('click', () => {
  state.simulation.name = scenarioName('simulation');
  storage.saveScenario(clone(state.simulation));
  renderSavedScenarios();
  $('#saved-scenarios').value = state.simulation.name;
  refreshScenarios();
  toast(t('saved'));
  trackEvent('save-scenario');
});

$('#load-scenario').addEventListener('click', () => {
  const saved = storage.listScenarios()[$('#saved-scenarios').value];
  if (!saved) return;
  state.simulation = merge(clone(CURRENT_SCENARIO), saved);
  refreshScenarios();
});

$('#delete-scenario').addEventListener('click', () => {
  const name = $('#saved-scenarios').value;
  if (!name) return;
  storage.deleteScenario(name);
  renderSavedScenarios();
});

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------

const languageSelect = $('#language');
languageSelect.innerHTML = Object.entries(LANGUAGES)
  .map(([code, { name }]) => `<option value="${code}">${name}</option>`)
  .join('');

languageSelect.addEventListener('change', ({ target }) => {
  state.language = target.value;
  applyLanguage();
});

function applyLanguage() {
  setLanguage(state.language);
  languageSelect.value = state.language;
  translateDocument();
  renderSavedScenarios();
  refreshScenarios();
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

let chartFrame;
function update() {
  const results = {
    names: scenarioNames(),
    current: computePayroll(state.input, state.current),
    simulation: computePayroll(state.input, state.simulation),
  };
  renderResults({ cards: $('#results'), summary: $('#difference'), sticky: $('#sticky-value') }, results);
  renderBreakdown($('#breakdown'), results);

  const flexWarning = $('#flex-warning');
  flexWarning.hidden = !results.simulation.flexible.overCap;
  flexWarning.textContent = t('flexOverCap', { cap: state.simulation.flexible.inKindCap });

  // The chart evaluates ~280 payrolls, so batch it to the next frame
  cancelAnimationFrame(chartFrame);
  chartFrame = requestAnimationFrame(renderComparisonChart);
  persist();
}

document.querySelector(`input[name="chartMode"][value="${state.chartMode}"]`).checked = true;
renderInput();
applyLanguage();
