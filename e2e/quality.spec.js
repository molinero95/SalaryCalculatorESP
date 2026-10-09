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
  await expect(page.locator('.result-current .headline strong')).toHaveText('2.293,93 €');
});

test('result-card simulation tabs stay synchronized with the editor', async ({ page }) => {
  await page.locator('#add-simulation').click();
  await page.fill('#scenario-name', 'Lower tax');
  await page.locator('#settings-simulation [data-shift]').fill('-2');
  await page.locator('#settings-simulation [data-apply]').click();
  await expect(page.locator('.result-sim-tab')).toHaveCount(2);
  await page.locator('[data-result-simulation="0"]').click();
  await expect(page.locator('#difference')).toHaveClass(/neutral/);
  await expect(page.locator('#sim-tabs [data-simulation="0"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-result-simulation="1"]').click();
  await expect(page.locator('#difference')).toHaveClass(/positive/);
  await expect(page.locator('.result-simulation h3')).toHaveText('Lower tax');
  await expect(page.locator('#chart .line')).toHaveCount(2);
});

test('refactored tax engine works after a full offline reload', async ({ page, context }) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
      );
    }
  });
  await page.fill('#salary', '45000');
  await expect(page.locator('.result-current .headline strong')).toHaveText('2.293,93 €');
  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.locator('.result-current .headline strong')).toHaveText('2.293,93 €');
    await page.fill('#salary', '30000');
    await expect(page.locator('.result-current .headline strong')).toHaveText('1.628,50 €');
  } finally {
    await context.setOffline(false);
  }
});

test('fractional persisted active simulation restores a valid selection', async ({ page }) => {
  await page.locator('#add-simulation').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('net-salary:state'))?.active)).toBe(1);
  await page.addInitScript(() => {
    const state = JSON.parse(localStorage.getItem('net-salary:state'));
    state.active = 0.5;
    localStorage.setItem('net-salary:state', JSON.stringify(state));
  });
  await page.reload();
  await expect(page.locator('[data-result-simulation="0"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.result-current .headline strong')).toHaveText('1.628,50 €');
});

test('breakdown exposes separate annual state and regional quotas', async ({ page }) => {
  await page.selectOption('#region', 'madrid');
  await expect(page.locator('#breakdown')).toContainText('Cuota íntegra estatal');
  await expect(page.locator('#breakdown')).toContainText('Cuota íntegra autonómica');
  await expect(page.locator('#breakdown')).toContainText('Base liquidable anual estimada');
  await page.fill('#children', '3');
  const row = page.locator('#breakdown tr').filter({ hasText: 'Reducción por más de dos descendientes' });
  await expect(row).toContainText('600');
});

test('Vox separates payroll withholding and annual regional tax across reloads', async ({ page }) => {
  await page.selectOption('#proposal-select', 'vox2024');
  await expect(page.locator('.result-simulation')).toContainText('Neto anual de nómina');
  await expect(page.locator('.result-simulation')).toContainText('Neto anual tras la renta');
  await expect(page.locator('.result-tax-scope').first()).toContainText('comunidad autónoma');
  await expect(page.locator('#proposal-info')).toContainText('Simulación parcial');
  await expect(page.locator('#settings-simulation [data-withholding-brackets] [data-rate="0"]')).toHaveValue('15');
  const payroll = await page.locator('.result-simulation .headline strong').textContent();
  await page.selectOption('#region', 'madrid');
  await expect(page.locator('.result-simulation .headline strong')).toHaveText(payroll);
  await page.reload();
  await expect(page.locator('#settings-simulation [data-withholding-brackets] [data-rate="0"]')).toHaveValue('15');
  await expect(page.locator('.result-simulation .headline strong')).toHaveText(payroll);
  await page.locator('#settings-simulation [data-group="groupWithholdingBrackets"] summary').click();
  await page.locator('#settings-simulation [data-withholding-brackets] [data-rate="0"]').fill('20');
  await expect(page.locator('.result-simulation .headline strong')).not.toHaveText(payroll);
});

