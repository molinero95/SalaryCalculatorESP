import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('shows the current payslip by default', async ({ page }) => {
  await expect(page.locator('.result-current .headline strong')).toHaveText('1.628,50 €');
  await expect(page.locator('#difference')).toHaveClass(/neutral/);
});

test('recalculates when the salary changes', async ({ page }) => {
  await page.fill('#salary', '45000');
  await expect(page.locator('.result-current .headline strong')).toHaveText('2.293,61 €');
});

test('lowering every bracket shows a positive difference', async ({ page }) => {
  const editor = page.locator('#settings-simulation');
  await editor.locator('[data-shift]').fill('-1');
  await editor.locator('[data-apply]').click();

  await expect(page.locator('#difference')).toHaveClass(/positive/);
  await expect(page.locator('#sticky-value')).toContainText('+');
  await expect(editor.locator('[data-preset]')).toHaveValue('');
});

test('selecting a bracket template keeps it selected', async ({ page }) => {
  const preset = page.locator('#settings-simulation [data-preset]');
  await preset.selectOption('flat20');
  await expect(preset).toHaveValue('flat20');
});

test('restores a scenario from a shared link', async ({ page }) => {
  const hash = await page.evaluate(async () => {
    const { encode } = await import('/js/storage.js');
    const { CURRENT_SCENARIO, DEFAULT_INPUT } = await import('/js/defaults.js');
    const simulation = structuredClone(CURRENT_SCENARIO);
    simulation.name = 'Rebaja';
    simulation.incomeTax.personalAllowance = 7000;
    return encode({ input: { ...DEFAULT_INPUT, salary: 40000 }, simulation });
  });

  // A different query string forces a real navigation instead of a hash change
  await page.goto(`/?shared#s=${hash}`);
  await expect(page.locator('#salary')).toHaveValue('40000');
  await expect(page.locator('.result-simulation h3')).toHaveText('Rebaja');
  await expect(page.locator('#difference')).toHaveClass(/positive/);
});

test('switches language', async ({ page }) => {
  await page.selectOption('#language', 'en');
  await expect(page.locator('h1')).toHaveText('Net salary simulator');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('monthly amounts are stored per year', async ({ page }) => {
  await page.locator('#details-form summary', { hasText: 'Retribución flexible' }).click();
  await page.locator('label:has(input[name="flexPeriod"][value="monthly"])').click();
  await page.fill('#flexMeal', '100');
  await page.locator('label:has(input[name="flexPeriod"][value="annual"])').click();
  await expect(page.locator('#flexMeal')).toHaveValue('1200');
});

test('page never scrolls sideways', async ({ page }) => {
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('help tips open on tap without toggling their checkbox', async ({ page }) => {
  const checkbox = page.locator('input[name="childrenFullyCounted"]');
  const tip = page.locator('label.checkbox .help-tip');
  await tip.click();
  await expect(tip).toHaveClass(/open/);
  await expect(checkbox).not.toBeChecked();
});

test('warns about inconsistent personal details', async ({ page }) => {
  await page.fill('#childrenUnder3', '2');
  await expect(page.locator('#input-warning')).toBeVisible();
  await page.fill('#children', '2');
  await expect(page.locator('#input-warning')).toBeHidden();
});

test('compact summary only shows on small screens', async ({ page, isMobile }) => {
  await expect(page.locator('.summary-strip')).toBeVisible({ visible: !!isMobile });
});

test('the simulation editor comes before the results and can be collapsed', async ({ page }) => {
  const editor = page.locator('.card-simulation');
  await expect(editor).toHaveAttribute('open', '');
  const editorY = (await editor.boundingBox()).y;
  const resultsY = (await page.locator('#results').boundingBox()).y;
  expect(editorY).toBeLessThan(resultsY);
});

test('share links only carry the changed proposal, not personal details', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.fill('#salary', '41234');
  await page.fill('#scenario-name', 'Mi propuesta');
  await page.locator('#share').click();

  const url = await page.evaluate(() => navigator.clipboard.readText());
  const payload = await page.evaluate(async (hash) => {
    const { decode } = await import('/js/storage.js');
    return decode(hash);
  }, url.split('#s=')[1]);

  expect(payload).toEqual({ simulation: { name: 'Mi propuesta' } });
  expect(url.length).toBeLessThan(120);
});

test('choosing a region shows the estimated tax return result', async ({ page }) => {
  await page.selectOption('#region', 'madrid');
  await expect(page.locator('.result-current .metrics')).toContainText('Resultado estimado de la renta');
  await expect(page.locator('.result-current .metrics')).toContainText('+');
});

test('several simulations can be kept and compared at once', async ({ page }) => {
  await page.locator('#add-simulation').click();
  await expect(page.locator('.sim-tab')).toHaveCount(2);
  await page.fill('#scenario-name', 'Rebaja');
  await page.locator('#settings-simulation [data-shift]').fill('-2');
  await page.locator('#settings-simulation [data-apply]').click();
  await expect(page.locator('#difference')).toHaveClass(/positive/);

  // The first tab is untouched
  await page.locator('.sim-tab [data-simulation="0"]').click();
  await expect(page.locator('#difference')).toHaveClass(/neutral/);

  // Both tabs are available in the comparison
  await expect(page.locator('#compare-options')).toContainText('Rebaja');

  // Tabs survive a reload
  await page.reload();
  await expect(page.locator('.sim-tab')).toHaveCount(2);
});
