// Visual checks. Screenshot baselines are platform-specific, so this file only
// runs locally (`npm run test:visual`); CI skips the @visual tag.
import { test, expect } from '@playwright/test';

const LANGUAGES = ['es', 'ca', 'eu', 'gl', 'en'];

const SECTIONS = {
  details: '#details-form',
  simulation: '.card-simulation',
  current: '.card-current',
  results: '#results',
  context: 'section[aria-labelledby="context-title"]',
  chart: 'section[aria-labelledby="chart-title"]',
  compare: 'section[aria-labelledby="compare-title"]',
  breakdown: 'section[aria-labelledby="breakdown-title"]',
};

async function openApp(page, { language = 'es', expand = true } = {}) {
  await page.goto('/');
  await page.evaluate((lang) => {
    localStorage.clear();
    localStorage.setItem('net-salary:state', JSON.stringify({ language: lang }));
  }, language);
  await page.reload();
  await page.locator('.result-current .headline strong').waitFor();
  if (expand) await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
  // Let the chart render in the next animation frame and hide the floating badge
  await page.waitForTimeout(200);
  await page.addStyleTag({ content: '.sticky-summary { visibility: hidden !important; }' });
}

test.describe('@visual layout', () => {
  for (const [name, selector] of Object.entries(SECTIONS)) {
    test(`section: ${name}`, async ({ page }) => {
      await openApp(page);
      await expect(page.locator(selector)).toHaveScreenshot(`${name}.png`, { animations: 'disabled' });
    });
  }

  test('dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await openApp(page, { expand: false });
    await expect(page).toHaveScreenshot('dark-mode.png', { fullPage: true, animations: 'disabled' });
  });
});

test.describe('@visual hover states', () => {
  test('help tip shows its message on hover', async ({ page, isMobile }) => {
    await openApp(page);
    const tip = page.locator('label[for="residence"] .help-tip');
    if (isMobile) await tip.tap();
    else await tip.hover();

    // Wait for the fade-in transition
    await expect.poll(() => tip.evaluate((el) => Number(getComputedStyle(el, '::after').opacity))).toBe(1);
    const box = await tip.boundingBox();
    await expect(page).toHaveScreenshot('help-tip.png', {
      clip: { x: 0, y: Math.max(0, box.y - 140), width: page.viewportSize().width, height: 180 },
      animations: 'disabled',
    });
  });

  test('chart shows a tooltip on hover', async ({ page }) => {
    await openApp(page);
    await page.locator('#settings-simulation [data-shift]').fill('-1');
    await page.locator('#settings-simulation [data-apply]').click();
    // The chart is redrawn in the next animation frame
    await expect(page.locator('#difference')).toHaveClass(/positive/);
    await page.waitForTimeout(200);
    const area = page.locator('#chart .hit-area');
    await area.scrollIntoViewIfNeeded();
    const box = await area.boundingBox();
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2);

    await expect(page.locator('#chart .tooltip')).toBeVisible();
    await expect(page.locator('#chart')).toHaveScreenshot('chart-tooltip.png', { animations: 'disabled' });
  });
});

test.describe('@visual fields fit in every language', () => {
  for (const language of LANGUAGES) {
    test(`all fields visible and selects not truncated (${language})`, async ({ page }) => {
      await openApp(page, { language });

      const problems = await page.evaluate(() => {
        const issues = [];
        const canvas = document.createElement('canvas').getContext('2d');
        const visible = (el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
        };

        for (const select of document.querySelectorAll('main select')) {
          if (select.closest('[hidden]')) continue;
          if (!visible(select)) {
            issues.push(`hidden select #${select.id}`);
            continue;
          }
          const style = getComputedStyle(select);
          canvas.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const text = select.selectedOptions[0]?.textContent ?? '';
          const available = select.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
          if (canvas.measureText(text).width > available + 1) issues.push(`select #${select.id} cuts "${text}"`);
        }

        for (const input of document.querySelectorAll('main input:not([type="radio"]):not([type="file"])')) {
          if (input.type === 'hidden' || input.closest('[hidden]')) continue;
          if (!visible(input)) issues.push(`hidden input ${input.id || input.name || input.dataset.field}`);
        }

        for (const label of document.querySelectorAll('main label')) {
          if (label.closest('[hidden]') || label.querySelector('input[type="file"]')) continue;
          if (!label.textContent.trim()) issues.push(`empty label for ${label.htmlFor}`);
        }

        const overflow = document.documentElement.scrollWidth - window.innerWidth;
        if (overflow > 0) issues.push(`page overflows by ${overflow}px`);
        return issues;
      });

      expect(problems).toEqual([]);
    });
  }
});
