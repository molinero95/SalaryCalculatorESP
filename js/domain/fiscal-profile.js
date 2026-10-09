import { unsupportedForalFamily } from './foral-family.js';
import { FORAL_TERRITORIES } from '../data/foral.js';

export const isForal = (region) => Object.hasOwn(FORAL_TERRITORIES, region);

/** Never silently substitute common-regime rules for an unreviewed foral profile. */
export function unsupportedFiscalProfile(input) {
  if (!isForal(input.region)) return false;
  return (
    input.contract !== 'permanent' ||
    input.age >= 65 ||
    unsupportedForalFamily(input) ||
    input.dependents65 > 0 ||
    input.dependents75 > 0 ||
    input.familySituation !== 3 ||
    [
      'flexMeal',
      'flexTransport',
      'flexHealth',
      'flexChildcare',
      'flexTraining',
      'pensionIndividual',
      'pensionEmployee',
      'pensionEmployer',
    ].some((key) => input[key] > 0)
  );
}
