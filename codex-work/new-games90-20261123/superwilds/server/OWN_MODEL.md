# Super Wilds own ZPLAY mathematical model

`own-model.mjs` provides a new operator-authored probability distribution for
`zplay72_multi_hot_5_super_wilds_v1`. It uses the game's freshly observed five
paylines, WILD substitution and displayed 3/4/5-symbol awards. It does not claim
to recover SmartSoft's hidden reel strips, probabilities or certified RTP.

The constructor is `createSuperWildsOwnModel({betLevels, randomBytes})`.
`betLevels` must be an explicit host policy; no ladder or balance is invented.
The production entropy default is `node:crypto.randomBytes`. Injection is
intended for isolated reproducible tests. Outcome input is not accepted from a
browser, player ID, session token, previous win or stake-dependent seed.

The candidate exposes the lifecycle's mathematical callbacks:

- `sampleOutcome({gameId, roundId, betMinor})` returns a fresh row-major 3×5
  grid, multiplier, all highest paying lines and exact aggregate BigInt award.
- `validateOutcome(outcome, context)` recomputes the full aggregate quote and
  rejects changed amounts, lines, symbols, dimensions, multipliers and extra
  authority fields.
- `maximumPayoutMinor(stake)` returns `stake * 1000n` for the admitted ladder.

`approved` remains false. The returned mathematical verification facts come
from the exact audit and deterministic evaluator; deferred lifecycle and ETB
policy acceptance remain false. A host must complete its actual protected
wallet, journal, lifecycle, model acceptance and release work before using this
candidate for money. Import or construction installs no model, release, table,
account, wallet, HTTP handler or deployment.

## Exact own probability law

The base branch generates fifteen independent uniform symbols from the nine
observed identities. The wheel is independent uniform 1–5. Every legal symbol
grid and wheel value has positive probability through that branch.

Exhaustively enumerating all `9^5 = 59,049` values of one line yields an award
numerator sum of `19,018`, using the paytable denominator two. Every line has
the same marginal distribution. Their overlap does not affect linearity of
expectation. Five lines and expected wheel value three therefore give:

`base return = 19,018 * 5 * 3 / (59,049 * 2) = 47,545 / 19,683`.

An independent own mixture selects that base branch with probability
`189,960,633 / 475,450,000`. The other branch generates a new zero-win grid:
its first column contains three uniform non-WILD symbols, its second column
uniformly excludes WILD and all symbols in the first column, and its final
three columns are independent uniform symbols. Every observed line fails
between the first two columns, so its award is exactly zero. This branch uses
new entropy each round and requires no rejection of previously winning grids.

The exact defined own return is consequently:

`(47,545 / 19,683) * (189,960,633 / 475,450,000) = 9,651 / 10,000 = 96.51%`.

This is an exact calculation of this authored distribution, not a simulation
estimate, provider parity claim, certification or observed production return.
The maximum is five lines × 40 stakes × wheel five = 1,000 stakes. An all-WILD
grid with wheel five reaches that maximum and has positive probability.

Every supplied stake must be a positive even number of ETB minor units. Thus
the smallest half-stake award is exact; no fractional cent is rounded. Stakes
are capped so the full 1,000× award remains a safe integer for the existing UI
transport. The host can impose a smaller ladder and account/house limits.

Integer sampling masks unused high bits and rejects values outside the bound;
it never uses modulo reduction. A byte-source error, malformed entropy or
128 consecutive rejected entropy values raises an error. The caller must roll
back the one transaction. Such failures never become losing rounds or use a
fallback outcome. The exact RTP describes the defined game law; execution and
entropy failures are availability failures outside that mathematical law.

## Verification

`node --test codex-work/new-games90-20261123/superwilds/server/own-model.test.mjs`
passes ten tests. They independently compare all 59,049 line combinations
against the current deterministic rules, prove the rational identity, reach
the exact 1,000× maximum, verify the mixture boundary, exercise unbiased entropy
rejection/failure, reject invalid stakes and outcome tampering, and validate
1,000 distinct fresh test grids across both win and loss cases. The varied-grid
test does not estimate or certify RTP.

No production wager or live verification was performed by these files.
