# Net salary simulator

> [!WARNING]
> This project was generated and developed with the help of artificial intelligence. The code, tax data, translations and results may contain errors or may not be fully up to date. Automated tests check selected behaviours but do not guarantee tax accuracy. Treat results as estimates and verify them against official sources or professional advice before making decisions.

Spanish payroll calculator and tax policy simulator. Work out your take-home pay under the current rules and compare it with any change to income tax (IRPF) brackets, allowances or social security contributions.

**[Open the simulator →](https://molinero95.github.io/SalaryCalculatorESP/)**

[Castellano](README.md) · [Català](README.ca.md) · [Euskara](README.eu.md) · [Galego](README.gl.md) · **English**

## What you can do

- **Your salary:** estimate payroll, IRPF withholding, employee contributions and employer cost; distinguish 12/14 payments, annual payroll net and net after the estimated tax return.
- **Residence and family:** select all 17 communities, Basque historical territory and an optional city; enter age, children, ascendants, disability and supported eligibility confirmations.
- **Flexible compensation and pensions:** assess meal, transport, health insurance, childcare and training benefits and individual/employer pension contributions within documented limits.
- **Simulate changes:** edit parameters and scales, compare up to five scenarios through cards, tables, breakdowns and salary charts; index thresholds in the common regime.
- **Political proposals:** load editable partial templates with sources, dates, assumptions and excluded measures.
- **Share and resume:** share simulation rules without personal details and automatically restore inputs and open tabs in the same browser.
- **Offline and installable:** after a complete first online load, use the app offline and install it in supporting browsers.
- **Five languages:** Spanish, Catalan, Basque, Galician and English.

## Payroll and annual assessment

Payroll withholding is an advance payment. Annual assessment separates state/regional quotas and allowances and estimates a payable or refundable balance. Changing common-regime residence can change annual assessment without changing payroll. A refund is not guaranteed.

Basque territories and Navarra use their own rules for supported profiles. Unsupported common-regime proposals or fiscal edits show an unavailable notice rather than an unchanged simulated result. [Residence](docs/locations.md) · [Foral scope](docs/foral-payroll.md) · [Fiscal validation](docs/fiscal-validation.md).

## Available policy templates

| Executable template | Scope                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| VOX 2024            | Partial annual and separate withholding scales; state child-rate reduction. Not the full programme.      |
| Sumar 2023          | Partial annual top marginal rate; current withholding retained.                                          |
| Podemos 2019        | Historical partial first annual band; current withholding and documented remaining assumptions retained. |

PP, PSOE, Podemos 2025 and Ciudadanos have informational entries where verified parameters or eligibility are missing. These are not complete models or exhaustive party coverage. Saved older scenarios are not silently rewritten; reapply a template to adopt reviewed rules. [Scope and sources](docs/proposal-scope.md) · [Catalogue](data/proposals.json).

## Supported scope and pending work

The main employment profile assumes one payer and a complete year. Multiple payers, self-employment, pluriactivity and joint filing have no complete model. Selected additional annual incomes in foral profiles do not constitute a complete self-employed calculator.

**Housing:** initial inputs and skipped-rule explanations are implemented; the new housing deductions in the plan are not yet calculated. Further phases require verified rules. [Housing plan](https://github.com/molinero95/SalaryCalculatorESP/pull/22) · [Prioritized backlog](docs/BACKLOG.md).

## Data maintenance and alerts

The fiscal catalogue records fiscal years, sources and verification dates. A weekly Monday/manual workflow checks known URLs for document changes, unavailable sources and overdue parameter groups. Cases persist with history until an explicit evidence-backed review; source recovery or fingerprint acceptance does not close them.

Reports are in **GitHub Actions → Template source review**, downloadable artifacts and the `monitor-state` branch. GitHub notifications depend on account settings; no dedicated messages or in-app maintenance alerts are configured. A 14-day BOE title scan discovers review candidates; AEAT indexes, original regional/foral bulletins, party indexes and automatic fiscal updates remain unsupported. [Monitor instructions](docs/template-maintenance.md) · [Fiscal sources](data/fiscal-sources.json).

## Privacy and architecture

Calculations and personal data stay in the browser, with local session storage. Shared links carry simulation rules, not salary/family inputs. Static HTML, CSS and JavaScript ES modules need no calculation backend or external application runtime dependencies. [GoatCounter](https://www.goatcounter.com/) records anonymous visits, so analytics makes external requests.

## Development and checks

Use Node.js 22, npm and Python 3. No application build is required.

```bash
npm ci
npm start                  # http://localhost:8000
npm test
npm run lint
npm run templates:check
npx playwright install --with-deps chromium
npm run test:e2e
```

CI runs unit, catalogue, browser/accessibility and selected macOS visual checks; tests do not certify tax accuracy. Run `npm run templates:build` after canonical catalogue edits and review the `sw.js` cache version after changing cached app files. [Development](CONTRIBUTING.md) · [Architecture](docs/architecture.md).

GitHub Pages publishes from `main`, repository root; check current repository settings before changing deployment.

## Backlog: next steps

The [complete backlog](docs/BACKLOG.md) records priorities, status, owners, dependencies and acceptance criteria. Persistent alerts are implemented; remaining work includes:

- **P0 — fiscal currency:** discover new official publications, show fiscal year/verification in results and strengthen review deadlines and monitor health.
- **P1 — scope and validation:** phased housing implementation (Claude), year-rollover/cache-upgrade checks, source traceability and additional verified proposals.
- **P1 — employment profiles:** multiple payers/job changes, partial-year employment, self-employment and pluriactivity.
- **P2 — evolution:** presentation/sharing refactors, visual coverage, reviewed fiscal-update drafts, broader foral scope, offer comparisons and leave/sick-pay estimates.

A backlog entry is not an available feature. Check its status and implementation PR before treating it as supported.

## Documentation and contributions

[AGENTS.md](AGENTS.md) · [Context](docs/AI_CONTEXT.md) · [Decisions](docs/ROADMAP.md) · [Backlog](docs/BACKLOG.md).

Fiscal and translation reviews are welcome. Fiscal changes require original sources, applicable periods/eligibility and independent tested examples. UI changes preserve all five languages and offline use.

## License

[MIT](LICENSE) © 2026 Jaime Molinero Lacave
