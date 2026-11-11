# Official SmartSoft game research for existing Superwin machines

This is an internal construction workflow for the games already listed in the existing player. It does not create a reference website, dashboard, public archive or replacement player.

The owner selected all 74 titles from the official SmartSoft catalogue and identified the working NEW MultiHot5 and FoxyHot20 machines as examples of the expected result. Each unfinished game must use its own freshly observed symbols, art, controls, sound, animations and response sequence. A screenshot, embedded demo or looping recording is not an implemented game.

## Collection

Install Python Playwright and use a locally available Chromium and ffmpeg. Each title gets a fresh isolated context and browser process; only publicly served official demo resources are recorded. No existing player profile, real-money account, user recordings or previous game-reference files are used.

```sh
python tools/collect_official.py
python tools/capture_demos.py --concurrency 1
python tools/build_specs.py
```

The collector records native clicks, screenshots, silent gameplay video, genuine separate audio resources, public client configuration, network provenance and hashes. `catalogues/groups.json` describes the 13 evidence groups. The per-game construction specifications describe observed controls and unresolved evidence. Provider restrictions and partial captures remain explicitly marked.

The source and capture directories are excluded from Git. Store the full research privately as construction materials. Public metadata or screenshots alone are not evidence that a game or wallet settlement is implemented.

## Construction and integration

Finish the official collection first. Then build real state-driven game components in the existing routes and preserve the working MultiHot5/FoxyHot20 machines. Replace the generic emoji/template renderer with each title’s measured UI and working controls. Integrate with the existing authenticated backend, wallet and history; preserve financial records, atomic accounting, exact minor units, idempotency and recovery. Keep unfinished models disabled. Provider server code and proprietary math are not recovered from public visual demos.
