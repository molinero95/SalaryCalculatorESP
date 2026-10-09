import { CITIES } from '../data/cities.js';
import { REGIONAL_SCALES } from '../data/regions.js';
import { FORAL_TERRITORIES } from '../data/foral.js';

export const RESIDENCE_REGIONS = { ...REGIONAL_SCALES, ...FORAL_TERRITORIES };

/** Decode a UI choice without changing other payroll or scenario fields. */
export function resolveResidence(value) {
  if (typeof value !== 'string') return null;
  if (value.startsWith('city:')) {
    const city = CITIES.find(({ id }) => id === value.slice(5));
    return city ? { city: city.id, region: city.region } : null;
  }
  if (value.startsWith('region:')) {
    const region = value.slice(7);
    return region === 'general' || Object.hasOwn(RESIDENCE_REGIONS, region) ? { city: '', region } : null;
  }
  return null;
}

/** Keep previously saved city/region pairs compatible with the single control. */
export function residenceValue(input) {
  const city = CITIES.find(({ id, region }) => id === input.city && region === input.region);
  return city
    ? `city:${city.id}`
    : `region:${Object.hasOwn(RESIDENCE_REGIONS, input.region) ? input.region : 'general'}`;
}
