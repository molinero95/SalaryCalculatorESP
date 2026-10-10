# Template maintenance

`data/proposals.json` is the canonical catalogue. Each entry records publication and human verification dates, primary/secondary source provenance, modelling status, limitations, parameters and a change history. `js/data/proposals.js` is generated so the static app works offline without an asynchronous JSON fetch.

After editing the catalogue, run `npm run templates:build`, `npm run templates:check`, `npm test` and `npm run lint`. CI rejects stale generated data. Existing simulation behaviour is preserved. Sumar and PSOE now link to the parties' original programmes. Secondary-source notes remain explicitly identified and cannot become executable templates without a primary source.

The **Template source review** workflow runs Mondays at 07:23 UTC and can be started manually in GitHub Actions. It checks every registered proposal document and every enacted-law source in `data/fiscal-sources.json` that has a `monitorUrl`, with 30-second timeouts and a 20 MiB limit, and publishes JSON/Markdown reports as artifacts and an Actions summary. Changed or unavailable sources and stale parameter groups fail the run so they are visible in Actions; notifications depend on your GitHub notification settings.

The first successful download for each source creates its fingerprint baseline. The baseline is stored as `baseline.json` on the orphan `monitor-state` branch, which the workflow updates itself (this is why it needs `contents: write`). It is not kept in Actions cache: caches are evicted after seven days without use, which a weekly schedule can reach, and a lost baseline would silently adopt a changed document as the new reference. Later runs compare against the branch. Changed sources keep the previous baseline until a reviewer manually runs the workflow with `accept_baseline` enabled. Failed downloads never replace it and do not block healthy sources from establishing baselines. PDF URLs reject HTML responses and invalid PDF signatures. Reports are retained for 90 days; fiscal history remains in Git.

Fingerprints detect byte changes. HTML layout, cookies, bot challenges returned with HTTP 200 and PDF metadata can cause false positives or hide the real document. Read the source before accepting its fingerprint. Download success never updates `verifiedAt`, fiscal parameters or legal status. Known-URL fingerprints are complemented by the bounded BOE discovery scan below. AEAT and party publication discovery remain unsupported.

## New BOE publication discovery (partial coverage)

