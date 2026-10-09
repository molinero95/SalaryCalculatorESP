import { resolveResidence, residenceCommunity } from '../js/domain/residence.js';

export async function chooseResidence(page, value) {
  const { region, city } = resolveResidence(value);
  const community = residenceCommunity(region);
  await page.selectOption('#residence', `region:${community}`);
  if (community === 'basque') await page.selectOption('#residence-territory', `region:${region}`);
  await page.selectOption('#residence-city', city);
}
