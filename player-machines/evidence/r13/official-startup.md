# Original SmartSoft startup and sound choice

Sources are the public SmartSoft Multi Hot 5 and Foxy Hot 20 demos captured under `/workspace/work/r12-reference` and `/workspace/work/r13-reference`. No user media or recreated logo/video is used.

## Original media and timing

Both demos deliver the same byte-identical `Images/loader-logo.gif`: 300×169, 63 frames, a 4,190ms looping timeline, 46,937 bytes. The browser plays that original GIF. It is a resource loader, not a fixed-duration movie; loading ends when the real renderer/control assets are ready. The loader bar and moving icon are original PNGs. The YES/NO speaker icons and the `font1` WOFF2 are also unchanged originals. Hashes, MIME types, public URLs and sizes are recorded in `official-startup-assets.json`.

Public source references:

- MH5 `Scripts/Slots/canvas.js:137–150`: actual loaded-resource progress and 100ms bar transitions. Lines199–215 initialize after150ms then fade the loader out over100ms.
- Foxy `Scripts/New/slot.js:36–66`: actual resource progress, icon scale `.1 + .9 * progress` and200ms initialization delay. Lines418–421 hide the loader200ms after the initial validated state response.
- MH5 captured `public/cache/b1/SlotsDemo/Content/Styles/mobile.othergamesslots.css:1999–2080` defines the black loader,205px logo container and native progress art; lines2160–2289 define the exact sound popup geometry, font, original speaker icons and mobile breakpoint.
- Both public common scripts use the existing sound setting handler for YES/NO. The local callback remains the existing controller `chooseSound`; this helper creates no audio player and makes no game/wallet requests.

## First paint and readiness

The initial HTML contains a loader shell. A small external stylesheet, which obeys the unchanged self-only CSP, shows and requests the original GIF only for the two selected games before the controller module runs. The helper adopts the same element and background without restarting the animation. The other two games neither show the shell nor request its GIF.

The existing controller still validates model, account, history, next-spin state and any saved gamble parent before enabling native presentation. Its startup readiness list includes `renderer.nativeReady`, preventing spins before authored timelines are ready. Main controls stay disabled/inert until that readiness completes. Progress reflects the supplied promises; it does not simulate time-based progress or force a full GIF loop.

The independent external guard uncovers a failed module load and offers a reload link. A30-second maximum cover and the helper's fatal-state observer prevent a failed load from leaving a black screen indefinitely. Retry, sign-out and disposal cancel outstanding waits and restore prior inert values.

## Consent behavior

The original wording is “Would you like sound?” with native YES/NO icons, font and sizing. A fresh valid startup shows it after initialization, avoiding the public demo's observed early-click race. It respects the existing `zplay:sound-choice` preference and any already open saved-gamble recovery dialog. One choice invokes the existing callback exactly once; NO persists mute through that callback. MH5 retains its100ms prompt fade. No wager is requested by opening, closing or answering the prompt.

## Verification

- `node --test test/startup.test.mjs`:4/4 pass. It verifies all original media hashes/MIMEs, standalone GIF identity, selected-game scope and source completion timings.
- `node test/startup-browser.mjs`: actual local Chromium with the production self-only CSP. It verifies first paint before module initialization, changing original GIF frames, readiness gating, original font/popup geometry, YES callback deduplication, persistent NO, cancellation/retry/disposal, restoration of inert controls, module-error/timeout uncovering and exclusion of the other games.
- Browser proof is saved under `/workspace/work/r13-startup-proof/` with per-game first-paint/loader/consent screenshots and `result.json`. No wallet or game API request is issued by the fixture.

The first-paint GIF is served as a binary `image/gif` asset. The existing binary Worker transport remains unchanged except for the explicit GIF MIME mapping. Source payload is105,227 bytes; the first-paint standalone copy adds46,937 bytes. All startup assets/scripts/styles together are about200KB, well within the reported Worker headroom.
