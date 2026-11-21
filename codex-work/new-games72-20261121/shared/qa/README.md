# Native browser recovery acceptance

This isolated CI suite loads the actual shared `RoundRecoveryClient` and its
default same-origin fetch transport in Chromium. It injects shared localStorage
request metadata and exercises native Web Locks across separate tabs. It never
mounts a production route or registers a game, and does not change the runtime's
default sessionStorage choice.

The only origin is `https://recovery-qa.zplay.invalid`; every request is handled
by Playwright. The account, session guard, requests, outcomes and ledger are
synthetic. The fixture ledger uses exact integer minor units and atomic in-memory
lookup/debit/credit/save. Its counters are not PostgreSQL or production ledger
evidence.

Four browser scenarios cover concrete remaining integration risks:

1. Two connected tabs attempt overlapping rounds. A held native Web Lock must
   reject the second tab without generating another request token or queued bet.
2. The fixture accepts and settles a request, then aborts its network response.
   A real document reload must retain that identity, block new SPIN/AUTO, and
   recover the same receipt with a status-only replay and one fixture settlement.
3. A request is dropped before acceptance. Recovery must see the explicit replay
   miss, revalidate current state, then resend the byte-equivalent action with
   the same token. It must accept only once.
4. One tab receives `429 Retry-After: 2`. A second already-connected tab must
   adopt the new persisted deadline under the native lock and make no request
   until that deadline. Its later replay must recover the same accepted round.

The report pins the source commit and SHA-256 of the shared module, fixture and
runner, records the exact scenario traces and assertion results, and records
unexpected browser errors or requests outside the intercepted origin. There
are no cookies, real credentials, provider references or live financial calls.

Run with Playwright 1.62.1 and its installed Chromium:

```sh
node codex-work/new-games72-20261121/shared/qa/run-recovery-browser.cjs
```

`ZPLAY_RECOVERY_QA_OUTPUT` sets the report directory. The feature-branch workflow
runs this as a separate job so a Roll X presentation failure does not conceal
independent recovery results. Successful native checks still do not establish
actual database concurrency, per-game settlement, BFCache, sound, performance,
or production release readiness.

CI also runs a controlled negative path with
`ZPLAY_RECOVERY_QA_FAILURE_PROBE=after-exclusive-lock`. This deliberately fails
while the first tab owns a held request. Its process must exit with code 1 and
retain the exact deliberate error; the parent check requires the request
evaluation to have drained, the browser to have closed, and the failure report
to exist. It cannot turn a failing normal scenario into a pass.

API references checked 22 November 2026 (Africa/Addis_Ababa):
- https://playwright.dev/docs/api/class-route
- https://playwright.dev/docs/api/class-browsercontext#browser-context-route
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API
