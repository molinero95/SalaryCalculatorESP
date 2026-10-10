import { bindProductNavigation } from './presentation/product-navigation.js';
import { createEventTracker } from './infrastructure/analytics.js';
import {
  createSession,
  sharePayload,
  MAX_SIMULATIONS,
  selectSimulation,
  addSimulation,
  removeSimulation,
} from './application/simulation-session.js';
import { createSessionPersistence } from './infrastructure/session-persistence.js';
import { bindPayrollForm } from './presentation/payroll-form.js';
import { computePayroll, grossAnnualOf } from './calc.js';
import { CURRENT_SCENARIO, clone } from './defaults.js';
import { LANGUAGES, DEFAULT_LANGUAGE, setLanguage, t, translateDocument } from './i18n/index.js';
import { formatEuros, formatSignedEuros, formatPercent, formatCompactEuros, escapeHtml } from './format.js';
import { renderSettings } from './settings.js';
import { renderChart, renderDataTable } from './chart.js';
import { renderResults, renderBreakdown } from './results.js';
import * as storage from './storage.js';
import { renderResidenceOptions, renderResidenceBrackets } from './presentation/residence.js';
import { isForal, unsupportedFiscalProfile, unsupportedFiscalScenario } from './domain/fiscal-profile.js';
import { hasRegionalTenantRule } from './domain/housing.js';
import { PROPOSALS, UNMODELLED_PROPOSALS } from './data/proposals.js';
import { salaryPercentile } from './data/salaries.js';
import { cumulativeInflation, BRACKETS_LAST_UPDATED } from './data/cpi.js';
import { proposalScenario, indexedScenario } from './political.js';

const $ = (selector) => document.querySelector(selector);

const CHART_RANGE = { from: 12000, to: 150000, step: 1000 };
const CHART_TABLE_EVERY = 5;
const INFLATION_SINCE_BRACKETS = Math.round(cumulativeInflation(BRACKETS_LAST_UPDATED - 1));
const TOAST_MS = 2500;
// Restore browser state at the composition boundary.
const shared = location.hash.startsWith('#s=') ? storage.decode(location.hash.slice(3)) : null;
if (shared) history.replaceState(null, '', location.pathname + location.search);
const state = createSession(storage.loadState() ?? {}, shared, { defaultLanguage: DEFAULT_LANGUAGE });

const simulationName = (index) => state.simulations[index].name || `${t('simulation')} ${index + 1}`;
const scenarioName = (kind) =>
  kind === 'current' ? state.current.name || `${t('current')} · 2026` : simulationName(state.active);
const scenarioNames = () => ({ current: scenarioName('current'), simulation: scenarioName('simulation') });

const analytics = createEventTracker(() => window.goatcounter);
const trackEvent = (name) => analytics.track(name);
document.querySelector('script[data-goatcounter]')?.addEventListener('load', () => analytics.flush());

const persistence = createSessionPersistence(storage, state);
const persist = () => persistence.schedule();
window.addEventListener('pagehide', () => persistence.flush());

const navigation = bindProductNavigation(
  $('#product-navigation'),
  () => {
    applyViewVisibility();
    update();
  },
  shared ? 'simulation' : 'salary',
);

function applyViewVisibility() {
  const view = navigation.view;
  $('#results-section').setAttribute('role', view === 'salary' ? 'tabpanel' : 'region');
  $('#results-section').setAttribute('aria-labelledby', view === 'salary' ? 'tab-salary' : 'simulation-title');
  $('#simulation-panel').hidden = view !== 'simulation';
  $('.card-current').hidden = view !== 'simulation';
  $('#proposals-panel').hidden = view !== 'proposals';
  $('#view-description').textContent = t(`view${view[0].toUpperCase()}${view.slice(1)}Description`);
  $('#chart-title').closest('section').hidden ||= view !== 'simulation';
  $('#compare-title').closest('section').hidden ||= view !== 'simulation';
  $('#sticky-summary').hidden ||= view !== 'simulation';
}

