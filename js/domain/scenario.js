// Scenario boundary: validate untrusted overrides against the supported shape.
import { CURRENT_SCENARIO, clone } from '../defaults.js';

export const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const isValidBrackets = (brackets) =>
  Array.isArray(brackets) &&
  brackets.length > 0 &&
  brackets.length <= 100 &&
  brackets.every(
    (b, i) =>
      Number.isFinite(b?.rate) &&
      b.rate >= 0 &&
      b.rate <= 100 &&
      (b.upTo === null
        ? i === brackets.length - 1
        : Number.isFinite(b.upTo) && b.upTo > (i ? brackets[i - 1].upTo : 0)),
  ) &&
  brackets.at(-1).upTo === null;

/**
 * Deep-merges untrusted `override` (saved state, shared link, imported file) into
 * `base`. Unknown keys are dropped and values whose type doesn't match are ignored.
 */
const isStringList = (list) => Array.isArray(list) && list.every((item) => typeof item === 'string');

export function merge(base, override) {
  if (isStringList(base)) return isStringList(override) ? clone(override) : base;
  if (Array.isArray(base)) return isValidBrackets(override) ? clone(override) : base;
  if (isPlainObject(base)) {
    if (!isPlainObject(override)) return base;
    return Object.fromEntries(
      Object.entries(base).map(([key, value]) => [key, key in override ? merge(value, override[key]) : value]),
    );
  }
  if (typeof base === 'number') return Number.isFinite(override) && override >= 0 ? override : base;
  return typeof override === typeof base ? override : base;
}

export const toScenario = (override) => merge(clone(CURRENT_SCENARIO), override);
