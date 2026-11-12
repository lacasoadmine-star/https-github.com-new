# Special Games — new playable replacement

This source is separate from the rejected NEW74 presentation. The existing financial transport is the only shared application code; game artwork, geometry, animation and controls must come from verified official references. Production spins use the existing Superwin account/session and ledger APIs, never the provider demo runtime.

`tools/capture-scene.mjs` reads presentation geometry from an observed public demo without exporting executable provider code or session credentials. `tools/fetch-media.py` downloads only observed original media and records SHA-256 provenance. Reference screenshots are verification evidence, not a substitute for a running game.

The complete 74-game release is evaluated by `tools/release.mjs`. A registered name, screenshot, working canvas, or smoke test alone cannot make an entry release-ready. The cutover replaces player game discovery only after every requested identity passes, with the existing Worker content/version retained for rollback. Backend routes, database bindings, accounts, and wallet infrastructure are preserved.

Current release status is in `reports/special74/manifest.json`. The catalogue is not yet eligible for production replacement.
