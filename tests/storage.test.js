import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encode, decode, loadState, saveState } from '../js/storage.js';

for (const name of ['Simulación de nómina', 'Euskara · € · 👶', '<script>alert(1)</script>']) {
  test(`share payload preserves Unicode literally: ${name}`, () => {
    const payload = { simulation: { name, incomeTax: { childRateReduction: 4 } } };
    const encoded = encode(payload);
    assert.match(encoded, /^[A-Za-z0-9_-]+$/);
    assert.deepEqual(decode(encoded), payload);
  });
}

for (const value of ['', '%broken%', 'e25vdC1qc29ufQ']) {
  test(`invalid shared data returns null: ${value}`, () => assert.equal(decode(value), null));
}

test('unavailable local storage does not stop calculation persistence', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('Unavailable');
    },
  });
  try {
    assert.doesNotThrow(() => saveState({ simulations: [] }));
    assert.equal(loadState(), null);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});
