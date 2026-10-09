// Distribution of gross annual salaries in Spain, used to place the user's
// salary in a percentile. Upper bound of each percentile.
// Source: AEAT, "Mercado de Trabajo y Pensiones en las Fuentes Tributarias 2024",
// full-year salary module (common territory; salaries annualised by days worked;
// excludes annualised salaries below the minimum wage and above 720,000 €).
// https://sede.agenciatributaria.gob.es/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Estadisticas/Publicaciones/sites/mercado/2024/jrubikf2b7aac620fee24d8b74e173bdf7c55d6347fe85e.html

export const SALARY_PERCENTILES = {
  source: 'AEAT, Mercado de Trabajo y Pensiones en las Fuentes Tributarias 2024',
  url: 'https://sede.agenciatributaria.gob.es/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Estadisticas/Publicaciones/sites/mercado/2024/jrubikf2b7aac620fee24d8b74e173bdf7c55d6347fe85e.html',
  year: 2024,
  mean: 32078,
  // prettier-ignore
  upperBounds: [
    15933, 16092, 16250, 16413, 16575, 16736, 16895, 17053, 17213, 17373,
    17539, 17703, 17868, 18030, 18198, 18366, 18538, 18712, 18891, 19071,
    19254, 19440, 19626, 19808, 19991, 20171, 20350, 20535, 20728, 20926,
    21118, 21313, 21513, 21709, 21912, 22112, 22313, 22521, 22737, 22955,
    23177, 23409, 23645, 23886, 24118, 24369, 24623, 24886, 25149, 25428,
    25714, 26000, 26300, 26616, 26942, 27269, 27615, 27971, 28337, 28730,
    29136, 29559, 30000, 30412, 30817, 31268, 31772, 32300, 32860, 33432,
    34025, 34642, 35254, 35906, 36571, 37247, 37929, 38625, 39343, 40085,
    40892, 41747, 42683, 43726, 44831, 46010, 47318, 48738, 50299, 52095,
    54152, 56585, 59539, 63072, 67410, 72917, 80429, 91706, 113906,
  ],
};

/** Percentile (0-100) of a gross annual salary, interpolating between bounds. */
export function salaryPercentile(gross) {
  const bounds = SALARY_PERCENTILES.upperBounds;
  if (gross <= bounds[0]) return 1;
  if (gross >= bounds.at(-1)) return 99;
  const i = bounds.findIndex((bound) => gross <= bound);
  return i + (gross - bounds[i - 1]) / (bounds[i] - bounds[i - 1]);
}
