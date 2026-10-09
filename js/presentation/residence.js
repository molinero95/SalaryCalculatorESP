import { CITIES } from '../data/cities.js';
import { residenceSources } from '../data/residence-sources.js';
import { RESIDENCE_REGIONS, residenceValue } from '../domain/residence.js';
import { FORAL_TERRITORIES } from '../data/foral.js';
import { GENERAL_REGIONAL_SCALE, CURRENT_SCENARIO, combineScales } from '../defaults.js';
import { t } from '../i18n/index.js';
import { escapeHtml, formatEuros, formatPercent } from '../format.js';

export function renderResidenceOptions(select, input) {
  const regions = Object.entries(RESIDENCE_REGIONS).sort(([, a], [, b]) => a.name.localeCompare(b.name, 'es'));
  select.innerHTML =
    `<option value="region:general">${escapeHtml(t('regionGeneral'))}</option>` +
    regions
      .map(([key, { name }]) => {
        const cities = CITIES.filter(({ region }) => region === key).sort((a, b) => a.name.localeCompare(b.name, 'es'));
        return `<optgroup label="${escapeHtml(name)}"><option value="region:${key}">${escapeHtml(name)} · ${escapeHtml(t('residenceOtherCity'))}</option>${cities.map(({ id, name: cityName }) => `<option value="city:${id}">${escapeHtml(name)} · ${escapeHtml(cityName)}</option>`).join('')}</optgroup>`;
      })
      .join('');
  select.value = residenceValue(input);
}

export function renderResidenceBrackets(element, input) {
  const foral = FORAL_TERRITORIES[input.region];
  const region = RESIDENCE_REGIONS[input.region];
  const stateScale = combineScales(
    CURRENT_SCENARIO.incomeTax.brackets,
    GENERAL_REGIONAL_SCALE.map((bracket) => ({ ...bracket, rate: -bracket.rate })),
  );
  const brackets = foral?.brackets ?? combineScales(stateScale, region?.brackets ?? GENERAL_REGIONAL_SCALE);
  const name = region?.name ?? t('regionGeneral');
  const city = CITIES.find(({ id, region }) => id === input.city && region === input.region);
  let from = 0;
  element.innerHTML = `<p><strong>${escapeHtml(city ? `${city.name} → ${name}` : name)}</strong> · ${escapeHtml(t(foral ? 'residenceForal' : 'residenceCommon'))} · 2026</p><p class="help">${escapeHtml(t('locationBracketsHelp'))}</p><table><thead><tr><th>${t('locationBase')}</th><th>${t('locationRate')}</th></tr></thead><tbody>${brackets
    .map(({ upTo, rate }) => {
      const label = upTo === null ? `${formatEuros(from)} +` : `${formatEuros(from)} – ${formatEuros(upTo)}`;
      from = upTo;
      return `<tr><td>${label}</td><td>${formatPercent(rate)}</td></tr>`;
    })
    .join('')}</tbody></table><p class="help">${escapeHtml(t('residenceSources'))}: ${residenceSources(input.region)
    .map(
      ({ label, url }) =>
        `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`,
    )
    .join(' · ')}</p><p class="help">${escapeHtml(t('residenceScope'))}</p>`;
}
