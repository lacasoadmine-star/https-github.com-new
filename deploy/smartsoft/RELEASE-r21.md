# Nine-game launch and round repairs — R21

The nine existing native SmartSoft cards now open a game-specific sheet with Game details, Favourite and Play Now. Play Now retains the existing authenticated game route. The attached Foxy Hot 20 screenshot is used for the launcher interaction; each game retains its own art.

Eleven verified Burning Ice mobile images are bundled into the existing asset Worker. Previously these public resources returned 503 and prevented the three Ice variants from opening. Every mirrored file matches the already retained source size and SHA-256.

A collected win can now start the requested next spin after its receipt finishes painting. Previously the asynchronous repaint could make `canStartVisible()` false immediately after a successful collect and silently cancel that spin. A single intent gate prevents overlapping taps from submitting duplicate wagers; hidden pages, cancelled holds, changed sessions and unavailable presentations cancel continuation. The existing session request IDs, action validation, wallet, payout model and ledger remain authoritative.

The mobile display hides the preceding win while the next round is pending, keeps the canvas stable, and places collection actions above the native spin button. The original mobile backgrounds, title proportions and native controls are retained.

`official-observations-r21.json` records separate public demo observations for all nine games, including two spin inputs and bet controls. The new video shows Wild Multi Stars and its Help/Collect/Spin behavior; it is a behavior reference, not replacement artwork for these nine titles. This release does not claim complete bonus-feature coverage or reproduction of the provider's private payout probabilities.

Build: `node deploy/smartsoft/build-runtime-r21.mjs deploy/smartsoft`. The five retained app baselines are hash-verified against R20 before applying the shared controller fixes. Generated resources have byte counts and hashes in `runtime-evidence-r21.json`.

Verification: 83 Node checks, 9 backend tests against disposable SQLite, and player/agent/admin frontend builds passed. Browser verification uses only the loopback server and simulated ETB; it never sends production wagers. Final browser and deployment results are recorded in `release-verification-r21.json`.

Publication adds one module to each existing Worker through its content-only endpoint. It retains every previous module and existing configuration, bindings, authentication, records and financial storage. Foxy Hot 20 and Multi Hot 5 are outside this revision's page scope.
