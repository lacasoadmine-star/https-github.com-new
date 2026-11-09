# Live CREDITS client recovery and Burning Ice pair controls

Recovered from the deployed Library v21 (`da36a601-0c45-4fd4-ab97-ed8bf1b7926e`),
used by Player v342 (`d890e3fd-51ed-4e9c-bb9b-70c623a234e7`), then checked against
Library v22 (`2535be54-ed2a-4bb2-8ab1-1a268ff7a545`) and Player v344
`2917ee3b-9a0e-49c0-84e3-b56a50d132d1`. The older
repository client is retained in its original directory. This snapshot restores
101 effective public files, applying the published overlays in their routing
order. The v21 and v22 baseline manifests pin every recovered file. The Coin
Miner publication happened during this task; all 43 prior Library module
hashes were verified as retained. Its eight updated public files are isolated
under the new `r6-coin` namespace; the pair still delegates to the retained v21
client routes. This pair's three-file correction and one new helper use that
retained client. Tests use the newly deployed shared ten-title actor.

The handoff ZIP was absent from this environment and its Drive search returned
no match. This recovery uses the actual Cloudflare version source, not an
assumption that the older Git checkpoint matches production.

## Change

For `burningice10_native` and `burningice40_native`, the upper and lower bet
rows start at the adjacent configured stake through the existing session API.
They no longer open the generic bet modal on desktop. Both neighbor rows use
the title's own `Buttons/Bet` frames. Plus/minus still change the selected stake.
The accepted receipt continues to own stake display, payouts and collection.
The host's collection button has a stable accessible name.

The new intent is pinned to the displayed session, game/model, stake ladder,
selection and receipt version. Pending requests, active wins, automatic play,
animation, unavailable sessions and changed pins cannot start another round.

The coordinates and carousel behavior come from the already captured
`Slots_blazinghot.js` reference and the existing source adapter. A fresh official
demo session has not been observed in this environment. The small overlapping
neighbor/spin padding retains the source geometry, with neighbor hit targets
above that padding. Mobile controls, win animations, audio and engine rules are
outside this correction; this is not a claim that either whole game is finished.

## Verification

Run `node --test test/burningice-wager.test.mjs` (11 passing checks).

For browser integration, install the pinned development dependencies with
`npm ci`, then run `npm run serve:test` and `python test/browser-controls.py`.
Chromium and Python Playwright must be available. The server binds only to
127.0.0.1. It serves a geometry-only presentation fixture with the actual app,
session, autoplay controller and unchanged deployed R6 Coin SQLite credits actor.
The actor's hash is checked before startup. No production API is used.

Each title passed 2 manual neighbor starts and 25 automatic starts, request
replay without another debit, synchronous duplicate-click rejection, collection
arithmetic, reload recovery, and zero JavaScript errors. The local workerd
supports compatibility date 2026-08-06; production uses 2026-11-07. Browser
results verify controls and receipts, not visual/audio parity or cash release.

## Publication state

**LOCAL CANDIDATE; NOT DEPLOYED.** Existing Player, Library, Railway services,
accounts, old games and all cash gates have not been mutated by this work.

The environment's enforced HTTP allowlist excludes the Player and SmartSoft
demo hosts. A request to the existing Player returned CONNECT 403. Shared
desktop control tools and an environment-change tool are not exposed here.
Live browser checks and a fresh official comparison therefore remain pending.
The supplied shared-chat URL also has not been read; current state was recovered
from the user's handoff text, the repository and Cloudflare metadata/source.

Before publishing, re-read active versions, compare the official pair and live
Player in a browser, build additive immutable assets, preserve all modules,
bindings, asset manifests and Durable Object declarations, and verify the
published response. Do not upload the old Git checkpoint or v342/v21 snapshot
over the newer Coin Miner release.
The user's publication authorization is already recorded; a new permission
request is not required to publish a fully verified correction.
