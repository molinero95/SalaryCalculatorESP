import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

async function importJson(page, value) {
  await page.locator('#import').setInputFiles({
    name: 'scenario.json',
    mimeType: 'application/json',
    buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)),
  });
}

test('malformed imports show an error without changing the payslip', async ({ page }) => {
  const before = await page.locator('.result-current .headline strong').textContent();
  await importJson(page, '{broken');
  await expect(page.locator('#toast')).toBeVisible();
  await expect(page.locator('.result-current .headline strong')).toHaveText(before);
});

test('import normalizes personal ranges and rejects invalid bracket order', async ({ page }) => {
  await importJson(page, {
    input: { salary: -500, children: 10000000, partTime: 0, region: 'unknown', payments: 99 },
    simulation: {
      incomeTax: {
        brackets: [
          { upTo: 20000, rate: 20 },
          { upTo: 10000, rate: 10 },
          { upTo: null, rate: 30 },
        ],
      },
    },
  });
  await expect(page.locator('#salary')).toHaveValue('30000');
  await expect(page.locator('#children')).toHaveValue('20');
  await expect(page.locator('#partTime')).toHaveValue('1');
  await expect(page.locator('#region')).toHaveValue('general');
  await expect(page.locator('#chart .line')).toHaveCount(1);
  const brackets = await page.locator('#settings-simulation input[data-rate]').count();
  expect(brackets).toBe(6);
});

test('imported HTML names remain literal text and never execute', async ({ page }) => {
  const name = '<img src=x onerror="window.injected=true">';
  await importJson(page, { simulation: { name } });
  await expect(page.locator('#compare-table')).toContainText(name);
  await expect(page.locator('#compare-table img')).toHaveCount(0);
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
});

for (const language of ['es', 'ca', 'eu', 'gl', 'en']) {
  test(`accessible, responsive interface and all simulation labels in ${language}`, async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.selectOption('#language', language);
    await page.locator('#add-simulation').click();
    await page.fill('#scenario-name', 'Scenario 2');
    await expect(page.locator('#chart-legend')).toContainText('Scenario 2');
    await page.evaluate(() =>
      document.querySelectorAll('details').forEach((d) => {
        d.open = true;
      }),
    );
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(audit.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await testInfo.attach(`layout-${language}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });
}

test('salary input supports keyboard operation and visibly updates', async ({ page }) => {
  const salary = page.locator('#salary');
  await salary.focus();
  await expect(salary).toBeFocused();
  await salary.press('ControlOrMeta+A');
  await salary.pressSequentially('45000');
  await salary.press('Tab');
  await expect(page.locator('.result-current .headline strong')).toHaveText('2.293,61 €');
});
