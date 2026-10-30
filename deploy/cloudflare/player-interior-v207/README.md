# Burning Ice 40 presentation v207

Existing `sw-burning-ice-40-r3` only: 5 columns, 4 rows and 40 lines. Based on uploaded Screen_Recording_20261030_062814_Chrome.mp4. Changes are separate Canvas reel drawing, green/gold borders, four-row sizing, existing project fruit atlas mapped to unchanged symbol indices, directional motion trail, gold authoritative winning-cell outlines, shield SPIN/STOP, thin meters and settings containing existing controls. No backend, RNG, payout math, account, wallet or database changes. No new website deployed.

The game controller is the deployed game-v2163.js with exactly one import and a guarded rendering branch. Every settlement/commit/API statement remains unchanged. The existing result-validation and request-key recovery code is unchanged. The existing STOP finishes a settled-result animation; it does not cancel settlement. No unsupported gamble/collect feature was invented.

Fixtures intercept all API requests, provide a synthetic player only in the browser and block real writes. Normal/STOP checks at360/390/430 assert exact5x4 grid, win amount, unique round keys, no pending round, settings access, no overflow and no page errors. Fixture seed values are not actual proof-of-fairness validation.

Not100% parity: server symbol set is8symbols (including star), reference includes other fruits/bells; published payouts remain different. No server symbol-set/settlement changes were authorized. Existing artwork is reused, not extracted from reference videos. Missing Habesha/MultiHot10 and Safari grid mismatch remain unresolved. This release is not a complete reconstruction of every scene in the ten uploads.

Rollback version3f035e10-62f7-48dd-be52-d9a698328dea (v206), deployment88629289-a100-469a-8f36-033ca4f8af87. Preserve all24existing modules byte-for-byte and allbindings, add one wrapper.
