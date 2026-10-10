# Template maintenance

`data/proposals.json` is the canonical catalogue. Each entry records publication and human verification dates, primary/secondary source provenance, modelling status, limitations, parameters and a change history. `js/data/proposals.js` is generated so the static app works offline without an asynchronous JSON fetch.

After editing the catalogue, run `npm run templates:build`, `npm run templates:check`, `npm test` and `npm run lint`. CI rejects stale generated data. Existing simulation behaviour is preserved. Sumar and PSOE now link to the parties' original programmes. Secondary-source notes remain explicitly identified and cannot become executable templates without a primary source.

The **Template source review** workflow runs Mondays at 07:23 UTC and can be started manually in GitHub Actions. It checks every registered proposal document and every enacted-law source in `data/fiscal-sources.json` that has a `monitorUrl`, with 30-second timeouts and a 20 MiB limit, and publishes JSON/Markdown reports as artifacts and an Actions summary. Changed or unavailable sources and stale parameter groups fail the run so they are visible in Actions; notifications depend on your GitHub notification settings.

The first successful download for each source creates its fingerprint baseline. The baseline is stored as `baseline.json` on the orphan `monitor-state` branch, which the workflow updates itself (this is why it needs `contents: write`). It is not kept in Actions cache: caches are evicted after seven days without use, which a weekly schedule can reach, and a lost baseline would silently adopt a changed document as the new reference. Later runs compare against the branch. Changed sources keep the previous baseline until a reviewer manually runs the workflow with `accept_baseline` enabled. Failed downloads never replace it and do not block healthy sources from establishing baselines. PDF URLs reject HTML responses and invalid PDF signatures. Reports are retained for 90 days; fiscal history remains in Git.

Fingerprints detect byte changes. HTML layout, cookies, bot challenges returned with HTTP 200 and PDF metadata can cause false positives or hide the real document. Read the source before accepting its fingerprint. Download success never updates `verifiedAt`, fiscal parameters or legal status. This monitor checks known URLs; it does not discover new party proposals or new publication URLs, such as next year's contribution order or a reissued AEAT withholding algorithm.

## Persistent review cases

The workflow also saves `alerts.json` beside `baseline.json` on `monitor-state`. Changed documents, unavailable sources and stale parameter groups create stable case IDs, for example `changed:fiscal:lirpf`, `unavailable:navarra` or `stale:withholding`. Repeated observations update the same case, retaining first/last detection, occurrence count, affected groups, observed fingerprints/errors and review history. A new changed fingerprint reopens a closed document case.

An open case remains open when the source recovers or a fingerprint is accepted. The report distinguishes a currently detected finding from a recovered finding that still needs review. Open cases keep the run failing even when downloads are healthy; a failure can therefore mean unresolved maintenance work, not a payroll regression.

After reading the relevant source, manually run **Template source review** with `alert_id`, `alert_status` and `alert_evidence`:

- `reviewed`: checked and no parameter implementation is needed; include the reasoning. An unavailable or stale case must first stop being detected.
- `implementation-needed`: reviewed and a fiscal/data change remains necessary; the case stays open.
- `implemented`: supply the exact `https://github.com/molinero95/SalaryCalculatorESP/pull/NUMBER` URL as evidence. The maintainer must verify that the linked change actually resolves the case; URL validation does not verify a PR's merge state or fiscal correctness.

The workflow records the triggering GitHub actor and timestamp. Review evidence is required; invalid actions leave the case and normal monitoring reports intact and fail the run. `accept_baseline` is separate and does not review a case or update `verifiedAt`. A still-stale case cannot be closed by accepting a fingerprint or supplying a PR URL; update and verify the applicable catalogue parameters first.

Reports and the full case ledger are uploaded as Actions artifacts. The chosen surface for this increment is the GitHub Actions summary plus the persistent `monitor-state` ledger; it sends no dedicated email, Slack message or GitHub issue notification. GitHub's existing workflow notifications depend on account settings. Publication discovery, app-visible status and delivery of dedicated notifications remain separate work. A failed remote-state restore stops the run rather than replacing the ledger with empty state. Do not manually remove pending cases to make a run green.

## Enacted-law sources and staleness

`data/fiscal-sources.json` records, for every parameter group of the enacted-law baseline (state scale, allowances, withholding, contributions, each regional scale, regional minima and each foral territory), its primary source, the fiscal year it applies to and the date a human last verified the parameters (`verifiedAt`). `scripts/fiscal-sources.js` validates it; a test fails if any region or foral territory in the data files has no source.

Consolidated BOE laws are monitored through the BOE open-data metadata endpoint (`/datosabiertos/api/legislacion-consolidada/id/{id}/metadatos`) rather than the HTML page, so layout changes do not trigger false positives. A metadata change means the consolidated text was updated; read it to find which articles changed.

New annual documents are caught by staleness instead of fingerprints. On each run, a parameter group is **stale** when no covering source was verified in the last 365 days for the current fiscal year; the previous fiscal year is accepted until 31 January because new-year rules are often published in late December. Accepting fingerprints never clears staleness: review the parameters, update the data and tests if needed, then update `fiscalYear`, `verifiedAt` and, where the document changed, `url`/`monitorUrl` in a reviewed PR.

For a fiscal change, prepare a reviewed PR with source excerpts, eligibility conditions, parameter changes, history and independent expected-value tests. AI extraction and automatic fiscal-update PRs are a later stage; they are not enabled by this workflow. No API keys or paid services are needed for this first stage.

Schedule details: <https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule>. Scheduled jobs may be delayed and public repository schedules can be disabled after prolonged inactivity.
