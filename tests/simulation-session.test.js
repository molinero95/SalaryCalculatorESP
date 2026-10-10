import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRENT_SCENARIO, DEFAULT_INPUT, clone } from '../js/defaults.js';
import { toScenario } from '../js/domain/scenario.js';
import {
  createSession,
  importSession,
  sharePayload,
  addSimulation,
  removeSimulation,
  selectSimulation,
} from '../js/application/simulation-session.js';

const flat = [{ upTo: null, rate: 20 }];

test('a session owns independent defaults and serializes only the simulation list', () => {
  const state = createSession();
  assert.deepEqual(state.input, DEFAULT_INPUT);
  assert.equal(state.simulation, state.simulations[0]);
  state.simulation.incomeTax.brackets[0].rate = 1;
  assert.equal(state.current.incomeTax.brackets[0].rate, 19);
  assert.equal(CURRENT_SCENARIO.incomeTax.brackets[0].rate, 19);
  assert.equal(createSession().simulation.incomeTax.brackets[0].rate, 19);
  const serialized = JSON.parse(JSON.stringify(state));
  assert.equal('simulation' in serialized, false);
  assert.equal(serialized.simulations.length, 1);
});

test('legacy saved scenarios retain custom rules and select their active simulation', () => {
  const state = createSession({ simulation: { name: 'Legacy', incomeTax: { brackets: flat } } });
  assert.equal(state.simulation.name, 'Legacy');
  assert.deepEqual(state.simulation.incomeTax.brackets, flat);
  assert.equal(state.simulation.incomeTax.useSeparateWithholding, false);
});

for (const [active, expected] of [
  [1.9, 1],
  [99, 2],
  [-1, 0],
  ['2', 0],
  [null, 0],
]) {
  test(`restored active index ${JSON.stringify(active)} resolves to ${expected}`, () => {
    const state = createSession({ active, simulations: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] });
    assert.equal(state.active, expected);
    assert.equal(state.simulation.name, ['A', 'B', 'C'][expected]);
  });
}

test('invalid entries are discarded before enforcing the five-tab limit', () => {
  const simulations = [null, false, [], ...Array.from({ length: 8 }, (_, i) => ({ name: `${i}` }))];
  const state = createSession({ simulations });
  assert.deepEqual(
    state.simulations.map((s) => s.name),
    ['0', '1', '2', '3', '4'],
  );
  assert.equal(createSession({ simulations: [null, []] }).simulations.length, 1);
});

test('shared proposals append to local tabs and retain recipient personal details', () => {
  const state = createSession(
    {
      input: { salary: 73000, region: 'madrid', children: 2 },
      simulations: Array.from({ length: 5 }, (_, i) => ({ name: `${i}` })),
    },
    { simulation: { name: 'Shared', incomeTax: { useSeparateWithholding: true, withholdingBrackets: flat } } },
  );
  assert.equal(state.input.salary, 73000);
  assert.equal(state.input.region, 'madrid');
  assert.equal(state.input.children, 2);
  assert.deepEqual(
    state.simulations.map((s) => s.name),
    ['0', '1', '2', '3', 'Shared'],
  );
  assert.equal(state.active, 4);
  assert.deepEqual(state.simulation.incomeTax.withholdingBrackets, flat);
});

test('import normalizes ranges while preserving unspecified personal fields and legacy formats', () => {
  const state = createSession({ input: { salary: 73000, children: 2, region: 'madrid' } });
  importSession(state, { simulation: { name: 'Imported' }, input: { children: 999, partTime: 0, age: 18.9 } });
  assert.equal(state.input.salary, 73000);
  assert.equal(state.input.children, 20);
  assert.equal(state.input.partTime, 1);
  assert.equal(state.input.age, 18);
  assert.equal(state.input.region, 'madrid');
  assert.equal(state.active, 0);
  assert.equal(state.simulation.name, 'Imported');
});

for (const imported of [null, [], {}, { input: {} }, { simulation: 'bad' }]) {
  test(`invalid file ${JSON.stringify(imported)} leaves the session unchanged`, () => {
    const state = createSession();
    const before = JSON.stringify(state);
    assert.throws(() => importSession(state, imported), /Invalid scenario file/);
    assert.equal(JSON.stringify(state), before);
  });
}

test('sharing includes only changed active scenario rules, never personal data or other tabs', () => {
  const state = createSession({ input: { salary: 73000, children: 2, region: 'madrid' } });
  addSimulation(state);
  state.simulation.name = 'Active';
  state.simulation.incomeTax.generalExpenses = 3000;
  assert.deepEqual(JSON.parse(JSON.stringify(sharePayload(state))), {
    current: {},
    simulation: { name: 'Active', incomeTax: { generalExpenses: 3000 } },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(sharePayload(createSession()))), { current: {}, simulation: {} });
});

