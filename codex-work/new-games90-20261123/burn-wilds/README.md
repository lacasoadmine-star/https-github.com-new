# Multi Hot 5 Burn Wilds expansion

This distinct component continues the next requested game under its retained identity `zplay72_multi_hot_5_burn_wilds_v1`. It implements only the currently observed/officially described Burn Wilds behavior: an own WILD on reel 2, 3 or 4 that participates in a winning line may expand vertically. It is not a renamed Super Wilds machine, evaluator, paytable, probability model, wallet, or completed live game.

Root's fresh current official round 4 showed final reels 2 and 3 entirely WILD and a displayed 4.75 DMO win at a 0.10 DMO stake with wheel 5×. The pre-expansion original grid was not captured in that observation. These facts corroborate final expansion presentation only; this component does not infer payouts or reconstruct that missing original result. The original/final grid in the tests is an explicitly synthetic validation fixture, not provider reference evidence.

`BurnWildsExpansion` exposes `start`, `accept`, `stop`, `tick`, `snapshot` and `dispose`. `accept` requires an authenticated authoritative receipt containing its exact game ID, `roundId`, five-column × three-row `originalGrid` and `finalGrid`, zero-based `expandedColumns` limited to 1–3, and `winLines` containing five row indexes. Each expanding column must contain an original WILD crossed by an authoritative positive winning line. All other cells must remain unchanged, and declared expanded columns must end entirely WILD. Optional `clientToken` must match the active request. Integer amount fields are validated and retained without calculation.

The animation reveals the original result, ignites only the declared columns, expands them in sequence, then displays the accepted final result. STOP speeds this timeline without selecting a result, inventing an expansion or changing settlement data. Lost-reply duplicates recover the same immutable receipt; conflicting same-round receipts fail closed. Restoring a receipt without an active animation immediately restores its final presentation.

`BurnWildsFlameOverlay` draws authored Canvas fire and sparks clipped to those exact reel rectangles. It receives a timeline snapshot and five measured reel rectangles, caps DPR at two and leaves pointer events to the actual game controls. It performs no networking, randomness, result selection or ledger action. Full host integration, its own complete cabinet/artwork/sound/paytable and live acceptance remain further work.

Focused verification: `node --test codex-work/new-games90-20261123/burn-wilds/expansion.test.mjs`.

## Current implementation continuation

On 23 November the actual own official v1.0.1 demo was reopened and seven separate manual 0.10 DMO rounds were observed. All seven were losses; this does not establish a winning expansion, X2 outcome, probability distribution or audio parity. Rules were refreshed with their own +/− controls before recording the 0.10/0.20 DMO paytable. The unrefreshed placeholder numbers and a marketing image showing additional features were excluded. Sanitized current facts are in `current-reference.json`; provider session URLs and history IDs are not published.

`rules.mjs` implements the refreshed per-line amount quotes, the five exact observed line shapes and left-to-right WILD substitution for a supplied final grid. It does not sample outcomes, infer a provider probability model, choose expanding reels, aggregate host settlements, or turn the displayed maximum into an invented clipping rule.

`scene.mjs` now renders five clipped moving reels, the 1/3/5/2/4 multiplier wheel order, accepted line highlights and the existing original-to-expanded-grid flame timeline. STOP only accelerates rendering. It uses actual individual symbol images supplied under this game's exact artwork identity; there is no screenshot/video playback or fallback to another title. Cabinet/fire drawing is authored Canvas and not claimed to be exact provider artwork. `layout.mjs` supplies both the scene and actual DOM buttons with the same responsive rectangles and caps the Canvas resolution through the scene at DPR2.

`controller.mjs` persists only the original prepared action under the authenticated subject, recovers lost replies with that same authority, prevents overlapping spins, and separates accepted presentation from settlement. It implements SPIN, presentation-only STOP, TAKE, host-enabled red/black X2 and AUTO25/50/100/500/1000 with the three observed stop conditions. AUTO ends on pause/disconnection. Balances and amounts come only from the host; no wallet or initial credit is fabricated. Definitively rejected unaccepted requests restore controls, while ambiguous results stay in RECOVER.

`mount.mjs` and `style.css` provide actual DOM controls, startup sound choice, separate effects/music settings, five-row bet selector, quoted own paytable, paylines, AUTO condition inputs, recovery and responsive positioning. The mount receives the existing host's `state/prepare/dispatch/recover` transport, a Burn-specific verified symbol atlas, and its own optional audio service. It owns and disposes only its own mount and listeners. It does not register another backend, create a wallet, or activate a route.

One bounded Node pass ran the existing10 expansion checks and the new8 meaningful runtime checks: **18 passed, zero failed/skipped/cancelled**. This checks quoted current amounts, pending request recovery, STOP/no-second-wager, identity/account isolation, AUTO pause, rejection restoration, sprite-cell rendering, DPR and shared measured control layout. Native browser acceptance of the newly mounted code has not run, and these fixtures are explicitly synthetic.

### Concrete remaining integration inputs

1. Complete and verify current own native symbol/cabinet/audio asset closure. The renderer rejects a missing or foreign symbol set; none was copied from another game. Direct public-loader HTTP access returned403 once; it was not retried or bypassed. The authorized cloud browser provided the seven reference rounds.
2. Supply the distinct authoritative Burn probability/outcome/expansion model and authenticated transport using the existing wallet/ledger. No cash endpoint or backend identity has been registered by this component.
3. Mount the complete own asset/controller package on `/new-games72/multi-hot-5-burn-wilds/`, then verify the actual live accepted round and ledger before enabling the catalogue entry.

The new source is implementation progress; it is not a completed or cash-enabled game.
