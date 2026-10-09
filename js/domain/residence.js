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

/** Communities contain a separate historical territory only in the Basque Country. */
export const RESIDENCE_COMMUNITIES = {
  ...Object.fromEntries(
    Object.entries(RESIDENCE_REGIONS).filter(([key]) => !['bizkaia', 'gipuzkoa', 'alava'].includes(key)),
  ),
  basque: { name: 'País Vasco' },
};

export function residenceCommunity(region) {
  return FORAL_TERRITORIES[region]?.community ?? (Object.hasOwn(RESIDENCE_COMMUNITIES, region) ? region : 'general');
}

export function residenceCities(region) {
  return CITIES.filter((city) => city.region === region).sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/** Cascading selections retain the persisted region/city shape and reject cross-territory cities. */
export function selectResidence(input, field, value) {
  if (field === 'residence') {
    if (value === 'region:basque') {
      const region = residenceCommunity(input.region) === 'basque' ? input.region : 'bizkaia';
      return { region, city: region === input.region ? input.city : '' };
    }
    const selection = resolveResidence(value);
    return selection && !selection.city && residenceCommunity(selection.region) !== 'basque' ? selection : null;
  }
  if (field === 'residenceTerritory') {
    const selection = resolveResidence(value);
    return residenceCommunity(input.region) === 'basque' &&
      selection &&
      !selection.city &&
      residenceCommunity(selection.region) === 'basque'
      ? selection
      : null;
  }
  if (field === 'residenceCity') {
    if (value === '') return { region: input.region, city: '' };
    const selection = resolveResidence(`city:${value}`);
    return selection?.region === input.region ? selection : null;
  }
  return null;
}