test('saving retains a named simulation independently of open tabs', async ({ page }) => {
  await page.fill('#scenario-name', 'Guardada');
  await page.selectOption('#proposal-select', 'vox2024');
  await page.fill('#scenario-name', 'Guardada');
  const net = await page.locator('.result-simulation .headline strong').textContent();
  await page.locator('#save-scenario').click();
  await expect(page.locator('#saved-scenarios')).toHaveValue('Guardada');
  await page.selectOption('#proposal-select', '');
  await page.reload();
  await page.selectOption('#saved-scenarios', 'Guardada');
  await page.locator('#load-scenario').click();
  await expect(page.locator('.result-simulation .headline strong')).toHaveText(net);
  await expect(page.locator('#scenario-name')).toHaveValue('Guardada');
});

test('separate withholding editor compares with the active reference scale', async ({ page }) => {
  await page.selectOption('#proposal-select', 'sumar2023');
  const editor = page.locator('#settings-simulation [data-withholding-brackets]');
  await expect(editor).not.toHaveClass(/changed/);
  await page.locator('details:has(> #settings-current) > summary').click();
  await page.locator('#settings-current [data-group="groupBrackets"] summary').click();
  await page.locator('#settings-current [data-rate="0"]').fill('20');
  await expect(editor).toHaveClass(/changed/);
});

test('floating annual difference stays inside narrow viewports with large amounts', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.fill('#salary', '45000');
  await page.selectOption('#proposal-select', 'vox2024');
  await page.evaluate(() => {
    document.querySelector('#sticky-value').textContent = '+999.999.999.999.999,99 € / anual';
  });
  await page.locator('#sticky-summary').scrollIntoViewIfNeeded();
  await expect(page.locator('#sticky-summary')).toBeVisible();
  await testInfo.attach('floating-summary-narrow', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  await expect
    .poll(() =>
      page.evaluate(() => {
        const rect = document.querySelector('#sticky-summary').getBoundingClientRect();
        return (
          rect.left >= 0 &&
          rect.right <= document.documentElement.clientWidth &&
          document.documentElement.scrollWidth <= document.documentElement.clientWidth
        );
      }),
    )
    .toBe(true);
  await page.selectOption('#language', 'eu');
  await testInfo.attach('floating-summary-narrow-basque', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    .toBe(true);
});

test('extracted form preserves annual gross across period changes and reload', async ({ page }) => {
  await page.fill('#salary', '42000');
  await page.locator('label:has(input[name="period"][value="perPayment"])').click();
  await expect(page.locator('#salary')).toHaveValue('3000');
  await page.locator('label:has(input[name="payments"][value="12"])').click();
  await expect(page.locator('#salary')).toHaveValue('3500');
  await page.reload();
  await expect(page.locator('#salary')).toHaveValue('3500');
  await expect(page.locator('input[name="period"][value="perPayment"]')).toBeChecked();
  await page.locator('label:has(input[name="period"][value="annual"])').click();
  await expect(page.locator('#salary')).toHaveValue('42000');
});

test('extracted pension form retains annual units and checkbox state across reload', async ({ page }) => {
  await page.locator('label:has(input[name="childrenFullyCounted"])').click();
  await page.locator('#pensionIndividual').locator('xpath=ancestor::details').locator('summary').click();
  await page.locator('label:has(input[name="pensionPeriod"][value="monthly"])').click();
  await page.fill('#pensionIndividual', '120');
  await page.fill('#pensionEmployer', '200');
  await page.locator('label:has(input[name="pensionPeriod"][value="annual"])').click();
  await expect(page.locator('#pensionIndividual')).toHaveValue('1440');
  await expect(page.locator('#pensionEmployer')).toHaveValue('2400');
  await page.reload();
  await expect(page.locator('input[name="childrenFullyCounted"]')).toBeChecked();
  await page.locator('#pensionIndividual').locator('xpath=ancestor::details').locator('summary').click();
  await expect(page.locator('#pensionIndividual')).toHaveValue('1440');
  await expect(page.locator('#pensionEmployer')).toHaveValue('2400');
});
