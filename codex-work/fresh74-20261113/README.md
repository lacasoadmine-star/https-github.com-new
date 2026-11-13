# Fresh rebuild checkpoint — 13 November 2026

This directory contains newly written presentation primitives, not completed games.
It does not import recovered game engines, old media, cached reference atlases, or
production wallet code. Existing launchers, accounts, balances and backend
behavior have not been changed. The presentation modules are published as inert
versioned assets through the existing Player Worker's existing asset route.

`reel-motion.mjs` animates a caller-supplied result, locks overlapping presentations,
accelerates the remaining animation on STOP, and cancels frames on disposal.
`canvas-reels.mjs` renders independently verified symbol sprites in clipped reels,
with device pixel ratio capped at 2. It cannot load or replay a board screenshot.
Explicit timing is required; the unit-test timing is not a measured provider timing.

`round-controller.mjs` accepts an injected existing-server adapter. It locks
double taps, preserves an uncertain round's token across recovery, and queues STOP
until its result arrives. Recovery is a lookup of the same round, never an
automatic new wager. A failed presentation can replay an already settled result.
An optional account-scoped `round-journal.mjs` stores only pending request
identity in IndexedDB. Initialize the controller before enabling SPIN. An
unresolved intent survives reload and is recovered by the existing server
adapter; a claim from another tab blocks a second request. No stored value is
used as a wallet balance. Network requests have a configurable 20-second
deadline, after which recovery uses the same token and does not create a wager.
This module still requires the production adapter and browser integration.

Run: `node --test codex-work/fresh74-20261113/*.test.mjs` (38 passing tests).

## Multi Hot 100 construction

The fresh `multihot100-machine.mjs` control model implements the observed 5 × 4
result layout, bet selection, SPIN/STOP, independent effects/music preferences,
and the observed autoplay counts 25/50/100/500/1000 with win/loss/gain stop limits.
Its bet choices and amounts come from its existing-server adapter. No official
stake limits, hidden paytable probabilities or new wallet are invented.

`multihot100-view.mjs` supplies the game-specific control surface, responsive
layout rules, modal menus, history display, optional supplied About text,
fullscreen action, multiplier display and server-supplied win-path highlighting.
It renders text safely, isolates styles in its own shadow root and removes its
own listeners/instance on replacement. History and audio need real adapters;
unavailable information is not replaced with fake records or invented sounds.

`multihot100-entry.mjs` connects those controls to the reel animation, sprite
renderer and pending-round controller. It requires verified atlas/strip inputs,
explicit timing and a server-supplied initial grid/balance. ETB integration also
requires a durable account-scoped pending-round journal. It does not fetch or
create any wallet. Reel movement now starts with the last visible grid, with
acceleration and deceleration instead of replacing the first frame abruptly.

This is a new game presentation/control implementation, not a completed playable
production engine. Fresh symbol atlases, recorded audio, measured timing, the
production server adapter, full wheel/bonus behavior and visual/mobile browser
verification remain incomplete. No screenshot or video is used as gameplay.
No new browser attempt or hosting activation was made for this construction.

Local bundle check (uses the repository's installed esbuild):
`esbuild.buildSync({entryPoints:['codex-work/fresh74-20261113/multihot100-entry.mjs'],bundle:true,minify:true,format:'esm',platform:'browser',target:['es2022'],outfile:'codex-work/fresh74-20261113/dist/multihot100.mjs'})`.

The local `build-browser-checks.mjs` script produces a disposable browser test
page from the fresh 74-name observation manifest. Its catalogue checks cover
shared round recovery, not 74 finished engines. Those browser checks are NOT
reported as passing: local Chromium failed at process-singleton startup, and
the shared browser rejected the local file URL under its protocol policy.
No alternate browser surface was used to work around that rejection.

## Fresh evidence

The official catalogue exposed 74 distinct demo links on this date. This is an
inventory of the current provider page, not proof of 74 completed reconstructions
or a silent replacement of the existing ZPLAY catalogue identifiers.

New observations include actual demo spins in Multi Hot 100, Multi Fruits Charging
Wilds, Gems Crown Charging Wilds, Gates of Merlyn, and Dice Jungle. Multi Hot 100's
bet selector, paytable, settings, history, and autoplay were inspected. PopX's
live board, menu and three help steps were observed. BalloonX's help was opened.
The supplied videos independently show Multi Hot 5, Foxy Hot 20, and Multi Hot 100.

The Multi Hot 100 help text includes a left-side multiplier description despite
the observed wheel being above the reels. That text must not silently override
the observed layout or be treated as verified hidden mathematics.

## Outstanding work

- Finish fresh per-title captures, all controls, mobile layouts, audio and bonuses.
- Resolve per-title loading failures and repeat every failed title; none is dropped.
- Supply correct fresh symbol atlases, animations, audio and measured timings.
- Build each game's specific behavior; this renderer is only a shared primitive.
- Connect verified game contracts to the existing account/server interfaces.
- Test each completed game at 360, 390 and 430 pixels before same-site publication.

Fresh access was interrupted by a site-served Cloudflare 1010 response. Automatic
review then rejected further demo-browser access. No alternate route, fingerprint,
proxy, or client was used to work around that rejection. Screenshots and sampled
frame recordings already captured are retained separately. Sampled clips are
silent, use their actual capture timing, and are not 60fps motion/audio evidence.

Cloudflare KV readback confirms the first two published presentation modules
match their source exactly. Public HTTP verification from this environment
returned Cloudflare 1010 for both an asset URL and the Player root; therefore
public availability has not been independently confirmed. No alternate client
or proxy is being used to evade that restriction.

The existing Railway pending change is a deletion of zplay-observed-machines.
It was not applied. Existing player, database, wallet and legacy games were preserved.
