Multi Hot 10 and Multi Hot 40 use separate, independently authored operator probability models. Neither reproduces SmartSoft's private probabilities. The observed public help supplies the symbol paytables, fixed line paths, reel geometry and left-to-right longest-match rule. The operator chooses independent uniform cells, independent multiplier weights and optional fair color gamble.

| Model | Grid | Lines | Base RTP | Maximum base payout | Total stake |
| --- | --- | --- | --- | --- | --- |
| `special74_multi_hot_10_v1` / `operator-mh10-v1` | 3 rows × 5 columns | 10 | 24/25 = 96% | 5000 × total stake | ETB 0.10–200.00 |
| `special74_multi_hot_40_v1` / `operator-mh40-v1` | 4 rows × 5 columns | 40 | 24/25 = 96% | 2500 × total stake | ETB 0.40–100.00 |

The MH10 observed help displays a 1000× maximum. This independent model has no such cap and can pay 5000× when every cell is seven and the multiplier is five. The actual operator maximum must be shown in the rules and reserved by the retained server before accepting a wager. A matching presentation does not imply matching provider mathematics.

All stakes and payouts are integer ETB minor units internally. Stakes divide equally across all lines, so line allocation and payouts require no rounding. A line pays once for its longest identical run starting at the leftmost column: three, four or five symbols. There are no wild substitutions, scatters, free spins, cascades or bonuses in these operator models. Color gamble selects either color with probability 1/2, pays 2× its eligible stake, permits at most five attempts and accepts a stake of at most ETB 500.00. Eligibility, debits and credits belong to the retained account service.

The exact proof enumerates all 32,768 five-cell sequences through the real evaluator and checks every multiplier ticket. For eight equiprobable symbols, the sum of line payouts across all sequences is `56 × sum(pay3) + 7 × sum(pay4) + sum(pay5)`. This is 10,840 for MH10 and 8,380 for MH40. The weighted multiplier sums are 98,304/33,875 and 393,216/104,750 respectively. Dividing the line sums by 32,768 and multiplying by the corresponding multiplier expectation gives exactly 24/25 in each model. Linearity of expectation permits overlapping paylines; no assumption that their outcomes are independent is used.

Run from the repository root:

```sh
node workers/superwin-player/special74/tools/prove-sibling-math.mjs
node --test workers/superwin-player/special74/tests/sibling-math.test.mjs
```

Each proof under `reports/special74/operator-math` includes the source digests, public chart/rules digests and `mathSha256`. This identity is the SHA-256 of the compact JSON `sourceInputs` array, which binds both the common evaluator and the specific model module. It is not the hash of a single bundle. Regenerate proofs and rerun tests after changing either source.

`sibling-core-adapter.mjs` adds only models explicitly listed in `sources`:

```js
const core = createSiblingOperatorCore(existingCore, {
  sources: {special74_multi_hot_40_v1: proof.mathSha256},
  enabled: false
});
```

The adapter is disabled by default, has no database or wallet access and delegates existing model IDs to the original core. In a disposable fixture, `enabled: true` exposes its operator stake schedule and permits draws. That flag alone does not establish retained runtime integration or authorize production activation.

Frontend outcome fields follow the existing fresh transport: `grid` is row-major with five columns; `wheelMultiplier` is 1–5; each `winLines` entry contains `line`, `symbol`, `matched`, `positions: [{row,col}]`, `win` before the multiplier and `payout` after the multiplier. `finalWin` is the sum of line payouts, and all cash fields are two-decimal ETB strings. Symbols follow the confirmed atlas ordering: `seven`, `bell`, `grape`, `watermelon`, `cherry`, `orange`, `plum`, `lemon`.

The retained service must still pin all three model identity fields, persist the canonical result with the existing request token, lock wallet balances, reserve liability, enforce gamble eligibility and replay committed requests without another debit. No production account, existing model, database schema or ledger route is changed by these modules. The standalone mathematical proof is not evidence that these sibling models have been installed into the deployed retained runtime.