The same weekly/manual workflow also runs `npm run sources:discover`, even if known-source checks fail. It queries the official [BOE sumario API](https://www.boe.es/datosabiertos/api/api.php) using JSON; [technical documentation](https://www.boe.es/datosabiertos/documentos/APIsumarioBOE.pdf) describes dates and ordinary/extraordinary editions. Source attribution is retained in candidate metadata: Agencia Estatal Boletín Oficial del Estado. Data reuse is subject to the BOE's conditions.

The default window is the 14 completed UTC days ending yesterday. Manual `boe_end_date` (`YYYY-MM-DD`, strictly before today UTC) selects a 14-day backfill. The overlap catches short interruptions, not an unlimited history: after more than 14 days without a working scan, manually scan all missed windows. The report lists every checked date, a documented API 404 as `no-edition`, and malformed/unavailable responses as errors. A scan does not advance or imply a complete historical cursor.

Only section I general-provision **titles** are matched for IRPF, contributions, pensions, housing and broad fiscal/budget reforms. A match creates a `publication:BOE-A-YEAR-NUMBER` review case with title, official URL, publication date, first detection and a metadata signature. It is not a confirmed legal change or an inferred parameter update; read the original text and applicable dates. Generic titles can hide fiscal measures, and broad matches can be irrelevant. Metadata signatures do not fingerprint the full newly discovered legal text.

Malformed dates/shapes, conflicting IDs, challenges and oversized responses are failures, not empty successful scans. Requests use 30-second timeouts, a 5 MiB bound and at most three parallel dates. Candidate links are derived from validated BOE IDs, not URLs supplied by a feed. Repeated discoveries reuse the case; a reviewed candidate reopens if its metadata changes. Cases remain pending after they leave the scan window. Publication and known-source checks update separate scopes in the shared ledger, so one cannot mark the other's cases recovered.

`report-boe.json`/`.md` are artifacts and an Actions summary. Review publication cases through the existing workflow inputs and current signature; accepting known-source fingerprints does not review discoveries. Scan errors create persistent `unavailable:discovery:boe:DATE` cases. There is no dedicated notification delivery and no automatic fiscal parameter/verification update.

Coverage is explicitly limited: no AEAT index adapter, no original autonomous/foral bulletin adapters, no party-index adapter, no guarantee for nonmatching titles, and no automatic coverage before the selected window. Regional laws republished in the BOE are not a substitute for watching their original bulletins. FRESH-01 remains open for those adapters and coverage improvements.

## Persistent review cases

The workflow also saves `alerts.json` beside `baseline.json` on `monitor-state`. Changed documents, unavailable sources and stale parameter groups create stable case IDs, for example `changed:fiscal:lirpf`, `unavailable:navarra` or `stale:withholding`. Repeated observations update the same case, retaining first/last detection, occurrence count, affected groups, observed fingerprints/errors and review history. A new changed fingerprint reopens a closed document case.

An open case remains open when the source recovers or a fingerprint is accepted. The report distinguishes a currently detected finding from a recovered finding that still needs review. Open cases keep the run failing even when downloads are healthy; a failure can therefore mean unresolved maintenance work, not a payroll regression.

After reading the relevant source, manually run **Template source review** with `alert_id`, `alert_signature` (copied exactly from the latest `alerts.json`), `alert_status` and `alert_evidence`:

- `reviewed`: checked and no parameter implementation is needed; include the reasoning. An unavailable or stale case must first stop being detected.
- `implementation-needed`: reviewed and a fiscal/data change remains necessary; the case stays open.
- `implemented`: supply the exact `https://github.com/molinero95/SalaryCalculatorESP/pull/NUMBER` URL as evidence. The maintainer must verify that the linked change actually resolves the case; URL validation does not verify a PR's merge state or fiscal correctness.

The workflow records the triggering GitHub actor and timestamp. The expected signature must match the current case, so a document changing during the review run cannot be approved using an old report. Review evidence is required; invalid actions leave the case and normal monitoring reports intact and fail the run. `accept_baseline` is separate and does not review a case or update `verifiedAt`. A still-stale case cannot be closed by accepting a fingerprint or supplying a PR URL; update and verify the applicable catalogue parameters first.

Reports and the full case ledger are uploaded as Actions artifacts. The chosen surface for this increment is the GitHub Actions summary plus the persistent `monitor-state` ledger; it sends no dedicated email, Slack message or GitHub issue notification. GitHub's existing workflow notifications depend on account settings. Publication discovery, app-visible status and delivery of dedicated notifications remain separate work. A failed remote-state restore stops the run rather than replacing the ledger with empty state. Do not manually remove pending cases to make a run green.

## Enacted-law sources and staleness

`data/fiscal-sources.json` records, for every parameter group of the enacted-law baseline (state scale, allowances, withholding, contributions, each regional scale, regional minima and each foral territory), its primary source, the fiscal year it applies to and the date a human last verified the parameters (`verifiedAt`). `scripts/fiscal-sources.js` validates it; a test fails if any region or foral territory in the data files has no source.

Consolidated BOE laws are monitored through the BOE open-data metadata endpoint (`/datosabiertos/api/legislacion-consolidada/id/{id}/metadatos`) rather than the HTML page, so layout changes do not trigger false positives. A metadata change means the consolidated text was updated; read it to find which articles changed.

New annual documents are caught by staleness instead of fingerprints. On each run, a parameter group is **stale** when no covering source was verified in the last 365 days for the current fiscal year; the previous fiscal year is accepted until 31 January because new-year rules are often published in late December. Accepting fingerprints never clears staleness: review the parameters, update the data and tests if needed, then update `fiscalYear`, `verifiedAt` and, where the document changed, `url`/`monitorUrl` in a reviewed PR.

For a fiscal change, prepare a reviewed PR with source excerpts, eligibility conditions, parameter changes, history and independent expected-value tests. AI extraction and automatic fiscal-update PRs are a later stage; they are not enabled by this workflow. No API keys or paid services are needed for this first stage.

Schedule details: <https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule>. Scheduled jobs may be delayed and public repository schedules can be disabled after prolonged inactivity.
