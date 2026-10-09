import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionPersistence } from '../js/infrastructure/session-persistence.js';

function fixture() {
  const jobs = new Map();
  const writes = [];
  const state = { active: 0 };
  let id = 0;
  const persistence = createSessionPersistence({ saveState: (state) => writes.push({ ...state }) }, state, {
    schedule: (callback, delay) => {
      assert.equal(delay, 300);
      jobs.set(++id, callback);
      return id;
    },
    cancel: (key) => jobs.delete(key),
  });
  const tick = () => {
    const callbacks = [...jobs.values()];
    jobs.clear();
    callbacks.forEach((callback) => callback());
  };
  return { persistence, state, writes, jobs, tick };
}

test('rapid updates coalesce into one write of the latest state', () => {
  const { persistence, state, writes, jobs, tick } = fixture();
  persistence.schedule();
  state.active = 1;
  persistence.schedule();
  state.active = 2;
  persistence.schedule();
  assert.equal(jobs.size, 1);
  assert.equal(writes.length, 0);
  tick();
  assert.deepEqual(writes, [{ active: 2 }]);
});

test('page lifecycle flush writes immediately and cancels the pending write', () => {
  const { persistence, state, writes, jobs, tick } = fixture();
  persistence.schedule();
  state.active = 3;
  persistence.flush();
  assert.equal(jobs.size, 0);
  tick();
  assert.deepEqual(writes, [{ active: 3 }]);
});

test('flush without a pending timer still saves and later updates work', () => {
  const { persistence, state, writes, tick } = fixture();
  persistence.flush();
  state.active = 1;
  persistence.schedule();
  tick();
  assert.deepEqual(writes, [{ active: 0 }, { active: 1 }]);
});
