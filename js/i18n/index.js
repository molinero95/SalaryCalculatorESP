import es from './es.js';
import ca from './ca.js';
import eu from './eu.js';
import gl from './gl.js';
import en from './en.js';

export const LANGUAGES = {
  es: { name: 'Castellano', locale: 'es-ES', messages: es },
  ca: { name: 'Català', locale: 'ca-ES', messages: ca },
  eu: { name: 'Euskara', locale: 'eu-ES', messages: eu },
  gl: { name: 'Galego', locale: 'gl-ES', messages: gl },
  en: { name: 'English', locale: 'en-GB', messages: en },
};

export const DEFAULT_LANGUAGE = 'es';

let current = DEFAULT_LANGUAGE;

export function setLanguage(code) {
  current = code in LANGUAGES ? code : DEFAULT_LANGUAGE;
  document.documentElement.lang = current;
}

export const getLocale = () => LANGUAGES[current].locale;

/** Returns the message for `key`, interpolating `{placeholders}` from `vars`. */
export function t(key, vars = {}) {
  const message = LANGUAGES[current].messages[key] ?? LANGUAGES[DEFAULT_LANGUAGE].messages[key] ?? key;
  return message.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
}

/** Translates every element annotated with `data-i18n*` attributes. */
export function translateDocument(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  document.title = t('appTitle');
}
