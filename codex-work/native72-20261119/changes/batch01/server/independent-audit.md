# Independent operator models: Multi Hot 20 and Burn Wilds

These are our own probability models. The captured paytables, numbered line paths, FoundationBet (1 and 2), Wild substitution/expansion and integer-cent evaluator remain the verified reference mechanics. Reel frequencies, reel order and wheel probabilities below are independently chosen. Neither model reproduces the provider RNG or claims provider certification.

Both candidates remain `productionApproved:false` and `probabilityModelAudited:false`. `offlineExactEnumerationVerified:true` records the calculation performed here; the normal production sampler still rejects these candidate objects. No account, wallet, API, deployment or operator release flag is changed by generating the audit.

| Property | Multi Hot 20 | Multi Hot 5 Burn Wilds |
| --- | --- | --- |
| Uniform reel-stop counts | 9 × 8 × 8 × 8 × 8 | 8 × 13 × 13 × 13 × 8 |
| Exhaustive stop combinations | 36,864 | 140,608 |
| Actual evaluator calls, five wheel values | 184,320 | 703,040 |
| Exact operator RTP | 9,663 / 10,000 = **96.63%** | 1,931 / 2,000 = **96.55%** |
| Target basis | Captured official claimed RTP used only as a numerical target | Newly captured official rules' claimed RTP used only as a numerical target |
| Positive wheel weights, 1× through 5× | 186,263,459; 18,477,104; 18,477,104; 18,477,104; 18,477,104 | 62,613,494; 1,588,189; 1,588,189; 1,588,189; 1,588,189 |
| Weight total | 260,171,875 | 68,966,250 |
| Exact maximum in this model's support | 1,000 × stake | 1,300 × stake |
| Existing conservative payout cap | 1,000 × stake | 1,300 × stake |

The base strip lists `seven, bell, grape, watermelon, lemon, plum, orange, cherry` in that order. Multi Hot 20 prepends one additional Seven on reel one and uses the base strip on reels two through five. Burn Wilds uses `seven, grape, watermelon, bell, lemon, plum, orange, cherry` on both outside reels; each middle reel appends `wild, lemon, plum, orange, cherry` to the base strip. Thus Seven and Wild each occur once in thirteen middle-reel stops, while each low-paying fruit occurs twice. The exact cyclic order is part of the hashed profile because rows within one reel are correlated.

Both maxima are reachable, rather than merely theoretical upper caps. At ETB 1.00 and wheel 5, M20 stops `[1,1,1,1,0]` produce a 230.00 base win capped to 1,000.00; Burn stops `[1,9,9,9,1]` expand the three middle Wild reels and produce a 260.00 base win paying exactly 1,300.00. The exhaustive artifact retains maximum witnesses at every wheel. M20 has two stop combinations actually capped at wheel 5; Burn's maximum equals its cap without truncation. Earlier eight-stop M20 and differently ordered Burn candidates reached only 687.5× and 1,250× and were superseded before production approval.

The initial Burn proposal with eight outside stops and nine middle stops was rejected. Its wheel-1 return is exactly `18317/11664` (157.038751714677…%), so a 96.55% return cannot be obtained using any strictly positive mixture of its 1×–5× wheels. The rejected draft and its complete enumeration remain in the JSON artifact. It was replaced with the explicit thirteen-stop middle strips above. The independently selected 96.00% draft target was superseded when the original rules screen advertised 96.55%; matching that numerical target does not reproduce its probability distribution.

For a model with `N` equally likely stop combinations, let `S[i]` be the sum of the exact final payouts in cents over every stop combination at wheel `i`, using a 100-cent stake. The expected return with wheel weights `w[i]` is exactly:

```text
sum(w[i] * S[i]) / (100 * N * sum(w[i]))
```

The audit calls the actual evaluator separately for every stop combination at all five wheels. This includes Wild expansion, FoundationBet divisibility, every numbered line and the payout cap; it does not assume independent visible cells or estimate return from sampled spins.

The weights use an exact rational blend of a uniform wheel and the lower or upper endpoint. For target `p/q` below the uniform mean, set `D=100*N`, `K=p*D-q*S[1]` and `A=q*sum(S)-5*p*D`; then use `[K+A,K,K,K,K]` divided by their common gcd. The analogous upper-end blend puts `A` on wheel 5. Integer cross multiplication proves equality to the requested target:

```text
Multi Hot 20:
10000 * 926776010880000 = 9663 * 959097600000000
                          = 9267760108800000000

Burn Wilds:
2000 * 936265285644000 = 1931 * 969720648000000
                         = 1872530571288000000
```

All five weights are positive integers and both totals fit the existing `secureIndex` bound of `0xFFFFFFFF`; its rejection sampler can therefore draw these distributions without modulo bias. Stops are sampled independently and uniformly on their own explicit strips, then the wheel is sampled independently.

The RTP proof extends to every accepted stake, including values such as 1.20 ETB for M20 and 1.10 ETB for Burn. Valid stakes are integral 20-cent or 10-cent denomination units. Line coefficients and final caps are homogeneous in those units; Wild expansion depends only on the grid. No rounding is introduced when scaling payout or cap. Regression tests also check this property at minimum, adjacent denomination and maximum stakes.

Run the offline calculation and verification from the repository root:

```sh
node codex-work/native72-20261119/changes/batch01/server/independent-audit.mjs
node --test codex-work/native72-20261119/changes/batch01/server/independent-profiles.test.mjs
```

The JSON artifact binds the exact evaluator SHA-256 and includes each model's strips, line paths, coefficients, weights, proof integers and profile digest. A fresh exhaustive regression must match the committed artifact byte-for-value. The 2026-11-21 regeneration with the newly captured Burn target used Node 22.23.5; the complete 11-test suite passed with zero failures or skips. Operator model review, integration acceptance and live route/session/recovery verification are still required before approval or wagering.
