# Maintenance policy

The owner requested maintenance mode on 13 October 2026. Keep the existing payroll estimator, supported fiscal profiles, five languages, editable simulations and offline operation stable. Taxable pay in kind in [PR #34](https://github.com/molinero95/SalaryCalculatorESP/pull/34) remains an explicitly requested feature.

The owner also requested a review of every province, including Canarias, Ceuta, Melilla, País Vasco and Navarra. Findings and the full inventory are in [territorial-coverage.md](territorial-coverage.md).

## Work selection

- Fix reproducible defects and regressions in the supported product.
- Review official-source changes and year-end applicability. Change existing fiscal parameters only with primary evidence, applicable dates and independent expected-value fixtures.
- Triage the weekly source-monitor ledger and its availability failures. Preserve unresolved cases and distinguish source availability, publication candidates and confirmed calculation changes.
- Close meaningful validation gaps, including installed-app upgrades and interrupted offline updates. Keep accessible layouts and reviewed macOS baselines.
- Update development dependencies or CI when an identified compatibility, security or reliability problem requires it; avoid unrelated version churn.

Other product expansion and broad refactoring are deferred until the owner requests them. This includes additional employment histories, self-employment, leave estimators and expansion of unsupported foral profiles. Common-regime housing deductions remain out of scope; existing supported foral habitual-rent credits remain part of maintenance. Older Ready/In progress backlog statuses describe plans, not permission to resume feature development.

## Review routine

1. Inspect current main, open PRs and the latest CI/deployment. Work from current main in a focused branch; do not merge a feature merely because it is open.
2. Read the latest `monitor-state/alerts.json` and Actions artifacts. A failing source review can mean unresolved findings rather than a broken calculator. Review original texts before changing parameters or closing a case; retain evidence through the existing workflow.
3. Prioritize verified calculation errors and user-visible failures. Treat incomplete fiscal research as pending, with its unsupported scope explicit.
4. Run the checks required by [CONTRIBUTING.md](../CONTRIBUTING.md). Preserve existing screenshot references unless inspected differences represent an intended change.
5. Report the concrete change, checks actually executed and remaining findings. PR creation does not authorize merging or deployment.

The existing Monday source-monitor workflow continues on its configured schedule. This policy does not create a daily automation or automatic fiscal updates.

## Initial review, 13 October 2026

Main at `4e0edd9` has successful CI (including macOS visual checks) and Pages deployment in [run 38119851751](https://github.com/molinero95/SalaryCalculatorESP/actions/runs/38119851751). Housing PRs #22, #26, #29 and #30 were closed; removal of housing inputs and plans was merged in #31.

[Source-review run 38280333885](https://github.com/molinero95/SalaryCalculatorESP/actions/runs/38280333885) persisted two availability failures (Podemos 2019 HTTP 403 and the Navarra fiscal source fetch failure) and eight BOE title candidates. These candidates are not confirmed fiscal changes and remain pending; none was closed or accepted in this review.

[PR #34](https://github.com/molinero95/SalaryCalculatorESP/pull/34) has passing lint, unit and nonvisual browser checks, but ten macOS screenshot comparisons fail after the new pay-in-kind section changes page height. This requires visual inspection and reviewed references as well as review of its fiscal assumptions before merging.
