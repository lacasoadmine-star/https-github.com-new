The renderer changes preserve the existing Worker, player session, shared wallet, game identities and accepted Multi Hot 5/Foxy routes.

`motion-patches.json` lists exact existing presentation-module URLs and their original SHA-256 digests. Small replacements freeze the decorative reel clock after STOP while the actual server receipt is pending. A validated receipt resumes landing. Normal spin timing, accepted grids, frozen reels, multiplier values and completion notifications are preserved. These adapters do not handle the separate Multi Hot 40 presenter or the accepted Multi Hot 5/Foxy routes.

`guest-entry-patch.json` is a candidate entry correction that keeps a logged-out visitor on the existing game route. The retained renderer still requires a confirmed account state before displaying its art, so this candidate alone is not a public guest preview. It does not change authentication, state endpoints or financial guards.

Verification commands:

- `node tests/remaining20_motion_stop.mjs`: nine supported renderer configurations. Checks pending STOP, invalid grid rejection, validated receipt landing and exactly one completion. No HTTP, wallet, RNG or database is involved.
- `python tests/batch10_live_audit.py`: read-only deployed guest audit. All non-GET API requests are aborted.
- `python tests/batch10_live_audit.py --patch-guest-entry`: tests the candidate entry module only inside the isolated browser.
- `python tests/batch10_live_audit.py --patch-guest-entry --preview-fixtures`: renders deployed frontend code with an isolated test state: zero balance, no round, accepting:false and launchable:false. Screenshots are test evidence, not a real account or production release.
- `python tests/native9_controls.py`: actual deployed native frontend code with isolated browser-only state/action fixtures. Exercises menu, bet, SPIN/STOP, receipt rendering and three phone viewports. No financial request reaches the real backend. The supplied no-win receipt tests presentation transport, not provider or production backend math.

Private browser results and screenshots remain in local `reports/` directories. No historical record, real balance or financial action was changed by this work.
