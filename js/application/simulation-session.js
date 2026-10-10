// Simulation session use cases. No DOM, storage, URL or browser lifecycle access.
import { CURRENT_SCENARIO, DEFAULT_INPUT, clone } from '../defaults.js';
import { isPlainObject, merge, toScenario } from '../domain/scenario.js';
import { normalizeInput } from '../domain/payroll-input.js';

export const MAX_SIMULATIONS = 5;

function changesFrom(base, value) {
  if (isPlainObject(base) && isPlainObject(value)) {
    const entries = Object.entries(value)
      .map(([key, item]) => [key, changesFrom(base[key], item)])
      .filter(([, item]) => item !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  return JSON.stringify(base) === JSON.stringify(value) ? undefined : value;
}

/** Simulations from saved or imported data (also accepts the old single `simulation`). */
function simulationList(source) {
  const list = Array.isArray(source?.simulations)
    ? source.simulations.filter(isPlainObject).slice(0, MAX_SIMULATIONS).map(toScenario)
    : [];
  return list.length ? list : [toScenario(isPlainObject(source?.simulation) ? source.simulation : {})];
}

/** `state.simulation` always points at the active tab (not saved: `simulations` is). */
function defineActiveSimulation(target) {
  target.active = Math.min(Math.max(0, Math.floor(target.active)), target.simulations.length - 1);
  Object.defineProperty(target, 'simulation', {
    get: () => target.simulations[target.active],
    set: (scenario) => {
      target.simulations[target.active] = scenario;
    },
    enumerable: false,
    configurable: true,
  });
}

/** Restore a session; a shared proposal opens as the last tab. Browser I/O stays outside. */
export function createSession(saved = {}, shared = null, { defaultLanguage = 'es' } = {}) {
  const defaults = {
    language: defaultLanguage,
    chartMode: 'diff',
    input: clone(DEFAULT_INPUT),
    current: clone(CURRENT_SCENARIO),
    active: 0,
  };
  const state = merge(merge(defaults, saved), shared ?? {});
  state.simulations = simulationList(saved);
  if (isPlainObject(shared?.simulation)) {
    state.simulations = [...state.simulations.slice(0, MAX_SIMULATIONS - 1), toScenario(shared.simulation)];
    state.active = state.simulations.length - 1;
  }
  defineActiveSimulation(state);
  state.chartMode = ['diff', 'rate'].includes(state.chartMode) ? state.chartMode : 'diff';
  normalizeInput(state.input);
  return state;
}

/** Validate the file before changing the live session. */
export function importSession(state, imported) {
  if (!isPlainObject(imported?.simulation) && !Array.isArray(imported?.simulations)) {
    throw new Error('Invalid scenario file');
  }
  state.input = normalizeInput(merge(state.input, imported.input ?? {}));
  state.current = toScenario(imported.current ?? {});
  state.simulations = simulationList(imported);
  state.active = 0;
}

/** Personal details and inactive tabs are deliberately excluded from public links. */
export function sharePayload(state) {
  return {
    current: changesFrom(CURRENT_SCENARIO, state.current),
    simulation: changesFrom(CURRENT_SCENARIO, state.simulation) ?? {},
  };
}

export function selectSimulation(state, index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.simulations.length) return false;
  state.active = index;
  return true;
}

export function addSimulation(state) {
  if (state.simulations.length >= MAX_SIMULATIONS) return false;
  state.simulations.push({ ...clone(state.current), name: '', proposal: '' });
  state.active = state.simulations.length - 1;
  return true;
}

export function removeSimulation(state, index) {
  if (state.simulations.length <= 1 || !Number.isInteger(index) || index < 0 || index >= state.simulations.length)
    return false;
  state.simulations.splice(index, 1);
  if (index < state.active) state.active -= 1;
  state.active = Math.min(state.active, state.simulations.length - 1);
  return true;
}
