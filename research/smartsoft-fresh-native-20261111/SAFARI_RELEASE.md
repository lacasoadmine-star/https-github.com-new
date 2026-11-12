Safari Simba is published on the existing Superwin player Worker.

- Existing NEW card: `/games/safarisimba_fresh?mode=account`.
- Existing legacy card route: `/games/safari-simba`.
- Worker: `superwin-player`, version `a8a7033f-74cb-49b8-8c17-24b226879d68`, deployment `f64cde7a-a366-47a0-a6e5-43321ab822b4`.
- Existing Railway service: `superwin-nine-slot-engine`, successful pinned deployment `e679746d-d409-45a3-b102-13b351d5ad79`.
- New independently implemented model replaces only the existing pending registration `fresh_safarisimba`. The other 86 registrations and their model identities remain unchanged.
- The renderer uses fresh original public spritesheets, font files, sound files, Spine skeletons and responsive native geometry. Screenshots and video are never game surfaces. No provider networking or game-engine module runs in this renderer.
- The financial transport uses the existing authenticated service and wallet ledger. It validates model identity, session identity, exact minor-unit receipts and grid shape. STOP only ends visual motion. A retry reuses the original request token. Take Win acknowledges funds already settled by this service and issues no additional credit.
- The independent server model implements the observed 3×3 board, five lines, nine symbols, left multiplier 1–5, animal expansion conditions, X2 gamble and 145× maximum. Its fixed distribution matches the public 96.39% return target; it does not reproduce the provider's private RNG or reel strips.

Verification completed with no real wagers, test accounts, balance edits, schema resets or new ledger tables:

- Eleven model, identity-preservation, receipt, recovery and account-boundary checks.
- Exhaustive 262,144 reel-stop combinations confirm the 145× bound without clipping payouts.
- Four persistent resource-storage and HTTP contract tests.
- Physical touch tests of the deployed renderer: BET, menu, SPIN/STOP, X2 red, Take Win, autoplay sheet, sound switches and turbo; intercepted financial responses verify two settlements and exactly three requests.
- Live renderer checks at 390×844, 320×568 and 844×390 with no JavaScript errors.
- Existing visible NEW Safari card opens the new native scene. An unauthenticated player sees the login action rather than receiving invented game credit.
- Public game metadata confirms the new model is enabled. Private state still requires authentication.

Source preparation: `build_scene_pack.py`, `build_safari_backend.py`, `finish_safari_profile.py`, `pack_safari_release.py`. Fresh browser inputs remain private in this workspace and the existing Worker resource store; no reference dashboard or new hosting site was created. Generated assets, raw demo session responses and private API upload payloads are excluded from source control.

The remaining catalogue is still incomplete; this release is Safari Simba only.
