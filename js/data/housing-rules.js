// Catalogue of IRPF housing rules researched for fiscal year 2026.
// Research and per-rule detail: docs/housing-deductions-2026.md (rule ids match).
// Metadata only: no rule is calculated yet, so every rule is reported as skipped.
//
// `region`: null for state rules, otherwise a common-regime key of REGIONAL_SCALES.
// `side`: who claims it. 'tenant' pays rent for their habitual dwelling, 'buyer'
//   acquires, builds, rehabilitates or finances it, 'landlord' lets a dwelling,
//   'any' is a housing-related amount open to tenants and buyers alike.
// `level`: verification level of the research. 'L1' primary legal text (BOE),
//   'L2' Ministry of Finance compendium "Tributación Autonómica. Medidas 2026"
//   chapter IV (updated 23-09-2026), 'L3' AEAT Renta 2025 manual only.
// `legalStatus`: 'provisional' while the enacting norm can still lapse.
// `payrollEffect`: true when the rule changes payroll withholding, not only the
//   annual return.

export const HOUSING_RESEARCH = {
  fiscalYear: 2026,
  researchedAt: '2026-10-10',
  compendiumUpdatedAt: '2026-09-23',
};

const BOE_LIRPF = 'https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764';
const BOE_RDL_29_2026 = 'https://www.boe.es/buscar/doc.php?id=BOE-A-2026-20823';
const COMPENDIUM =
  'https://www.hacienda.gob.es/sgfal/financiacionterritorial/autonomica/capitulo-iv-tributacion-autonomica-2026.pdf';

const state = (id, side, article, url, extra = {}) => ({
  id,
  region: null,
  side,
  level: 'L1',
  article,
  url,
  legalStatus: 'inForce',
  payrollEffect: false,
  ...extra,
});

const regional = (region, rules) =>
  rules.map(([id, side, article]) => ({
    id,
    region,
    side,
    level: 'L2',
    article,
    url: COMPENDIUM,
    legalStatus: 'inForce',
    payrollEffect: false,
  }));