test('sharing unchanged rules opens those rules rather than a recipient existing proposal', () => {
  const shared = JSON.parse(JSON.stringify(sharePayload(createSession())));
  const recipient = createSession(
    { input: { salary: 73000, region: 'navarra' }, simulations: [{ name: 'Vox', proposal: 'vox2024' }] },
    shared,
  );
  assert.equal(recipient.active, 1);
  assert.deepEqual(recipient.simulation, CURRENT_SCENARIO);
  assert.equal(recipient.simulations[0].proposal, 'vox2024');
  assert.equal(recipient.input.salary, 73000);
  assert.equal(recipient.input.region, 'navarra');
});

test('removing an inactive tab preserves the selected scenario identity', () => {
  const state = createSession({ simulations: [{ name: 'A' }, { name: 'B' }, { name: 'C' }], active: 1 });
  const selected = state.simulation;
  assert.equal(removeSimulation(state, 0), true);
  assert.equal(state.active, 0);
  assert.equal(state.simulation, selected);
  assert.equal(removeSimulation(state, 1), true);
  assert.equal(state.active, 0);
  assert.equal(state.simulation, selected);
});

test('removing the selected tab selects the next tab or the preceding last tab', () => {
  const state = createSession({ simulations: [{ name: 'A' }, { name: 'B' }, { name: 'C' }], active: 1 });
  assert.equal(removeSimulation(state, 1), true);
  assert.equal(state.simulation.name, 'C');
  assert.equal(removeSimulation(state, 1), true);
  assert.equal(state.simulation.name, 'A');
  assert.equal(state.active, 0);
});

test('tab commands enforce capacity, selection and a nonempty session', () => {
  const state = createSession();
  state.current.incomeTax.generalExpenses = 3000;
  for (let i = 0; i < 4; i++) assert.equal(addSimulation(state), true);
  assert.equal(addSimulation(state), false);
  assert.equal(state.active, 4);
  assert.equal(state.simulation.incomeTax.generalExpenses, 3000);
  assert.equal(selectSimulation(state, 1), true);
  assert.equal(state.simulation, state.simulations[1]);
  for (const invalid of [-1, 5, 1.5, NaN]) {
    assert.equal(selectSimulation(state, invalid), false);
    assert.equal(removeSimulation(state, invalid), false);
  }
  assert.equal(selectSimulation(state, 4), true);
  assert.equal(removeSimulation(state, 4), true);
  assert.equal(state.active, 3);
  while (state.simulations.length > 1) assert.equal(removeSimulation(state, 0), true);
  assert.equal(removeSimulation(state, 0), false);
  assert.equal(state.active, 0);
});

test('scenario replacement follows the active tab after imports', () => {
  const state = createSession();
  importSession(state, { simulations: [{ name: 'A' }, { name: 'B' }] });
  selectSimulation(state, 1);
  state.simulation = toScenario({ name: 'Replacement' });
  assert.deepEqual(
    state.simulations.map((s) => s.name),
    ['A', 'Replacement'],
  );
});

test('scenario boundaries reject unknown fields, wrong types and negative/nonfinite values', () => {
  const scenario = toScenario({
    unknown: 'ignored',
    name: 23,
    incomeTax: { generalExpenses: -1, personalAllowance: Infinity, useSeparateWithholding: 'yes', extra: 1 },
    socialSecurity: { minBase: '1200' },
  });
  assert.deepEqual(scenario, CURRENT_SCENARIO);
});

for (const brackets of [
  [],
  [{ upTo: 100, rate: 20 }],
  [{ upTo: null, rate: 101 }],
  [
    { upTo: 100, rate: 20 },
    { upTo: 50, rate: 30 },
    { upTo: null, rate: 40 },
  ],
  [
    { upTo: null, rate: 20 },
    { upTo: null, rate: 30 },
  ],
  [{ upTo: null, rate: NaN }],
]) {
  test(`invalid bracket scale ${JSON.stringify(brackets)} falls back on both scales`, () => {
    const scenario = toScenario({ incomeTax: { brackets, withholdingBrackets: brackets } });
    assert.deepEqual(scenario.incomeTax.brackets, CURRENT_SCENARIO.incomeTax.brackets);
    assert.deepEqual(scenario.incomeTax.withholdingBrackets, CURRENT_SCENARIO.incomeTax.withholdingBrackets);
  });
}

test('each restored scenario owns its arrays, independently of the source object', () => {
  const source = { incomeTax: { brackets: clone(flat) } };
  const state = createSession({ simulations: [source, source] });
  state.simulations[0].incomeTax.brackets[0].rate = 10;
  assert.equal(state.simulations[1].incomeTax.brackets[0].rate, 20);
  assert.equal(source.incomeTax.brackets[0].rate, 20);
});

test('the browser injects language configuration without an application translation dependency', () => {
  assert.equal(createSession({}, null, { defaultLanguage: 'en' }).language, 'en');
  assert.equal(createSession({ language: 'ca' }, null, { defaultLanguage: 'en' }).language, 'ca');
});

test('shared default reference replaces recipient custom rules while preserving personal input', () => {
  const state = createSession(
    { input: { salary: 73000 }, current: { incomeTax: { personalAllowance: 10000 } } },
    sharePayload(createSession()),
  );
  assert.deepEqual(state.current, CURRENT_SCENARIO);
  assert.equal(state.input.salary, 73000);
});
