import { computePayroll, grossAnnualOf } from './calc.js';
import { CURRENT_SCENARIO, DEFAULT_INPUT, clone } from './defaults.js';
import { LANGUAGES, DEFAULT_LANGUAGE, setLanguage, t, translateDocument } from './i18n/index.js';
import { formatEuros, formatSignedEuros, formatPercent, formatCompactEuros, escapeHtml } from './format.js';
import { renderSettings } from './settings.js';
import { renderChart, renderDataTable } from './chart.js';
import { renderResults, renderBreakdown } from './results.js';
import * as storage from './storage.js';
import { REGIONAL_SCALES } from './data/regions.js';
import { PROPOSALS, UNQUANTIFIED_PROPOSALS } from './data/proposals.js';
import { salaryPercentile } from './data/salaries.js';
import { cumulativeInflation, BRACKETS_LAST_UPDATED } from './data/cpi.js';
import { proposalScenario, indexedScenario } from './political.js';

const $ = (selector) => document.querySelector(selector);

const CHART_RANGE = { from: 12000, to: 150000, step: 1000 };
const CHART_TABLE_EVERY = 5;
const MAX_COMPARED = 3;
const INFLATION_SINCE_BRACKETS = Math.round(cumulativeInflation(BRACKETS_LAST_UPDATED - 1));
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
const isStringList = (list) => Array.isArray(list) && list.every((item) => typeof item === 'string');

