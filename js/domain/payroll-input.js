// Payroll input units and supported ranges, independent of the browser.
import { FORAL_ANNUAL_AMOUNTS } from './foral-assessment.js';
import { REGIONAL_SCALES } from '../data/regions.js';
import { FORAL_TERRITORIES } from '../data/foral.js';
import { CITIES } from '../data/cities.js';

export const MONTHS = 12;

/** Annual amounts that the form can show per year or per month, keyed by the period field controlling them. */
export const AMOUNT_FIELDS = {
  flexPeriod: ['flexMeal', 'flexTransport', 'flexHealth', 'flexChildcare', 'flexTraining'],
  pensionPeriod: ['pensionIndividual', 'pensionEmployee', 'pensionEmployer'],
};
export const PERIOD_OF_AMOUNT = Object.fromEntries(
  Object.entries(AMOUNT_FIELDS).flatMap(([period, fields]) => fields.map((field) => [field, period])),
);

export const NUMERIC_INPUTS = new Set([
  ...FORAL_ANNUAL_AMOUNTS,
  'salary',
  'payments',
  'partTime',
  'familySituation',
  'age',
  'children',
  'childrenUnder3',
  'childrenUnder6',
  'children6to15',
  'foralAscendantsUnder65',
  'foralAscendantClaimants',
  'dependents65',
  'dependents75',
  'disability',
  'workingDays',
  'flexHealthPeople',
  ...Object.keys(PERIOD_OF_AMOUNT),
]);

/** Shared input bounds; the form must expose the same limits. Amounts remain annual. */
export const INPUT_LIMITS = {
  ...Object.fromEntries(FORAL_ANNUAL_AMOUNTS.map((field) => [field, {}])),
  salary: {},
  age: { min: 16, max: 100, integer: true },
  partTime: { min: 1, max: 100, integer: true },
  children: { max: 20, integer: true },
  childrenUnder3: { max: 20, integer: true },
  childrenUnder6: { max: 20, integer: true },
  children6to15: { max: 20, integer: true },
  foralAscendantsUnder65: { max: 10, integer: true },
  foralAscendantClaimants: { min: 1, max: 10, integer: true },
  dependents65: { max: 10, integer: true },
  dependents75: { max: 10, integer: true },
  workingDays: { max: 366, integer: true },
  flexHealthPeople: { min: 1, max: 15, integer: true },
  ...Object.fromEntries(Object.keys(PERIOD_OF_AMOUNT).map((field) => [field, {}])),
};

const oneOf = (value, allowed) => (allowed.includes(value) ? value : allowed[0]);
export function normalizeInput(input) {
  input.period = oneOf(input.period, ['annual', 'perPayment']);
  input.contract = oneOf(input.contract, ['permanent', 'temporary']);
  input.payments = oneOf(input.payments, [14, 12]);
  input.familySituation = oneOf(input.familySituation, [3, 2, 1]);
  input.disability = oneOf(input.disability, [0, 33, 65]);
  input.partTime = Math.min(100, Math.max(1, input.partTime));
  input.region = oneOf(input.region, ['general', ...Object.keys(REGIONAL_SCALES), ...Object.keys(FORAL_TERRITORIES)]);
  input.city = CITIES.some((city) => city.id === input.city && city.region === input.region) ? input.city : '';
  for (const period of Object.keys(AMOUNT_FIELDS)) input[period] = oneOf(input[period], ['annual', 'monthly']);
  for (const [field, { min = 0, max = 1e9, integer = false }] of Object.entries(INPUT_LIMITS)) {
    const value = Math.min(max, Math.max(min, input[field]));
    input[field] = integer ? Math.floor(value) : value;
  }
  return input;
}