// ---------------------------------------------------------------------------
// Personal details form
// ---------------------------------------------------------------------------

const renderInput = bindPayrollForm($('#details-form'), state, update);

// ---------------------------------------------------------------------------
// Chart
// ---------------------------------------------------------------------------

function renderComparisonChart() {
  if (
    unsupportedFiscalProfile(state.input) ||
    unsupportedFiscalScenario(state.input, state.current) ||
    $('#chart-title').closest('section').hidden
  )
    return;
  const xs = [];
  for (let x = CHART_RANGE.from; x <= CHART_RANGE.to; x += CHART_RANGE.step) xs.push(x);

  const baseline = xs.map((gross) => computePayroll(state.input, state.current, gross));
  const isDiff = state.chartMode === 'diff';
  const simulations = state.simulations
    .map((scenario, i) => ({ scenario, i }))
    .filter(({ scenario }) => !unsupportedFiscalScenario(state.input, scenario))
    .map(({ scenario, i }) => ({
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
// Simulation settings
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
  const header = $('.result-simulation header');
  if (!header) return;
  $('.result-simulation .result-sim-tabs')?.remove();
  const tabs = state.simulations
    .map(
      (_, i) =>
        `<button type="button" class="result-sim-tab ${i === state.active ? 'active' : ''}" aria-pressed="${i === state.active}" data-result-simulation="${i}">${escapeHtml(simulationName(i))}</button>`,
    )
    .join('');
  header.insertAdjacentHTML(
    'afterend',
    `<div class="result-sim-tabs" role="group" aria-label="${escapeHtml(t('compareTitle'))}">${tabs}</div>`,
  );
}

$('#results').addEventListener('click', ({ target }) => {
  const tab = target.closest('[data-result-simulation]');
  if (!tab) return;
  selectSimulation(state, Number(tab.dataset.resultSimulation));
  refreshScenarios();
  $(`[data-result-simulation="${state.active}"]`).focus();
});

$('#sim-tabs').addEventListener('click', ({ target }) => {
  const tab = target.closest('[data-simulation]');
  const remove = target.closest('[data-remove-simulation]');
  if (remove) {
    removeSimulation(state, Number(remove.dataset.removeSimulation));
  } else if (tab) {
    selectSimulation(state, Number(tab.dataset.simulation));
  } else if (target.id === 'add-simulation') {
    addSimulation(state);
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
  const payload = sharePayload(state);
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
    info.innerHTML = `<p>${t(proposal.note)}</p><p class="muted">${t('proposalSource')}: ${sourceLink(proposal)}</p><p class="muted">${t('proposalVerified')}: ${escapeHtml(proposal.verifiedAt)}${proposal.status === 'partial' ? ` · ${t('proposalPartial')}` : ''}</p>`;
  const simulationInfo = $('#simulation-proposal-info');
  simulationInfo.hidden = !proposal;
  simulationInfo.innerHTML = proposal ? info.innerHTML : '';
}

$('#proposal-select').addEventListener('change', ({ target }) => {
  state.simulation = target.value
    ? proposalScenario(target.value, proposalName(target.value))
    : { ...clone(state.current), name: '', proposal: '' };
  navigation.select('simulation', { focus: true });
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

  $('#creep-text').parentElement.hidden = isForal(state.input.region);
  if (isForal(state.input.region)) return;
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
  navigation.select('simulation');
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
    ...selected.map((s) => ({
      ...s,
      result: unsupportedFiscalScenario(state.input, s.scenario) ? null : computePayroll(state.input, s.scenario),
    })),
  ];
  $('#compare-table').innerHTML = `
    <table class="table">
      <thead><tr><th scope="col"></th><th scope="col">${t('rowNetAfterReturn')}</th><th scope="col">${t('difference')}</th><th scope="col">${t('effectiveRate')}</th></tr></thead>
      <tbody>${rows
        .map(({ name, className, result }) => {
          if (!result)
            return `<tr><th scope="row">${escapeHtml(name)}</th><td colspan="3">${t('foralScenarioUnsupported')}</td></tr>`;
          const diff = result.netAnnualAfterReturn - current.netAnnualAfterReturn;
          const swatch = className ? `<span class="swatch ${className}"></span> ` : '';
          return `<tr><th scope="row">${swatch}${escapeHtml(name)}</th><td>${formatEuros(result.netAnnualAfterReturn)}</td><td>${className ? formatSignedEuros(diff) : '—'}</td><td>${result.effectiveRate === null ? '—' : formatPercent(result.effectiveRate)}</td></tr>`;
        })
        .join('')}</tbody>
    </table>`;

  const xs = [];
  for (let x = CHART_RANGE.from; x <= CHART_RANGE.to; x += CHART_RANGE.step * 2) xs.push(x);
  const baseline = xs.map((gross) => computePayroll(state.input, state.current, gross).netAnnualAfterReturn);
  const series = selected
    .filter(({ scenario }) => !unsupportedFiscalScenario(state.input, scenario))
    .map(({ name, className, scenario }) => ({
      name,
      className,
      values: xs.map((gross, i) => computePayroll(state.input, scenario, gross).netAnnualAfterReturn - baseline[i]),
    }));

  $('#compare-chart').hidden = series.length === 0;
  $('#compare-chart').innerHTML = '';
  $('#compare-legend').innerHTML = series
    .map((s) => `<span class="legend-item"><span class="swatch ${s.className}"></span>${escapeHtml(s.name)}</span>`)
    .join('');
  if (!series.length) return;
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
  renderResidenceOptions($('#details-form'), state.input);
}

function renderLocationBrackets() {
  renderResidenceBrackets($('#location-brackets'), state.input);
}

function applyLanguage() {
  setLanguage(state.language);
  renderRegionOptions();
  renderProposalControls();
  languageSelect.value = state.language;
  translateDocument();
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
  cancelAnimationFrame(chartFrame);
  renderLocationBrackets();
  const foral = isForal(state.input.region);
  const basque = foral && state.input.region !== 'navarra';
  $('#foral-benefits-help').hidden = !foral;
  $('#foral-benefits-help').textContent = t(basque ? 'foralBenefitsBasqueHelp' : 'foralBenefitsNavarraHelp');
  $('#foral-annual-fields').hidden = !foral;
  const tenure = state.input.housingTenure;
  $('#housing-fields').hidden = foral;
  $('#housingRentPaid-field').hidden = tenure !== 'tenant';
  $('#housingLeaseBefore2015-field').hidden = tenure !== 'tenant';
  $('#housingInvestment-field').hidden = tenure !== 'owner';
  $('#housingPurchaseBefore2013-field').hidden = tenure !== 'owner';
  $('#housingLoanWithholding-field').hidden = tenure !== 'owner' || !state.input.housingPurchaseBefore2013;
  // Regional tenant deductions: only the communities with a calculated rule ask for their facts.
  const regionalTenant = tenure === 'tenant' && hasRegionalTenantRule(state.input.region);
  $('#housingSavingsBase-field').hidden = tenure !== 'tenant';
  for (const field of ['housingRentAid', 'housingLargeFamily', 'housingSingleParent', 'housingRegionalConfirmed'])
    $(`#${field}-field`).hidden = !regionalTenant;
  $('#housingTwoMinorChildren-field').hidden = !regionalTenant || state.input.region !== 'galicia';
  $('#housingFamilyUnitConfirmed-field').hidden = !regionalTenant || state.input.region !== 'madrid';
  $('#housingFamilyUnitOtherBase-field').hidden =
    !regionalTenant || state.input.region !== 'madrid' || !state.input.housingFamilyUnitConfirmed;
  $('#foralExemptIncome-field').hidden = state.input.region !== 'navarra';
  $('#foralRentalInsurance-field').hidden = !basque;
  $('label[for="foralRentalExpenses"]').textContent = t(basque ? 'foralRentalExpensesBasque' : 'foralRentalExpenses');
  $('#foral-ascendants-under65-field').hidden = !basque;
  const hasAscendants =
    state.input.dependents65 + state.input.dependents75 + (basque ? state.input.foralAscendantsUnder65 : 0) > 0;
  $('#foral-ascendant-claimants-field').hidden = !foral || !hasAscendants;
  $('#foral-ascendants-field').hidden = !foral || !hasAscendants;
  $('#foral-ascendants-help').textContent = t(basque ? 'foralAscendantsBasqueHelp' : 'foralAscendantsNavarraHelp');
  $('label[for="dependents65"]').textContent = t(
    state.input.region === 'navarra' ? 'dependents65Navarra' : 'dependents65',
  );
  $('label[for="dependents75"]').textContent = t(
    state.input.region === 'navarra' ? 'dependents75Navarra' : 'dependents75',
  );
  $('#foral-under6-field').hidden = !basque;
  $('#foral-age6to15-field').hidden = state.input.region !== 'alava';
  $('#foral-children-field').hidden = !foral || state.input.children === 0;
  $('#foral-mobility-field').hidden = !basque || state.input.disability !== 33;
  $('#foral-rural-field').hidden = state.input.region !== 'alava' || (state.input.children === 0 && !hasAscendants);
  $('label[for="children"]').textContent = t(
    foral ? (state.input.region === 'navarra' ? 'childrenNavarra' : 'childrenBasque') : 'children',
  );
  $('#foral-children-help').textContent = t(basque ? 'foralChildrenBasqueHelp' : 'foralChildrenNavarraHelp');
  const unsupportedReference = unsupportedFiscalScenario(state.input, state.current);
  const unsupportedSimulation = unsupportedFiscalScenario(state.input, state.simulation);
  const unsupported = unsupportedFiscalProfile(state.input) || unsupportedReference;
  const scope = $('#fiscal-scope');
  scope.hidden = !isForal(state.input.region);
  scope.textContent = t(
    unsupportedReference ? 'foralScenarioUnsupported' : unsupported ? 'foralUnsupported' : 'foralScope',
  );
  const outputSections = ['#results', '#context-title', '#chart-title', '#compare-title', '#breakdown-title'];
  for (const selector of outputSections) $(selector).closest('section').hidden = unsupported;
  $('#chart-title').closest('section').hidden =
    unsupported ||
    !state.simulations.some((scenario) => !unsupportedFiscalScenario(state.input, scenario)) ||
    (foral &&
      [
        'foralRentalGross',
        'foralActivityIncome',
        'foralSavingsIncome',
        'foralExemptIncome',
        'foralOtherWithholding',
      ].some((key) => state.input[key] > 0));
  $('#sticky-summary').hidden = unsupported;
  applyViewVisibility();
  for (const id of ['share-whatsapp', 'share-x', 'share-native'])
    $(`#${id}`).disabled = unsupported || unsupportedSimulation;
  renderInputWarnings();
  if (unsupported) {
    lastResults = null;
    renderResultTabs();
    renderProposalInfo();
    persist();
    return;
  }
  const results = {
    names: scenarioNames(),
    current: computePayroll(state.input, state.current),
    simulation: unsupportedSimulation ? null : computePayroll(state.input, state.simulation),
  };
  lastResults = results;
  renderResults({ cards: $('#results'), summary: $('#difference'), sticky: $('#sticky-value') }, results);
  renderResultTabs();
  $('#difference').hidden = unsupportedSimulation || navigation.view !== 'simulation';
  $('#sticky-summary').hidden = unsupportedSimulation || navigation.view !== 'simulation';
  $('#breakdown-title').closest('section').hidden = unsupportedSimulation && navigation.view !== 'salary';
  renderBreakdown($('#breakdown'), { ...results, simulation: results.simulation ?? results.current });
  renderContext(results.current);
  renderProposalInfo();

  renderInputWarnings();

  const flexWarning = $('#flex-warning');
  flexWarning.hidden = !results.simulation?.flexible.overCap;
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
navigation.select(navigation.view);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
