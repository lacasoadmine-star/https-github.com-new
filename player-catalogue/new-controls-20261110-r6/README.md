# NEW demo controls r6 — prepared release

This is a presentation-only continuation for the ten catalogue-r3 demos.
The complete live lobby has 15 NEW badges; excluding the protected MultiHot5
and FoxyHot20 leaves 13 current targets. MultiHot40, Balloon and JetX are outside
this narrow r6 release and require their separate current-model review.

No production cash gate, engine, bet schedule, balance, wallet binding, account,
or settled receipt is changed. The existing demo pages remain labeled CREDITS.

## What changes

- Ice10 and Ice40 keep the reviewed r5 portrait menu, collect audio, and terminal
  thaw. The all-frozen Ice40 rendering failure is corrected by preparing its
  normal column image before the thaw replaces the active column sprites.
- The ten existing demo pages receive the tested touch-gesture zoom guard.
  Multi-touch cancels an armed held spin; ordinary single-touch controls and
  browser keyboard zoom keep their existing behavior.
- The three Burning Ice AUTO dialogs receive the verified currency-width CSS.
  Its selectors include the actual stage class, so the runtime's later-loaded
  native dialog stylesheet cannot override the fix.
- Habesha, Wild Ways, 5 Wild and Deluxe play their verified original sound on
  opening idle AUTO settings and explicitly stopping active AUTO. START form
  submission and financial requests are unchanged.
- The existing Ice10/40 startup cover begins below both the Player header and
  the CREDITS banner. Its original logo, prompt and callbacks remain intact.

## Immutable route composition

New client base: `/native-library/remaining20/20261110-new-controls-r6/`.

| New suffix | Affected games | Retained fallback |
| --- | --- | --- |
| `ice/` | Burning Ice 10, Burning Ice 40 | `20261110-ice-controls-r5/` |
| `habesha/` | Habesha Fortune 5 | `20261109-r4-review4/` |
| `modern/` | Multi Hot Wild Ways, Multi Hot 5 Wild | `20261109-r5-seven-review1/` |
| `deluxe/` | Multi Hot Deluxe | `20261109-deluxe-strip-r1/` |

Other ten-subset games keep their current app prefix and receive only the
scoped HTML additions. Deluxe still consumes its exact initial-grid correction.
Habesha's app derives from its own earlier client, not the seven-title client.
Changed app catalogs resolve beside the app with `import.meta.url`; their
unchanged catalog and manifest bodies delegate through the matching family.

The zoom prefix remains `/native-library/remaining20/20261110-new-zoom-r1/`.
The pair startup stylesheet retains its advertised
`/native-library/remaining20/20261110-ice-startup-r1/ice-startup-layout.css` URL;
the thin Player proxy serves its exact bytes from the existing Library.

## Module and release requirements

`manifest.json` contains exact module names, local source paths, byte lengths,
SHA-256 values, response hashes, entry modules, and prerequisite Player modules.
The new Player code is 15,512 bytes across seven modules; the new Library code
is recorded in the manifest across three modules. The Library asset module derives changed
responses from exact retained modules instead of duplicating their large bodies.

At preparation time, Player346 is active again after rollback, latest staged
Player is347, and Library26 retains r5. The new Player entry imports the r5
entry, so **include the exact three `requiredPlayerModules` listed in the
manifest** when staging from the active346 module set. They are unchanged
copies of the already reviewed r5 Player modules.

Library retains `remaining20-ice-controls-assets-r5.mjs`,
`remaining20-review4-assets.mjs`, and `remaining20-r5-seven-assets.mjs`, which the
new asset module imports. `localOnlyRetainedCopies` are support files for local
verification; they are not new deployment modules. Preserve every existing
active module, binding, secret, static asset configuration and exported handler.

This directory does not deploy or change Git. Root owns active-version checks,
staging, deployment, live proof, and rollback.

## Build and evidence

Run:

```bash
node build-r6.mjs
node --experimental-vm-modules verify-r6.mjs
```

Ten grouped checks pass, including exact response hashes; GET/HEAD/ETag behavior;
credential stripping on Library calls; bounded gzip HTML rewriting; original
cookie preservation; protected game and API delegation; and the four actual
app import graphs containing 47, 46, 48 and 48 modules. Catalog lookup and demo
URL adaptation execute through the composed routes. Old immutable prefixes and
Deluxe's corrected initial-grid response stay byte-identical.

The same run includes the 12-case Ice40 regression using the real revealed
32.00 CREDITS receipt at a 2.00 CREDITS stake. It reproduces r5's missing normal
column image and verifies the correction through actual preparation and paint
code with labeled image-decode sentinels. Its receipt remains byte-identical.

Component evidence remains in the adjacent folders: zoom59 Worker and92 browser
checks, original AUTO sound6 checks, legacy currency16 browser cases (override
loaded before and after the original stylesheet, plus four reproduced original
layout collisions), and pair
startup77 checks. The combined r6 verifier is offline; it does not replace the
root live browser check. Reload the previously failing settled Ice40 receipt
first, then verify controls and subsequent CREDITS play, AUTO stop, and the
changed mobile/desktop overlays.
