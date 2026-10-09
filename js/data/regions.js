// Regional (autonómica) IRPF scales of the 15 common-regime communities in 2026.
// Thirteen keep their 2025 scale; Comunitat Valenciana (Ley 5/2026) and
// Extremadura (Ley 2/2026) approved new ones. País Vasco and Navarra have their
// own foral tax systems, modelled separately in foral.js.
// Sources: AEAT, Manual práctico de Renta 2025, "Gravamen autonómico"; Hacienda,
// Tributación Autonómica. Medidas 2026 (capítulos I y II).
// https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-general/gravamen-autonomico/
// https://www.hacienda.gob.es/sgfal/financiacionterritorial/autonomica/capitulo-i-tributacion-autonomica-2026.pdf

/* prettier-ignore */
export const REGIONAL_SCALES = {
  andalusia: { name: 'Andalucía', brackets: [
    { upTo: 13000, rate: 9.5 }, { upTo: 21100, rate: 12 }, { upTo: 35200, rate: 15 },
    { upTo: 60000, rate: 18.5 }, { upTo: null, rate: 22.5 } ] },
  aragon: { name: 'Aragón', brackets: [
    { upTo: 13072.5, rate: 9.5 }, { upTo: 21210, rate: 12 }, { upTo: 36960, rate: 15 },
    { upTo: 52500, rate: 18.5 }, { upTo: 60000, rate: 20.5 }, { upTo: 80000, rate: 23 },
    { upTo: 90000, rate: 24 }, { upTo: 130000, rate: 25 }, { upTo: null, rate: 25.5 } ] },
  asturias: { name: 'Asturias', brackets: [
    { upTo: 12450, rate: 9 }, { upTo: 17707.2, rate: 12 }, { upTo: 33007.2, rate: 14 },
    { upTo: 53407.2, rate: 19.2 }, { upTo: 70000, rate: 21.5 }, { upTo: 90000, rate: 22.5 },
    { upTo: 175000, rate: 25 }, { upTo: null, rate: 26 } ] },
  balearic: { name: 'Illes Balears', brackets: [
    { upTo: 10000, rate: 9 }, { upTo: 18000, rate: 11.25 }, { upTo: 30000, rate: 14.25 },
    { upTo: 48000, rate: 17.5 }, { upTo: 70000, rate: 19 }, { upTo: 90000, rate: 21.75 },
    { upTo: 120000, rate: 22.75 }, { upTo: 175000, rate: 23.75 }, { upTo: null, rate: 24.75 } ] },
  canary: { name: 'Canarias', brackets: [
    { upTo: 13748, rate: 9 }, { upTo: 19422, rate: 11.5 }, { upTo: 35924, rate: 14 },
    { upTo: 57566, rate: 18.5 }, { upTo: 93268, rate: 23.5 }, { upTo: 123745, rate: 25 },
    { upTo: null, rate: 26 } ] },
  cantabria: { name: 'Cantabria', brackets: [
    { upTo: 13000, rate: 8.5 }, { upTo: 21000, rate: 11 }, { upTo: 35200, rate: 14.5 },
    { upTo: 60000, rate: 18 }, { upTo: 90000, rate: 22.5 }, { upTo: null, rate: 24.5 } ] },
  castillaLaMancha: { name: 'Castilla-La Mancha', brackets: [
    { upTo: 12450, rate: 9.5 }, { upTo: 20200, rate: 12 }, { upTo: 35200, rate: 15 },
    { upTo: 60000, rate: 18.5 }, { upTo: null, rate: 22.5 } ] },
  castillaLeon: { name: 'Castilla y León', brackets: [
    { upTo: 12450, rate: 9 }, { upTo: 20200, rate: 12 }, { upTo: 35200, rate: 14 },
    { upTo: 53407.2, rate: 18.5 }, { upTo: null, rate: 21.5 } ] },
  catalonia: { name: 'Catalunya', brackets: [
    { upTo: 12500, rate: 9.5 }, { upTo: 22000, rate: 12.5 }, { upTo: 33000, rate: 16 },
    { upTo: 53000, rate: 19 }, { upTo: 90000, rate: 21.5 }, { upTo: 120000, rate: 23.5 },
    { upTo: 175000, rate: 24.5 }, { upTo: null, rate: 25.5 } ] },
  valencia: { name: 'Comunitat Valenciana', brackets: [
    { upTo: 12000, rate: 8.8 }, { upTo: 22000, rate: 11.7 }, { upTo: 32000, rate: 14.6 },
    { upTo: 42000, rate: 17 }, { upTo: 52000, rate: 19.4 }, { upTo: 62000, rate: 21.9 },
    { upTo: 72000, rate: 24.4 }, { upTo: 100000, rate: 26.1 }, { upTo: 150000, rate: 27.35 },
    { upTo: 200000, rate: 28.35 }, { upTo: null, rate: 29.35 } ] },
  extremadura: { name: 'Extremadura', brackets: [
    { upTo: 12450, rate: 7.75 }, { upTo: 20200, rate: 9.75 }, { upTo: 24200, rate: 16 },
    { upTo: 35200, rate: 17.5 }, { upTo: 60000, rate: 21 }, { upTo: 80200, rate: 23.5 },
    { upTo: 99200, rate: 24 }, { upTo: 120200, rate: 24.5 }, { upTo: null, rate: 25 } ] },
  galicia: { name: 'Galicia', brackets: [
    { upTo: 12985.35, rate: 9 }, { upTo: 21068.6, rate: 11.65 }, { upTo: 35200, rate: 14.9 },
    { upTo: 60000, rate: 18.4 }, { upTo: null, rate: 22.5 } ] },
  madrid: { name: 'Comunidad de Madrid', brackets: [
    { upTo: 13362.22, rate: 8.5 }, { upTo: 19004.63, rate: 10.7 }, { upTo: 35425.68, rate: 12.8 },
    { upTo: 57320.4, rate: 17.4 }, { upTo: null, rate: 20.5 } ] },
  murcia: { name: 'Región de Murcia', brackets: [
    { upTo: 12450, rate: 9.5 }, { upTo: 20200, rate: 11.2 }, { upTo: 34000, rate: 13.3 },
    { upTo: 60000, rate: 17.9 }, { upTo: null, rate: 22.5 } ] },
  rioja: { name: 'La Rioja', brackets: [
    { upTo: 12450, rate: 8 }, { upTo: 20200, rate: 10.6 }, { upTo: 35200, rate: 13.6 },
    { upTo: 40000, rate: 17.8 }, { upTo: 50000, rate: 18.3 }, { upTo: 60000, rate: 19 },
    { upTo: 120000, rate: 24.5 }, { upTo: null, rate: 27 } ] },
};

