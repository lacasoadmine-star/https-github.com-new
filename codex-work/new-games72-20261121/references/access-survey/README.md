# Official demo entry/access survey — 2026-11-21

The survey opened exactly the 13 priority public demo URLs in the current registry, using two dedicated Cloudflare Browser Run sessions. Each session retained one blank controller page and at most one game page. Each game page was closed before the next was opened; both browser sessions were then closed successfully.

Each game received one bounded navigation and one mobile entry screenshot. The viewport was 390 × 844 at scale 1, with mobile metrics, touch and an Android/SM-S928B user agent. This was browser emulation, not a physical Samsung device or a performance test.

## Observed results

| Result | Count | Games |
| --- | --- | --- |
| Correct titled game behind an initial sound prompt | 9 | Multi Hot 5 Wild; Multi Hot 10; Multi Hot 20; Multi Hot 40; Multi Hot 100; Multi Hot 5 Super Wilds; Multi Hot Wild Ways; Burning Ice 10; Burning Ice 40 |
| Sound prompt over a still-loading background | 3 | Multi Hot 5 Burn Wilds; Multi Hot Ways; Wild Multi Stars |
| SmartSoft intro/loading screen only | 1 | Burning Ice |

All 13 main document requests returned HTTP 200. No country restriction, main-document 403 or 429 was observed in this particular survey. The earlier Hot Samba country restriction belongs to its separate capture record and is not part of these 13.

Auxiliary frames displayed Not Found text. Their HTTP status was not captured; this does not establish that the main game's assets or playback failed.

## Limits

No sound prompt was dismissed, no gameplay control was pressed, and no round was started. Every row therefore has zero completed round observations and false rules, sound, video, seven-spin and release-readiness claims. A sound prompt or canvas is entry evidence only. The four loading observations are unresolved bounded snapshots, not proof of a permanently broken game.

`survey-results.json` contains the complete public-safe results. Per-game JSON and JPEG files are under `2026-11-21/`, with source identity, timestamps, viewport and artifact hashes. Session IDs, page target IDs and site-issued tokens are excluded. `survey-script-template.txt` records the actual passive entry-probe method; its target placeholder was populated only from the current registry's official public demo URLs.

The screenshots are fresh research references. They are not game assets, playable rounds, or evidence of asset reuse rights. A separate inspected session is needed for seven actual rounds, controls, paytables, animations and sound.

## Subsequent full-reference attempt

A separate Multi Hot 5 Wild session was opened after both survey browsers had closed. At 2026-11-21T20:25:32.514Z it displayed an explicit country restriction before gameplay. That observation is preserved separately in `multi-hot-5-wild-followup-blocker.json` and its screenshot. It does not overwrite the earlier permitted entry observation, establish a cause for the difference, or satisfy any round requirement. The new session was closed without an input or retry.
