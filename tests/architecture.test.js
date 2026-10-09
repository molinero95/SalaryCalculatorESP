import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = new URL(entry.name, directory);
    return entry.isDirectory() ? filesIn(new URL(`${entry.name}/`, directory)) : [path];
  });
}

test('domain and application modules do not access browser APIs or depend on outer layers', () => {
  for (const layer of ['domain', 'application']) {
    for (const path of filesIn(new URL(`../js/${layer}/`, import.meta.url))) {
      const source = readFileSync(path, 'utf8');
      assert.doesNotMatch(
        source,
        /\b(?:document|window|localStorage|location|history|navigator)\s*[.(]/,
        path.pathname,
      );
      assert.doesNotMatch(source, /from\s+['"][^'"]*\/(?:infrastructure|presentation|i18n)\//, path.pathname);
      if (layer === 'domain') assert.doesNotMatch(source, /from\s+['"][^'"]*\/application\//, path.pathname);
    }
  }
});

test('every browser module is explicitly included in the offline app shell', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const cached = new Set([...sw.matchAll(/'\.\/(js\/[^']+)'/g)].map((match) => match[1]));
  const root = new URL('../', import.meta.url);
  for (const path of filesIn(new URL('js/', root))) {
    if (!path.pathname.endsWith('.js')) continue;
    assert.ok(cached.has(path.pathname.slice(root.pathname.length)), `Missing offline module ${path.pathname}`);
  }
});
