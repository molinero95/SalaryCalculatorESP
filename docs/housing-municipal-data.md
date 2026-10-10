# Municipal population handoff for housing phase 3

## Prepared data

`data/municipal-population-2025.json` and the equivalent CSV contain 8,132 municipalities from the [INE official municipal population table 29005](https://www.ine.es/jaxiT3/files/t/csv_bdsc/29005.csv). The reference date is 1 January 2025. Only `Sexo = Total`, `Periodo = 2025` and numeric populations are included. No earlier population is substituted for a missing 2025 value.

The five-digit `code` and two-digit `provinceCode` are strings: preserve leading zeroes. Names are taken directly from the same table, without joining by name or applying the 2026 municipality catalogue. The CSV has UTF-8 encoding, a header and ungrouped integer populations. The JSON records the source URL, download date and SHA-256 of the original downloaded CSV.

Six historic entries have no numeric 2025 population and are excluded: Cerdedo (36011), Cesuras (15026), Cotobade (36012), Gatova (12066), Oza dos Ríos (15063), Palmerola (17122).

Validation: all municipality codes are unique, populations are nonnegative integers, and sums by province match all 52 province/autonomous-city entries in the annex of [Real Decreto 1117/2025](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-25362). The aggregate is 49,114,494 inhabitants. This is the official municipal register dataset, not the annual population census.

## Remaining implementation decisions

This is a development reference dataset; it is not loaded by the app and does not activate any fiscal deduction. No service-worker change is required. Housing phase 3 still needs the regional depopulation lists and the reference date required by each legal rule. A population threshold and membership in an officially designated rural/depopulated list are different conditions. Verify each before enabling it.

The decree declares these municipal figures official with effects from 31 December 2025. This does not establish which population year any particular deduction requires. Additional years may be necessary. Match municipalities by official code and record list/source/year provenance; do not infer eligibility from a name or population alone.

## Reviewed macOS screenshot references

Ten affected references (details, simulation, salary/proposal navigation and dark mode, for desktop/mobile) were copied byte-for-byte from actual images in [CI run 38090330038](https://github.com/molinero95/SalaryCalculatorESP/actions/runs/38090330038), artifact 11684150027. That run tested phase-2 head `18fec4963a986cc4fa6c7715bdc123578073f615` against its phase-1 base. The images were generated on macOS, reviewed for housing content, control visibility and layout, and retain the `darwin` filenames. The unchanged residence help references remain intact. The original run passed the ten language/profile field checks and two help screenshot checks; ten layout comparisons failed against pre-housing references.

The new references require a fresh macOS CI comparison before claiming visual checks pass. Updating these images does not resolve the outstanding fiscal review of phase 2.