// Regional personal and family allowances where they differ from the state ones
// (AEAT, Manual Renta 2025, "Cuadro mínimos personales y familiares").
/* prettier-ignore */
export const REGIONAL_ALLOWANCES = {
  balearic: { ageOver65Allowance: 1265, ageOver75Allowance: 1540, child2Allowance: 2970, child3Allowance: 4400, child4Allowance: 4950, dependent65Allowance: 1265, dependent75Allowance: 1540, disability33Allowance: 3300, disability65Allowance: 9900, careAllowance: 3300 },
  andalusia: { personalAllowance: 5790, ageOver65Allowance: 1200, ageOver75Allowance: 1460, child1Allowance: 2510, child2Allowance: 2820, child3Allowance: 4170, child4Allowance: 4700, childUnder3Allowance: 2920, dependent65Allowance: 1200, dependent75Allowance: 1460, disability33Allowance: 3130, disability65Allowance: 9390, careAllowance: 3130 },
  asturias: { personalAllowance: 6105, ageOver65Allowance: 1265, ageOver75Allowance: 1540, child1Allowance: 2640, child2Allowance: 2970, child3Allowance: 4400, child4Allowance: 4950, childUnder3Allowance: 3080, dependent65Allowance: 1265, dependent75Allowance: 1540, disability33Allowance: 3300, disability65Allowance: 9900, careAllowance: 3300 },
  valencia: { personalAllowance: 6105, ageOver65Allowance: 1265, ageOver75Allowance: 1540, child1Allowance: 2640, child2Allowance: 2970, child3Allowance: 4400, child4Allowance: 4950, childUnder3Allowance: 3080, dependent65Allowance: 1265, dependent75Allowance: 1540, disability33Allowance: 3300, disability65Allowance: 9900, careAllowance: 3300 },
  canary: { personalAllowance: 5606, ageOver65Allowance: 1162, ageOver75Allowance: 1414, child1Allowance: 2424, child2Allowance: 2727, child3Allowance: 4040, child4Allowance: 4545, childUnder3Allowance: 2828, dependent65Allowance: 1162, dependent75Allowance: 1414, disability33Allowance: 3030, disability65Allowance: 9090, careAllowance: 3030 },
  galicia: { personalAllowance: 5789, ageOver65Allowance: 1199, ageOver75Allowance: 1460, child1Allowance: 2503, child2Allowance: 2816, child3Allowance: 4172, child4Allowance: 4694, childUnder3Allowance: 2920, dependent65Allowance: 1199, dependent75Allowance: 1460, disability33Allowance: 3129, disability65Allowance: 9387, careAllowance: 3129 },
  madrid: { personalAllowance: 5956.65, ageOver65Allowance: 1234.26, ageOver75Allowance: 1502.58, child1Allowance: 2575.85, child2Allowance: 2897.83, child3Allowance: 4400, child4Allowance: 4950, childUnder3Allowance: 3005.16, dependent65Allowance: 1234.26, dependent75Allowance: 1502.58, disability33Allowance: 3219.81, disability65Allowance: 9659.44, careAllowance: 3219.81 },
};
