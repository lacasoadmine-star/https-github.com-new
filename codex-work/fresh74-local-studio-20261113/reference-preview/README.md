# Fresh 74 local reference studio

A portable, read-only viewer for the newly captured 74-title catalogue. It contains original images, verified silent sampled MP4 exports, observed UI controls, source hashes, and the exact partial/failure states. It does not reconstruct 74 games or connect to the provider.

## Build

Requires Python 3.10+; no third-party package, CDN, font service, or install step.

```sh
python reference-preview/build-preview.py \
  --manifest /path/to/fresh-run/manifest-74.json \
  --evidence-root /path/to/fresh-run \
  --output /path/to/local-app/reference-preview \
  --study-link ../reel-study/index.html
```

The optional study link opens a separately labelled local reel animation prototype when that sibling folder has been packaged. Omit the option if it is unavailable. The builder copies only media referenced by this run's manifest; it preserves original bytes and verifies recorded SHA-256 values. If the complete evidence folder has moved, it remaps only the exact `evidenceRoot` prefix declared in the manifest. It rejects other paths or symlinks outside the chosen evidence root. Missing files are reported without removing their catalogue titles. Existing source captures are never edited.

The build writes `catalogue-data.js` as well as `catalogue.json`. This makes the complete catalogue available without `fetch`, which is often blocked for local files. `media-integrity.json` records the copied originals and checksums. `--hardlink-media` is an optional workspace optimization; ordinary copies are the default.

## Open without a server

Open `local-app/reference-preview/index.html` directly in a browser. Search, filters, original image galleries, captured control observations, checkpoint download, and local MP4 playback use only packaged files. Keep the complete folder together. A missing media file displays an explicit unavailable state; it cannot erase the catalogue.

The viewer never requests a provider demo URL. Its content policy allows packaged resources and same-origin local API calls only. There are no accounts, wallet, wagers, credentials, payments, live provider sessions, or synthetic sound.

## Optional local server

```sh
python reference-preview/server.py --root /path/to/local-app --port 8740
```

Open `http://127.0.0.1:8740/`. The server binds only to loopback. It serves the portable bundle and these read-only endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/catalogue` | The packaged 74-title snapshot |
| `GET /api/progress` | Counts, snapshot identity, and incomplete titles that remain retryable |
| `GET /api/checkpoint` | The same read-only checkpoint view |
| `GET /api/retry-queue` | All incomplete titles in catalogue order; browser-local queue storage is identified explicitly |
| `GET /api/health` | Local read-only readiness with snapshot identity |

POST/PUT/PATCH/DELETE are rejected. Byte ranges support seeking in local MP4 files. Traversal, outside symlinks, non-loopback Host headers and foreign Origin headers are rejected. The server is for local use and has no provider client. Stop it with Ctrl+C. If the progress endpoint fails, the already loaded catalogue stays on screen; opening `index.html` directly provides file mode without depending on the server for media.

## Sequential retry queue

**Every incomplete reference remains retryable.** Clear scenes, partial scenes and failed loads are all included. `needsRetry` counts all incomplete entries; `failedScenes` counts the separate subset whose scene failed. A prior attempt or an available one-minute sample clip never removes a title from the retry list.

`retry-queue.js` keeps the exact catalogue sequence, source statuses, current cursor and queue-control events. The browser saves a checkpoint locally after each queue action. If a saved entry was active when the page closed, restore marks that same entry interrupted and resumes it rather than moving past it. Save checkpoint downloads the current queue; Restore checkpoint accepts either that download or a standalone queue checkpoint. If browser storage is unavailable, file export/import still provides a resume path.

The default permits three transient network retry slots after the initial recorded failure, with 1 s, 3 s and 10 s eligibility delays. The fourth recorded failure defers the title and advances to the next catalogue position. The deferred title remains incomplete and is included in a later pass. Access-block observations pause for manual review; they cannot automatically advance or authorize provider access.

Activating a position, recording a network observation, or advancing the cursor is **bookkeeping only**. These operations make no provider request, verify no live retry, and never change source completion flags. The interface always reports zero new captures verified by the queue. A finished queue pass does not imply that any capture became complete. The initial server retry order is read-only; the user's active queue checkpoint remains in their browser or downloaded file.

## How to interpret the evidence

- Card posters prefer the separately reviewed original poster; they do not automatically treat a loading screen as successful gameplay.
- A saved image count includes real loaders, menus, errors, and selected motion frames. It is not a count of verified gameplay views.
- Silent MP4s hold actual screenshot samples at their recorded timestamps. Unknown pixels between samples are not generated. Inter-segment gaps are cut and listed; no sample is stretched to meet a 60-second target.
- The viewer shows the sum of actual sampled segment spans, not recorder wall-clock duration. A full minute of active play remains unverified.
- Original audio and continuous native video are unavailable in this run. The source exporter's audio-stream count must be zero before a silent clip is packaged.
- Recorded control buttons show the closest unambiguous later saved frame within 30 seconds. They do not claim an exact causal response or execute the original game. Optional touch markers use recorded viewport coordinates only on that associated later frame; they are not overlaid on unrelated gallery images. Original capture images remain unchanged.
- All incomplete titles remain in the exported retry checkpoint, including titles with clips longer than one minute. Retry readiness is not success.

## Verification

```sh
python reference-preview/test_preview.py
node --test reference-preview/core.test.cjs reference-preview/retry-queue.test.cjs
node --check reference-preview/app.js
```

Tests cover fresh-run containment and relocation, the exact parsed manifest snapshot identity, changed bytes during copying, lost files, duplicate inventory, false audio flags, read-only progress, parent-directory routing, byte-range playback, path traversal, wrong Host/Origin, ambiguous event timing and safe media URLs. The retry regression includes 59 clear scenes plus two partial renders plus 13 failed scenes: all 74 remain in the ordered queue. Additional checks exercise next through title 74, interrupted resume, bounded network observations, access-block pause, malformed checkpoints and false live-capture claims. Test images are disposable fixtures, never part of the official reference bundle.

The browser UI should additionally be checked in both HTTP mode and direct file mode, including search, a successful scene, a failed title, recorded controls, and silent playback. No public deployment is required.
