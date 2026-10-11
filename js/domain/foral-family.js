/** Family inputs that block a foral estimate, as message keys. Eligibility is confirmed explicitly. */
export function foralFamilyIssues(input) {
  const children = input.children ?? 0;
  const under3 = input.childrenUnder3 ?? 0;
  const under6 = input.childrenUnder6 ?? 0;
  const age6to15 = input.children6to15 ?? 0;
  const issues = [];
  if ([children, under3, under6, age6to15].some((value) => !Number.isInteger(value) || value < 0 || value > 20))
    issues.push('foralIssueInvalid');
  else if (
    under3 > children ||
    (input.region !== 'navarra' &&
      (under6 > children || age6to15 > children || under3 > under6 || under6 + age6to15 > children))
  )
    issues.push('foralIssueAgeGroups');
  if (input.region === 'alava' && input.city === 'vitoria-gasteiz' && input.foralAlavaRural === true)
    issues.push('foralIssueAlavaRural');
  if (children > 0 && input.foralChildrenConfirmed !== true) issues.push('foralIssueChildren');
  return issues;
}

/** Inconsistent age groups or unconfirmed eligibility never generate an estimate. */
export const unsupportedForalFamily = (input) => foralFamilyIssues(input).length > 0;
