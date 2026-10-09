import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES } from '../js/i18n/index.js';

for (const [code, { messages }] of Object.entries(LANGUAGES)) {
  test(`all translations and interpolation variables are present in ${code}`, () => {
    const baseline = LANGUAGES.es.messages;
    assert.deepEqual(Object.keys(messages).sort(), Object.keys(baseline).sort());
    for (const [key, value] of Object.entries(messages)) {
      assert.equal(typeof value, 'string', key);
      assert.ok(value.trim(), key);
      const variables = (text) => (text.match(/\{\w+\}/g) ?? []).sort();
      assert.deepEqual(variables(value), variables(baseline[key]), key);
    }
  });
}
