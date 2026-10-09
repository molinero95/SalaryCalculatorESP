import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const cataloguePath = new URL('../data/proposals.json', import.meta.url);
export const generatedPath = new URL('../js/data/proposals.js', import.meta.url);

export function validateCatalogue(catalogue) {
  if (catalogue.schemaVersion !== 1 || !Array.isArray(catalogue.proposals) || !catalogue.proposals.length)
    throw new Error('Invalid catalogue version or proposals');
  const ids = new Set();
  for (const p of catalogue.proposals) {
    if (!/^[a-z][a-z0-9]+$/.test(p.id) || ids.has(p.id)) throw new Error('Invalid or duplicate proposal id');
    ids.add(p.id);
    for (const key of ['party', 'title', 'note', 'date', 'verifiedAt'])
      if (typeof p[key] !== 'string' || !p[key].trim()) throw new Error(`Missing ${key}: ${p.id}`);
    const url = new URL(p.url);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Source must be public HTTPS');
    if (!/^\d{4}-\d{2}(-\d{2})?$/.test(p.date) || !/^\d{4}-\d{2}-\d{2}$/.test(p.verifiedAt))
      throw new Error('Invalid date');
    if (!['official', 'secondary'].includes(p.sourceType)) throw new Error('Invalid source type');
    if (!['modelled', 'partial', 'unmodelled'].includes(p.status)) throw new Error('Invalid status');
    if (!Array.isArray(p.limitations) || !p.limitations.every((x) => typeof x === 'string'))
      throw new Error('Invalid limitations');
    if (p.status !== 'modelled' && !p.limitations.length) throw new Error('Incomplete proposal needs limitations');
    if (!Array.isArray(p.history) || !p.history.length || p.history.some((h) => !h.date || !h.description))
      throw new Error('Missing history');
    if (p.status === 'unmodelled') {
      if (p.changes) throw new Error('Unmodelled proposal cannot have changes');
      continue;
    }
    if (p.sourceType !== 'official') throw new Error('Simulations require a primary source');
    const tax = p.changes?.incomeTax;
    if (!tax || Object.keys(p.changes).some((k) => k !== 'incomeTax')) throw new Error('Unsupported changes');
    for (const [key, value] of Object.entries(tax)) {
      if (!['brackets', 'personalAllowance', 'childRateReduction'].includes(key))
        throw new Error('Unsupported parameter');
      if (key !== 'brackets' && (!Number.isFinite(value) || value < 0 || (key === 'childRateReduction' && value > 100)))
        throw new Error('Invalid parameter');
    }
    if (!Array.isArray(tax.brackets) || !tax.brackets.length) throw new Error('Missing brackets');
    let previous = 0;
    tax.brackets.forEach(({ upTo, rate }, i) => {
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error('Invalid rate');
      if (i === tax.brackets.length - 1 ? upTo !== null : !Number.isFinite(upTo) || upTo <= previous)
        throw new Error('Invalid bracket limits');
      previous = upTo;
    });
  }
  return catalogue;
}

export function renderCatalogue(catalogue) {
  validateCatalogue(catalogue);
  const modelled = Object.fromEntries(
    catalogue.proposals.filter((p) => p.status !== 'unmodelled').map((p) => [p.id, p]),
  );
  const notes = catalogue.proposals.filter((p) => p.status === 'unmodelled');
  return `// Generated from data/proposals.json. Run npm run templates:build; do not edit directly.\n\nexport const PROPOSALS = ${JSON.stringify(modelled, null, 2)};\n\nexport const UNMODELLED_PROPOSALS = ${JSON.stringify(notes, null, 2)};\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const catalogue = JSON.parse(await readFile(cataloguePath, 'utf8'));
  const { format, resolveConfig } = await import('prettier');
  const output = await format(renderCatalogue(catalogue), {
    ...(await resolveConfig(fileURLToPath(generatedPath))),
    filepath: fileURLToPath(generatedPath),
  });
  if (process.argv.includes('--check')) {
    if (output !== (await readFile(generatedPath, 'utf8'))) throw new Error('Generated catalogue is stale');
  } else await writeFile(generatedPath, output);
}
