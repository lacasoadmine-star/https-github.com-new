# Current Multi Hot 100 deterministic rules

The current official demo now supplies a complete, independently checked 100-line geometry and public paytable for the separately reserved game `zplay72_multi_hot_100_v1`.

`paylines.mjs` holds all 100 distinct paths. Fresh original static atlas artwork resolves the former transcription error: line 45 is `[2,2,2,1,1]`; line 46 is `[1,1,1,0,0]`. Rows use zero at the top; columns run left to right. `payline-art-evidence.json` pins the 16 original atlas image/metadata files and the decoded line facts. `verify-atlas.py` independently reads the separately retained source images, restores rotation/trim, checks every input hash, extracts each line and compares all 100 outputs. Original artwork stays outside this public source directory.

The current demo help initially showed uninitialized overlapping placeholders. Using its actual paytable plus control initialized the complete numeric rows at 2.00 DMO, and minus restored 1.00 DMO. A further scroll exposed all low-symbol rows. Only those initialized values are used. The public rules describe adjacent matches starting at the leftmost reel, the highest match on each payline, line-bet scaling and the independent 1–5 multiplier. `paytable-evidence.json` records the numeric observations, current source facts and private frame checksums, without publishing the screenshots or session identifiers.

`quoteM100Grid({grid, betMinor, multiplier})` accepts a dense row-major four-by-five grid, a positive BigInt stake and a multiplier from 1 to 5. It sums each qualifying line's longest match exactly, then applies the multiplier once. All amounts are BigInt minor units. Its coefficients multiply total stake divided by 100; this is equivalent to the current displayed 100-line awards. It rejects fractional minor-unit line awards because the public help does not specify their settlement rounding. It applies no payout clipping and produces no random outcomes or balance.

The fresh separately initiated first reference round has 14 orange three-symbol runs and 35 orange four-symbol runs. At 1.00 DMO and 3× its exact quote is `(14 × 0.05 + 35 × 0.10) × 3 = 12.60 DMO`, matching the observed pending win. Corrected line 46 contributes 0.15 DMO to that amount. An all-sevens grid at 5× reaches the printed 2,500× upper bound exactly; shorter prefixes are not additionally paid.

```js
import {quoteM100Grid} from './quote.mjs';
const quote = quoteM100Grid({grid: acceptedRowMajorGrid, betMinor: 100n, multiplier: 3});
```

`traceM100LineRuns(grid)` exposes geometric prefix facts without amounts. The quote is deterministic reference arithmetic. It does not establish the provider's private reel strips/probabilities, certified RTP, production wager policy, wallet/ledger attachment, gambling limits or release readiness. No wallet, account, handler or deployment is changed by importing it. The printed 96.66% is a provider help fact, not a calculated or claimed return of an implemented probability model.

Verification on the current source:

- `node --test codex-work/requested82-20261124/multi-hot-100/rules/*.test.mjs`: 11 passed, including the actual 12.60 observation, the distinct line 46, all symbol/count award scaling, the 2,500× maximum, direction, sparse inputs, fractional-minor rejection and exact large-integer arithmetic.
- `python -m unittest discover -s codex-work/requested82-20261124/multi-hot-100/rules -p 'test_*.py'`: 5 passed, including independent trim/rotation pixels, drawn geometry, ambiguous/missing artwork and corrupt bounds.
- `python codex-work/requested82-20261124/multi-hot-100/rules/verify-atlas.py /absolute/path/to/retained/Sprites`: 16 original SHA-256 pins and all 100 unique decoded paths verified. This optional check requires separately retained original images and Pillow; a source-only checkout does not contain those media.
