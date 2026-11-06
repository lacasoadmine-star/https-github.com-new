# Official AUTO and bet presentation

Verified against the public SmartSoft demos on 2026-11-06. Only Multi Hot 5 and Foxy Hot 20 receive this presentation. The existing controller retains authority over the available stake ladder and settled spin results; amounts and currency shown here come from the local ETB game.

## Foxy Hot 20

Reference screenshots: `/workspace/work/r13-reference/FoxyHot20/autoplay.png` and `bet-picker.png`.

- AUTO uses the original 730×753 popup, count controls, close control, row separators, toggles, inputs and start button. Source frames are extracted from the original TexturePacker atlases, with source bounds and rotated pixels restored. `official-dialog-assets.json` records hashes and decoded-pixel verification.
- Counts are 25, 50, 100, 500 and 1000; default 100. Choosing a count does not start play. START PLAY passes the chosen count and enabled thresholds to the controller.
- Stop conditions are a single settled win reaching a threshold, cumulative net decrease, and cumulative net increase. All three start disabled, with empty amount inputs.
- BET uses original `Bets/Popup`, `Button`, `ButtonActive`, `Up` and `Down` art, showing five rows and paging through the controller's current legal ladder. Replacing a legacy/current ladder preserves its existing data-bet handlers.
- Source layout/config: `/workspace/work/r13-reference/FoxyHot20/Scripts/New/Components/autoPlay.js` and `/workspace/work/r12-reference/FoxyHot20/Scripts/New/foxyhot20.js`.

## Multi Hot 5

Reference screenshot: `/workspace/work/r13-reference/MultiHot5/autoplay.png`. Exact DOM and CSS are captured in `current-dom-and-styles.json` and `public/cache/b1/SlotsDemo/Content/Styles/mobile.othergamesslots.css` under that directory. The presentation uses the verified legacy DOM dimensions/colors from CSS lines 2517–2820, with original close, hover-close, infinity and checkbox PNGs.

- Counts are 10, 25, 50, 75 and unlimited; unlimited is selected by default.
- Blank SPIN TILL inputs set cumulative net-profit and net-loss limits. The source's displayed wording and spelling are retained. Profit is returned as `stopIncrease`, never Foxy's single-round `stopWin`.
- The BIG WIN stop toggle starts off. Provider `slot.js` identifies it with a strict settled win greater than 25× the total stake; the controller implements the verified condition.
- The main stake control is a horizontal carousel, not a bet popup (`slot.js:12014`). The controller owner makes the next stake preview select the next permitted level and preserves plus/minus stepping. This module does not create a fictitious MH5 bet popup.

## Validation

Chromium browser fixture `/workspace/work/r13-runtime/dialog-preview.cjs` verifies both dialogs render without script errors or horizontal page overflow; default counts, Foxy count selection and enabled amount field, MH5 net-profit/net-loss and BIG WIN options, five visible Foxy bet rows, paging, and replacement of the current legal bet ladder. Screenshots are saved beside the fixture. Controller stop conditions are tested separately by the controller owner.

No provider runtime/game outcome code is executed by this presentation module. Native images are served locally. The fixture uses no real wager API. Native fonts are loaded by the existing controller from the original font bytes.
