import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const tab = (page, view) => page.locator(`#product-navigation [data-view="${view}"]`);

async function expectView(page, view) {
  for (const candidate of ['salary', 'simulation', 'proposals']) {
    await expect(tab(page, candidate)).toHaveAttribute('aria-selected', String(candidate === view));
    await expect(tab(page, candidate)).toHaveAttribute('tabindex', candidate === view ? '0' : '-1');
  }
  await expect(page.locator('#simulation-panel')).toBeVisible({ visible: view === 'simulation' });
  await expect(page.locator('#proposals-panel')).toBeVisible({ visible: view === 'proposals' });
  const results = page.locator('#results-section');
  if (view === 'salary') {
    await expect(results).toHaveAttribute('role', 'tabpanel');
    await expect(results).toHaveAttribute('aria-labelledby', 'tab-salary');
    await expect(tab(page, 'salary')).toHaveAttribute('aria-selected', 'true');
  } else if (view === 'simulation') {
    await expect(results).toHaveAttribute('role', 'region');
    await expect(results).toHaveAttribute('aria-labelledby', 'simulation-title');
  } else {
    await expect(results).toBeHidden();
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('salary is the initial view and navigation does not duplicate personal inputs', async ({ page }) => {
  await expectView(page, 'salary');
  await expect(page.locator('.result-current .headline strong')).toHaveText('1.628,50 €');
  await expect(page.locator('#salary')).toHaveCount(1);
  await expect(page.locator('.result-simulation')).toBeHidden();
  await expect(page.locator('#difference')).toBeHidden();
  await expect(page.locator('#compare-table')).toBeHidden();
  await expect(page.locator('#salary')).toBeVisible();
  for (const view of ['simulation', 'proposals', 'salary']) {
    await tab(page, view).click();
    await expectView(page, view);
    await expect(page.locator('#salary')).toBeVisible();
  }
});

test('changing views preserves salary, edited scales and open simulations', async ({ page }) => {
  await page.fill('#salary', '45000');
  await tab(page, 'simulation').click();
  await page.locator('#add-simulation').click();
  await page.fill('#scenario-name', 'Lower rates');
  await page.locator('#settings-simulation [data-shift]').fill('-1');
  await page.locator('#settings-simulation [data-apply]').click();
  const simulatedNet = await page.locator('.result-simulation .headline strong').textContent();
  await tab(page, 'proposals').click();
  await tab(page, 'salary').click();
  await expect(page.locator('#salary')).toHaveValue('45000');
  await expect(page.locator('.result-current .headline strong')).toHaveText('2.293,93 €');
  await tab(page, 'simulation').click();
  await expect(page.locator('#scenario-name')).toHaveValue('Lower rates');
  await expect(page.locator('.sim-tab')).toHaveCount(2);
  await expect(page.locator('.result-simulation .headline strong')).toHaveText(simulatedNet);
});

test('navigation supports arrows, wrapping, Home and End with automatic selection', async ({ page }) => {
  await tab(page, 'salary').focus();
  await page.keyboard.press('ArrowRight');
  await expect(tab(page, 'simulation')).toBeFocused();
  await expectView(page, 'simulation');
  await page.keyboard.press('End');
  await expect(tab(page, 'proposals')).toBeFocused();
  await expectView(page, 'proposals');
  await page.keyboard.press('ArrowRight');
  await expect(tab(page, 'salary')).toBeFocused();
  await expectView(page, 'salary');
  await page.keyboard.press('ArrowLeft');
  await expect(tab(page, 'proposals')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(tab(page, 'salary')).toBeFocused();
  await expectView(page, 'salary');
});

test('applying a documented political proposal opens its simulation', async ({ page }) => {
  await tab(page, 'proposals').click();
  await expectView(page, 'proposals');
  await expect(page.locator('#results-section')).toBeHidden();
  await page.selectOption('#proposal-select', 'vox2024');
  await expectView(page, 'simulation');
  await expect(tab(page, 'simulation')).toBeFocused();
  await expect(page.locator('#settings-simulation [data-withholding-brackets] [data-rate="0"]')).toHaveValue('15');
  await expect(page.locator('.result-simulation')).toContainText('Vox');
  await expect(page.locator('#simulation-proposal-info')).toContainText('Simulación parcial');
  await expect(page.locator('#salary')).toHaveValue('30000');
});

test('a shared proposal opens the simulation without importing personal details', async ({ page }) => {
  const hash = await page.evaluate(async () => {
    const { encode } = await import('/js/storage.js');
    return encode({ simulation: { name: 'Shared change', incomeTax: { personalAllowance: 7000 } } });
  });
  await page.goto(`/?navigation-share#s=${hash}`);
  await expectView(page, 'simulation');
  await expect(page.locator('#salary')).toHaveValue('30000');
  await expect(page.locator('#scenario-name')).toHaveValue('Shared change');
});

test('offline reload returns to salary while preserving inputs and editable simulations', async ({ page, context }) => {
  await page.fill('#salary', '45000');
  await tab(page, 'simulation').click();
  await page.fill('#scenario-name', 'Offline change');
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
    await expectView(page, 'salary');
    await expect(page.locator('#salary')).toHaveValue('45000');
    await tab(page, 'proposals').click();
    await expectView(page, 'proposals');
    await tab(page, 'simulation').click();
    await expect(page.locator('#scenario-name')).toHaveValue('Offline change');
    await expect(page.locator('.result-current .headline strong')).toHaveText('2.293,93 €');
  } finally {
    await context.setOffline(false);
  }
});

for (const language of ['es', 'ca', 'eu', 'gl', 'en']) {
  test(`each view is accessible and fits a narrow screen in ${language}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.selectOption('#language', language);
    for (const view of ['salary', 'simulation', 'proposals']) {
      await tab(page, view).click();
      await expectView(page, view);
      await expect(tab(page, view)).not.toHaveText('');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(audit.violations).toEqual([]);
    }
  });
}

test('sharing unchanged rules opens a new default simulation over a saved proposal', async ({ page }) => {
  const hash = await page.evaluate(async () => {
    const { encode } = await import('/js/storage.js');
    return encode({ simulation: {} });
  });
  await page.locator('#tab-proposals').click();
  await page.selectOption('#proposal-select', 'vox2024');
  await page.goto(`/?unchanged-share#s=${hash}`);
  await expect(page.locator('.sim-tab')).toHaveCount(2);
  await expect(page.locator('.result-simulation h3')).not.toContainText('Vox');
  await expect(page.locator('.result-simulation .headline strong')).toHaveText('1.628,50 €');
});

test('removing an earlier simulation keeps the active edited result', async ({ page }) => {
  await page.locator('#tab-simulation').click();
  await page.locator('#add-simulation').click();
  await page.fill('#scenario-name', 'Keep me');
  await page.locator('#settings-simulation [data-shift]').fill('-1');
  await page.locator('#settings-simulation [data-apply]').click();
  const result = await page.locator('.result-simulation .headline strong').textContent();
  await page.locator('#add-simulation').click();
  await page.locator('[data-simulation="1"]').click();
  await page.locator('[data-remove-simulation="0"]').click();
  await expect(page.locator('#scenario-name')).toHaveValue('Keep me');
  await expect(page.locator('.result-simulation .headline strong')).toHaveText(result);
});

test('a restored unsupported foral reference initializes and can be reset', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'net-salary:state',
      JSON.stringify({ input: { region: 'navarra' }, current: { incomeTax: { personalAllowance: 10000 } } }),
    );
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.reload();
  await expect(page.locator('#fiscal-scope')).toContainText('Esta simulación no está modelada');
  await page.locator('#tab-simulation').click();
  await page.locator('.card-current summary').click();
  await page.locator('#reset-current').click();
  await expect(page.locator('.result-current .headline strong')).toBeVisible();
  expect(errors).toEqual([]);
});
