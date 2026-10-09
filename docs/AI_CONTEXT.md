# Project context for AI agents

## Product and scope

SalaryCalculatorESP estimates Spanish employee payroll and compares editable fiscal scenarios, including selected political proposals and inflation indexing. Users enter salary and personal circumstances, inspect payroll/annual-return estimates, compare charts and up to five simulations, and save/share/export scenarios. The hosted app is a static GitHub Pages site; repository: `molinero95/SalaryCalculatorESP`.

This software was generated and developed with AI assistance. Fiscal data, translations and results may be incomplete or inaccurate. Preserve that message and describe results as estimates.

The supported fiscal model includes the common regime and a limited foral model for employee profiles including confirmed eligible children/ascendants, taxpayer age/disability, short temporary employment, flexible compensation, ordinary pensions and selected positive annual rental/savings/business inputs in Bizkaia, Gipuzkoa, Álava and Navarra. Read [foral-payroll.md](foral-payroll.md) and [locations.md](locations.md) and [foral-family.md](foral-family.md) before changing jurisdiction logic; unsupported foral profiles hide results rather than use common-regime rules. This is not a full Renta WEB declaration: losses, joint filing, all regional deductions, special employment profiles and every benefit/eligibility case are outside the implemented scope. The authoritative detail is in [fiscal-validation.md](fiscal-validation.md).

## Architecture

| Area                   | Files                                                                         | Responsibility                                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell                  | `index.html`, `css/styles.css`                                                | Static interface, responsive layout and accessible controls                                                                                              |
| Browser shell          | `js/app.js`                                                                   | Browser I/O, event wiring, presentation coordination and composition                                                                                     |
| Scenario domain        | `js/domain/scenario.js`, `js/domain/payroll-input.js`                         | Supported scenario shape, defensive normalization, input units and ranges                                                                                |
| Session use cases      | `js/application/simulation-session.js`                                        | Restore/import/share sessions, active simulation and tab invariants                                                                                      |
| Persistence scheduling | `js/infrastructure/session-persistence.js`                                    | Debounced writes to an injected repository and immediate lifecycle flush                                                                                 |
| Payroll form           | `js/presentation/payroll-form.js`, `residence.js`                             | Browser control rendering, events, display-to-annual unit conversion and cascading community, historical-territory and optional-city residence selectors |
| Pension/annual domain  | `js/domain/pension.js`, `js/domain/foral-assessment.js`                       | Ordinary pension limits and positive foral rental/savings/business integration with habitual-rent credits                                                |
| Payroll                | `js/calc.js`                                                                  | `computePayroll`: contributions, flexible pay, pension interactions and payroll/annual outputs                                                           |
| Income tax             | `js/tax.js`                                                                   | Pure scales, employment reduction, minima, withholding and annual state/regional quotas                                                                  |
| Baseline               | `js/defaults.js`                                                              | Current scenario, input defaults, scale combination and cloning                                                                                          |
| Regional data          | `js/data/regions.js`                                                          | Common-regime autonomous scales and allowance overrides; `foral.js` has full foral scales, `cities.js` maps residence presets                            |
| Proposal catalogue     | `data/proposals.json`                                                         | Canonical proposal metadata, supported changes and historical notes                                                                                      |
| Generated proposals    | `js/data/proposals.js`                                                        | Browser-ready catalogue generated by `scripts/template-catalogue.js`                                                                                     |
| Scenario builders      | `js/political.js`                                                             | Proposal application and inflation indexing                                                                                                              |
| Presentation           | `js/results.js`, `js/chart.js`, `js/settings.js`, `js/format.js`              | Breakdown/cards/charts, parameter editors and localized/escaped formatting                                                                               |
| Languages              | `js/i18n/`                                                                    | Matching keys in Spanish, Catalan, Basque, Galician and English                                                                                          |
| Persistence            | `js/storage.js`                                                               | Local state/scenarios and Unicode-safe URL serialization                                                                                                 |
| Offline                | `sw.js`, `manifest.webmanifest`                                               | App-shell precache and installable/offline experience                                                                                                    |
| Context data           | `js/data/cpi.js`, `js/data/salaries.js`                                       | Inflation/salary reference data; inspect their dates before treating as current                                                                          |
| Monitoring             | `scripts/check-template-sources.js`, `.github/workflows/template-sources.yml` | Known-source fingerprints and review reports; does not change fiscal calculations                                                                        |
| Validation             | `tests/`, `e2e/`, `.github/workflows/test.yml`                                | Node tests, Playwright/axe checks and CI                                                                                                                 |

