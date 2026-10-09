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
| Local macOS visual baselines                   | Platform fonts differ; CI runs behavioural/accessibility checks, not screenshot validation       |

## Implemented foundation

- Multiple simulation tabs, comparison cards/charts and persistent selection.
- Initial DDD separation: scenario/input boundaries, session use cases, persistence scheduling and payroll form adapter; see [architecture.md](architecture.md).
- Separate annual state/regional quotas and breakdown labels; reviewed proposal withholding scales and explicit payroll/annual card metrics.
- Official-source threshold/minimum/contribution/pension/flexible-pay regression coverage for the supported fiscal scope.
- README AI/inaccuracy warnings in all five languages.
- Validated proposal catalogue, history/provenance, generated-data CI check and verification/partial UI labels.
- Weekly/manual source monitor with bounded downloads, PDF validation, per-source baselines and reports.

Confirm current details in code and CI; this list is not an exhaustive feature specification.

## Candidate next tasks, not yet implemented

1. **Continue DDD separation:** extract proposal/comparison presentation and sharing/import/export browser adapters from `app.js`, then evaluate splitting the settings renderer. Keep fiscal modules stable until a separate migration is justified.
2. **Reviewed AI extraction:** accept changed source documents and produce structured draft parameters plus supporting excerpts, dates, applicability and missing conditions. Keep extracted text/data untrusted; validate against a schema before using it. No provider/API key is currently configured.
3. **Automatic draft fiscal PRs:** assemble catalogue changes, history, source evidence and representative salary/profile impact comparisons; run checks and require review before updating published figures. The monitor currently creates reports, not these PRs.
4. **Proposal discovery:** watch official publication indexes/feeds as well as known document URLs. Specify sources and provenance instead of claiming exhaustive party coverage.
5. **Additional eligible proposals:** collect the inputs needed for PP youth relief and resolve unspecified intermediate rates/conditions for other proposals. Do not invent missing policy details.
6. **Broader fiscal scope:** prioritize special profiles, additional deductions or foral regimes only after defining independent official fixtures and explicit applicability.
7. **Visual regression portability:** assess platform-specific baselines or a consistent rendering environment before adding screenshot checks to CI.

A live check during the source-monitor implementation found that the official PSOE PDF returned HTML in that execution environment. Treat this as a dated observation, not a permanent source outage; future reports must determine its current availability. Source-monitor errors should not be mistaken for failed payroll calculations.

Update this file when a decision or item materially changes. Record why, not a running transcript of every implementation step.

## Foral follow-up

Residence presets now cover all communities and reviewed individual employment profiles with eligible children and taxpayer disability in each foral territory. Extend [locations.md](locations.md) by validating ascendant/dependency and disabled-relative deductions, family situations 1/2, short temporary contracts, flexible compensation, pension/EPSV rules and independent workplace/withholding jurisdiction. Keep unsupported profiles guarded until their rules and tests are reviewed.
