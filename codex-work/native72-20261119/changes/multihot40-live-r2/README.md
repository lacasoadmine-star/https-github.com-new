# Multi Hot 40 mobile release candidate

Catalog target 2 is Multi Hot 40. The existing Player route is `/games/multihot40_native`. Its live HTML and the official demo launcher returned HTTP 200. The live expansion state returned the expected HTTP 401 without a Player session. The static game profile declares 40 paylines and `launchable: false`. Enablement and the accepted wager profile must be verified from the authenticated service state.

Release `zplay-multihot40-20261120-r3` keeps the existing Player session, wager model and settlement endpoints. The title-specific package updates phone touch areas, focus-aware audio and autoplay, reel reveal timing, and the spin reset on a rejected request. The bundled page labels the autoplay confirmation `START PLAY`.

After producing the Habesha r9 stage described in `releases/20261120-habesha-http/README.md`, build the next release from a separate copy of that stage. Run from `codex-work/native72-20261119`:

```sh
curl -fsS https://superwin-player.apdiy61.workers.dev/games/multihot40_native -o /tmp/multihot40-live.html
cp -a /tmp/habesha-r9 /tmp/habesha-multihot40-r3
node changes/multihot40-live-r2/stage-release.mjs /tmp/habesha-multihot40-r3 /tmp/multihot40-live.html
node changes/dedicated-resume/deployment/build-pins.mjs /tmp/habesha-multihot40-r3 /tmp/habesha-multihot40-r3/worker
MULTIHOT40_QA_STAGE=/tmp/habesha-multihot40-r3 node --test changes/multihot40-live-r2/multihot40-live-r2.test.mjs
```

Deploy Habesha first and verify it using `qa/verify-live-packages.py`. Fetch the active Worker content again before preparing the Multi Hot 40 upload. The second inventory records the required live Habesha release and uses `native72dedicatedmh40r3/`, so the uploaded multipart can preserve every module from the first deployment. Keep the active version ID for rollback. After promotion, verify both routes from the second stage. `--launch-only` checks page releases and bootstraps before verifying every asset.

The page baselines and new assets are pinned by SHA-256. The candidate has not been published. The existing official demo response gives the launcher identity only. Interactive visual parity and authenticated live settlement remain unverified.

After Multi Hot 40 r3 is live and verified, use the same stage to prepare Safari Simba:

```sh
node changes/safari-r4/stage-release.mjs /tmp/habesha-multihot40-r3
node changes/dedicated-resume/deployment/build-pins.mjs /tmp/habesha-multihot40-r3 /tmp/habesha-multihot40-r3/safari-worker
node --test changes/safari-r4/release.test.mjs
```

Before Safari promotion, verify the active Multi Hot 40 entry point, retain its version ID for rollback, and verify the Safari manifest's inherited KV values and public dependencies. The Safari entry delegates to the active Multi Hot 40 wrapper, including Habesha and the existing Player APIs. After promotion, verify both Safari route spellings and the pinned stylesheet at `/new74/037-safari-simba/style.css`.
