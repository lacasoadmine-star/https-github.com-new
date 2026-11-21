# Public reference evidence bundle

The eight files `public-references-20261121.zip.part-001` through `.part-008`
preserve the exact bytes of a ZIP containing **65 public official-demo reference
and recorded static-QA images**. Each part is at most 512 KiB. The canonical
Deluxe seven-round video and 16 separately published images remain individual
files. `index.json` lists every included image's original repository path, byte
size, SHA-256 and Git blob SHA, together with every ordered part's size and hash
and the reconstructed archive's size and hash. The deterministic ZIP uses
`ZIP_STORED`, fixed timestamps and regular-file modes.

## Explicitly unpublished evidence

Two history panels are preserved privately and **excluded from the public tree**:

- `games/roll-x/evidence/2026-11-21/my-bets-history.jpg`
- `games/multi-hot-5-deluxe/evidence/2026-11-21/history-current-seven.png`

The full original paths, byte sizes, SHA-256 digests and reasons are in
`index.json` under `publicOmissions`; each game's evidence index also declares
its withheld file under `unpublishedFiles`. These files are not restored by this
utility and are not claimed to be available in the checkout. The original local
images are unchanged. The superseded archive containing history imagery is not
published. All seven canonical round-result images for each captured game remain
available with unchanged hashes. No additional round or replacement evidence
has been invented. Image names, capture metadata and action-log purposes were
reviewed; the 83 source images contained no EXIF/comment metadata.

## Restore the included images

```sh
python3 codex-work/new-games72-20261121/evidence-bundle/materialize.py --root .
```

The standard-library-only utility verifies every ordered part and reconstructs
the ZIP in memory; no complete ZIP is required in the checkout. It verifies the
archive digest, exact member set and every image hash before writing. Only
indexed reference and static-QA image paths are accepted. History/account image
names, traversal and symbolic-link destinations are rejected. If any existing
destination has different contents, no files are written. Identical files are
retained, and new files receive an exact byte readback. Repeating the command
produces zero writes when all 65 images already match. Use `--verify-only` to
validate without creating missing files.

The feature-branch QA workflow restores the included evidence before Node tests
and runs these integrity tests:

```sh
python3 -m unittest discover -s codex-work/new-games72-20261121/evidence-bundle -p test_materialize.py -v
```

`verification.json` records the actual isolated round trip, byte comparison of
all 65 included images and the twelve packaging tests. It also verifies that the
two unpublished paths are not created. These checks establish preservation of
the included evidence; they do not establish gameplay, sound, controls or live
release readiness. No runtime imports these reference images or uses them as
playable rounds. Existing game and release requirements remain in force.
