import { chooseResidence } from './residence-helper.js';
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('a Madrid tenant sees the regional rent deduction only after confirming its requirements', async ({ page }) => {
  await chooseResidence(page, 'region:madrid');
  await page.fill('#salary', '30000');
  await page.fill('#age', '30');
  await page.locator('#housing-fields > summary').click();
  await page.selectOption('#housingTenure', 'tenant');
  await page.fill('#housingRentPaid', '9600');
  await expect(page.locator('#housingRegionalConfirmed-field')).toBeVisible();
  await expect(page.locator('#housingFamilyUnitConfirmed-field')).toBeVisible();
  await expect(page.locator('#housingTwoMinorChildren-field')).toBeHidden();
  await expect(page.locator('#housingFamilyUnitOtherBase-field')).toBeHidden();
  const breakdown = page.locator('body');
  await expect(breakdown).not.toContainText('Deducciones por vivienda');

  await page.locator('#housingRegionalConfirmed-field').click();
  await expect(breakdown).not.toContainText('Deducciones por vivienda');
  await page.locator('#housingFamilyUnitConfirmed-field').click();
  await expect(page.locator('#housingFamilyUnitOtherBase-field')).toBeVisible();
  await expect(breakdown).toContainText('Deducciones por vivienda');
  await expect(breakdown).toContainText('1.237,20');

  await page.reload();
  await expect(page.locator('#housingRegionalConfirmed')).toBeChecked();
  await expect(page.locator('#housingRentPaid')).toHaveValue('9600');
});

test('communities without a calculated tenant rule do not ask for its facts', async ({ page }) => {
  await chooseResidence(page, 'region:castillaLeon');
  await page.locator('#housing-fields > summary').click();
  await page.selectOption('#housingTenure', 'tenant');
  await expect(page.locator('#housingRentPaid-field')).toBeVisible();
  await expect(page.locator('#housingSavingsBase-field')).toBeVisible();
  await expect(page.locator('#housingRegionalConfirmed-field')).toBeHidden();
  await chooseResidence(page, 'region:galicia');
  await expect(page.locator('#housingRegionalConfirmed-field')).toBeVisible();
  await expect(page.locator('#housingTwoMinorChildren-field')).toBeVisible();
  await expect(page.locator('#housingFamilyUnitConfirmed-field')).toBeHidden();
});

test('changing the community clears region-specific housing attestations', async ({ page }) => {
  await chooseResidence(page, 'region:madrid');
  await page.locator('#housing-fields > summary').click();
  await page.selectOption('#housingTenure', 'tenant');
  await page.locator('#housingRegionalConfirmed-field').click();
  await page.locator('#housingFamilyUnitConfirmed-field').click();
  await expect(page.locator('#housingRegionalConfirmed')).toBeChecked();
  await chooseResidence(page, 'region:castillaLaMancha');
  await expect(page.locator('#housingRegionalConfirmed')).not.toBeChecked();
  await expect(page.locator('#housingLeaseDays-field')).toBeVisible();
  await expect(page.locator('#housingLeaseDays')).toHaveValue('365');
  await expect(page.locator('#housingCoTenants')).toHaveValue('1');
});

test('a young Madrid buyer gets the interest deduction after confirming its requirements', async ({ page }) => {
  await chooseResidence(page, 'region:madrid');
  await page.fill('#salary', '30000');
  await page.fill('#age', '29');
  await page.locator('#housing-fields > summary').click();
  await page.selectOption('#housingTenure', 'owner');
  await expect(page.locator('#housingInterestPaid-field')).toBeVisible();
  await expect(page.locator('#housingNewBuild-field')).toBeHidden();
  await expect(page.locator('#housingProtectedDwelling-field')).toBeHidden();
  await page.fill('#housingInvestment', '8000');
  await page.fill('#housingInterestPaid', '3000');
  const body = page.locator('body');
  await expect(body).not.toContainText('Deducciones por vivienda');
  await page.locator('#housingBuyerConfirmed-field').click();
  await expect(body).toContainText('Deducciones por vivienda');
  await expect(body).toContainText('750,00');
  await chooseResidence(page, 'region:murcia');
  await expect(page.locator('#housingBuyerConfirmed')).not.toBeChecked();
  await expect(page.locator('#housingNewBuild-field')).toBeVisible();
  await expect(page.locator('#housingInterestPaid-field')).toBeHidden();
});
