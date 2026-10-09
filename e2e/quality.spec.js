import { chooseResidence } from './residence-helper.js';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

async function restoreState(page, value) {
  await page.addInitScript(
    (value) => localStorage.setItem('net-salary:state', typeof value === 'string' ? value : JSON.stringify(value)),
    value,
  );
  await page.reload();
}

test('malformed stored state restores a valid default payslip', async ({ page }) => {
  const before = await page.locator('.result-current .headline strong').textContent();
  await restoreState(page, '{broken');
  await expect(page.locator('.result-current .headline strong')).toHaveText(before, { useInnerText: true });
});

test('restoring browser state normalizes personal ranges and rejects invalid bracket order', async ({ page }) => {
  await restoreState(page, {
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

test('restored HTML names remain literal text and never execute', async ({ page }) => {
  const name = '<img src=x onerror="window.injected=true">';
  await restoreState(page, { simulation: { name } });
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
  await chooseResidence(page, 'region:madrid');
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
  await chooseResidence(page, 'region:madrid');
  await expect(page.locator('.result-simulation .headline strong')).toHaveText(payroll);
  await page.reload();
  await expect(page.locator('#settings-simulation [data-withholding-brackets] [data-rate="0"]')).toHaveValue('15');
  await expect(page.locator('.result-simulation .headline strong')).toHaveText(payroll);
  await page.locator('#settings-simulation [data-group="groupWithholdingBrackets"] summary').click();
  await page.locator('#settings-simulation [data-withholding-brackets] [data-rate="0"]').fill('20');
  await expect(page.locator('.result-simulation .headline strong')).not.toHaveText(payroll);
});

test('manual scenario storage is absent while open simulations restore automatically', async ({ page }) => {
  const legacy = { Unused: { name: 'Unused' } };
  await page.evaluate((value) => localStorage.setItem('net-salary:scenarios', JSON.stringify(value)), legacy);
  await page.selectOption('#proposal-select', 'vox2024');
  await page.fill('#scenario-name', 'Propuesta abierta');
  const net = await page.locator('.result-simulation .headline strong').textContent();
  await page.reload();
  for (const id of ['save-scenario', 'load-scenario', 'delete-scenario', 'saved-scenarios', 'export', 'import'])
    await expect(page.locator('#' + id)).toHaveCount(0);
  await expect(page.locator('.result-simulation .headline strong')).toHaveText(net);
  await expect(page.locator('#scenario-name')).toHaveValue('Propuesta abierta');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('net-salary:scenarios')))).toEqual(legacy);
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

test('annual and monthly amount labels remain whole on narrow screens in every language', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const language of ['es', 'ca', 'eu', 'gl', 'en']) {
    await page.selectOption('#language', language);
    await page.evaluate(() =>
      document.querySelectorAll('details.extras').forEach((details) => {
        details.open = true;
      }),
    );
    for (const field of ['flexPeriod', 'pensionPeriod']) {
      const label = page.locator(`label:has(input[name="${field}"][value="monthly"]) span`);
      await expect(label).toBeVisible();
      expect(
        await label.evaluate((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return range.getClientRects().length;
        }),
      ).toBe(1);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true);
  }
  await testInfo.attach('monthly-controls-narrow', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});

test('anonymous events survive a delayed GoatCounter script load', async ({ page }) => {
  let release;
  const ready = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('https://gc.zgo.at/count.js', async (route) => {
    await ready;
    await route.fulfill({
      contentType: 'application/javascript',
      body: 'window.analyticsEvents = []; window.goatcounter = {count: event => window.analyticsEvents.push(event)};',
    });
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.fill('#salary', '73000');
  await page.fill('#scenario-name', 'Private proposal');
  await page.locator('#add-simulation').click();
  release();
  await expect
    .poll(() => page.evaluate(() => window.analyticsEvents))
    .toEqual([{ path: 'add-simulation', title: 'add-simulation', event: true }]);
  await page.locator('#add-simulation').click();
  await expect.poll(() => page.evaluate(() => window.analyticsEvents?.length)).toBe(2);
});

test('cascading residence selectors preserve salary and display territorial annual brackets and sources', async ({
  page,
}) => {
  await expect(page.locator('#residence option')).toHaveCount(18);
  await expect(page.locator('#residence-territory')).toBeHidden();
  await expect(page.locator('#residence-city')).toBeVisible();
  await expect(page.locator('#region')).toBeHidden();
  await expect(page.locator('#city')).toBeHidden();
  await expect(page.locator('label[for="residence"]')).toHaveCount(1);
  await expect(page.locator('label[for="residence"]')).toContainText('Comunidad autónoma de residencia fiscal');
  await page.fill('#salary', '73000');
  await chooseResidence(page, 'city:bilbao');
  await expect(page.locator('#region')).toHaveValue('bizkaia');
  await expect(page.locator('#salary')).toHaveValue('73000');
  await expect(page.locator('#location-brackets')).toContainText('Bilbao → País Vasco · Bizkaia');
  await expect(page.locator('#location-brackets a')).toHaveAttribute(
    'href',
    'https://www.bizkaia.eus/documents/880307/15187815/ca_13_2013.pdf',
  );
  await expect(page.locator('#location-brackets')).toContainText('18.080');
  await expect(page.locator('#location-brackets')).toContainText('49');
  await expect(page.locator('#fiscal-scope')).toBeVisible();
  await chooseResidence(page, 'city:pamplona-iruna');
  await expect(page.locator('#region')).toHaveValue('navarra');
  await expect(page.locator('#location-brackets')).toContainText('4.458');
  await chooseResidence(page, 'city:madrid');
  await expect(page.locator('#region')).toHaveValue('madrid');
  await expect(page.locator('#fiscal-scope')).toBeHidden();
  await chooseResidence(page, 'region:catalonia');
  await expect(page.locator('#city')).toHaveValue('');
  await expect(page.locator('[data-salary]')).toHaveCount(0);
  await expect(page.locator('#region')).toHaveValue('catalonia');
});

test('Bilbao preset and reviewed payroll survive a complete offline reload', async ({ page, context }) => {
  await chooseResidence(page, 'city:bilbao');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
      );
  });
  await expect(page.locator('.result-current .headline strong')).toHaveText('1.658,93 €');
  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.locator('#city')).toHaveValue('bilbao');
    await expect(page.locator('#residence')).toHaveValue('region:basque');
    await expect(page.locator('#residence-territory')).toHaveValue('region:bizkaia');
    await expect(page.locator('#residence-city')).toHaveValue('bilbao');
    await expect(page.locator('#region')).toHaveValue('bizkaia');
    await expect(page.locator('.result-current .headline strong')).toHaveText('1.658,93 €');
    await chooseResidence(page, 'city:pamplona-iruna');
    await expect(page.locator('#region')).toHaveValue('navarra');
    await expect(page.locator('.result-current .headline strong')).toHaveText('1.667,50 €');
  } finally {
    await context.setOffline(false);
  }
});

