import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventTracker } from '../js/infrastructure/analytics.js';

test('events before the async provider loads are delivered once, in order', () => {
  let counter = null;
  const events = [];
  const tracker = createEventTracker(() => counter);
  tracker.track('add-simulation');
  tracker.track('share');
  counter = { count: (event) => events.push(event) };
  tracker.flush();
  tracker.flush();
  assert.deepEqual(events, [
    { path: 'add-simulation', title: 'add-simulation', event: true },
    { path: 'share', title: 'share', event: true },
  ]);
});

test('loaded counters receive events immediately without personal parameters', () => {
  const events = [];
  const tracker = createEventTracker(() => ({ count: (event) => events.push(event) }));
  tracker.track('copy-current');
  assert.deepEqual(events, [{ path: 'copy-current', title: 'copy-current', event: true }]);
});

test('blocked counters have a bounded queue', () => {
  let counter = null;
  const events = [];
  const tracker = createEventTracker(() => counter, { maxQueued: 2 });
  tracker.track('first');
  tracker.track('second');
  tracker.track('third');
  counter = { count: (event) => events.push(event.path) };
  tracker.flush();
  assert.deepEqual(events, ['second', 'third']);
});

test('provider exceptions cannot break app actions or stop later events', () => {
  let called = 0;
  const tracker = createEventTracker(() => ({
    count: () => {
      called++;
      throw new Error('blocked');
    },
  }));
  assert.doesNotThrow(() => {
    tracker.track('share');
    tracker.track('print');
  });
  assert.equal(called, 2);
});

test('invalid event names and free text are not collected', () => {
  const events = [];
  const tracker = createEventTracker(() => ({ count: (event) => events.push(event) }));
  for (const name of [null, 123, 'salary=73000', 'My proposal', 'https://example.com', 'x'.repeat(65)])
    tracker.track(name);
  assert.deepEqual(events, []);
});
