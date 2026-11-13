# Complete-catalogue media acquisition

Run from the repository root:

```sh
python workers/superwin-player/special74/tools/fetch-all-media.py --workers 12
```

The downloader covers the entire `selected-games.json` catalogue in one bounded
parallel queue. It reads public media URLs from archived observations, including
new batch sessions, and follows explicit texture references in atlas/JSON files.
It never downloads provider JavaScript, WebAssembly, account data or financial
API responses. A public source returning 404 stays unresolved; an arbitrary
substitute is never created.

Original bytes are retained in ignored `special74/assets/observed/` paths. The
committed `all74-media-manifest.json` records source URLs, SHA-256 checksums,
sizes, detected media types, per-game associations and evidence paths. It can
restore the files on the next run. Downloads are atomic. A local checkpoint
journal preserves completed files between manifest checkpoints, and a resumed
run re-verifies each hash before reusing a file. Damaged local files are fetched
again and must match the already pinned hash.
Intermediate manifests retain earlier, not-yet-reverified hashes in
`unverifiedPins`, so recovery does not depend on the ignored local journal.
These pins do not count toward the run's verified-media totals.

When `archive-media-recovery.json` is present, media recovered from the existing
Superwin KV archive can also be verified and ingested. Each asset must carry the
original source URL, archive SHA-256, archive member path and capture-manifest
evidence. A differently named archived asset is recorded as a separate source;
it does not turn a failed URL into a successful download.

`all74-media-status.json` distinguishes shared launcher/font resources from
game-specific media. Download coverage is limited to resources actually observed
or declared by those resources. It is not evidence that every game feature was
visited, that all lazy-loaded sounds were triggered, or that a playable game was
built. Gameplay and release readiness remain in their separate evidence reports.

The provider serves some PNG images from `.webp` URLs and one observed WAV sound
from an `.mp3` URL. These files keep their exact source bytes and detected MIME;
they are not re-encoded or replaced. Invalid HTML/error bodies are rejected.

Targeted verification:

```sh
python -m unittest discover -s workers/superwin-player/special74/tests -p 'test_all_media.py' -v
```

For offline raster integrity and audio/video stream checks, with Pillow and
`ffprobe` installed:

```sh
python workers/superwin-player/special74/tools/verify-media-integrity.py
```

This writes `all74-media-integrity.json`, tied to the exact media-manifest hash.
It rechecks local file hashes on every run and reuses decoder checks only for
unchanged source/hash pairs. `all74-media-resolution-plan.json` lists known
missing sources that builders must not introduce as rendering dependencies.
No texture aliases were fabricated when exact recorded alternatives were absent.
