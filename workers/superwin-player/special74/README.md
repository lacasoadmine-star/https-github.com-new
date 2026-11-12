# Special Games — independent playable additions

This source is separate from the rejected NEW74 presentation. The existing financial transport is the only shared application code; game artwork, geometry, animation and controls must come from verified official references. Production spins use the existing Superwin account/session and ledger APIs, never the provider demo runtime.

`tools/capture-scene.mjs` reads presentation geometry from an observed public demo without exporting executable provider code or session credentials. `tools/fetch-media.py` downloads only observed original media and records SHA-256 provenance. Reference screenshots are verification evidence, not a substitute for a running game.

The complete 74-game release is evaluated by `tools/release.mjs`. A registered name, screenshot, working canvas, or smoke test alone cannot make an entry release-ready. The latest request adds the new Special Games catalogue alongside existing games after all 74 entries pass, with the existing Worker content/version retained for rollback. Backend routes, database bindings, accounts, and wallet infrastructure are preserved.

Current release status is in `reports/special74/manifest.json`. The catalogue is not yet eligible for production release. `reports/special74/selected-games.json` explicitly maps the 74 requested positions to distinct, freshly discovered official SmartSoft titles; unavailable names have user-authorized replacements. Catalogue discovery and a successful launch are not proof of gameplay, implementation, or parity.
