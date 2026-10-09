// Helpers that build comparison scenarios: party proposals and inflation indexing.

import { CURRENT_SCENARIO, clone } from './defaults.js';
import { PROPOSALS } from './data/proposals.js';

const ALLOWANCE_KEYS = [
  'personalAllowance',
  'ageOver65Allowance',
  'ageOver75Allowance',
  'child1Allowance',
  'child2Allowance',
  'child3Allowance',
  'child4Allowance',
  'childUnder3Allowance',
  'dependent65Allowance',
  'dependent75Allowance',
  'disability33Allowance',
  'disability65Allowance',
  'careAllowance',
];

const round2 = (x) => Math.round(x * 100) / 100;

function deepAssign(target, changes) {
  for (const [key, value] of Object.entries(changes)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) deepAssign(target[key], value);
    else target[key] = clone(value);
  }
  return target;
}

/** Current rules with a party proposal applied on top. */
export function proposalScenario(id, name) {
  const proposal = PROPOSALS[id];
  return { ...deepAssign(clone(CURRENT_SCENARIO), proposal.changes), name, proposal: id };
}

/** `base` with bracket limits and personal allowances raised by `percent` (inflation indexing). */
export function indexedScenario(base, percent, name) {
  const factor = 1 + percent / 100;
  const scenario = clone(base);
  scenario.incomeTax.brackets = scenario.incomeTax.brackets.map(({ upTo, rate }) => ({
    upTo: upTo === null ? null : round2(upTo * factor),
    rate,
  }));
  if (scenario.incomeTax.useSeparateWithholding)
    scenario.incomeTax.withholdingBrackets = scenario.incomeTax.withholdingBrackets.map(({ upTo, rate }) => ({
      upTo: upTo === null ? null : round2(upTo * factor),
      rate,
    }));
  for (const key of ALLOWANCE_KEYS) scenario.incomeTax[key] = round2(scenario.incomeTax[key] * factor);
  return { ...scenario, name, proposal: '' };
}
