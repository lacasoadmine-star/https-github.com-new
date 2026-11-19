# Habesha and Player presentation source

This source snapshot contains the Habesha game presentation, the Player lobby interface, shared browser dependencies, session adapters and focused regression tests. Product source and artwork bytes are retained from the reviewed working snapshots.

## Source layout

- `changes/habesha-r5/assets/` contains the main Habesha presentation and lifecycle work: receipt-driven balance display, continuous reel motion, focus-aware audio, startup, controls, help and gamble presentation.
- `changes/habesha-r6/assets/` refines original artwork placement, cabinet proportions, symbols and menu layout.
- `changes/habesha-r7/assets/` contains the later help stylesheet adjustment. Apply this stylesheet over the earlier Habesha presentation when reconstructing that source version.
- `changes/lobby-play-now/` contains the Player interface changes and baseline browser code used for comparison. The lobby opens the existing Player game routes through Play Now.
- `live-frontend/` contains the shared browser audio, motion, artwork and model dependencies used by these sources.
- `current-worker/` and `railway-recovery/` contain selected ordinary request/session/model implementation and regression source. Test tokens, balances and fixture secrets are synthetic.

## Test scope

The retained tests cover presentation timing, focus handling, preview-only bet changes, payout calculations, session changes and lobby behavior. This source snapshot is not a complete standalone production checkout. Avoid wildcard test runs: help-paytable, session-controller, catalog-routing and the r6 geometry/help-visual/portrait-native suites require fixtures, manifests or runtime inputs from the separate local development workspace.

The following self-contained subset passed all 48 checks when run from this snapshot's root:

```bash
node --experimental-vm-modules --test \
  changes/habesha-r5/tests/focus-lifecycle.test.mjs \
  changes/habesha-r5/tests/audio-settings.test.mjs \
  changes/habesha-r5/tests/gamble-navigation.test.mjs \
  changes/habesha-r5/tests/startup-ownership.test.mjs \
  changes/habesha-r5/tests/startup-flow.test.mjs \
  changes/habesha-r5/tests/gamble-presentation.test.mjs \
  changes/habesha-r6/tests/presentation.test.mjs
```

Runtime asset manifests inside the asset directories describe the artwork and audio consumed by the browser. Production configuration, operational records and account information are maintained separately. This source snapshot does not certify authenticated wallet transactions or completed live-game acceptance.
