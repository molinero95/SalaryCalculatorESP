import { computePayroll, grossAnnualOf } from './calc.js';
import { CURRENT_SCENARIO, DEFAULT_INPUT, clone } from './defaults.js';
import { LANGUAGES, DEFAULT_LANGUAGE, setLanguage, t, translateDocument } from './i18n/index.js';
import { formatEuros, formatSignedEuros, formatPercent, formatCompactEuros, escapeHtml } from './format.js';
import { renderSettings } from './settings.js';
import { renderChart, renderDataTable } from './chart.js';
import { renderResults, renderBreakdown } from './results.js';
import * as storage from './storage.js';
import { REGIONAL_SCALES } from './data/regions.js';
import { PROPOSALS, UNMODELLED_PROPOSALS } from './data/proposals.js';
import { salaryPercentile } from './data/salaries.js';
import { cumulativeInflation, BRACKETS_LAST_UPDATED } from './data/cpi.js';
import { proposalScenario, indexedScenario } from './political.js';

const $ = (selector) => document.querySelector(selector);

const CHART_RANGE = { from: 12000, to: 150000, step: 1000 };
const CHART_TABLE_EVERY = 5;
const MAX_SIMULATIONS = 5;
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
  brackets.length <= 100 &&
  brackets.every(
    (b, i) =>
      Number.isFinite(b?.rate) &&
      b.rate >= 0 &&
      b.rate <= 100 &&
      (b.upTo === null
        ? i === brackets.length - 1
        : Number.isFinite(b.upTo) && b.upTo > (i ? brackets[i - 1].upTo : 0)),
  ) &&
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
  if (typeof base === 'number') return Number.isFinite(override) && override >= 0 ? override : base;
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

const toScenario = (override) => merge(clone(CURRENT_SCENARIO), override);

/** Simulations from saved or imported data (also accepts the old single `simulation`). */
function simulationList(source) {
  const list = Array.isArray(source?.simulations)
    ? source.simulations.filter(isPlainObject).slice(0, MAX_SIMULATIONS).map(toScenario)
    : [];
  return list.length ? list : [toScenario(isPlainObject(source?.simulation) ? source.simulation : {})];
}

/** `state.simulation` always points at the active tab (not saved: `simulations` is). */
function defineActiveSimulation(target) {
  target.active = Math.min(Math.max(0, Math.floor(target.active)), target.simulations.length - 1);
  Object.defineProperty(target, 'simulation', {
    get: () => target.simulations[target.active],
    set: (scenario) => {
      target.simulations[target.active] = scenario;
    },
    enumerable: false,
    configurable: true,
  });
}

function normalizeInput(state) {
  state.input.period = oneOf(state.input.period, ['annual', 'perPayment']);
  state.input.contract = oneOf(state.input.contract, ['permanent', 'temporary']);
  state.input.payments = oneOf(state.input.payments, [14, 12]);
  state.input.familySituation = oneOf(state.input.familySituation, [3, 2, 1]);
  state.input.disability = oneOf(state.input.disability, [0, 33, 65]);
  state.input.partTime = Math.min(100, Math.max(1, state.input.partTime));
  state.input.region = oneOf(state.input.region, ['general', ...Object.keys(REGIONAL_SCALES)]);
  for (const period of Object.keys(AMOUNT_FIELDS))
    state.input[period] = oneOf(state.input[period], ['annual', 'monthly']);
  for (const field of NUMERIC_INPUTS) {
    const element = document.querySelector(`input[name="${field}"]`);
    if (!element) continue;
    const minimum = element.hasAttribute('min') ? Number(element.min) : 0;
    const maximum = element.hasAttribute('max') ? Number(element.max) : 1e9;
    let value = Math.min(maximum, Math.max(minimum, state.input[field]));
    if (element.step !== 'any' && !['salary', ...Object.keys(PERIOD_OF_AMOUNT)].includes(field))
      value = Math.floor(value);
    state.input[field] = value;
  }
}

function initialState() {
  const defaults = {
    language: DEFAULT_LANGUAGE,
    chartMode: 'diff',
    input: clone(DEFAULT_INPUT),
    current: clone(CURRENT_SCENARIO),
    active: 0,
  };

  // A shared link (#s=…) is applied on top of the locally saved state, so the
  // recipient keeps their own personal details
  const shared = location.hash.startsWith('#s=') ? storage.decode(location.hash.slice(3)) : null;
  if (shared) history.replaceState(null, '', location.pathname + location.search);

  const saved = storage.loadState() ?? {};
  const state = merge(merge(defaults, saved), shared ?? {});

  // Simulations live in a list; a shared simulation opens as a new tab
  state.simulations = simulationList(saved);
  if (isPlainObject(shared?.simulation)) {
    state.simulations = [...state.simulations.slice(0, MAX_SIMULATIONS - 1), toScenario(shared.simulation)];
    state.active = state.simulations.length - 1;
  }
  defineActiveSimulation(state);

  state.chartMode = oneOf(state.chartMode, ['diff', 'rate']);
  normalizeInput(state);
  return state;
}