function merge(base, override) {
  if (isStringList(base)) return isStringList(override) ? override : base;
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

/** The parts of `value` that differ from `base` (undefined when equal), to keep share links short. */
function changesFrom(base, value) {
  if (isPlainObject(base) && isPlainObject(value)) {
    const entries = Object.entries(value)
      .map(([key, item]) => [key, changesFrom(base[key], item)])
      .filter(([, item]) => item !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  return JSON.stringify(base) === JSON.stringify(value) ? undefined : value;
}

const oneOf = (value, allowed) => (allowed.includes(value) ? value : allowed[0]);

function initialState() {
  const defaults = {
    language: DEFAULT_LANGUAGE,
    chartMode: 'diff',
    compare: ['vox2024', 'indexed', 'sumar2023'],
    input: clone(DEFAULT_INPUT),
    current: clone(CURRENT_SCENARIO),
    simulation: clone(CURRENT_SCENARIO),
  };

  // A shared link (#s=…) is applied on top of the locally saved state, so the
  // recipient keeps their own personal details
  const shared = location.hash.startsWith('#s=') ? storage.decode(location.hash.slice(3)) : null;
  if (shared) history.replaceState(null, '', location.pathname + location.search);

  const state = merge(merge(defaults, storage.loadState() ?? {}), shared ?? {});
  state.chartMode = oneOf(state.chartMode, ['diff', 'rate']);
  state.input.period = oneOf(state.input.period, ['annual', 'perPayment']);
  state.input.contract = oneOf(state.input.contract, ['permanent', 'temporary']);
  state.input.payments = oneOf(state.input.payments, [14, 12]);
  state.input.familySituation = oneOf(state.input.familySituation, [3, 2, 1]);
  state.input.disability = oneOf(state.input.disability, [0, 33, 65]);
  state.input.partTime = Math.min(100, Math.max(1, state.input.partTime));
  state.input.region = oneOf(state.input.region, ['general', ...Object.keys(REGIONAL_SCALES)]);
  for (const period of Object.keys(AMOUNT_FIELDS))
    state.input[period] = oneOf(state.input[period], ['annual', 'monthly']);
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
    ? [
        {
          name: t('chartDiff'),
          className: 'series-1',
          values: pairs.map(([a, b]) => b.netAnnualAfterReturn - a.netAnnualAfterReturn),
        },
      ]
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
          .map(
            (s) => `<span class="legend-item"><span class="swatch ${s.className}"></span>${escapeHtml(s.name)}</span>`,
          )
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

/** Link to the current proposal. Personal details are deliberately left out. */
function shareUrl() {
  const payload = {
    current: changesFrom(CURRENT_SCENARIO, state.current),
    simulation: changesFrom(CURRENT_SCENARIO, state.simulation),
  };
  return `${location.origin}${location.pathname}#s=${storage.encode(payload)}`;
}

/** Ready-made message for social networks, using the user's own result. */
function shareText() {
  const diff = lastResults.simulation.netAnnualAfterReturn - lastResults.current.netAnnualAfterReturn;
  const name = scenarioName('simulation');
  return Math.abs(diff) < 0.5
    ? t('shareTextNone', { name })
    : t('shareText', { name, diff: formatSignedEuros(diff, 0) });
}

$('#share').addEventListener('click', async () => {
  const url = shareUrl();
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // Clipboard unavailable: expose the link in the address bar instead
    history.replaceState(null, '', url);
  }
  toast(t('linkCopied'));
  trackEvent('share');
});

$('#share-whatsapp').addEventListener('click', () => {
  window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText()} ${shareUrl()}`)}`, '_blank', 'noopener');
  trackEvent('share-whatsapp');
});

$('#share-x').addEventListener('click', () => {
  const params = new URLSearchParams({ text: shareText(), url: shareUrl() });
  window.open(`https://x.com/intent/post?${params}`, '_blank', 'noopener');
  trackEvent('share-x');
});

const nativeShare = $('#share-native');
nativeShare.hidden = !navigator.share;
nativeShare.addEventListener('click', async () => {
  try {
    await navigator.share({ title: t('appTitle'), text: shareText(), url: shareUrl() });
    trackEvent('share-native');
  } catch {
    // The user closed the share sheet
  }
});

$('#print').addEventListener('click', () => {
  trackEvent('print');
  window.print();
});

$('#export').addEventListener('click', () => {
  const { input, current, simulation } = state;
  const blob = new Blob([JSON.stringify({ input, current, simulation }, null, 2)], { type: 'application/json' });
  const slug = scenarioName('simulation')
    .normalize('NFD')
    .replace(/[^\w]+/g, '-')
    .toLowerCase();
  const link = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `${slug}.json`,
  });
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
// Party proposals
// ---------------------------------------------------------------------------

const proposalName = (id) => `${PROPOSALS[id].party} (${PROPOSALS[id].date.slice(0, 4)})`;
const sourceLink = ({ title, url, date }) =>
  `<a href="${url}" target="_blank" rel="noopener">${escapeHtml(title)}</a>${date ? ` · ${date}` : ''}`;

function renderProposalControls() {
  $('#proposal-select').innerHTML =
    `<option value="">${t('custom')}</option>` +
    Object.keys(PROPOSALS)
      .map((id) => `<option value="${id}">${escapeHtml(proposalName(id))}</option>`)
      .join('');
  $('#other-proposals').innerHTML = UNQUANTIFIED_PROPOSALS.map(
    (p) =>
      `<li><strong>${p.party}</strong>: ${t(p.note)} <span class="muted">${t('proposalSource')}: ${sourceLink(p)}</span></li>`,
  ).join('');
  renderProposalInfo();
}

function renderProposalInfo() {
  const proposal = PROPOSALS[state.simulation.proposal];
  $('#proposal-select').value = proposal ? state.simulation.proposal : '';
  const info = $('#proposal-info');
  info.hidden = !proposal;
  if (proposal)
    info.innerHTML = `<p>${t(proposal.note)}</p><p class="muted">${t('proposalSource')}: ${sourceLink(proposal)}</p>`;
}

$('#proposal-select').addEventListener('change', ({ target }) => {
  state.simulation = target.value
    ? proposalScenario(target.value, proposalName(target.value))
    : { ...clone(state.current), name: '', proposal: '' };
  trackEvent(`proposal-${target.value || 'custom'}`);
  refreshScenarios();
});

// ---------------------------------------------------------------------------
// Context: salary percentile and bracket creep
// ---------------------------------------------------------------------------

const indexedName = () => t('creepScenarioName', { inflation: INFLATION_SINCE_BRACKETS });

function renderContext(current) {
  const percentile = Math.floor(salaryPercentile(current.grossAnnual));
  $('#percentile-text').textContent = t('percentileText', { p: percentile });
  $('#percentile-marker').style.left = `${percentile}%`;

  const indexed = computePayroll(state.input, indexedScenario(state.current, INFLATION_SINCE_BRACKETS, ''));
  $('#creep-text').textContent = t('creepText', {
    year: BRACKETS_LAST_UPDATED,
    inflation: INFLATION_SINCE_BRACKETS,
    amount: formatEuros(indexed.netAnnualAfterReturn - current.netAnnualAfterReturn, 0),
  });
}

$('#creep-simulate').addEventListener('click', () => {
  state.simulation = indexedScenario(state.current, INFLATION_SINCE_BRACKETS, indexedName());
  trackEvent('simulate-indexed-brackets');
  refreshScenarios();
  $('.card-simulation').scrollIntoView({ behavior: 'smooth' });
});

// ---------------------------------------------------------------------------
// Comparison of several scenarios
// ---------------------------------------------------------------------------

/** Every scenario that can be compared, keyed by a stable id. */
function comparableScenarios() {
  const saved = Object.entries(storage.listScenarios()).map(([name, scenario]) => [
    `saved:${name}`,
    { name, scenario: merge(clone(CURRENT_SCENARIO), scenario) },
  ]);
  return Object.fromEntries([
    ['simulation', { name: `${t('yourSimulation')}: ${scenarioName('simulation')}`, scenario: state.simulation }],
    ...Object.keys(PROPOSALS).map((id) => [
      id,
      { name: proposalName(id), scenario: proposalScenario(id, proposalName(id)) },
    ]),
    ['indexed', { name: indexedName(), scenario: indexedScenario(state.current, INFLATION_SINCE_BRACKETS, '') }],
    ...saved,
  ]);
}

function renderComparison() {
  const options = comparableScenarios();
  state.compare = state.compare.filter((id) => id in options);
  const full = state.compare.length >= MAX_COMPARED;

  $('#compare-options').innerHTML = Object.entries(options)
    .map(([id, { name }]) => {
      const checked = state.compare.includes(id);
      return `<label class="checkbox"><input type="checkbox" value="${escapeHtml(id)}" ${checked ? 'checked' : ''} ${full && !checked ? 'disabled' : ''} /><span>${escapeHtml(name)}</span></label>`;
    })
    .join('');

  const selected = state.compare.map((id, i) => ({ ...options[id], className: `series-${i + 1}` }));
  const current = computePayroll(state.input, state.current);

  if (!selected.length) {
    $('#compare-table').innerHTML = `<p class="muted">${t('compareEmpty')}</p>`;
    $('#compare-chart').replaceChildren();
    $('#compare-legend').innerHTML = '';
    return;
  }

  const rows = [
    { name: scenarioName('current'), result: current },
    ...selected.map((s) => ({ ...s, result: computePayroll(state.input, s.scenario) })),
  ];
  $('#compare-table').innerHTML = `
    <table class="table">
      <thead><tr><th scope="col"></th><th scope="col">${t('rowNetAfterReturn')}</th><th scope="col">${t('difference')}</th><th scope="col">${t('effectiveRate')}</th></tr></thead>
      <tbody>${rows
        .map(({ name, className, result }) => {
          const diff = result.netAnnualAfterReturn - current.netAnnualAfterReturn;
          const swatch = className ? `<span class="swatch ${className}"></span> ` : '';
          return `<tr><th scope="row">${swatch}${escapeHtml(name)}</th><td>${formatEuros(result.netAnnualAfterReturn)}</td><td>${className ? formatSignedEuros(diff) : '—'}</td><td>${formatPercent(result.effectiveRate)}</td></tr>`;
        })
        .join('')}</tbody>
    </table>`;

  const xs = [];
  for (let x = CHART_RANGE.from; x <= CHART_RANGE.to; x += CHART_RANGE.step * 2) xs.push(x);
  const baseline = xs.map((gross) => computePayroll(state.input, state.current, gross).netAnnualAfterReturn);
  const series = selected.map(({ name, className, scenario }) => ({
    name,
    className,
    values: xs.map((gross, i) => computePayroll(state.input, scenario, gross).netAnnualAfterReturn - baseline[i]),
  }));

  $('#compare-legend').innerHTML = series
    .map((s) => `<span class="legend-item"><span class="swatch ${s.className}"></span>${escapeHtml(s.name)}</span>`)
    .join('');
  renderChart($('#compare-chart'), {
    xs,
    series,
    formatValue: (v) => formatSignedEuros(v, 0),
    formatAxis: formatCompactEuros,
    marker: grossAnnualOf(state.input),
  });
}

$('#compare-options').addEventListener('change', ({ target }) => {
  state.compare = target.checked
    ? [...state.compare, target.value].slice(0, MAX_COMPARED)
    : state.compare.filter((id) => id !== target.value);
  persist();
  renderComparison();
});

// ---------------------------------------------------------------------------
// Help tips
// ---------------------------------------------------------------------------

// Tapping a "?" toggles its message (needed on touch screens) without
// activating the label or checkbox that contains it
document.addEventListener('click', (event) => {
  const tip = event.target.closest('.help-tip');
  document.querySelectorAll('.help-tip.open').forEach((open) => open !== tip && open.classList.remove('open'));
  if (!tip) return;
  event.preventDefault();
  tip.classList.toggle('open');
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

function renderRegionOptions() {
  const regions = Object.entries(REGIONAL_SCALES).sort(([, a], [, b]) => a.name.localeCompare(b.name));
  $('#region').innerHTML =
    `<option value="general">${t('regionGeneral')}</option>` +
    regions.map(([key, { name }]) => `<option value="${key}">${name}</option>`).join('');
  $('#region').value = state.input.region;
}

function applyLanguage() {
  setLanguage(state.language);
  renderRegionOptions();
  renderProposalControls();
  languageSelect.value = state.language;
  translateDocument();
  renderSavedScenarios();
  refreshScenarios();
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

/** Flags inconsistent personal details instead of silently ignoring them. */
function renderInputWarnings() {
  const { children, childrenUnder3, familySituation } = state.input;
  const warnings = [
    childrenUnder3 > children && t('warnChildrenUnder3'),
    familySituation === 1 && children === 0 && t('warnSingleParent'),
  ].filter(Boolean);

  const element = $('#input-warning');
  element.hidden = !warnings.length;
  element.textContent = warnings.join(' ');
}

let chartFrame;
let lastResults;
function update() {
  const results = {
    names: scenarioNames(),
    current: computePayroll(state.input, state.current),
    simulation: computePayroll(state.input, state.simulation),
  };
  lastResults = results;
  renderResults({ cards: $('#results'), summary: $('#difference'), sticky: $('#sticky-value') }, results);
  renderBreakdown($('#breakdown'), results);
  renderContext(results.current);
  renderProposalInfo();

  renderInputWarnings();

  const flexWarning = $('#flex-warning');
  flexWarning.hidden = !results.simulation.flexible.overCap;
  flexWarning.textContent = t('flexOverCap', { cap: state.simulation.flexible.inKindCap });

  // The chart evaluates ~280 payrolls, so batch it to the next frame
  cancelAnimationFrame(chartFrame);
  chartFrame = requestAnimationFrame(() => {
    renderComparisonChart();
    renderComparison();
  });
  persist();
}

document.querySelector(`input[name="chartMode"][value="${state.chartMode}"]`).checked = true;
renderInput();
applyLanguage();
