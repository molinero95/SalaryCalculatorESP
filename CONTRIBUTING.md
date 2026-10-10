# Development and validation

## Setup

Use Node.js 22 (as in CI), npm and Python 3 for the static development server.

```sh
npm ci
npm start
```

Open `http://localhost:8000`. Browser ES modules need an HTTP server; opening `index.html` as a file is not equivalent. There is no application bundler or backend. Proposal data generation is a maintenance step, not a runtime build requirement.

## Checks

| Change                                        | Checks                                                                                              |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Markdown/documentation only                   | `npm run lint`, verify paths and commands against the repository                                    |
| JS or fiscal data                             | `npm test`, `npm run lint`; fiscal updates also need source-based regression cases                  |
| Proposal catalogue                            | `npm run templates:build`, `npm run templates:check`, `npm test`, `npm run lint`                    |
| UI, persistence, translations, offline assets | Above checks plus `npm run test:e2e`                                                                |
| Intended visual change                        | Inspect affected views and run appropriate local `npm run test:visual`; review any baseline updates |

For browser tests, install Chromium once:

```sh
npx playwright install --with-deps chromium
npm run test:e2e
```

Playwright starts its own Python server on port 4173 and runs desktop Chrome and Pixel 7 profiles. Nonvisual browser checks run on Linux CI. A separate macOS job compares the residence form, residence help, simulation card, salary/proposal navigation views and dark-mode page against reviewed snapshots, and checks field visibility in all five languages. The remaining `@visual` snapshots run locally on macOS; Linux excludes them. Do not mistake their exclusion for visual validation.

`npm run test:coverage` reports executed lines, functions and branches. Coverage reveals unexecuted paths; it does not prove the legal model is complete. `npm run format` formats the entire repository; for focused changes prefer formatting the edited files.

## Fiscal/data updates

1. Read `docs/fiscal-validation.md` and locate the rule in the appropriate official source.
2. Specify applicable period and profile; identify whether it affects withholding, annual assessment, contributions or a hypothetical scenario.
3. Implement in the responsible module. Keep national and regional rules distinct.
4. Add an independent fixture/worked expected result, including relevant thresholds and one-sided boundary cases.
5. Update source documentation and explain unsupported conditions. For proposal updates, update catalogue history and human `verifiedAt` only after content review.
6. Run relevant checks and review the diff for unrelated changes.

The source monitor is separate: `npm run templates:sources` accesses live websites and creates ignored `.source-monitor/` reports. A nonzero exit can mean a changed or inaccessible document rather than a calculator regression. See `docs/template-maintenance.md` before accepting a baseline.

## PR handoff

Explain the problem, resulting behaviour, sources/assumptions and checks actually run. Preserve unrelated user changes. If a browser install or external source is unavailable, report the limitation and use CI where available. Publishing and merging follow the user's authorization for the task. Do not add secrets or personal scenarios to commits or PR descriptions.
