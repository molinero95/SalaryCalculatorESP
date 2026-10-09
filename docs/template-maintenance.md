# Template maintenance

`data/proposals.json` is the canonical catalogue. Each entry records publication and human verification dates, primary/secondary source provenance, modelling status, limitations, parameters and a change history. `js/data/proposals.js` is generated so the static app works offline without an asynchronous JSON fetch.

After editing the catalogue, run `npm run templates:build`, `npm run templates:check`, `npm test` and `npm run lint`. CI rejects stale generated data. Existing simulation behaviour is preserved. Sumar now links to the party's original programme. Secondary-source notes remain explicitly identified and cannot become executable templates without a primary source.

The **Template source review** workflow runs Mondays at 07:23 UTC and can be started manually in GitHub Actions. It checks every registered document, with 30-second timeouts and a 20 MiB limit, and publishes JSON/Markdown reports as artifacts and an Actions summary. Changed or unavailable sources fail the run so they are visible in Actions; notifications depend on your GitHub notification settings.

The first successful run creates a fingerprint baseline in Actions cache. Later runs compare against the latest baseline. Changed sources keep the previous baseline until a reviewer manually runs the workflow with `accept_baseline` enabled. Failed downloads never replace it. Cache eviction creates a new baseline-needed report; cache is monitoring state, not an audit archive. Reports are retained for 90 days; fiscal history remains in Git.

Fingerprints detect byte changes. HTML layout, cookies, bot challenges returned with HTTP 200 and PDF metadata can cause false positives or hide the real document. Read the source before accepting its fingerprint. Download success never updates `verifiedAt`, fiscal parameters or legal status. This monitor checks known URLs; it does not discover new party proposals or new publication URLs.

For a fiscal change, prepare a reviewed PR with source excerpts, eligibility conditions, parameter changes, history and independent expected-value tests. AI extraction and automatic fiscal-update PRs are a later stage; they are not enabled by this workflow. No API keys or paid services are needed for this first stage.

Schedule details: <https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule>. Scheduled jobs may be delayed and public repository schedules can be disabled after prolonged inactivity.
