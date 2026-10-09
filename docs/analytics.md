# Anonymous analytics

The page loads `https://gc.zgo.at/count.js` asynchronously with the account endpoint `https://molinero95.goatcounter.com/count`. GoatCounter records the pageview automatically. Application events are anonymous fixed names such as `save-scenario`, `share` and `export-json`; salary, family fields and simulation names are never added to these events.

The application adapter queues up to 20 events until the script loads, then flushes once in order. A blocked or failing counter cannot interrupt calculations, saving or sharing. Analytics requests remain outside the service worker's cache. Local/dev traffic remains excluded by GoatCounter's default filter.

Verification on 2026-10-09: the official script and the configured account website returned HTTP 200. The account is private and displays its sign-in page, so its dashboard totals were not inspected. These HTTP checks prove availability, not that every visitor is counted; blockers, bots and the vendor's filters can suppress requests. Browser regressions use a stub provider to verify wiring and delayed load without adding artificial visits to the live account.

To check receipt manually, open the deployed site in a regular browser with network recording enabled. Confirm `count.js` loads and the `/count` request uses the configured account; saving a scenario should send an event named `save-scenario`. Check that event in the account dashboard. Avoid `allow_local`, `allow_frame` or disabling filters in production solely to make a test count.

Primary API documentation: https://www.goatcounter.com/help/js and https://www.goatcounter.com/help/skip-dev.