Runtime uses browser ES modules without external application dependencies. npm packages provide development/testing tooling. GoatCounter records anonymous visits; do not describe the app as having no external requests whatsoever.

The DDD refactor is incremental. Read [architecture.md](architecture.md) for layer boundaries and the remaining extractions. Existing fiscal/rendering modules retain their public paths.

## Data flow and compatibility

`DEFAULT_INPUT` and `CURRENT_SCENARIO` provide initial values. `app.js` reads browser state and composes the session, form and persistence adapters. `createSession` and `importSession` apply the domain normalization rules; session commands enforce selection, capacity and a nonempty simulation list. The session owns restored arrays, so editing a tab cannot mutate another tab or an import payload. `computePayroll(input, scenario)` returns calculation outputs used by cards, breakdowns and charts. Scenario builders clone inputs rather than mutate the current baseline. Reviewed templates can use an independent `withholdingBrackets` scale when `useSeparateWithholding` is true; annual `brackets` remain the combined reference. See [proposal-scope.md](proposal-scope.md).

Local storage keys are `net-salary:state` and `net-salary:scenarios`. Persistence is debounced and flushed during page lifecycle events. Browser tests that alter saved state must account for that flush; seed corruption on the next page initialization rather than just before reload. The active simulation index is clamped and floored. Shared links use `#s=`; inspect the import/share code before altering the payload because locally saved personal details and shared simulation settings have different roles.

## Fiscal distinctions that matter

- Payroll withholding is an advance payment; annual liability/refund is a separate estimate. Do not display an annual credit as higher monthly payroll cash.
- Withholding rates truncate to two decimals. The 43% quota cap has a salary limit. Short temporary contracts use a minimum rate under the documented assumption.
- Annual assessment separates state and regional scales and minima. Different minimum amounts must not cancel another quota. Age thresholds differ between the documented annual rule and withholding algorithm.
- User-edited combined scales are hypothetical. Derived state adjustments preserve configured precision and can be signed when combined rates fall below the regional reference. Do not silently clamp away this compatibility behaviour.
- Flexible-pay tax exemptions and social-security contributions are different. Pension limits involve shared room, employer/employee relationships and net-income limits; employer contributions also affect income/contribution calculations.
- Units vary: scenario rates use percentage points, salary/result calculations commonly use annual euro amounts and contribution limits are monthly. Check existing conversions before changing units.

These are navigation hints, not a substitute for the fiscal source matrix or the current code/tests.

## Proposal maintenance

Catalogue states are `modelled`, `partial` and `unmodelled`. Executable templates require official sources. Incomplete notes can retain an explicitly identified secondary source. Vox and Sumar currently supply templates; other entries are contextual notes. A partial template retains documented assumptions, not a complete reconstruction of an election programme.

Publication date, human verification date and automated download time are distinct. The weekly monitor hashes known URLs, rejects invalid PDF responses and preserves unapproved changed fingerprints. It cannot discover new announcements or interpret their fiscal significance. See [template-maintenance.md](template-maintenance.md) for baseline acceptance and cache limitations.

## Start a new session

Read AGENTS.md, inspect Git status/branch and the current task, then read the relevant module, documentation and tests. Use repository files and current CI as the source of implementation truth; this context is not a claim that a particular branch or pending PR is up to date. Ask only for missing decisions that block the task. End with a concise handoff that distinguishes completed work, pending work and actual validation.
