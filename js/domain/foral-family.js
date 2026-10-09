/** Eligibility is confirmed explicitly; inconsistent age groups never generate an estimate. */
export function unsupportedForalFamily(input) {
  const children = input.children ?? 0;
  const under3 = input.childrenUnder3 ?? 0;
  const under6 = input.childrenUnder6 ?? 0;
  const age6to15 = input.children6to15 ?? 0;
  return (
    under3 > children ||
    (input.region !== 'navarra' &&
      (under6 > children || age6to15 > children || under3 > under6 || under6 + age6to15 > children)) ||
    (input.region === 'alava' && input.city === 'vitoria-gasteiz' && input.foralAlavaRural === true) ||
    (children > 0 && input.foralChildrenConfirmed !== true)
  );
}
