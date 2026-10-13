import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const cacheName = (version) => `salary-calculator-upgrade-${version}`;

// Each test has a separate origin and serves the real app and service worker.
// Only version markers and one failed install response differ between releases.
async function releases() {
  let version = 'previous';
  let interrupted = false;
  const worker = await readFile(new URL('sw.js', root), 'utf8');
  const server = createServer(async (request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname.slice(1) || 'index.html';
    if (interrupted && path === 'js/data/proposals.js') {
      response.writeHead(503).end('Interrupted release');
      return;
    }
    try {
      let body = await readFile(new URL(path, root));
      if (path === 'sw.js') body = worker.replace(/const CACHE = '[^']+';/, `const CACHE = '${cacheName(version)}';`);
      if (['js/tax.js', 'js/data/proposals.js'].includes(path)) {
        body = `${body}\nexport const offlineRelease = '${version}';\n`;
      }
      const type = path.endsWith('.js')
        ? 'text/javascript'
        : path.endsWith('.css')
          ? 'text/css'
          : path.endsWith('.svg')
            ? 'image/svg+xml'
            : path.endsWith('.webmanifest')
              ? 'application/manifest+json'
              : 'text/html';
      response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }).end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    deploy(next, fail = false) {
      version = next;
      interrupted = fail;
    },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function installed(page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
      );
    }
  });
}

async function savedSession(page) {
  await page.fill('#salary', '45000');
  await page.locator('#tab-simulation').click();
  await page.locator('#add-simulation').click();
  await page.fill('#scenario-name', 'Keep through upgrade');
  await page.locator('#settings-simulation [data-shift]').fill('-1');
  await page.locator('#settings-simulation [data-apply]').click();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('net-salary:state'))?.simulations?.[1]?.name))
    .toBe('Keep through upgrade');
  return page.locator('.result-simulation .headline strong').textContent();
}

async function restoredSession(page, expectedNet, version) {
  await expect(page.locator('#salary')).toHaveValue('45000');
  await expect(page.locator('.result-current .headline strong')).toHaveText('2.293,93 €');
  await page.locator('#tab-simulation').click();
  await expect(page.locator('.sim-tab')).toHaveCount(2);
  await expect(page.locator('#scenario-name')).toHaveValue('Keep through upgrade');
  await expect(page.locator('.result-simulation .headline strong')).toHaveText(expectedNet);
  expect(
    await page.evaluate(async () => {
      const tax = await import('/js/tax.js');
      const proposals = await import('/js/data/proposals.js');
      return [tax.offlineRelease, proposals.offlineRelease];
    }),
  ).toEqual([version, version]);
}

test('installed app retires the old cache and preserves simulations through an offline upgrade', async ({
  page,
  context,
}) => {
  const release = await releases();
  try {
    await page.goto(release.url);
    await installed(page);
    const expectedNet = await savedSession(page);
    release.deploy('next');
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await expect
      .poll(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting)))
      .toBe(true);
    expect(await page.evaluate(() => caches.keys())).toEqual(
      expect.arrayContaining([cacheName('previous'), cacheName('next')]),
    );
    // Production intentionally waits until all old tabs close before activation.
    await page.close();
    const reopened = await context.newPage();
    await reopened.goto(release.url);
    await installed(reopened);
    await expect.poll(() => reopened.evaluate(() => caches.keys())).toEqual([cacheName('next')]);
    await context.setOffline(true);
    await reopened.reload();
    await restoredSession(reopened, expectedNet, 'next');
  } finally {
    await release.close();
  }
});

test('interrupted installation keeps the previous worker and saved session usable offline', async ({
  page,
  context,
}) => {
  const release = await releases();
  try {
    await page.goto(release.url);
    await installed(page);
    const expectedNet = await savedSession(page);
    release.deploy('interrupted', true);
    const state = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const update = new Promise((resolve) =>
        registration.addEventListener(
          'updatefound',
          () => {
            const worker = registration.installing;
            worker.addEventListener('statechange', () => {
              if (worker.state === 'redundant' || worker.state === 'installed') resolve(worker.state);
            });
          },
          { once: true },
        ),
      );
      await registration.update();
      return update;
    });
    expect(state).toBe('redundant');
    expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting))).toBe(
      false,
    );
    expect(await page.evaluate(() => caches.keys())).toContain(cacheName('previous'));
    await context.setOffline(true);
    await page.reload();
    await restoredSession(page, expectedNet, 'previous');
  } finally {
    await release.close();
  }
});
