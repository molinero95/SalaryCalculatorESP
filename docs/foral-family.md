# Foral descendants and taxpayer disability · 2026

Reviewed 9 October 2026. This extends the individual, full-year single-employment-payer model; it is not a complete foral return. The model still excludes age 65+, family situations 1/2, temporary contracts, ascendants, dependency grades, relatives’ disability, adoptions, changes in family circumstances during the year, flexible remuneration and pension/EPSV contributions. Workplace and residence are assumed to have the same withholding administration.

## Official sources

| Territory | Annual assessment                                                                                                                                                                                                                                                                                            | Payroll withholding                                                                                                                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bizkaia   | [NF 13/2013, consolidated 1 January 2026](https://www.bizkaia.eus/documents/880307/15187815/ca_13_2013.pdf), arts.23,79,82                                                                                                                                                                                   | [DF 134/2025, BOB 30 December 2025](https://www.bizkaia.eus/lehendakaritza/Bao_bob/2025/12/30/I-1405_cas.pdf), effective 1 January 2026; [regulation DF 47/2014 art.88](https://www.bizkaia.eus/documents/880307/15187815/ca_47_2014.pdf)                                          |
| Gipuzkoa  | [NF 3/2014 consolidated](https://www.gipuzkoa.eus/documents/2456431/80760262/NF+3-2014+%282025-3%29.pdf/8ab5c95c-3f89-8fdf-5cb8-01950e3983cc), arts.23,79,82, including NF 1/2025 reform; [2026 budget amendments, NF 6/2025](https://www7.gipuzkoa.net/presupuestos/2026/Ppto2026/pdfs/0/Disposiciones.pdf) | [DF 27/2025, BOG 30 December 2025](https://egoitza.gipuzkoa.eus/gao-bog/castell/bog/2025/12/30/c2508991.pdf), art.95 of DF 33/2014, effective 1 January 2026                                                                                                                       |
| Álava     | [NF 33/2013 consolidated](https://web.araba.eus/documents/d/araba/indice_norma-foral_irpf_cas-7-pdf), arts.23,79,82                                                                                                                                                                                          | [DF 42/2025, BOTHA 29 December 2025](https://www.araba.eus/BOTHA/Boletines/2025/147/2025_147_03919_C.pdf), art.84, effective 1 January 2026                                                                                                                                        |
| Navarra   | [DFL 4/2008 consolidated](https://www.lexnavarra.navarra.es/detalle.asp?r=29657), arts.62.5,62.9,64.5                                                                                                                                                                                                        | [Hacienda consolidated DF 174/1999](https://www.navarra.es/es/web/normativa-hacienda/-/reglamento-del-impuesto-sobre-la-renta-de-las-personas-f%C3%ADsicas-df-174/1999-de-24-de-mayo-?print=true), art.71, DF 148/2025 effective 1 January 2026 and BON 20 January 2026 correction |

The Gipuzkoa consolidated PDF filename contains “2025-3”, but the downloaded text includes the NF 6/2025 amendments effective 2026. Read the contents and effective dates, not the filename alone. Navarra's current 2026 withholding table is the first current article 71 table; historical tables following it must not be substituted. The €75,250 boundary and the final high-income bands are retained.

## Children and eligibility

The user must explicitly confirm that all entered children satisfy the jurisdiction's requirements. Existing saved states with children default to **unconfirmed**; results stay hidden until confirmed. Counts represent children eligible throughout the year, with year-end ages. Changing jurisdiction or the total child count clears the confirmation; choosing another city in the same jurisdiction preserves it. No automatic assumption is made from the number of children alone.

- Basque territories: descendants aged up to 30 inclusive, cohabiting, nonexempt income not above SMI; no other family unit whose member exceeds SMI; neither filing nor required to file IRPF. Special rules for disabled descendants, judicial support and family changes are outside this profile.
- Navarra: unmarried descendants under 30, cohabiting and nonexempt income not above IPREM. Disabled descendants, adoption supplements and judicial-support exceptions are outside this profile.
- Full counting means one eligible parent; otherwise annual deductions are shared equally between two eligible parents. More than two eligible claimants or mixed sharing between children are not represented. Withholding uses the **whole descendant count**, irrespective of annual deduction sharing.
- Basque under-six count includes under-three children; the two inputs are not added. Under-six + ages six to fifteen cannot exceed total children. Impossible groups hide results and the pure payroll entry point rejects them.

| Annual child credit  | Bizkaia / Gipuzkoa | Álava                                         | Navarra       |
| -------------------- | ------------------ | --------------------------------------------- | ------------- |
| First                | €682               | €734.80                                       | €483          |
| Second               | €844               | €909.70                                       | €512          |
| Third                | €1,421             | €1,532.30                                     | €732          |
| Fourth               | €1,680             | €1,811.70                                     | €981          |
| Fifth                | €2,195             | €2,366.10                                     | €1,111        |
| Sixth and subsequent | €2,195             | €2,366.10                                     | €1,286        |
| Age supplement       | Under 6: €394      | Under 6: €424.60; ages 6–15 inclusive: €68.20 | Under 3: €644 |

Álava's optional rural confirmation applies a 15% increase to the **ordinal child credit only**, not the age supplements, when residence is in a municipality below 4,000 inhabitants and the family's principal centre of interests is there (art.79.2bis). It is not inferred from selecting Álava, nor from municipality data. Leave it unchecked in Vitoria-Gasteiz.

Navarra increases the child credit attributable to each taxpayer by 40% when article 64.5 income (including exempt income) is at most €20,000; between €20,000.01 and €30,000 the percentage is `40 − 50 × (income − 20000) / 20000`, rounded to two decimal **percentage points**. At €30,000 it is 15%; above €30,000 there is no increment. Do not replace this enacted discontinuity with an invented linear phaseout. The base child credit is shared first, then the taxpayer's own percentage is applied once; do not halve the resulting increment a second time. With no other income in this profile, article 64.5 income is gross salary minus employee SS.

## Taxpayer disability

Requires certified disability and active employment throughout the year. Dependency grade credits and disabled relatives are not modelled. The ordinary disability selector refers to the taxpayer.

- Basque employment bonification is multiplied by 2 for disability 33–64%, or 3.5 for disability 65+ and for 33–64% with accredited reduced mobility (BLAM final mobility limitation at least 25%). Cap at positive net employment income. The separate mobility checkbox is used only in Basque territories with disability 33–64%.
- Basque withholding: reduce the appropriate descendant-column rate by the published disability **percentage points**, using inclusive gross-income upper limits. Floor the rate at zero. Reduced mobility uses the severe column.
- Annual disability credit: Bizkaia/Gipuzkoa €906 / €1,294; Álava €1,025.64 / €1,464.54, for 33–64% / 65+ respectively. Reduced mobility alone does not change the annual disability credit band.
- Navarra withholding: ordinary/severe reductions are 5/15 points through €23,250, 3/15 through €41,250, 2/8 through €94,750 and 2/5 above. At income below the first retention band the zero rate remains zero.
- Navarra annual work credit is multiplied by 1.5 / 2 for 33–64% / 65+, capped by the employment scale quota; personal disability credits are €766 / €2,757. In this single-income model employment scale quota and annual scale quota use the same base. Annual tax stays nonnegative.

## Independent examples and validation

At €30,000 gross and €1,950 employee SS:

| Profile                             | Withholding rate       | Annual tax                                                      |
| ----------------------------------- | ---------------------- | --------------------------------------------------------------- |
| Bizkaia/Gipuzkoa, 33–64% disability | 15 − 7 = 8%            | Base €22,050; quota €5,270 − €1,615 − €906 = **€2,749**         |
| Álava, 33–64% disability            | 8%                     | €5,270 − €1,615 − €1,025.64 = **€2,629.36**                     |
| Bizkaia/Gipuzkoa, 65+% disability   | 15 − 12 = 3%           | Base €17,550; quota €4,036.50 − €1,615 − €1,294 = **€1,127.50** |
| Álava, 65+% disability              | 3%                     | €4,036.50 − €1,615 − €1,464.54 = **€956.96**                    |
| Navarra, 33–64% disability          | 14.6 − 3 = 11.6%       | €6,516.63 − €1,410.28 − €1,050 − €766 = **€3,290.35**           |
| Navarra, 65+% disability            | max(0, 14.6 − 15) = 0% | €6,516.63 − €1,410.28 − €1,400 − €2,757 = **€949.35**           |

`tests/foral-family.test.js` has independently transcribed published descendant rows, boundary cases for disability tables, sharing/age/rural/income increments, payroll examples, restoration and common-regime isolation. Existing complete zero-descendant boundary fixtures remain. Browser tests cover eligibility guards, age fields, results, persistence, language changes and offline loading. AI-generated software warnings remain applicable; tests do not establish fiscal certification.
