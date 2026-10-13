# Territorial coverage audit · 13 October 2026

This audit checks implementation coverage, not fiscal certification. The independent inventory uses the [INE standard province list](https://www.ine.es/daco/daco42/codmun/cod_provincia_estandar.htm): 50 provinces plus Ceuta and Melilla. Every provincial capital is mapped to an existing supported tax jurisdiction; the UI selects community, Basque territory and optional city, not province. Other cities in the same jurisdiction use that scale. See [locations.md](locations.md) for supported profiles.

## Findings

- The basic full-year, single-payer employee profile calculates in all 50 provinces: 46 in the common regime and four foral provinces. Tests validate the independent capital-to-jurisdiction mapping and calculate five salary levels for each province. Independent official amount fixtures remain in `regional-official.test.js`, `locations.test.js` and the foral tests.
- Both Canary provinces use the Canary regional scale and minima. This does not cover every island-specific relief: La Palma is explicitly outside the model. AEAT [2026 changes](https://sede.agenciatributaria.gob.es/Sede/irpf/novedades-impuesto/novedades-normativa-2026.html) extend its residence deduction for 2026 and affect eligible withholding from 10 September, with optional October regularization. The existing form has no island/eligibility/regularization inputs, so a Canary province alone cannot establish complete coverage.
- Bizkaia, Gipuzkoa and Álava have distinct foral jurisdictions. Navarra uses its own foral model. Results are limited to reviewed profiles and assume compatible residence/withholding jurisdiction; unsupported profiles must remain explicitly blocked. These four provinces do not support taxable pay in kind in PR #34.
- Ceuta and Melilla are absent from the selector and calculation model. They cannot be counted as supported by using the generic common-regime scale. [LIRPF art.68.4](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#a68) and [RIRPF art.80.2](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820#a80) require distinct annual and withholding relief. AEAT [modalities](https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c16-deducciones-generales-cuota/deduccion-rentas-obtenidas-ceuta-melilla/modalidades.html) distinguish effective residence, income location and longer residence/asset conditions. The applicable 60 % relief is not a universal discount triggered by a city name.

## Complete inventory

“Basic profile” below means a supported employee profile, with no claim to all regional deductions. Canary and foral exceptions above apply.

| INE code | Province / autonomous city | Capital preset             | Tax jurisdiction | Basic profile |
| -------- | -------------------------- | -------------------------- | ---------------- | ------------- |
| 01       | Araba/Álava                | vitoria-gasteiz            | alava            | Supported     |
| 02       | Albacete                   | albacete                   | castillaLaMancha | Supported     |
| 03       | Alicante/Alacant           | alicante-alacant           | valencia         | Supported     |
| 04       | Almería                    | almeria                    | andalusia        | Supported     |
| 05       | Ávila                      | avila                      | castillaLeon     | Supported     |
| 06       | Badajoz                    | badajoz                    | extremadura      | Supported     |
| 07       | Illes Balears              | palma                      | balearic         | Supported     |
| 08       | Barcelona                  | barcelona                  | catalonia        | Supported     |
| 09       | Burgos                     | burgos                     | castillaLeon     | Supported     |
| 10       | Cáceres                    | caceres                    | extremadura      | Supported     |
| 11       | Cádiz                      | cadiz                      | andalusia        | Supported     |
| 12       | Castellón/Castelló         | castello-de-la-plana       | valencia         | Supported     |
| 13       | Ciudad Real                | ciudad-real                | castillaLaMancha | Supported     |
| 14       | Córdoba                    | cordoba                    | andalusia        | Supported     |
| 15       | A Coruña                   | a-coruna                   | galicia          | Supported     |
| 16       | Cuenca                     | cuenca                     | castillaLaMancha | Supported     |
| 17       | Girona                     | girona                     | catalonia        | Supported     |
| 18       | Granada                    | granada                    | andalusia        | Supported     |
| 19       | Guadalajara                | guadalajara                | castillaLaMancha | Supported     |
| 20       | Gipuzkoa                   | donostia-san-sebastian     | gipuzkoa         | Supported     |
| 21       | Huelva                     | huelva                     | andalusia        | Supported     |
| 22       | Huesca                     | huesca                     | aragon           | Supported     |
| 23       | Jaén                       | jaen                       | andalusia        | Supported     |
| 24       | León                       | leon                       | castillaLeon     | Supported     |
| 25       | Lleida                     | lleida                     | catalonia        | Supported     |
| 26       | La Rioja                   | logrono                    | rioja            | Supported     |
| 27       | Lugo                       | lugo                       | galicia          | Supported     |
| 28       | Madrid                     | madrid                     | madrid           | Supported     |
| 29       | Málaga                     | malaga                     | andalusia        | Supported     |
| 30       | Murcia                     | murcia                     | murcia           | Supported     |
| 31       | Navarra                    | pamplona-iruna             | navarra          | Supported     |
| 32       | Ourense                    | ourense                    | galicia          | Supported     |
| 33       | Asturias                   | oviedo                     | asturias         | Supported     |
| 34       | Palencia                   | palencia                   | castillaLeon     | Supported     |
| 35       | Las Palmas                 | las-palmas-de-gran-canaria | canary           | Supported     |
| 36       | Pontevedra                 | pontevedra                 | galicia          | Supported     |
| 37       | Salamanca                  | salamanca                  | castillaLeon     | Supported     |
| 38       | Santa Cruz de Tenerife     | santa-cruz-de-tenerife     | canary           | Supported     |
| 39       | Cantabria                  | santander                  | cantabria        | Supported     |
| 40       | Segovia                    | segovia                    | castillaLeon     | Supported     |
| 41       | Sevilla                    | sevilla                    | andalusia        | Supported     |
| 42       | Soria                      | soria                      | castillaLeon     | Supported     |
| 43       | Tarragona                  | tarragona                  | catalonia        | Supported     |
| 44       | Teruel                     | teruel                     | aragon           | Supported     |
| 45       | Toledo                     | toledo                     | castillaLaMancha | Supported     |
| 46       | Valencia/València          | valencia                   | valencia         | Supported     |
| 47       | Valladolid                 | valladolid                 | castillaLeon     | Supported     |
| 48       | Bizkaia                    | bilbao                     | bizkaia          | Supported     |
| 49       | Zamora                     | zamora                     | castillaLeon     | Supported     |
| 50       | Zaragoza                   | zaragoza                   | aragon           | Supported     |
| 51       | Ceuta                      | —                          | Not modelled     | Not supported |
| 52       | Melilla                    | —                          | Not modelled     | Not supported |

## Follow-up

The requested nationwide review is complete; implementing Ceuta/Melilla or La Palma remains a separate fiscal change. Before claiming all-territory coverage, define a bounded eligible salaried profile, verify the applicable 2026 texts and contribution relief separately from IRPF, add explicit residence/work-location confirmations and guard mixed or partial-year cases. Require independent annual/withholding examples, five-language UI, source catalogue coverage and offline/browser checks. Do not infer authorization to implement an unreviewed regime from this audit.
