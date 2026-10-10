// App shell only: external analytics and shared personal data are never cached.
const CACHE = 'salary-calculator-v23';
const ASSETS = [
  './manifest.webmanifest',
  './assets/app-icon.svg',
  './',
  './index.html',
  './css/styles.css',
  './js/chart.js',
  './js/calc.js',
  './js/domain/pension.js',
  './js/domain/foral-assessment.js',
  './js/tax.js',
  './js/app.js',
  './js/domain/residence.js',
  './js/data/residence-sources.js',
  './js/presentation/residence.js',
  './js/domain/scenario.js',
  './js/domain/payroll-input.js',
  './js/application/simulation-session.js',
  './js/infrastructure/session-persistence.js',
  './js/infrastructure/analytics.js',
  './js/presentation/payroll-form.js',
  './js/presentation/product-navigation.js',
  './js/format.js',
  './js/political.js',
  './js/defaults.js',
  './js/storage.js',
  './js/settings.js',
  './js/results.js',
  './js/data/proposals.js',
  './js/data/cpi.js',
  './js/data/regions.js',
  './js/data/foral.js',
  './js/data/cities.js',
  './js/foral-tax.js',
  './js/data/foral-family.js',
  './js/domain/foral-family.js',
  './js/domain/fiscal-profile.js',
  './js/domain/housing.js',
  './js/data/housing-rules.js',
  './js/data/salaries.js',
  './js/i18n/ca.js',
  './js/i18n/gl.js',
  './js/i18n/eu.js',
  './js/i18n/index.js',
  './js/i18n/en.js',
  './js/i18n/es.js',
];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith('salary-calculator-') && key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const path = url.pathname;
  const allowed = ASSETS.some((asset) => new URL(asset, self.registration.scope).pathname === path);
  if (!allowed) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(url.pathname, copy)));
        }
        return response;
      })
      .catch(() => caches.match(url.pathname)),
  );
});