const state = initialState();

const simulationName = (index) => state.simulations[index].name || `${t('simulation')} ${index + 1}`;
const scenarioName = (kind) =>
  kind === 'current' ? state.current.name || `${t('current')} · 2026` : simulationName(state.active);
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

// Flush pending changes when the page is closed or reloaded
window.addEventListener('pagehide', () => {
  clearTimeout(saveTimer);
  storage.saveState(state);
});

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

  const baseline = xs.map((gross) => computePayroll(state.input, state.current, gross));
  const isDiff = state.chartMode === 'diff';
  const simulations = state.simulations.map((scenario, i) => ({
    name: simulationName(i),
    className: `series-${i + 2}`,
    values: xs.map((gross, j) => {
      const result = computePayroll(state.input, scenario, gross);
      return isDiff ? result.netAnnualAfterReturn - baseline[j].netAnnualAfterReturn : result.effectiveRate;
    }),
  }));
  const series = isDiff
    ? simulations
    : [
        {
          name: scenarioName('current'),
          className: 'series-1',
          values: baseline.map((result) => result.effectiveRate),
        },
        ...simulations,
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
    series.length > 0
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

function renderSimulationTabs() {
  const tabs = state.simulations.map((_, i) => {
    const active = i === state.active;
    const remove =
      state.simulations.length > 1
        ? `<button type="button" class="tab-remove" data-remove-simulation="${i}" aria-label="${t('removeSimulation')}" title="${t('removeSimulation')}">✕</button>`
        : '';
    return `<div class="sim-tab ${active ? 'active' : ''}"><button type="button" aria-pressed="${active}" data-simulation="${i}">${escapeHtml(simulationName(i))}</button>${remove}</div>`;
  });
  const add =
    state.simulations.length < MAX_SIMULATIONS
      ? `<button type="button" class="sim-add" id="add-simulation">${t('newSimulation')}</button>`
      : '';
  $('#sim-tabs').innerHTML = tabs.join('') + add;
}

function renderResultTabs() {
  const tabs = state.simulations
    .map(
      (_, i) =>
        `<button type="button" class="result-sim-tab ${i === state.active ? 'active' : ''}" aria-pressed="${i === state.active}" data-result-simulation="${i}">${escapeHtml(simulationName(i))}</button>`,
    )
    .join('');
  $('.result-simulation header').insertAdjacentHTML(
    'afterend',
    `<div class="result-sim-tabs" role="group" aria-label="${escapeHtml(t('compareTitle'))}">${tabs}</div>`,
  );
}

$('#results').addEventListener('click', ({ target }) => {
  const tab = target.closest('[data-result-simulation]');
  if (!tab) return;
  state.active = Number(tab.dataset.resultSimulation);
  refreshScenarios();
  $(`[data-result-simulation="${state.active}"]`).focus();
});

$('#sim-tabs').addEventListener('click', ({ target }) => {
  const tab = target.closest('[data-simulation]');
  const remove = target.closest('[data-remove-simulation]');
  if (remove) {
    state.simulations.splice(Number(remove.dataset.removeSimulation), 1);
    state.active = Math.min(state.active, state.simulations.length - 1);
  } else if (tab) {
    state.active = Number(tab.dataset.simulation);
  } else if (target.id === 'add-simulation') {
    state.simulations.push({ ...clone(state.current), name: '', proposal: '' });
    state.active = state.simulations.length - 1;
    trackEvent('add-simulation');
  } else {
    return;
  }
  refreshScenarios();
});

function renderSettingsPanels() {
  renderSimulationTabs();
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
  renderSimulationTabs();
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
  const { input, current, simulations } = state;
  const blob = new Blob([JSON.stringify({ input, current, simulations }, null, 2)], { type: 'application/json' });
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
    if (!isPlainObject(imported?.simulation) && !Array.isArray(imported?.simulations)) {
      throw new Error('Invalid scenario file');
    }
    state.input = merge(state.input, imported.input ?? {});
    normalizeInput(state);
    state.current = toScenario(imported.current ?? {});
    state.simulations = simulationList(imported);
    state.active = 0;
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
  $('#other-proposals').innerHTML = UNMODELLED_PROPOSALS.map(
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

function renderComparison() {
  const selected = state.simulations.map((scenario, i) => ({
    name: simulationName(i),
    scenario,
    className: `series-${i + 2}`,
  }));
  const current = computePayroll(state.input, state.current);

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
  renderResultTabs();
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
