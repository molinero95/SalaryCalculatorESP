# Net salary simulator

Spanish payroll calculator and tax policy simulator. Work out your take-home pay under the current rules and compare it with any change to income tax (IRPF) brackets, allowances or social security contributions.

**[Open the simulator →](https://molinero95.github.io/SalaryCalculatorESP/)**

[Castellano](README.md) · [Català](README.ca.md) · [Euskara](README.eu.md) · [Galego](README.gl.md) · **English**

## Features

- **Full payslip**: employee contributions (common contingencies, unemployment, training, MEI and solidarity contribution), income tax withholding following the general procedure in the IRPF Regulation, and employer cost.
- **Side-by-side comparison** between the current rules and a simulation, with a line-by-line breakdown and differences.
- **Editable brackets**: add, remove or change brackets; apply regional templates or index every threshold at once.
- **Every parameter is configurable**: personal and family allowances, employment income reduction, minimum wage tax credit, contribution bases, employer rates…
- **Flexible compensation**: meal card, transport, health insurance, childcare and training, with their exempt limits.
- **Pension plans**: individual and company plans, with the estimated saving in the tax return.
- **Chart by salary level** to see who gains or loses under a proposal.
- **Saved scenarios**, share links and JSON import/export.
- **Five languages**: Spanish, Catalan, Basque, Galician and English.
- No dependencies, no backend, no cookies: everything is computed in the browser.
  Visits are counted anonymously with [GoatCounter](https://www.goatcounter.com/).

## How it works

1. **Social security**: contribution base = gross annual salary / 12, clamped between the minimum and maximum bases. Above the maximum base, the solidarity contribution applies in bands.
2. **Net earnings** = gross − contributions.
3. **Withholding base** = net earnings − other deductible expenses (€2,000, plus disability-related ones) − employment income reduction (art. 20 LIRPF).
4. **Tax amount** = scale(base) − scale(personal and family allowance) , capped at 43 % of the excess over the withholding-free minimum.
5. **Withholding rate** = tax amount / gross, rounded to two decimals (at least 2 % on temporary contracts).
6. With **14 payments**, social security is spread over 12 months and the two extra payments only carry income tax.
7. The **low-earner credit** is not applied in payroll: it is shown as an estimated refund in the annual return.
8. **Flexible compensation** is exempt from income tax up to its limits but still pays social security.

### Default values (2026)

| Parameter                           | Value                                                                |
| ----------------------------------- | -------------------------------------------------------------------- |
| Withholding scale                   | 19 % · 24 % · 30 % · 37 % · 45 % · 47 %                              |
| Employee contributions              | 4.70 % CC + 1.55 % unemployment + 0.10 % training + 0.15 % MEI       |
| Maximum / minimum base              | €5,101.20 / €1,424.50 per month                                      |
| Personal allowance                  | €5,550                                                               |
| Maximum employment income reduction | €7,302                                                               |
| Low-earner credit (annual return)   | €590.89 up to €17,094, zero at €20,048.45                            |
| Withholding-free minimum            | €15,876 – €19,262 depending on family situation                      |
| Pension plans (tax base reduction)  | €1,500 individual + €8,500 employment, max 30 % of net income        |
| Tax-exempt flexible pay             | Meals €11/day · transport €1,500/year · health insurance €500/person |

> [!IMPORTANT]
> This tool gives estimates only. Some parameters (minimum wage credit, withholding-free minimum, regional scales) may change during the year; all of them can be adjusted in the interface or in [`js/defaults.js`](js/defaults.js). It does not cover the foral territories (Basque Country and Navarre).

### Sources

- [Law 35/2006 on IRPF](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764) — arts. 19, 20, 57-61, 63, 80 bis and 101.
- [IRPF Regulation (RD 439/2007)](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820) — arts. 80-86 (withholding procedure).
- [Royal Decree-law 5/2026](https://www.boe.es/buscar/doc.php?id=BOE-A-2026-3810) — low-earner credit (DA 61ª LIRPF).
- Orden PJC/297/2026 — 2026 contribution bases and rates.
- [Spanish Tax Agency — withholding on employment income](https://sede.agenciatributaria.gob.es/).
- [Social Security — contribution bases and rates](https://www.seg-social.es/wps/portal/wss/internet/Trabajadores/CotizacionRecaudacionTrabajadores/36537).

## Development

There is no build step: it is plain HTML, CSS and JavaScript ES modules.

```bash
npm start   # local server at http://localhost:8000
npm test    # payroll engine tests (Node 18+)
```

```
├── index.html
├── css/styles.css
├── js/
│   ├── app.js          # state and UI orchestration
│   ├── calc.js         # payroll engine (pure functions)
│   ├── defaults.js     # current parameters and bracket templates
│   ├── settings.js     # settings and bracket editor
│   ├── results.js      # result cards and breakdown
│   ├── chart.js        # SVG chart
│   ├── format.js       # number formatting
│   ├── storage.js      # localStorage and share links
│   └── i18n/           # translations (one file per language)
└── tests/
```

### Deploying to GitHub Pages

In the repository's **Settings → Pages**, choose _Deploy from a branch_, branch `main` and folder `/ (root)`.

### Contributing

Corrections to the tax rules and reviews of the translations (especially Basque and Galician) are welcome. To add a language, create `js/i18n/<code>.js` with the same keys as `es.js`, register it in `js/i18n/index.js` and add its `README.<code>.md`.

## License

[MIT](LICENSE) © 2026 Jaime Molinero Lacave
