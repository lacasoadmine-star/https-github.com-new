# Existing library API: Cloudflare redirect transport correction

This maintenance patch repairs a reproduced Cloudflare transport failure in the existing Multi Hot 40 and Balloon API wrappers. It changes no game model, asset, payout, account, wallet or session contract, and contributes **zero** new games.

## Observed failure and cause

The signed-in existing Multi Hot 40 page returned HTTP 503 from its state endpoint. The deployment owner opened the same endpoint in the browser and observed only the safe error body:

    {"error":"RETRY_SAME_REQUEST"}

The source is pinned to the pre-correction modules and their retained corrected replacements. Its identity check runs before a signed request to the existing native-family engine. The current engine origin is valid, and bounded Railway logs showed successful engine traffic without a corresponding library-state request. These observations alone did not prove a credential problem; no secret was retrieved, changed or guessed.

The failing fetch options contain redirect: 'error'. Cloudflare's current [Request documentation](https://developers.cloudflare.com/workers/runtime-apis/request/) explains that this mode is unsupported and throws during request construction, before network transmission. The page was opened and verified on 2026-11-21; its displayed last-update date was 2026-11-18.

This was then reproduced directly in Cloudflare's execution runtime, without sending a request: constructing a Request with error throws a TypeError; manual constructs successfully. A second runtime fixture executes the pinned module function bodies with the real Cloudflare Request constructor, a synthetic identity response and a synthetic upstream. Both original wrappers reproduce 503 with **zero** upstream calls. Both corrected wrappers return fixture status 200 with **one** synthetic upstream call. The Balloon wrapper has the same code defect; its live account endpoint has not been claimed verified by these fixtures.

## Minimal correction

Each candidate changes only the redirect mode to manual and adds explicit rejection of all 3xx responses. Redirect bodies are cancelled, the existing no-store RETRY_SAME_REQUEST response is returned, and no redirect destination is contacted. The exact request method, path, body, session checks, signing algorithm, response handling, other routes and scheduled behavior remain unchanged.

The candidates retain their existing Worker module names:

| Module | Baseline SHA-256 | Candidate SHA-256 |
|---|---|---|
| expansion-worker-20261108-fetch-fix.mjs | d348ec638ddfae3a676a340c157eecc01971b5bb6a6e04b9b50a92e5148c1cec | 4fccd64669136c2bfbe74454b627b6ae06fbc2c9a061147e770702230a1fc279 |
| balloon-worker-20261108.mjs | 0a28ca4a593bc4925d11d18e468e44cf51dc2b4021677504da91bef9f5f02aca | 497606663471e6ffafcdebbbdf2263f49321a3e7ddaad8db71b9196ec65d3ec6 |

The Worker should retain all 404 module names, replacing only these two bodies. The other 402 modules, the active Deluxe wrapper/main module, all bindings, runtime exports, static asset configuration and stored artwork remain unchanged. Reinstalling a generic game-page wrapper over the current routing is unnecessary.

## Reproduction

From this folder:

    node --test --test-reporter=tap transport.test.mjs
    TRANSPORT_REVIEW_BASELINE=1 node --test --test-reporter=tap transport.test.mjs

The candidate passes **18/18** tests. The original source produces **9 passes and 9 failures**, including the state transport failures. Node itself accepts redirect: 'error', so the local fixture explicitly reproduces the constructor constraint observed in Cloudflare. This distinction prevents a Node-only check from hiding the production incompatibility.

Tests verify deterministic HMAC signing, one request per state/history/action call, exact action-body preservation, no cookie forwarding to the engine, redirect refusal and body cancellation, retry behavior, upstream errors, authentication, session/origin checks, body limits and legacy route delegation. Every upstream response is synthetic. These tests neither debit a wallet nor establish live settlement.

The fixture.mjs file also exports cloudflareRouteProbe(). Its generated function can be run by the Cloudflare execution tool; it contains no cloudflare.request call and uses no real fetch. The stored runtime observations are in evidence/cloudflare-request-constructor.json and evidence/cloudflare-route-fixture.json. Exact source pins and commands are recorded in verification.json.

## Actual deployment and live verification

The two corrections were activated on the existing Player Worker as **version 464**, `8ed7d80e-16c3-41d6-b301-4b35668ff571`, deployment `fb512104-133d-46f7-81d3-673638f8ae07`, at `2026-11-21T21:33:21.204091Z`. The deployment plan records the required version 463 baseline; it is not a statement that activation is still pending.

The fresh full-module readback verified all **404 modules**: the two intended bodies match their candidate hashes and all other **402 modules remain byte-identical**. All 18 bindings, runtime metadata, named handlers, Durable Object exports and static assets were preserved. See `post-deploy-module-verification.json` and `deployment-result.json`.

The signed-in Multi Hot 40 page subsequently connected and enabled its controls. Its BET selector and MENU opened during the live check. Balloon's state endpoint also returned successfully, but its page still showed `Not connected`: a separate client polling defect remained. The successful transport repair is therefore distinguished from complete Balloon UI repair. No production wager, balance adjustment or database change was used to verify this maintenance.

A later Balloon client-wrapper attempt was rolled back to this same version 464 after its exact HTML-source guard rejected a newer retained script path. The rebased r2 client correction was then deployed as version466 with both transport corrections and the Deluxe maintenance preserved byte-for-byte. The separate Balloon package records the failed attempt, successful r2 deployment and live Ready/Refresh verification. This package's deployment plan retains its original version463 guards as historical preflight inputs; `deployment-result.json` records the transport activation as version464.
