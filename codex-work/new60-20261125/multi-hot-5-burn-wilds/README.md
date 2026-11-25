# Multi Hot 5 Burn Wilds — observed payout component

This new module quotes the five fixed paylines from a supplied final grid. It was
written from the official DMO paytable and rules freshly observed on 25 November
2026, rules version `v1.0.1`. It includes no provider artwork, audio,
source program, guessed symbol weights or random outcome generator.

## Implemented behavior

- Five paylines: middle, top, bottom, V and inverted V, with runs beginning on the
  leftmost reel and continuing through adjacent reels.
- Exact displayed payouts at both observed total bets, `0.10 DMO` and `0.20 DMO`.
- Seven, grapes, watermelon, bell, lemon, plum, orange, cherry and wild symbols.
- Wild substitution on reels 2–4, requiring the authoritative final expanded grid.
- Deterministic application of a supplied winning multiplier from 1 to 5.
- All money amounts are integer DMO cents. ETB, unknown bets, invalid grids and
  incomplete winning wild expansions are rejected.

The supplied grid and multiplier must come from an independently authoritative
source. This component cannot create a round, generate a result or touch a
wallet. Its output explicitly sets `settlementAuthorized: false`.

## Verification boundary

The quote reports each line separately. It deliberately has no aggregate round
payout: the observed wording about highest payline wins has not yet been checked
against a fresh result with concurrent winning lines. No decision between maximum
and sum is made by this component.

The expansion trigger is visible in the official rules, but complete expansion
ordering and possible cascading behavior are not independently established. The
caller must therefore supply a final grid and explicitly set
`finalExpansionComplete: true`. A wild on a winning line must occupy its entire
reel in that final grid. This module neither predicts nor creates that expansion.

The configured `96.55%` RTP and `1300×` maximum win are labelled as provider
displays. This code does not establish either property because reel strips,
symbol distributions and multiplier probabilities are unavailable. It accepts
only the two directly observed bets, regardless of the wider displayed bet
range. This is a working partial evaluator, not a completed game or production
release. Commercial media rights and full live acceptance remain separate.

Official reference page:
<https://www.smartsoftgaming.com/games/multi-hot-5-burn-wilds>

## Run the focused checks

```sh
node --test codex-work/new60-20261125/multi-hot-5-burn-wilds/payout.test.mjs
```

```js
import { quoteObservedFinalGrid } from './payout.mjs';

const quote = quoteObservedFinalGrid({
  currency: 'DMO',
  betMinorUnits: 10,
  winningMultiplier: 2,
  finalExpansionComplete: true,
  grid: [
    ['lemon', 'seven', 'bell'],
    ['plum', 'seven', 'orange'],
    ['cherry', 'seven', 'plum'],
    ['orange', 'bell', 'lemon'],
    ['grapes', 'cherry', 'watermelon'],
  ],
});
// Middle line: baseMinorUnits=40; multipliedMinorUnits=80.
// No total payout is returned and no settlement is authorized.
```