test('unreviewed foral profiles hide every fiscal output and recover when corrected', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await chooseResidence(page, 'city:bilbao');
  await page.fill('#children', '1');
  await expect(page.locator('#fiscal-scope')).toContainText('Se ocultan los resultados');
  for (const selector of ['#results', '#chart', '#compare-table', '#breakdown', '#sticky-summary'])
    await expect(page.locator(selector)).toBeHidden();
  await page.setViewportSize({ width: 640, height: 900 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(errors).toEqual([]);
  await page.fill('#children', '0');
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#fiscal-scope')).toContainText('Modelo foral de nómina');
  await page.fill('#children', '1');
  await chooseResidence(page, 'city:madrid');
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#fiscal-scope')).toBeHidden();
});

test('cascading residence controls remain readable in every language on narrow screens', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  for (const language of ['es', 'ca', 'eu', 'gl', 'en']) {
    await page.selectOption('#language', language);
    await chooseResidence(page, 'city:bilbao');
    await expect(page.locator('#residence')).toBeVisible();
    await expect(page.locator('[data-salary]')).toHaveCount(0);
    const overflowing = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflowing).toBe(false);
  }
  await testInfo.attach('bilbao-presets-mobile', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});

test('reviewed foral children require confirmation, preserve shared withholding and save age groups', async ({
  page,
}) => {
  await chooseResidence(page, 'city:bilbao');
  await page.fill('#children', '1');
  await page.fill('#childrenUnder6', '1');
  await expect(page.locator('#results')).toBeHidden();
  await page.check('#foralChildrenConfirmed');
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('label[for="children"]')).toContainText('30 años inclusive');
  await page.check('input[name="childrenFullyCounted"]');
  await expect(page.locator('#results')).toBeVisible();
  await page.fill('#childrenUnder3', '1');
  await page.fill('#childrenUnder6', '0');
  await expect(page.locator('#results')).toBeHidden();
  await page.fill('#childrenUnder6', '1');
  await expect(page.locator('#results')).toBeVisible();
  await page.reload();
  await expect(page.locator('#foralChildrenConfirmed')).toBeChecked();
  await expect(page.locator('#childrenUnder6')).toHaveValue('1');
  await expect(page.locator('#results')).toBeVisible();
  await chooseResidence(page, 'city:pamplona-iruna');
  await expect(page.locator('#foralChildrenConfirmed')).not.toBeChecked();
  await expect(page.locator('#results')).toBeHidden();
  await page.check('#foralChildrenConfirmed');
  await expect(page.locator('#foral-under6-field')).toBeHidden();
  await expect(page.locator('label[for="children"]')).toContainText('menores de 30');
  await expect(page.locator('#results')).toBeVisible();
  await chooseResidence(page, 'region:alava');
  await page.check('#foralChildrenConfirmed');
  await expect(page.locator('#foral-age6to15-field')).toBeVisible();
  await page.fill('#children6to15', '1');
  await expect(page.locator('#results')).toBeHidden();
  await page.fill('#children6to15', '0');
  await expect(page.locator('#results')).toBeVisible();
});

