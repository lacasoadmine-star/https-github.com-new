# Local reference studio — implementation

This isolated feature directory contains the offline viewer, read-only local server, independent reel study, tests and generic export/packaging utilities. The original repository applications are unchanged.

## Reference viewer

The viewer accepts a separately supplied 74-entry evidence manifest. It packages original images and verified silent sampled clips under content hashes, exposes search, filters, image galleries and recorded-control observations, and retains missing/failed states. A JavaScript data snapshot makes the catalogue available when opened directly from disk.

See `reference-preview/README.md` for build commands, interpretation rules and regression checks. The optional Python server binds only to loopback, supports ranged video reads and read-only catalogue/progress endpoints, and performs no provider requests.

The sequential retry queue includes every incomplete title, keeps failed scenes as a separate count, persists its current position, resumes an interrupted title and bounds transient retry observations. Queue controls are bookkeeping only: they never claim a new live capture or change source completion flags.

## Independent reel study

`reel-study/` contains local SPIN/STOP/autoplay interaction code and a tested state engine. Source images, symbol regions and original-source hashes are supplied separately in the private local distribution. It does not implement provider payout mathematics or claim equivalent original game mechanics. No accounts, wallet, financial state or audio are imported.

The standalone helper can combine a fully built local study and its supplied image metadata into one offline HTML file. See its README.

## Data boundary

Capture records, reviewed poster metadata, source-path indexes, live catalogue evidence and original media are intentionally absent from this source branch. The runnable local delivery contains the appropriate input data. Tools that embed specific capture filenames or report individual capture findings are also retained with the local work rather than published here.

Generic utilities included here are `assemble-sampled-clips.py`, `export-final-captures.py` and `package-evidence.py`. The first preserves within-segment screenshot sample timestamps and explicitly accounts for gaps; it does not create audio or native video. The packaging utility preserves original bytes and creates integrity records for the chosen input folder.

## Verification and limits

```sh
python3 reference-preview/test_preview.py
node --test reference-preview/core.test.cjs reference-preview/retry-queue.test.cjs
node --test reel-study/engine.test.cjs
```

The checks exercise source containment, copied-byte identity, snapshot consistency, missing media, retry preservation, read-only API behavior, parent-directory routing, video ranges, event timing, and reel state transitions. Browser visual verification was unavailable in the working environment because local file navigation and browser launch encountered environment restrictions. No deployment is performed by these tools.
