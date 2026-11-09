# Additional three NEW game zoom guard

This is a separate continuation after the frozen ten-demo zoom package. It targets exactly `/games/multihot40_native`, `/games/balloon_native`, and `/games/jetx_native`. MultiHot5, FoxyHot20, the lobby, the ten-demo package, and every API route pass through unchanged.

## Verified source and routing

The three HTML entries and their input contracts were inspected in SHA-verified modules from Player v346. The small current JetX entry comes from `observed-assets.mjs`; the observed gateway overrides the older static JetX page. Its no-mode 302 to account mode, account/demo query parameters, response cookies and CSP must be preserved. Only a final GET 200 HTML response with the exact known title markers receives the guard.

The first read-only Python HTTP attempt returned Cloudflare 1010 for all three routes. These 17-byte error bodies are not game HTML and were never used as fixtures. No retry, authentication assumption, alternative user agent, or proxy bypass was performed. The later source recovery used the authorized read-only Cloudflare version API and verified hashes. See `provenance.json`, `baseline-http.json`, and `recovered-module-receipts.json`.

## Product files and integration

Add only these three modules and wrap the current Player's existing export with `installOlderNewZoomWorker(previous)`:

- `older-new-zoom-policy-r1.mjs`
- `older-new-zoom-assets-r1.mjs`
- `older-new-zoom-worker-r1.mjs`

The wrapper serves a same-origin CSS file and an early classic script under `/native-library/remaining20/20261110-older-new-zoom-r1/`. It bounds HTML reads, supports the existing gzip response, retains session/security headers, strips stale body metadata, and preserves the existing scheduled handler. Non-GET, redirects, errors, oversized bodies and unrecognized/login HTML pass through.

Both the exact current MultiHot40/Balloon module paths and the reviewed next immutable `/native-library/existing-new/20261110-etb1-40000-r1/` paths are recognized. The game IDs and page markers remain required. This permits composition with the separate wager/UI correction without changing the frozen r6 package.

## Input behavior

The viewport and gesture handling prevent pinch, double-tap zoom and Ctrl+wheel on the selected pages. Normal taps, controls, keyboard input, single-finger scrolling and browser keyboard/menu zoom remain available. Operating-system accessibility overrides are not controlled by this code.

MultiHot40 uses a delayed SpinHold. Beginning a pinch sends the matching pointer cancellation to stop its pending hold. Balloon starts a primary hold immediately, so it must **not** receive that synthetic cancellation: its actual primary release remains authoritative. A suppressed secondary press, release, cancellation or implicit-capture loss cannot start or prematurely release the primary Balloon hold. The existing Balloon `touch-action:none` on HOLD and `pan-y` on the body are retained. A genuine first finger pressed on HOLD still follows the existing immediate-start contract. JetX's exact current view uses normal click/change/keyboard input.

No financial algorithms, API parameters, wallet code, account status or cash release gates are modified.

## Verification

- `worker-report.json`: **54 checks passed** against the exact retained HTML. Covers route/method/status gates, original JetX redirect, account/demo final pages, old title exclusions, known next app paths, cookies/CSP, gzip/bounds and immutable assets.
- `balloon-input-report.json`: **12 checks passed** using the exact active Balloon pointer functions and real Chromium CDP touch events. Start/collect/heartbeat callbacks are inert counters. Tests reproduce the old secondary-touch activation, then verify primary hold, secondary release, implicit-capture loss and keyboard behavior.
- `browser-report.json`: **30 checks passed** on exact entry markup/styles, current JetX view, and retained MultiHot40 SpinHold. The original viewport zoomed to approximately 4.96 under a real pinch; all three guarded routes remained at 1 while idle and during local animation. Menus, amount input, taps, held input, keyboard, desktop Ctrl+wheel and 360/430 px JetX viewport checks passed. No API, mutation or outbound request occurred; no browser exception remained.

These are local input/markup tests with inert transport. They do not assert live wallet settlements or full provider visual parity. The retained MultiHot40 SpinHold has an independently discovered native-timer binding bug, owned by the separate controls correction. The zoom fixture supplies its supported timer hooks explicitly to isolate gesture testing and asserts that the hold starts before release. The accompanying controls candidate fixes that product bug; this wrapper does not duplicate or hide it.

To reproduce locally:

```sh
node new-zoom-older3-followup/build.mjs
node new-zoom-older3-followup/verify-worker.mjs
node new-zoom-older3-followup/verify-balloon-input.mjs
node new-zoom-older3-followup/verify-browser.mjs
```

No deployment or Git mutation was performed by this child. The parent owns the final current-version check, composition, publication and live verification.