test('reviewed foral disability and mobility recover output without leaking into common regime', async ({ page }) => {
  await chooseResidence(page, 'city:bilbao');
  await page.selectOption('#disability', '33');
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#foral-mobility-field')).toBeVisible();
  await page.check('#foralReducedMobility');
  await expect(page.locator('#results')).toBeVisible();
  await page.selectOption('#disability', '65');
  await expect(page.locator('#foral-mobility-field')).toBeHidden();
  await chooseResidence(page, 'city:madrid');
  await expect(page.locator('#foral-children-field')).toBeHidden();
  await expect(page.locator('#foral-under6-field')).toBeHidden();
  await expect(page.locator('#foral-mobility-field')).toBeHidden();
  await expect(page.locator('label[for="children"]')).toContainText('25');
  await expect(page.locator('#results')).toBeVisible();
});

test('community and territory filter cities and restore saved selections', async ({ page }) => {
  await chooseResidence(page, 'city:bilbao');
  await expect(page.locator('#residence-territory')).toBeVisible();
  await expect(page.locator('#residence-city option[value="madrid"]')).toHaveCount(0);
  await page.selectOption('#residence-territory', 'region:gipuzkoa');
  await expect(page.locator('#city')).toHaveValue('');
  await expect(page.locator('#residence-city option[value="bilbao"]')).toHaveCount(0);
  await expect(page.locator('#residence-city option[value="donostia-san-sebastian"]')).toHaveCount(1);
  await chooseResidence(page, 'city:bilbao');
  await page.reload();
  await expect(page.locator('#residence')).toHaveValue('region:basque');
  await expect(page.locator('#residence-territory')).toHaveValue('region:bizkaia');
  await expect(page.locator('#residence-city')).toHaveValue('bilbao');
  await page.selectOption('#residence', 'region:navarra');
  await expect(page.locator('#residence-territory')).toBeHidden();
  await expect(page.locator('#residence-territory')).toBeDisabled();
  await expect(page.locator('#city')).toHaveValue('');
  await expect(page.locator('#residence-city option[value="bilbao"]')).toHaveCount(0);
  await page.selectOption('#residence', 'region:general');
  await expect(page.locator('#residence-city')).toBeDisabled();
});

