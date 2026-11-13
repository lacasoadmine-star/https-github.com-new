# Local reel interaction study

This is an independent local visual prototype with SPIN, STOP, bounded autoplay, title switching and keyboard controls. It uses separately supplied original screenshot regions; it does not reproduce provider game mathematics, live financial state or original sound.

## Supplied assets

The runnable local distribution supplies `sources.json`, `sources.js` and the `assets/` folder. These evidence and provenance files are intentionally absent from the public source branch. Keep `index.html`, `style.css`, `engine.js` and `app.js` beside the matching supplied data files to run the study.

`sources.js` defines `window.FRESH_REEL_SOURCES`. The metadata identifies source images, image hashes, observed starting symbol columns and rectangle regions. The renderer reads those regions without requiring a provider request.

## Standalone HTML

Given the fully built local study, create a single offline HTML file with:

```sh
python3 reel-study/build-standalone.py --root /path/to/built/reel-study --output /path/to/study.html
```

The helper validates the supplied image hashes before embedding data and generates CSP hashes for its included code and style. It performs no upload.

## State tests

```sh
node --test reel-study/engine.test.cjs
```

These tests cover input deduplication, stopping running and waiting autoplay, finite round counts, disposal on title changes, integer symbol landings and invalid inputs. Motion timing is authored for the local study and is not verified as equivalent to provider timing. The working environment did not permit browser visual QA; the state tests do not substitute for that check.