export const HOUSING_RULES = [
  state('S1', 'tenant', 'LIRPF art. 68.6 (RDL 29/2026)', BOE_RDL_29_2026, { legalStatus: 'provisional' }),
  state('S2', 'tenant', 'LIRPF DT 15ª', BOE_LIRPF),
  state('S3', 'buyer', 'LIRPF DT 18ª; RIRPF art. 86.1', BOE_LIRPF, { payrollEffect: true }),
  state('S4', 'landlord', 'LIRPF art. 23.2; DT 38ª', BOE_LIRPF),

  ...regional('andalusia', [
    ['AND-1', 'tenant', 'Ley 5/2021 art. 10'],
    ['AND-2', 'buyer', 'Ley 5/2021 art. 9'],
    ['AND-3', 'tenant', 'Decreto-ley 1/2026 art. 7'],
    ['AND-4', 'buyer', 'Decreto-ley 1/2026 art. 6'],
  ]),
  ...regional('aragon', [
    ['ARA-1', 'tenant', 'TR D.Leg. 1/2005 art. 110-12'],
    ['ARA-2', 'buyer', 'TR D.Leg. 1/2005 arts. 110-10, 160-1, 160-2'],
    ['ARA-3', 'buyer', 'TR D.Leg. 1/2005 art. 110-7'],
    ['L-ARA', 'landlord', 'TR D.Leg. 1/2005 art. 110-13'],
  ]),
  ...regional('asturias', [
    ['AST-1', 'tenant', 'TR D.Leg. 2/2014 art. 7'],
    ['AST-2', 'buyer', 'TR D.Leg. 2/2014 art. 14 decies'],
    ['AST-3', 'buyer', 'TR D.Leg. 2/2014 art. 6'],
    ['AST-4', 'buyer', 'TR D.Leg. 2/2014 art. 4'],
    ['AST-5', 'any', 'TR D.Leg. 2/2014 art. 14 terdecies'],
    ['AST-6', 'any', 'TR D.Leg. 2/2014 art. 14 sexdecies'],
    ['L-AST', 'landlord', 'TR D.Leg. 2/2014 art. 14 quindecies'],
  ]),
  ...regional('balearic', [
    ['BAL-1', 'tenant', 'TR D.Leg. 1/2014 art. 3 bis'],
    ['BAL-2', 'buyer', 'TR D.Leg. 1/2014 art. 3 quater'],
    ['BAL-3', 'tenant', 'TR D.Leg. 1/2014 art. 4 quinquies'],
    ['BAL-T', 'buyer', 'Ley 3/2012 DT única.3'],
    ['L-BAL-a', 'landlord', 'TR D.Leg. 1/2014 art. 4 quater'],
    ['L-BAL-b', 'landlord', 'TR D.Leg. 1/2014 art. 4 quater'],
    ['L-BAL-c', 'landlord', 'TR D.Leg. 1/2014 art. 4 quater'],
  ]),
  ...regional('canary', [
    ['CAN-1', 'tenant', 'TR D.Leg. 1/2009 art. 15'],
    ['CAN-2', 'tenant', 'TR D.Leg. 1/2009 art. 15 bis'],
    ['CAN-3', 'buyer', 'TR D.Leg. 1/2009 art. 14'],
    ['L-CAN-a', 'landlord', 'TR D.Leg. 1/2009 art. 15 ter'],
    ['L-CAN-b', 'landlord', 'TR D.Leg. 1/2009 art. 16'],
    ['L-CAN-c', 'landlord', 'TR D.Leg. 1/2009 art. 15 quater'],
  ]),
  ...regional('cantabria', [
    ['CANT-1', 'tenant', 'TR D.Leg. 62/2008 art. 2.1'],
    ['CANT-2', 'tenant', 'TR D.Leg. 62/2008 art. 2.11'],
    ['CANT-3', 'buyer', 'TR D.Leg. 62/2008 art. 2.19.1'],
    ['CANT-4', 'buyer', 'TR D.Leg. 62/2008 art. 2.19.2'],
    ['L-CANT', 'landlord', 'TR D.Leg. 62/2008 art. 2.17'],
  ]),
  ...regional('castillaLaMancha', [
    ['CLM-1', 'tenant', 'Ley 8/2013 art. 9'],
    ['CLM-2', 'tenant', 'Ley 8/2013 art. 9 ter'],
    ['CLM-3', 'tenant', 'Ley 8/2013 art. 9 quáter'],
    ['CLM-4', 'tenant', 'Ley 8/2013 art. 9 quinquies'],
    ['CLM-5', 'tenant', 'Ley 8/2013 art. 9 bis'],
    ['CLM-6', 'buyer', 'Ley 8/2013 art. 12 ter'],
    ['CLM-7', 'buyer', 'Ley 8/2013 art. 12 octies'],
  ]),
  ...regional('castillaLeon', [
    ['CYL-1', 'tenant', 'TR D.Leg. 1/2013 art. 7.4-7.5'],
    ['CYL-2', 'buyer', 'TR D.Leg. 1/2013 art. 7.1'],
    ['CYL-3', 'buyer', 'TR D.Leg. 1/2008 DT 5ª'],
    ['L-CYL', 'landlord', 'TR D.Leg. 1/2013 art. 7.3'],
  ]),
  ...regional('catalonia', [
    ['CAT-1', 'tenant', 'Código tributario art. 612-3'],
    ['CAT-2', 'tenant', 'Código tributario art. 612-11'],
    ['CAT-3', 'tenant', 'Ley 8/2025 art. 61'],
    ['CAT-4', 'buyer', 'Ley 8/2025 arts. 58, 60'],
    ['CAT-5', 'buyer', 'Código tributario art. 613-1'],
    ['CAT-6', 'buyer', 'Código tributario art. 612-4'],
    ['CAT-7', 'buyer', 'Ley 8/2025 arts. 59, 60'],
  ]),
  ...regional('valencia', [
    ['VAL-1', 'tenant', 'Ley 13/1997 art. 4.Uno.n)'],
    ['VAL-2', 'tenant', 'Ley 13/1997 art. 4.Uno.ñ)'],
    ['VAL-3', 'buyer', 'Ley 13/1997 art. 4.Uno.k)'],
    ['VAL-4', 'buyer', 'Ley 13/1997 art. 4.Uno.l)'],
    ['VAL-5', 'buyer', 'Ley 13/1997 art. 4.Uno.u)'],
    ['VAL-6', 'buyer', 'Ley 13/1997 art. 4.Uno.m)'],
    ['VAL-T', 'buyer', 'Ley 13/1997 DT 1ª'],
    ['L-VAL', 'landlord', 'Ley 13/1997 art. 4.Uno.j)'],
  ]),
  ...regional('extremadura', [
    ['EXT-1', 'tenant', 'TR D.Leg. 1/2018 art. 9'],
    ['EXT-2', 'buyer', 'TR D.Leg. 1/2018 art. 8'],
    ['EXT-3', 'buyer', 'TR D.Leg. 1/2018 art. 11 bis'],
    ['EXT-4', 'buyer', 'TR D.Leg. 1/2018 art. 11 quater'],
    ['L-EXT-a', 'landlord', 'TR D.Leg. 1/2018 art. 9 bis'],
    ['L-EXT-b', 'landlord', 'TR D.Leg. 1/2018 art. 9 ter'],
  ]),
  ...regional('galicia', [
    ['GAL-1', 'tenant', 'TR D.Leg. 1/2011 art. 5.Siete'],
    ['GAL-2', 'buyer', 'TR D.Leg. 1/2011 art. 5.Veinte'],
    ['L-GAL-a', 'landlord', 'TR D.Leg. 1/2011 art. 5.Veintidós'],
    ['L-GAL-b', 'landlord', 'TR D.Leg. 1/2011 art. 5.Veintitrés'],
  ]),
  ...regional('rioja', [
    ['RIO-1', 'tenant', 'Ley 10/2017 art. 32.12'],
    ['RIO-2', 'buyer', 'Ley 10/2017 art. 32.11'],
    ['RIO-3', 'buyer', 'Ley 10/2017 art. 32.2'],
    ['RIO-T1', 'buyer', 'Ley 10/2017 DT 1ª.a)'],
    ['RIO-T2', 'buyer', 'Ley 10/2017 DT 1ª.b)'],
    ['RIO-T3', 'buyer', 'Ley 10/2017 DT 1ª.d)'],
  ]),
  ...regional('madrid', [
    ['MAD-1', 'tenant', 'TR D.Leg. 1/2010 arts. 8, 18'],
    ['MAD-2', 'buyer', 'TR D.Leg. 1/2010 art. 12'],
    ['MAD-3', 'buyer', 'TR D.Leg. 1/2010 art. 10'],
    ['MAD-4', 'buyer', 'TR D.Leg. 1/2010 art. 13'],
    ['MAD-5', 'buyer', 'TR D.Leg. 1/2010 art. 10 ter'],
    ['MAD-6', 'any', 'TR D.Leg. 1/2010 art. 10 bis'],
    ['L-MAD-a', 'landlord', 'TR D.Leg. 1/2010 art. 8 bis'],
    ['L-MAD-b', 'landlord', 'TR D.Leg. 1/2010 art. 8 ter'],
  ]),
  ...regional('murcia', [
    ['MUR-1', 'tenant', 'TR D.Leg. 1/2010 art. 1.Trece'],
    ['MUR-2', 'buyer', 'TR D.Leg. 1/2010 art. 1.Uno'],
    ['MUR-3', 'buyer', 'TR D.Leg. 1/2010 art. 1.Quince'],
    ['MUR-T', 'buyer', 'TR D.Leg. 1/2010 DT 1ª, DT única.4'],
  ]),
];
