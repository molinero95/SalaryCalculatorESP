// Full annual scales, not a regional share. Effective 1 January 2026.
// Reviewed sources and supported profiles: docs/locations.md.
const basqueScale = [
  [18080, 23],
  [36160, 28],
  [54240, 35],
  [77450, 40],
  [107260, 45],
  [142960, 46],
  [208390, 47],
  [null, 49],
].map(([upTo, rate]) => ({ upTo, rate }));

export const FORAL_TERRITORIES = {
  bizkaia: { name: 'País Vasco · Bizkaia', community: 'basque', brackets: structuredClone(basqueScale) },
  gipuzkoa: { name: 'País Vasco · Gipuzkoa', community: 'basque', brackets: structuredClone(basqueScale) },
  alava: { name: 'País Vasco · Araba/Álava', community: 'basque', brackets: structuredClone(basqueScale) },
  navarra: {
    name: 'Navarra',
    community: 'navarra',
    brackets: [
      [4458, 13],
      [10030, 22],
      [21175, 25],
      [35663, 28],
      [51266, 36.5],
      [66869, 41.5],
      [89159, 44],
      [139310, 47],
      [195034, 49],
      [334344, 50.5],
      [null, 52],
    ].map(([upTo, rate]) => ({ upTo, rate })),
  },
};
