# Dedicated release recovery checkpoint

This directory stores exact release manifests, original served HTML, normalized baseline dependency metadata and source hashes. It does not store media bytes. The reviewed source is retained under `changes/dedicated-resume/`; unchanged media retain explicit content-addressed KV keys and SHA-256 values.

`checkpoint.json` is produced only when every source file still matches the staged package. The archival command fails if source changed after staging. Rerun it after the final package build, before committing the recovery checkpoint:

```bash
node qa/build-dedicated-packages.mjs
node qa/archive-dedicated-checkpoint.mjs
node changes/dedicated-resume/deployment/build-pins.mjs /workspace/scratch/9a8b0ddfa7e7/local-qa-built
```

The manifests and pins describe a candidate until deployment is independently confirmed. Preserve the deployed version identifier and verification results in the release notes; a manifest file alone does not prove deployment.

## Rebuild after local scratch data is lost

Restore only the baseline media and model files reachable from the dedicated releases. Public GETs use the frozen original release prefixes; every result must be HTTP 200 with the recorded byte length and SHA-256. A failure stops recovery and is never replaced by a placeholder.

```bash
node qa/restore-dedicated-inputs.mjs --out /absolute/path/restored-baseline
node qa/build-dedicated-packages.mjs --baseline /absolute/path/restored-baseline --out /absolute/path/rebuilt-release
DEDICATED_QA_STAGE=/absolute/path/rebuilt-release node --test qa/package-http-smoke.test.mjs qa/deluxe-style-integration.test.mjs
```

An existing verified baseline can be reused without network access:

```bash
node qa/restore-dedicated-inputs.mjs --reuse /absolute/path/existing-baseline --out /absolute/path/restored-baseline
```

Compare the three rebuilt manifest SHA-256 values with `checkpoint.json`. The source files, original HTML, baseline hashes, explicit KV keys, content types, dependency edges and deterministic JSON serialization are all retained. The builder checks that each game’s math model still exactly matches its baseline. Unchanged assets do not need another KV upload.

## Verification scope

`qa/package-http-smoke.test.mjs` starts a local HTTP fixture server and its client in the same process tree. It verifies all manifest asset bytes, entry-page dependencies, synthetic receipts, replay, rejected requests, interrupted responses and session expiry. It makes no production requests and does not test browser rendering. `qa/deluxe-style-integration.test.mjs` verifies known CSS cascade conflicts and viewport arithmetic; it is also not a rendered screenshot test.

The checkpoint contains no account credentials, signed URLs or customer transactions. It does not replace the retained upstream Worker modules or authorize deploying an incomplete Worker.
