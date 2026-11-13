# Special Games — independent playable additions

This source is separate from the rejected NEW74 presentation. The existing financial transport is the only shared application code; game artwork, geometry, animation and controls must come from verified official references. Production spins use the existing Superwin account/session and ledger APIs, never the provider demo runtime.

`tools/capture-scene.mjs` reads presentation geometry from an observed public demo without exporting executable provider code or session credentials. `tools/fetch-media.py` downloads only observed original media and records SHA-256 provenance. Reference screenshots are verification evidence, not a substitute for a running game.

The complete 74-game release is evaluated by `tools/release.mjs`. A registered name, screenshot, working canvas, or smoke test alone cannot make an entry release-ready. The latest request adds the new Special Games catalogue alongside existing games after all 74 entries pass, with the existing Worker content/version retained for rollback. Backend routes, database bindings, accounts, and wallet infrastructure are preserved.

Current release status is in `reports/special74/manifest.json`. The catalogue is not yet eligible for production release. `reports/special74/selected-games.json` explicitly maps the 74 requested positions to distinct, freshly discovered official SmartSoft titles; unavailable names have user-authorized replacements. Catalogue discovery and a successful launch are not proof of gameplay, implementation, or parity.

`router.mjs` and `src/catalog.mjs` implement the additive integration boundary. They expose the new catalogue only for a complete release and leave existing game/API requests with the retained handler. The lobby module appends its own section to the observed `main.player-main` container only while the existing `#sw-v116-games` marker is present. It removes only its own section on other SPA views and retains existing nodes. The initial integration passed local browser fixtures. The later view guard passed JavaScript DOM-model checks; its expanded browser fixture must be rerun when the unavailable execution environment recovers. It is not deployed.

`tools/package-release.mjs` refuses to package an incomplete 74-game release. The current refusal is expected: individual implementations and reference comparisons remain incomplete. `tools/fetch-covers.py` stages 74 official catalogue cover images with source URLs and hashes. Cover images do not count as playable games.

Restore the original launcher menu button with `python3 workers/superwin-player/special74/tools/fetch-launcher-media.py`. The downloader pins the observed source, PNG signature, byte count and SHA-256; a missing or changed asset is never replaced by an emoji or arbitrary remote file. This restore helper was added while the execution environment was unavailable and has not yet been executed.
