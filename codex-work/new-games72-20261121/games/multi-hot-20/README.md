# Multi Hot 20 — current-reference bounded evaluator

This module independently transcribes the current official **SmartSoft MultiHot20** demo. It preserves the reserved game ID `zplay72_multi_hot_20_v1` and route `/new-games72/multi-hot-20/`. It does not import another game's implementation, rules, artwork, symbols, audio, or RNG.

**Status: 24 isolated tests passed; candidate arithmetic only; release, backend, and cash gates closed.** This is a substantive rules/evidence checkpoint, not a playable or production-ready game.

## Evidence and implementation boundary

The parent agent opened the exact current official demo and captured seven separately initiated manual rounds at **0.20 DMO**, each with its own result image. Those seven observations had no win presentation. The four motion samples for `spin-05` are frames from one of those seven rounds. Later control tests produced **three additional demo rounds**, ending at displayed ordinal 10. Their attribution to two AUTO rounds and one main-control click is an inference from the action sequence. These extra rounds are not included in, or substituted for, the seven initial observations, and their complete winning results were not captured.

The official game page is <https://www.smartsoftgaming.com/games/multi-hot-20>. The public demo is <https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=MultiHot20&PortalName=demo&Token=DEMO>. The capture timestamps are **2026-11-21 UTC**, despite the task checkpoint directory's `20261122` label. The reference viewport is **1363 × 936**, landscape. The demo reports **v1.0.0**.

`evidence-index.json` binds **57 original screenshots and two capture logs**, totaling **5,993,503 bytes**, and `fresh-reference-report.md` describes observed actions and remaining limitations. Reference screenshots remain evidence: they are not playable renderer assets. No history screenshots were captured or copied. Header round identifiers visible in official-demo screenshots refer to public DMO demo rounds, not production player rounds.

The original images and archives are **retained privately and excluded from GitHub**. Automatic approval review rejected the attempted M20 archive part012 upload because the submitted binary payload could not be cleared for sensitive/account/session-content risk; that rejected action was not retried. The entire M20 bundle folder and all57 source images are excluded from the next public tree. `publication-status.json` records this boundary. The index retains exact original image hashes as private-evidence pointers; it does not imply that a public checkout can restore the images.

Public publication includes the reviewed text observations, source and arithmetic fixture. The full24 evaluator tests passed again in an isolated directory containing only `evaluator.mjs`, `evaluator.test.mjs` and `fixtures/observed-seven-rounds.json`, with no images or archive present. Public CI runs those pure tests; it does not run M20 image restoration or image QA. The next exact GitHub CI outcome remains pending.

## Resolved numeric source

The first-open paytable was inconsistent: at the displayed 0.20 DMO preview it rendered a single malformed-looking row with values 35, 35, 20, 20, and 75 for the symbol groups. Both that image and the attempted correction are retained. It is **excluded from numeric rules**.

After the preview increment to 0.40 and decrement to 0.20, the complete 3/4/5 tables rendered. The refreshed 0.20 table gives these displayed DMO amounts:

| Symbol | Three | Four | Five |
| --- | ---: | ---: | ---: |
| Seven | 0.50 | 4.00 | 20.00 |
| Bell | 0.20 | 1.00 | 2.00 |
| Grapes | 0.10 | 0.50 | 1.00 |
| Watermelon | 0.10 | 0.50 | 1.00 |
| Lemon, plum, orange, or cherry, matched individually | 0.05 | 0.10 | 0.50 |

The separate 0.40 screenshot corroborates doubled values for the four fully visible high-symbol groups. The helper uses an exact ratio to the **displayed total bet**; it does not multiply those bound amounts by 20 or silently divide them by another line count. The documentation describes multipliers **1 through 5**. No probabilities are provided or invented.

## Two exported functions

`quoteObservedLine({ symbol, matchedReels, totalBetMinor, multiplier })` quotes one symbol/count against that bound table. Its intermediate arithmetic uses `BigInt`. Amounts are reduced rational strings with `exactMinor: null` when a fractional minor unit remains. The helper does not round, approve a bet, or select a financial currency policy.

`inspectCandidateLines({ rows, totalBetMinor, multiplier })` inspects an externally supplied three-row, five-reel window. It finds the longest identical adjacent prefix beginning at the leftmost reel along each of the 20 paths actually shown in this demo. It returns candidate quotes with their numbered paths. It does not generate a result or certify that the supplied window is reachable.

```js
import { quoteObservedLine, inspectCandidateLines } from './evaluator.mjs';

quoteObservedLine({
  symbol: 'seven', matchedReels: 5, totalBetMinor: 20, multiplier: 3,
});
// afterMultiplier: { numerator: '6000', denominator: '1',
//                    exactMinor: 6000, roundingApplied: false }
// settlementEligible: false

inspectCandidateLines({
  rows: [
    ['bell', 'lemon', 'cherry', 'grapes', 'orange'],
    ['seven', 'bell', 'seven', 'lemon', 'seven'],
    ['orange', 'seven', 'cherry', 'seven', 'watermelon'],
  ],
  totalBetMinor: 20,
  multiplier: 3,
});
// Includes the five-seven candidate on the documented line 20.
// aggregatePayoutMinor: null; aggregationPolicy: 'UNRESOLVED'
```

The demo's **0.20–200.00 DMO** limits are reference metadata. They are not imposed as ETB limits. Positive safe-integer input amounts are accepted solely for arithmetic fixtures; the existing operator policy remains responsible for any eventual wager validation.

## Unresolved settlement and release gates

The demo's phrase **“Highest payline wins are only paid”** does not unambiguously settle whether the global highest line alone is paid or each line contributes its highest matching payout. Consequently there is no aggregate payout and no wallet or server settlement integration.

The freshly reopened official product page still lists **100 fixed lines**, while this exact demo contains **20 numbered line paths**. This module records and evaluates the visible demo chart as candidate evidence only. It does not invent the additional 80 paths or claim that the variant conflict has been resolved.

The demo reports a maximum of **1000×** and RTP **96.63%**. A deliberately unrestricted all-seven fixture creates 20 individual candidates of 500× each at multiplier 5. Summing those candidates would give 10000×, but neither that hypothetical sum nor the window's reachability is established. This comparison is an unresolved-model warning, not a claim that the provider's maximum is incorrect. The module neither caps nor aggregates candidates, and the reported RTP is not a claim about this code.

Exact outcome distributions, legal reel combinations, aggregate settlement, rounding, gamble rules, genuine assets/audio, animation timing, and complete control behavior remain open. The observed multiplier is above the reels although the written rules describe a left-side multiplier reel; this discrepancy is also retained. No synthetic substitute symbols, sounds, or gameplay are introduced to conceal those gaps.

## Verification

Run from the repository root:

```sh
node --test codex-work/new-games72-20261121/games/multi-hot-20/evaluator.test.mjs
```

The first run passed **24/24**, with no failure or retry. Coverage includes both bound preview amounts, exact fractions, multiplier application, adjacency and leftmost origin, distinct chart paths, all 20 candidates without an aggregate, the seven current no-win observations, overflow, malformed inputs, and preventing caller mutations from changing the private chart. `evaluator-test-report.json` records the actual command, result, runtime, duration, and tested source hashes. This isolated verification does not claim renderer, controls, sound, integration, or production readiness.
