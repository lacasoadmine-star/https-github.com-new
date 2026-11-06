# Player interaction and reference presentation update — r7

This update addresses in-game differences visible during actual player interaction, together with interrupted reel and win audio. Multi Hot uses the existing colored multiplier glyphs, thin gold reel borders, original isolated hex controls and red spin emblem. Its center win amount and down-chevron acknowledge the credited win through the existing COLLECT action; a subsequent press spins. Foxy has a faceted jade wheel shield, mirrored vine win frame, matched symbol payout caption and rounded secondary controls. Forest foliage and lower edge components are restored without a whole-page screenshot overlay. Recorder text and recorded balances are excluded.

Reload now restores the last validated grid, multiplier and WIN from read-only round history. It does not restore gamble eligibility or create a wager. The WIN meter resets for a newly validated spin; final amounts still come from the server receipt. Presentation and geometry remain driven by live Canvas and DOM code.

The existing reel MP3 faded to a low-energy hole at each repeat. A 35ms equal-power head/tail overlap reduces that gap. Loop phase is retained through mute and hidden-tab suspension; playback resumes immediately. Start/stop gain ramps prevent hard edges and sources are cleaned up. AUTO waits for the active win phrase instead of cutting a 1.489s/2.142s clip after 1 second. Manual SPIN/COLLECT can still skip the phrase with a fade.

Real Chromium OfflineAudioContext measurements: loop seam minimum RMS0.00131287 to0.01318837, about 10 times improvement, five boundaries; whole 3s render level changes about0.037dB. These measurements validate continuity and bounded output; physical-device listening and 100% provider waveform identity are not established.

## Verification

- 252Node game tests passed.
- Six native Canvas configurations passed at 360/390/430CSS pixels.
- Six trusted touch/keyboard HTTP player runs:746checks,90settled rounds and 12gamble actions.
- Two focused final HTTP runs:151checks,18rounds and 4gamble actions.
- Two Cloudflare Browser Rendering fixture runs:202checks.
- All eight local HTTP test ledgers balanced; no JavaScript errors. Grid, multiplier, WIN, balance, reload, hold/release, collect-without-wager, partial-response replay and free spins at zero balance were verified.
- 9backend tests with disposable SQLite, all three portal builds and 10portal regression tests passed.

The HTTP QA server requires an explicit --qa flag, binds only 127.0.0.1, issues disposable sessions and invented balances, and uses the unchanged authoritative engine snapshot plus an isolated in-memory double-entry ledger. It does not override browser fetch or contact production wallets. Run node scripts/player-qa-server.mjs --qa, then node scripts/player-qa-browser.mjs --qa after installing Playwright/Chromium. All QA controls stay outside public/ and the deployment bundle.

Only the generated machine asset module is replaced in the existing Player Worker. Server mathematics, ledger, authentication boundaries and payment code remain unchanged. Rollback is v297:21386faa-173c-4ee3-8e34-e817692815c5. Source and deployment records identify the final published version after promotion.

The supplied three recordings were compared through idle, spin and win states. Artwork, control states and payout feedback are closer; reconstructed backgrounds, some typography and ornaments still mean 100% pixel equivalence is not claimed.
