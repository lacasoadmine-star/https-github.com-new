# Existing-game recovery and held-line batch

Published together on 2026-11-10 on the existing Superwin Player v354 and
Library v33. Exact deployment IDs and module preservation are in
deployment-receipt.json. No wallet, account, backend, actor, round schema or
cash approval gate changed. MultiHot5 and FoxyHot20 remain byte-identical.

All 10 existing remaining-game clients now restore an accepted active BET
only while connected and authenticated, for the same game and model. The
existing 1.00, 2.00 and 40,000.00 choices remain exact integer amounts. CoinMiner
also restores its accepted mine count. Unsupported options, foreign models,
disconnected data and malformed amounts do not change the next controls.
Identical receipts do not repeatedly repaint the cost. Each client keeps its
own current assets, controls, catalogue, canonical adapter and dependency tree.

The included ice-receipt-r11 change fixes a separate rendering bug. Server
receipts contain incremental awards, including an empty final respin; the
previous renderer displayed only that final frame's empty wins. The new draw
projection combines accepted held-line deltas and retains their final cells.
It shows no early line highlights before the feature ends, and never edits a
receipt, generates an outcome, submits an action or credits a wallet.

Official reference: BlazingHot40 free DMO, observed 2026-11-10. 25 requested
demo spins completed in 585.6 seconds, including 6 natural freeze features.
The 25 outcomes passed 227 payline, coefficient, freeze, accumulated award and
balance comparisons against the recovered native public-rule model. The
official site's 8 audio exceptions are retained in its private observation;
they are not attributed to the new client. This sample does not establish
the provider's private RNG, RTP, unseen states or an official ETB profile.

Verification:

- 139 checks cover the actual 10 client pre-paint paths and Worker routing.
- 33 receipt checks use the 25 observations, reproduce the missing final-line
  trigger, retain exact amounts, and prove that input receipts stay unchanged.
- 22 checks cover the Ice resource wrappers and existing financial routes.
- Chromium verified all 12 live entry shells and canonical client adapters,
  exact restored 2.00 and 40,000.00 controls, CoinMiner mine settings, and
  rejection of disconnected updates. No financial POST was made.
- A separate isolated browser replay using deployed modules rendered 24 held
  lines and 42.00 at the scaled 2.00 input on desktop and portrait; the prior
  module rendered no held lines. No JavaScript error occurred. This is a
  component replay, not an authenticated wallet wager or production receipt.
- All 290 prior Player modules and 72 prior Library modules retain their hashes.

The immutable public assets module contains the exact executable client
changes. The companion ice-receipt-r11 directory supplies its rendering
module. Private captured events, engine sources and credentials are excluded.

Still unfinished: full per-game official visual/audio/rare-state parity,
release approval and real-wallet readiness for the new titles, and the
remaining official SmartSoft inventory. The 69-title historical remainder is
tracked without duplicating the 10 identities already under construction.
