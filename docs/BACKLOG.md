# Project backlog

Priorities agreed on 10 October 2026. This is the canonical list of pending work; [ROADMAP.md](ROADMAP.md) records architecture decisions and implemented capabilities. Items below are plans, not claims of implemented or legally verified behaviour.

## Working rules

- Priority: P0 = protect fiscal currency and make gaps visible; P1 = strengthen validation and supported scope; P2 = maintenance or later product work.
- Status: Ready, Research, Assigned, Blocked, In progress or Done. Assigned does not mean implementation has begun.
- Start each PR from current `main`. Keep one independently reviewable increment per PR; link its backlog ID and update status when work starts or merges. Move completed items to the completion log with the PR link.
- Sources changing or downloading successfully do not approve fiscal parameters. Verify the legal text, applicable year, effective dates and eligibility before changing calculations or `verifiedAt`.
- Preserve five languages, offline use, personal-data-free shared links, and the distinction between payroll withholding and annual assessment. Use the checks required by [CONTRIBUTING.md](../CONTRIBUTING.md).
- Claude owns housing implementation. Codex owns the proposed freshness and monitoring work; this allocation is not a claim that those tasks are running. Coordinate shared input, translation and app-shell files before editing them.

## Prioritized queue

| ID          | Priority | Work                                                             | Status   | Owner      | Depends on                                         |
| ----------- | -------- | ---------------------------------------------------------------- | -------- | ---------- | -------------------------------------------------- |
| FRESH-01    | P0       | Discover new official fiscal publications                        | Research | Codex      | —                                                  |
| FRESH-02    | P0       | Persist and track source-review alerts                           | Ready    | Codex      | —                                                  |
| FRESH-03    | P0       | Show fiscal year, verification and pending scope in results      | Ready    | Codex      | FRESH-02 for live alert status                     |
| FRESH-04    | P0       | Apply source-specific review deadlines and monitor health checks | Research | Codex      | —                                                  |
| TEST-01     | P1       | Cover fiscal-year rollover and stale data behaviour              | Ready    | Codex      | FRESH-03, FRESH-04 for new behaviour               |
| TEST-02     | P1       | Verify an installed app upgrades from an older offline cache     | Ready    | Codex      | —                                                  |
| DATA-01     | P1       | Trace each parameter group to legal articles and fixtures        | Ready    | Codex      | —                                                  |
| HOUSE-01    | P1       | Implement housing in separately reviewed phases                  | Assigned | Claude     | PR #22 research; primary-source checks per rule    |
| POLICY-01   | P1       | Discover additional proposals and verify missing eligibility     | Research | Unassigned | Primary sources and supported inputs               |
| REFACTOR-01 | P2       | Extract proposal/comparison rendering and sharing adapters       | Ready    | Codex      | Coordinate with housing UI work                    |
| TEST-03     | P2       | Extend portable visual regression coverage                       | Research | Unassigned | Reviewed rendering environment                     |
| AUTO-01     | P2       | Produce reviewed fiscal-update drafts from source changes        | Blocked  | Unassigned | FRESH-02, DATA-01; extraction design               |
| SCOPE-01    | P2       | Extend foral assessment and unsupported profiles                 | Research | Unassigned | Official fixtures and eligibility inputs           |
| PRODUCT-01  | P2       | Compare salary or job offers                                     | Research | Unassigned | Define inputs and comparison scope                 |
| PRODUCT-02  | P2       | Estimate birth leave, breastfeeding leave and sick-leave effects | Research | Unassigned | Verify rules, dates, contracts and required inputs |

## Acceptance criteria

### FRESH-01 — publication discovery

Inventory supported official indexes/feeds for BOE, AEAT, common-regime communities and foral territories. Implement adapters incrementally and report uncovered jurisdictions explicitly. Detect a new URL and a revised annual document; deduplicate candidates and retain source, publication date and detected date. Discovery produces review candidates, never automatic legal approval. Tests use saved responses, including malformed feeds, unavailable sources and irrelevant publications.

### FRESH-02 — persistent review alerts

Persist changed, unavailable and overdue sources across runs, with Pending review → Reviewed/no parameter change or Implementation needed → Implemented transitions. Repeated failures update the same alert rather than generating duplicates. Record evidence, affected groups and the resolving PR. Define the notification channel and authorization before sending messages; Actions artifacts alone must not be mistaken for a delivered notification. Accepting a fingerprint cannot close an unresolved parameter-review alert.

### FRESH-03 — visible data status

Generate browser-safe metadata from the source catalogue: fiscal year and verification dates for the rules used by the selected profile. Show unsupported and pending rules separately. Do not label data current solely because a URL downloaded. Define what the UI shows when metadata or monitor reports are missing, outdated or unavailable offline. Cover all languages, narrow screens and offline reload. Live source health requires a published report; the current catalogue alone cannot provide it.

