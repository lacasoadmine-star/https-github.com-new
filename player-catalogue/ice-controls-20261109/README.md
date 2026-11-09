Burning Ice 10 and Burning Ice 40: native desktop controls

This additive Player/Library package keeps the existing catalogue and all cash routes.
It changes only the two existing `/demo/games/burningice10_native` and
`/demo/games/burningice40_native` pages, using a new immutable client prefix.

The official BlazingHot10 and BlazingHot40 free demos were opened on
2026-11-09 at 1365 × 850. Clicking the next stake row changes the selected bet
instead of opening a dialog. The recovered public `blazinghot.js` places the
original COLLECT button at 137,671 and the menu Spine animation at 170,795.
The package uses those original data files; it does not run provider scripts.
Asset URLs, exact byte counts and SHA-256 hashes are in `provenance.json`.
The existing Library Worker serves the immutable overlay through its existing
service binding. The Player keeps only a small route wrapper and asset-name index,
because its retained modules approach Cloudflare's uncompressed size limit.

Changes:
- Next and previous native stake rows use the existing bounded bet controls.
- The previous bet is visible; the selected amount follows source text placement.
- Original enabled/disabled COLLECT artwork uses the existing collection handler.
- The original idle arrow and spin-click animation occupy their source positions.
- The existing session, server outcome, receipt, wager and wallet logic is unchanged.

Validation: 60 wrapper/asset checks; real Chromium preview over the deployed
CREDITS API checks both titles at 1,2 and the 40,000 upper boundary, no debit on
bet changes, SPIN/STOP with one accepted wager, balance conservation, reload,
and portrait rendering. The preview rounds were losses; that run does not
establish live winning-collect coverage. Search/display and portrait layouts
outside this desktop correction keep their existing behavior.

This is a controls correction, not a cash release or a full parity assertion.
Rare bonuses, full sound timing, remaining legacy timing and portrait parity
remain pending. Real-wallet release approvals stay closed. The preserved
previous Player is v345 (`d893eb63-054f-4219-9b41-43c188cf8b87`). The recovery
path is that version; Library actors and accepted round formats are unchanged.
