import { test, expect } from '@playwright/test';
import { chooseResidence } from './residence-helper.js';

test('historical Podemos component changes annual assessment without changing payroll', async ({ page }) => {
  await page.goto('/');
  await chooseResidence(page, 'region:madrid');
  await page.locator('#tab-proposals').click();
  await page.selectOption('#proposal-select', 'podemos2019');
  await expect(page.locator('#simulation-proposal-info')).toContainText('Escenario histórico parcial');
  await expect(page.locator('#simulation-proposal-info')).toContainText('La retención de nómina no cambia');
  await expect(page.locator('.result-simulation .headline strong')).toHaveText('1.628,50 €');
  await expect(page.locator('#difference')).toContainText('69,00 €');
  await chooseResidence(page, 'region:navarra');
  await expect(page.locator('.result-simulation .warning')).toContainText('Esta simulación no está modelada');
});

test('PP deflation stays informational with its primary source and no fabricated factor', async ({ page }) => {
  await page.goto('/');
  await page.locator('#tab-proposals').click();
  await page.locator('.other-proposals summary').click();
  await expect(page.locator('#other-proposals')).toContainText('20 de febrero de 2025');
  await expect(page.locator('#other-proposals')).toContainText('No fija el porcentaje');
  await expect(page.locator('#other-proposals a[href*="BOCG_D_15_219_2014"]')).toBeVisible();
  await expect(page.locator('#proposal-select option[value="pp2025deflation"]')).toHaveCount(0);
});
