// Spanish CPI (IPC general, INE), % change. Source: INE tables 76144 (annual
// average) and 76134 (December year-on-year).
// https://www.ine.es/jaxiT3/Tabla.htm?t=76144 · https://www.ine.es/jaxiT3/Tabla.htm?t=76134

// prettier-ignore
export const CPI_DECEMBER = {
  2008: 1.4, 2009: 0.8, 2010: 3.0, 2011: 2.4, 2012: 2.9, 2013: 0.3, 2014: -1.0,
  2015: 0.0, 2016: 1.6, 2017: 1.1, 2018: 1.2, 2019: 0.8, 2020: -0.5, 2021: 6.5,
  2022: 5.7, 2023: 3.1, 2024: 2.8, 2025: 2.9,
};

// The state scale limits (12,450 / 20,200 / 35,200 / 60,000 €) date from Ley 26/2014
export const BRACKETS_LAST_UPDATED = 2015;

/** Cumulative CPI increase (%) from December of `fromYear` to December 2025. */
export function cumulativeInflation(fromYear) {
  const factor = Object.entries(CPI_DECEMBER)
    .filter(([year]) => Number(year) > fromYear)
    .reduce((acc, [, change]) => acc * (1 + change / 100), 1);
  return (factor - 1) * 100;
}
