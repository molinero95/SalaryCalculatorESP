// Renders scripts/og-image.html to assets/og-image.png (1200×630) for link previews.
// Usage: node scripts/generate-og-image.js
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const template = fileURLToPath(new URL('og-image.html', import.meta.url));
const output = fileURLToPath(new URL('../assets/og-image.png', import.meta.url));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(`file://${template}`);
await page.screenshot({ path: output });
await browser.close();
console.log(`Saved ${output}`);
