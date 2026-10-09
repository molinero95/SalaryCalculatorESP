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
const NUMERIC_INPUTS = new Set(['salary', 'payments', 'age', 'children', 'childrenUnder3', 'dependents65', 'dependents75', 'disability']);

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
    editing: 'simulation',
    chartMode: 'diff',
    input: clone(DEFAULT_INPUT),
    current: clone(CURRENT_SCENARIO),
    simulation: clone(CURRENT_SCENARIO),
  };

  // A shared link (#s=…) takes precedence over the locally saved state
  const shared = location.hash.startsWith('#s=') ? storage.decode(location.hash.slice(3)) : null;
  if (shared) history.replaceState(null, '', location.pathname + location.search);

  const state = merge(defaults, shared ?? storage.loadState() ?? {});
  state.editing = oneOf(state.editing, ['simulation', 'current']);
  state.chartMode = oneOf(state.chartMode, ['diff', 'rate']);
  state.input.period = oneOf(state.input.period, ['annual', 'perPayment']);
  state.input.contract = oneOf(state.input.contract, ['permanent', 'temporary']);
  state.input.payments = oneOf(state.input.payments, [14, 12]);
  return state;
}

const state = initialState();

const editedScenario = () => state[state.editing];
const referenceScenario = () => (state.editing === 'simulation' ? state.current : CURRENT_SCENARIO);
const scenarioName = (kind) => state[kind].name || (kind === 'current' ? `${t('current')} · 2026` : t('simulation'));
const scenarioNames = () => ({ current: scenarioName('current'), simulation: scenarioName('simulation') });

let saveTimer;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => storage.saveState(state), SAVE_DELAY_MS);
}

// ---------------------------------------------------------------------------
// Personal details form
// ---------------------------------------------------------------------------

const form = $('#details-form');

function renderInput() {
  for (const [name, value] of Object.entries(state.input)) {
    const control = form.elements[name];
    if (!control) continue;
    if (control.type === 'checkbox') control.checked = value;
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
    ? [{ name: t('chartDiff'), className: 'series-1', values: pairs.map(([a, b]) => b.netAnnual - a.netAnnual) }]
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

function renderSettingsPanel() {
  document.querySelectorAll('input[name="editing"]').forEach((radio) => (radio.checked = radio.value === state.editing));
  const nameInput = $('#scenario-name');
  nameInput.value = editedScenario().name;
  nameInput.placeholder = scenarioName(state.editing);
  renderSettings($('#settings'), { scenario: editedScenario(), reference: referenceScenario(), onChange: update });
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

/** Replaces scenario state, then refreshes the settings panel and results. */
function refreshScenarios() {
  renderSettingsPanel();
  update();
}

$('#editing').addEventListener('change', ({ target }) => {
  state.editing = target.value;
  persist();
  renderSettingsPanel();
});

$('#scenario-name').addEventListener('input', ({ target }) => {
  editedScenario().name = target.value.trim();
  update();
});

$('#copy-current').addEventListener('click', () => {
  state.simulation = { ...clone(state.current), name: state.simulation.name };
  state.editing = 'simulation';
  refreshScenarios();
});

$('#reset').addEventListener('click', () => {
  state[state.editing] = { ...clone(CURRENT_SCENARIO), name: editedScenario().name };
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
});

$('#export').addEventListener('click', () => {
  const { input, current, simulation } = state;
  const blob = new Blob([JSON.stringify({ input, current, simulation }, null, 2)], { type: 'application/json' });
  const slug = scenarioName('simulation').normalize('NFD').replace(/[^\w]+/g, '-').toLowerCase();
  const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${slug}.json` });
  link.click();
  URL.revokeObjectURL(link.href);
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
});

$('#load-scenario').addEventListener('click', () => {
  const saved = storage.listScenarios()[$('#saved-scenarios').value];
  if (!saved) return;
  state.simulation = merge(clone(CURRENT_SCENARIO), saved);
  state.editing = 'simulation';
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
  renderResults({ cards: $('#results'), summary: $('#difference') }, results);
  renderBreakdown($('#breakdown'), results);

  // The chart evaluates ~280 payrolls, so batch it to the next frame
  cancelAnimationFrame(chartFrame);
  chartFrame = requestAnimationFrame(renderComparisonChart);
  persist();
}

document.querySelector(`input[name="chartMode"][value="${state.chartMode}"]`).checked = true;
renderInput();
applyLanguage();
