# Decisions and next work

## Established decisions

| Decision                                       | Reason / consequence                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Static HTML/CSS/ES modules                     | Simple hosting, offline use and no server dependency for payroll calculations                    |
| Pure fiscal engine separate from UI            | Independent expected-value tests and clearer maintenance                                         |
| Withholding and annual assessment are separate | Different minima, quota rules and credits; monthly cash must stay distinct from annual estimates |
| User-editable hypothetical scenarios           | Preserve arbitrary supported rates and combined-scale precision                                  |
| Five UI languages                              | New UI keys require all dictionaries; translations can need human review                         |
| Canonical JSON proposals with generated JS     | Reviewable data/history while retaining synchronous offline browser imports                      |
| Source monitoring flags changes for review     | Document bytes cannot determine whether a fiscal rule changed or became law                      |
| Independent official fixtures                  | Tests should challenge implementation rather than reproduce its constants                        |
| Local macOS visual baselines                   | Reviewed residence/help/dark-mode snapshots run on macOS CI; remaining snapshots stay local      |

## Implemented foundation

- Three product views: salary calculator, editable simulations and documented political proposals, sharing personal inputs; default salary entry and simulation entry for shared links.
- Multiple simulation tabs, comparison cards/charts and persistent selection.
- Initial DDD separation: scenario/input boundaries, session use cases, persistence scheduling and payroll form adapter; see [architecture.md](architecture.md).
- Separate annual state/regional quotas and breakdown labels; reviewed proposal withholding scales and explicit payroll/annual card metrics.
- Official-source threshold/minimum/contribution/pension/flexible-pay regression coverage for the supported fiscal scope.
- README AI/inaccuracy warnings in all five languages.
- Validated proposal catalogue, history/provenance, generated-data CI check and verification/partial UI labels.
- Weekly/manual source monitor with bounded downloads, PDF validation, per-source baselines and reports.

Confirm current details in code and CI; this list is not an exhaustive feature specification.

## Prioritized next work

The canonical pending queue, owners, dependencies and acceptance criteria are in [BACKLOG.md](BACKLOG.md). Fiscal currency, publication discovery, persistent review alerts and visible verification status take priority over general refactoring. Claude owns the separate housing implementation phases proposed in [PR #22](https://github.com/molinero95/SalaryCalculatorESP/pull/22); regional rules require original legal-text verification before implementation.

A live check during the source-monitor implementation found that the official PSOE PDF returned HTML in that execution environment. Treat this as a dated observation, not a permanent source outage; future reports must determine its current availability. Source-monitor errors should not be mistaken for failed payroll calculations.

Update this file when a decision or item materially changes. Record why, not a running transcript of every implementation step.

## Foral follow-up

Residence presets cover all communities. [Expanded foral payroll](foral-payroll.md) includes age, family situations, short temporary contracts, ascendants, flexible compensation, ordinary pensions and selected positive annual incomes/habitual-rent credits. Remaining work is joint assessment, dependency/disabled relatives, adoption, special rental profiles, losses/carry-forwards, additional credits, preferred EPSV data and independent workplace/withholding jurisdiction. Keep applicability explicit; the current model must not be labelled complete IRPF.

## Manual scenario controls

Manual save/load/delete and JSON import/export were removed because the user finds them unused and wants a simpler simulator. Open simulation tabs and form state still restore automatically; links share proposal parameters. Obsolete named-scenario storage is ignored without deleting browser data. Regression tests cover the simplified controls, existing tabs/proposals, sharing, restored-state validation, delayed analytics and offline operation.
