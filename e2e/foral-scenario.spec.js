import { test, expect } from '@playwright/test';
import { chooseResidence } from './residence-helper.js';

for (const region of ['navarra', 'bizkaia', 'gipuzkoa', 'alava']) {
  test(`${region}: unavailable Vox scenario recovers in Madrid and with current rules`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await chooseResidence(page, `region:${region}`);
    await page.locator('#tab-proposals').click();
    await page.selectOption('#proposal-select', 'vox2024');
    await expect(page.locator('.result-current .headline strong')).toBeVisible();
    await expect(page.locator('.result-simulation')).toContainText('Esta simulación no está modelada');
    await expect(page.locator('.result-simulation .headline')).toHaveCount(0);
    await expect(page.locator('#difference')).toBeHidden();
    await expect(page.locator('#sticky-summary')).toBeHidden();
    await expect(page.locator('#breakdown')).toBeHidden();
    await expect(page.locator('#compare-table')).toContainText('Esta simulación no está modelada');
    await expect(page.locator('#share-whatsapp')).toBeDisabled();
    await page.locator('#tab-salary').click();
    await expect(page.locator('#breakdown')).toBeVisible();
    await expect(page.locator('#creep-simulate')).toBeHidden();
    await page.locator('#tab-simulation').click();
    await chooseResidence(page, 'region:madrid');
    await expect(page.locator('.result-simulation .headline strong')).toHaveText('1.937,07 €');
    await expect(page.locator('#difference')).toBeVisible();
    await expect(page.locator('#breakdown')).toBeVisible();
    await chooseResidence(page, `region:${region}`);
    await page.locator('#copy-current').click();
    await expect(page.locator('.result-simulation .headline strong')).toBeVisible();
    await expect(page.locator('.result-simulation .warning')).toHaveCount(0);
    await expect(page.locator('#breakdown')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('restored and offline unsupported simulation does not resurrect fake results', async ({ page, context }) => {
  await page.goto('/');
  await page.locator('#tab-proposals').click();
  await page.selectOption('#proposal-select', 'vox2024');
  await chooseResidence(page, 'region:navarra');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
      );
  });
  await context.setOffline(true);
  try {
    await page.reload();
    await page.locator('#tab-simulation').click();
    await expect(page.locator('.result-simulation')).toContainText('Esta simulación no está modelada');
    await expect(page.locator('.result-simulation .headline')).toHaveCount(0);
    await expect(page.locator('#difference')).toBeHidden();
    await page.selectOption('#language', 'en');
    await expect(page.locator('.result-simulation')).toContainText('This simulation is not modelled');
  } finally {
    await context.setOffline(false);
  }
});
