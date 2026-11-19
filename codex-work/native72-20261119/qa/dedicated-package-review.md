# Dedicated Habesha / Deluxe package review

## Reviewed candidate

Offline review and local HTTP verification completed for the frozen Habesha r8, Deluxe r2 and shared r1 packages. This review does not claim deployment or browser rendering results. No production spin, gamble, balance mutation or account request was performed.

| Package | Manifest SHA-256 | Assets | Asset bytes |
| --- | --- | ---: | ---: |
| Habesha r8 | `d0829f6a3207a97cb38b4f0653af26f180cfc3559c662e29f29cc0d6da61df59` | 213 | 10,055,964 |
| Deluxe r2 | `f98025dfeb8ad0fcbeeb1e7069137ff33175beb80ebe5f23db4ff6838b0811b3` | 99 | 12,703,912 |
| Shared r1 | `2ae6b5774ee7790bab9dee3e697deeb63d9e57d7fc8e8193a24a1dced9b997e0` | 9 | 1,062,682 |

The builder verified 321 asset files, 23,822,558 bytes and 333 dependency edges. The upload plan contains 43 new content-addressed KV entries, including the three manifests, totaling 422,124 bytes. Unchanged media reuse their existing explicit KV keys.

## Concrete integration issues found and resolved

- **Invalid AUTO limits could still start wagers.** The helper correctly returned `null` after input validation failed, but the shared click handler used a nullish fallback that converted it to the default spin count. The shared controller now falls back only when the helper method is absent. `foundation.test.mjs` includes regressions using the actual production click listener for both games.
- **Loader layout remained governed by first-paint CSS.** The critical stylesheet's more specific selector forced block layout and absolute logo placement after the runtime helper inserted its progress bar. The runtime stylesheet now overrides those exact selectors, using a centered column with the logo in normal flow. The initial critical cover still works before runtime CSS loads; `[hidden]` still hides the completed loader.
- **Sound consent mixed old and dedicated styles.** Inherited `#sound-consent`, heading and `#sound-no` selectors outranked class-only rules. Dedicated selectors now cover the dialog, heading and both buttons explicitly. Flexible buttons and a viewport-bounded width retain space on narrow phones and desktop.
- **BET popup could extend below short landscape screens.** Its height is now bounded by the available viewport below its actual top, with internal scrolling. Arrow minimum heights are explicit rather than inheriting the generic dialog button minimum. The final root-owned stylesheet also uses the measured broad-row Deluxe BET geometry.

No helper JavaScript was changed for the CSS fixes. The AUTO listener fix was made in the shared controller by its owner. No math model, reel strip, payout table or media bytes were edited during this review.

## HTML and helper wiring reviewed

The Deluxe entry HTML contains 67 unique IDs with no duplicates. All five `data-close` references and all four panel targets resolve. Of 55 literal controller ID references, the only element absent from initial HTML is `official-auto-start`; the controls helper creates it before the controller binds its click handler.

The Help helper preserves the existing close button and its `data-close="settings"` attribute. The AUTO helper installs its own close handler after replacing the dialog contents. BET selection closes settings through the existing delegated handler. Help and BET classes are switched from the same `bets.hidden` state, and global `[hidden]{display:none!important}` remains present.

Stylesheet order is base styles, critical startup styles, then cabinet geometry in HTML. Runtime helpers append the dedicated dialog stylesheet. Shared imports resolve only through `/zplay-native-shared-20261119-r1/`; game code, model and media remain in their own package closure. Builder checks reject foreign game references, missing dependencies, incorrect byte hashes and nine-byte `Not found` placeholders.

## Repeatable checks and observed results

```bash
node --test qa/package-http-smoke.test.mjs qa/deluxe-style-integration.test.mjs
```

Result: **9 passing test entries, 0 failures** (four CSS checks, four nested HTTP checks and their parent).

The HTTP test starts `qa/browser-server.mjs` as a child in the same command/process tree. It verified both entry pages and their direct dependencies, then retrieved every game/shared manifest asset and checked its exact SHA-256 and byte length. All 321 assets succeeded, with no missing asset recorded by the harness. It also exercised synthetic winning spins, gambles, repeated tokens, interrupted responses, definitive rejections and session expiry using the actual staged validators. The server reports zero production transactions.

The CSS tests verify known selector precedence and viewport arithmetic. The final BET bounds were checked at 1366×768, 844×390, 667×375, 390×844, 320×568 and 1024×600. Consent sizing was checked from 280 to 1366 pixels wide. These are static calculations, not rendered screenshots.

Browser localhost access was unavailable in the shared environment. No alternate browser or network workaround was attempted. Actual visual interaction and production routing must be verified separately after release by the parent task.

## Recovery checkpoint verified

`changes/dedicated-resume/release-checkpoint/` retains all three exact manifests, original served HTML, complete normalized baseline metadata, 50 source hashes, the required baseline dependency list, dependency edges and upload descriptors. It archives no media bytes.

The checkpoint was tested by restoring only **273 baseline assets / 22,000,370 bytes** from the existing verified baseline, with zero downloads, then building into a separate output directory. All three rebuilt manifest hashes exactly matched the table above. The original candidate stage was not modified by this recovery test.

```bash
node qa/archive-dedicated-checkpoint.mjs
node qa/restore-dedicated-inputs.mjs --reuse /absolute/path/existing-baseline --out /absolute/path/restored-baseline
node qa/build-dedicated-packages.mjs --baseline /absolute/path/restored-baseline --out /absolute/path/rebuilt-release
```

After any source change, rebuild and regenerate the checkpoint and deployment pins. The archival script rejects stale source hashes rather than silently capturing mismatched dependencies. Deployment confirmation belongs in release notes; this report records the exact reviewed candidate and local evidence only.