test('residence help remains inside narrow viewports in every language', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  for (const language of ['es', 'ca', 'eu', 'gl', 'en']) {
    await page.selectOption('#language', language);
    const tip = page.locator('label[for="residence"] .help-tip');
    await tip.click();
    await expect.poll(() => tip.evaluate((el) => Number(getComputedStyle(el, '::after').opacity))).toBe(1);
    const bounds = await tip.evaluate((el) => {
      const field = el.closest('label').getBoundingClientRect();
      const popup = getComputedStyle(el, '::after');
      const left = field.left + parseFloat(popup.left);
      return {
        left,
        right: left + parseFloat(popup.width),
        viewport: innerWidth,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(bounds.viewport);
    expect(bounds.overflow).toBeLessThanOrEqual(0);
    await tip.click();
  }
});

for (const residence of ['region:bizkaia', 'region:gipuzkoa', 'region:alava', 'region:navarra']) {
  test(`${residence}: expanded foral benefits and annual income work offline`, async ({ page, context }, testInfo) => {
    await chooseResidence(page, residence);
    await page.fill('#age', '66');
    await page.locator('label:has(input[name="contract"][value="temporary"])').click();
    await page.selectOption('#familySituation', '2');
    await expect(page.locator('#results')).toBeVisible();
    await page.fill('#dependents65', '1');
    await expect(page.locator('#results')).toBeHidden();
    await page.check('#foralAscendantsConfirmed');
    await expect(page.locator('#results')).toBeVisible();
    await page.locator('#pensionIndividual').locator('xpath=ancestor::details').locator('summary').click();
    await page.fill('#pensionIndividual', '1500');
    await expect(page.locator('#results')).toBeVisible();
    await page.locator('#foral-annual-fields summary').click();
    await page.fill('#foralSavingsIncome', '1000');
    await expect(page.locator('#results')).toBeHidden();
    await page.check('#foralAnnualConfirmed');
    await expect(page.locator('#results')).toBeVisible();
    await testInfo.attach('expanded-foral-form', {
      body: await page.locator('#details-form').screenshot(),
      contentType: 'image/png',
    });
    await testInfo.attach('expanded-foral-results', {
      body: await page.locator('#results').screenshot(),
      contentType: 'image/png',
    });
    const before = await page.locator('#results').innerText();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller)
        await new Promise((resolve) =>
          navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
        );
    });
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('#results')).toHaveText(before, { useInnerText: true });
    await expect(page.locator('#foralAscendantsConfirmed')).toBeChecked();
    await page.locator('#foral-annual-fields summary').click();
    await expect(page.locator('#foralAnnualConfirmed')).toBeChecked();
    await expect(page.locator('#foralSavingsIncome')).toHaveValue('1000');
    await context.setOffline(false);
  });
}
test('annual and ascendant confirmations reset when jurisdiction or eligible amounts change', async ({ page }) => {
  await chooseResidence(page, 'region:bizkaia');
  await page.fill('#dependents65', '1');
  await page.check('#foralAscendantsConfirmed');
  await page.fill('#foralAscendantClaimants', '2');
  await expect(page.locator('#foralAscendantsConfirmed')).not.toBeChecked();
  await page.check('#foralAscendantsConfirmed');
  await page.locator('#foral-annual-fields summary').click();
  await page.fill('#foralSavingsIncome', '1000');
  await page.check('#foralAnnualConfirmed');
  await page.fill('#foralSavingsIncome', '2000');
  await expect(page.locator('#foralAnnualConfirmed')).not.toBeChecked();
  await page.check('#foralAnnualConfirmed');
  await chooseResidence(page, 'region:navarra');
  await expect(page.locator('#foralAscendantsConfirmed')).not.toBeChecked();
  await expect(page.locator('#foralAnnualConfirmed')).not.toBeChecked();
  await expect(page.locator('label[for="dependents65"]')).toHaveText('Ascendientes a cargo 65–74');
  await expect(page.locator('label[for="dependents75"]')).toHaveText('Ascendientes a cargo 75 o más');
  await chooseResidence(page, 'city:madrid');
  await expect(page.locator('#foral-annual-fields')).toBeHidden();
  await expect(page.locator('#results')).toBeVisible();
});
