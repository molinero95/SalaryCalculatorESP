# Expanded foral payroll and individual assessment · 2026

Reviewed 9 October 2026. This model estimates one active employee's payroll and individual annual assessment in Bizkaia, Gipuzkoa, Álava and Navarra. The test profiles are fictional realistic examples worked independently from the official rules; they are not real taxpayers' returns or a fiscal certification.

## Sources

Use the current consolidated articles, not historical wording or summaries in preambles:

- [Bizkaia NF 13/2013, consolidated 1 January 2026](https://www.bizkaia.eus/documents/880307/15187815/ca_13_2013.pdf): arts.17 (in-kind income), 23 (employment), 32 and 63 (housing rental and classification), 70–71 (pensions), 75–77 (general/savings quotas), 79–83 (family and age), 86 (rent paid). [DF 47/2014 consolidated](https://www.bizkaia.eus/documents/880307/15187815/ca_47_2014.pdf): meal/transport conditions and art.88 withholding.
- [Gipuzkoa NF 3/2014 consolidated](https://www.gipuzkoa.eus/documents/2456431/80760262/NF+3-2014+%282025-3%29.pdf/8ab5c95c-3f89-8fdf-5cb8-01950e3983cc): corresponding income, pension, savings and personal articles, including NF 1/2025 reform and 2026 amendments. The filename does not describe all effective dates in the text. [2026 withholding amendments](https://egoitza.gipuzkoa.eus/gao-bog/castell/bog/2025/12/30/c2508991.pdf).
- [Álava NF 33/2013 consolidated](https://web.araba.eus/documents/d/araba/indice_norma-foral_irpf_cas-7-pdf): corresponding articles, including the separate ascendant amount and rural supplement. [2026 withholding amendments](https://www.araba.eus/BOTHA/Boletines/2025/147/2025_147_03919_C.pdf).
- [Navarra DFL 4/2008, Hacienda consolidated law](https://www.navarra.es/es/web/normativa-hacienda/-/texto-refundido-de-la-ley-foral-del-impuesto-sobre-la-renta-de-las-personas-f%C3%ADsicas-dfl-4/2008-de-2-de-junio-): arts.15 (in-kind exemption), 25 (rental), 55 (pensions), 59–60 (quotas), 62.2/5/9 (rent, employment and family), 64.5 (income including exemptions before specified reductions), 66 (advance payments). [DF 174/1999 consolidated](https://www.navarra.es/es/web/normativa-hacienda/-/reglamento-del-impuesto-sobre-la-renta-de-las-personas-f%C3%ADsicas-df-174/1999-de-24-de-mayo-?print=true): arts.40,51bis,71. Use the current 2026 table, including the January correction, rather than appended historical tables.

## Payroll and benefits

| Rule                          | Basque territories                                                                                                                           | Navarra                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Short temporary contract      | 2% minimum under the shorter-than-one-year assumption                                                                                        | 2% minimum; also applies to part-time employment                                                |
| Family situation 1/2/3        | Does not import common withholding-free thresholds; child column remains separate                                                            | Same distinction                                                                                |
| Active worker's age credit    | Strictly **over** 65: €393; over 75: €714, replacing €393. Full through €20,000 income-tax base before pensions, linear phase-out to €30,000 | **At least** 65: €264; at least 75: €585, replacing €264                                        |
| Ordinary eligible ascendant   | €328 Bizkaia/Gipuzkoa; €423.72 Álava, including eligible under-65 ascendants                                                                 | €264 at least 65, €585 at least 75; disjoint 65–74 / 75+ inputs                                 |
| Álava rural                   | 15% increase of ordinal child and ascendant credits, not child age supplements                                                               | Not applicable                                                                                  |
| Health insurance              | Ordinary medical insurance remains taxable                                                                                                   | €500 per covered person; €1,500 for the disabled taxpayer                                       |
| Meal / transport              | €11 per eligible working day / €1,500 annually                                                                                               | Same reviewed limits                                                                            |
| Childcare / training          | Eligible first-cycle childcare or required job training; entered eligible amounts                                                            | Same eligibility assumption                                                                     |
| Ordinary personal pension     | €5,000                                                                                                                                       | €1,500 ordinary room shared with employment contributions                                       |
| Employment pension            | Employee + employer up to €8,000, without the common employer-matching coefficients                                                          | Extra employment room up to €8,500, employer-matching coefficients and €60,000 income threshold |
| Joint pension reduction limit | €10,000; employment has priority, no 30% net-income cap; never makes the general base negative                                               | 30% of net employment/activity income, **50% when over 50**, plus monetary limits               |

Ascendant eligibility and sharing are explicit: continuous eligible cohabitation or the documented residential-care equivalent, income limits and filing conditions differ by territory. Enter the same number of eligible claimants for every included ascendant; heterogeneous sharing requires a richer family model. Changing territory or eligible ascendant counts resets confirmation. Existing saved states are compatible and default to unconfirmed eligibility.

Family situation is a **payroll** input, not election of joint assessment. Age means an active employee's year-end age; it does not select retired-person pension taxation or age-related SS exemptions. Flexible remuneration still contributes to SS, including the taxable Basque medical insurance. Ordinary employer pension contributions increase the contribution base and annual employment income, but not cash payroll withholding. Coverage of additional family members' medical insurance assumes they are not disabled.

Navarra's employment credit uses net employment before pensions and includes exempt remuneration. Personal/child and rent income limits use art.64.5 income, including exemptions and before rental reductions, rather than the liquidable base. An ordinary pension reduction or exempt medical policy therefore cannot manufacture extra personal/child credits.

## Additional annual inputs

These fields are foral-only and require explicit scope/eligibility confirmation. Changing the jurisdiction or entered annual amounts resets it. They are annual euro amounts regardless of the flexible-pay/pension display periods.

- **One permanent-housing lease**, without a rental business. Basque ordinary housing: 30% gross allowance, deductible financing costs and nonpayment insurance capped at €300; no negative rental yield. Eligible public intermediation: 70% gross allowance and financing costs. The result belongs to **savings**. Navarra: deductible property expenses capped at gross rents, ordinary remaining income in **general**; registered eligible public intermediation reduces positive net yield by 70%. Unused property expenses and special stressed-area/rural rules are not carried or inferred.
- **Business profit** is an already determined positive fiscal net yield before partial integration/reductions, added to general income. This does not calculate RETA, business books, depreciation, simplified/objective estimation or business investment credits. In the Basque territories, other taxable income above €7,500 makes the employment bonification €3,000 before the certified-disability multiplier.
- **Savings** is positive net nonexempt financial income and realised transfer gains after eligible expenses/exemptions. The 2026 Basque savings scale begins at 19% through €7,500 and ends at 28% above €300,000; Navarra begins at 20% through €6,000 and ends at 28% above €300,000. No losses or prior-year offsets are inferred. Navarra's additional nonemployment exempt-income input restores those amounts for art.64.5 income limits.
- **Rent paid** means the taxpayer's eligible habitual-housing share after exempt subsidies. Basque ordinary 20% / €1,600; under 36, severe own disability or explicitly confirmed special category: 35% / €2,800. General and savings liquidable bases each must not exceed €68,000. Navarra ordinary 15% / €1,500, under 30 or qualifying single-parent category 20% / €1,600; art.64.5 income at most €30,000 and paid rent **strictly above 10%** of that income. Neither payroll family situation nor child count certifies a special category.
- **Other withholding / advance payments** reduce the annual settlement once, never payroll withholding. Monthly payroll cash does not include rent, investment proceeds or business cash. Annual cash after settlement applies the whole estimated settlement to payroll cash; it is not total household disposable income. Wage-only effective-rate/wedge indicators and the wage-rate chart are suppressed for mixed-income profiles so other advance payments cannot be misreported as a negative wage tax burden.

The Basque €1,615 general-quota reduction cannot consume savings quota. Eligible family/housing credits apply afterwards to the combined quota. Exclusive-employment no-filing suppression is not applied when additional taxable income or gross property rents are entered; the estimator does not decide all mandatory-filing exceptions.

## Independent worked examples

€30,000 gross, permanent full-time employment, age 35, no children, employee SS €1,950:

| Profile                                                                  | Bizkaia / Gipuzkoa | Álava     | Navarra   |
| ------------------------------------------------------------------------ | ------------------ | --------- | --------- |
| Baseline annual tax                                                      | €4,495.00          | €4,495.00 | €4,406.35 |
| €1,500 personal pension                                                  | €4,075.00          | €4,075.00 | €3,986.35 |
| Eligible 70-year-old ascendant, sole claimant                            | €4,167.00          | €4,071.28 | €4,142.35 |
| €500 medical insurance                                                   | €4,495.00          | €4,495.00 | €4,266.35 |
| €12,000 ordinary rent received, €1,000 eligible expenses, €400 insurance | €5,844.00          | €5,844.00 | €8,100.53 |
| €10,000 net fiscal business profit                                       | €7,295.00          | €7,295.00 | €7,735.53 |
| €10,000 eligible habitual rent paid                                      | €1,695.00          | €1,695.00 | €2,906.35 |

Navarra insurance in the landlord example is already included in its expense input and is not separately deducted. The Basque rental net is €12,000 × 70% − €1,000 − €300 = €7,100; savings quota €1,349. Navarra net is €11,000, general base €39,050; quota €8,648.27 + €3,387 × 36.5% = €9,884.525, credits €1,084 + €700, annual €8,100.53. Withholding remains based on employment.

Tests: `foral-benefits`, `foral-assessment`, existing `foral-family` and `locations`; realistic common-regime payroll cases and independently transcribed scale rows in `regional-official` cover every other autonomous community. Browser tests cover all four jurisdictions, eligibility reset, restoration and a complete offline reload.

## Remaining limits

This is **not complete IRPF**. Joint filing, family changes during the year, disabled relatives, dependency grades, adoption supplements, judicial maintenance, special employment/retirement, multiple rental-property records, special rental zones, loss integration/carry-forwards, donation/house-purchase/care/energy credits and international-tax offsets remain outside the model. Preferred EPSV credits cannot be inferred from a worker's personal contribution ratio: art.91bis and the implementing regulation use qualifying collective contributions and the **whole employer's** salary/contribution base. They require additional verified inputs. Other deductions are never automatically assumed.