### FRESH-04 — deadlines and monitor health

Specify review intervals per source class, with more frequent checks around year-end and rule changes. Preserve explicit fiscal-year validation and reject future verification dates. Distinguish a late review, a failed source and a monitor that has stopped running. Test elapsed-time boundaries and missing reports. Choose intervals with documented reasoning; shortening a deadline does not itself verify a law.

### TEST-01 — fiscal-year rollover

Use an injected date, not the wall clock, to test 31 December, 1 January, the existing January grace period and 1 February. Demonstrate that previous-year data cannot silently become current-year data. Verify UI warnings and recovery after reviewed metadata updates; downloading or accepting a baseline must not clear overdue parameter verification.

### TEST-02 — installed-app upgrades

Start from an older app-shell cache and saved session, deploy the new version, and check the actual service-worker lifecycle. Verify that the updated fiscal modules and metadata load consistently, old caches are retired at the correct stage, personal input and open simulations survive, and a subsequent reload works offline. Test an interrupted update without publishing a partially cached version.

### DATA-01 — parameter evidence

For each supported group, record legal article/table, fiscal period, effective date where applicable, supported eligibility, verification evidence and associated independent fixtures. Distinguish legal text from official summaries and historical manuals. Fail validation for missing group coverage or incompatible metadata; never reset verification dates merely to pass a check. Housing adds provenance for each new rule as it is implemented.

### HOUSE-01 — Claude handoff

Research and proposed phases are in [PR #22](https://github.com/molinero95/SalaryCalculatorESP/pull/22). The research document is not yet merged at backlog creation. Implement the full plan in one PR per phase: input/provenance guards, state transitional rules, regional tenant rules, municipality-dependent rules, buyer rules and landlord scope. Verify original regional legal texts before implementing regional rules. Leave unclear temporal applicability and unstable measures pending. Family-unit income conditions must be collected or explicitly guarded; individual filing alone does not satisfy those conditions. Each phase includes independent threshold fixtures, applicable translations, offline checks and updated scope documentation. Codex reviews each delivery.

### POLICY-01 — additional proposals

Discover official publications beyond existing URLs and distinguish current proposals from historical programmes, enacted law and announcements. Add executable scenarios only when the model has enough supported parameters and inputs. Otherwise retain an informational entry with the missing details. Resolve PP youth eligibility and unspecified rates through evidence, not assumptions. Preserve foral applicability guards and separate payroll from annual effects.

### REFACTOR-01 — presentation boundaries

Move proposal/comparison rendering and browser sharing into focused presentation/infrastructure adapters; preserve supported public interfaces. Keep calculation modules pure and avoid a fiscal-engine rewrite without an identified problem. Existing selection, sharing, accessibility and offline regressions must pass; add tests only for newly exposed behaviour or meaningful uncovered boundaries.

### TEST-03 — visual portability

Document the rendering environment and add reviewed snapshots for currently uncovered important flows. Retain existing macOS checks. Never regenerate baselines solely to hide font differences or failures; inspect and explain intended visual changes.

### AUTO-01 — fiscal-update drafts

First define extraction schemas and supporting excerpts, with publication/effective dates and unresolved conditions. Treat document content and extracted data as untrusted. A draft must include source evidence, affected parameter groups, independent fixtures and representative profile impact comparisons. Require review before published figures change. Provider integrations, credentials and automatic PR creation need a concrete approved design.

### SCOPE-01 — foral completeness

Prioritize joint assessment, dependency/disability of relatives, adoption, rental profiles, losses/carry-forwards, preferred EPSV and workplace/withholding jurisdiction from [foral-payroll.md](foral-payroll.md). Each increment needs primary sources, independent examples and explicit unsupported conditions. Do not describe the existing estimator as complete IRPF.

### PRODUCT-01 / PRODUCT-02 — later product discovery

Define user stories and data requirements before implementation. Offer comparisons must distinguish annual net after assessment from payroll cash and account for benefits using supported rules. Leave and sick-pay estimates require official eligibility, applicable dates and contract/collective-agreement inputs where relevant; unknown conditions remain visible instead of inferred.

## Recommended execution order

Codex: specify discovery coverage (FRESH-01), implement persistent alerts (FRESH-02), then visible status and review deadlines (FRESH-03/FRESH-04). Add rollover and upgrade regressions with those changes. Claude: housing phases independently, coordinating shared files. Refactoring follows these reliability improvements unless it is necessary for a specific change.

## Completion log

No items from this backlog have been completed yet. Previously merged work belongs to the implemented foundation in [ROADMAP.md](ROADMAP.md), not this pending queue.
