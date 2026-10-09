import { getLocale } from './i18n/index.js';

const formatters = new Map();

function formatter(options) {
  const key = getLocale() + JSON.stringify(options);
  if (!formatters.has(key)) formatters.set(key, new Intl.NumberFormat(getLocale(), { useGrouping: 'always', ...options }));
  return formatters.get(key);
}

const currency = (digits) => ({
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: digits,
  maximumFractionDigits: digits,
});

export const formatEuros = (value, digits = 2) => formatter(currency(digits)).format(value);

export const formatSignedEuros = (value, digits = 2) => (value > 0.004 ? '+' : '') + formatEuros(value, digits);

export const formatCompactEuros = (value) =>
  formatter({ style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 }).format(value);

export const formatNumber = (value, digits = 0) =>
  formatter({ minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);

export const formatPercent = (value, digits = 2) => `${formatNumber(value, digits)} %`;

export const formatPoints = (value) => `${value > 0.004 ? '+' : ''}${formatNumber(value, 2)} pp`;

export const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
