# M20 presentation update

The app/CSS build can update the existing owned M20 layer without appending another wrapper. This preserves its original entry, the current global main module, every other module, all runtime settings and every old immutable resource key. It does not change account, wallet, mathematical model or financial handlers.

`createM20PresentationPlan({build, baseline, deploymentId})` prepares a source-commit-labelled plan. Build with the deployed M20 layer's original parent (`new90m20r1/entry.mjs`), original native `previousAppPath` from its config, and the currently linked old stylesheet. The build's emitted entry must hash exactly like the retained `requested82m20r1/entry.mjs`. Only its new config and worker bodies are mapped to the same existing names. Supply the exact published source commit and independently verify the source/build inputs before external use.

The baseline is an independent current readback: `id`, `number`, `mainModule`, `moduleCount`, `totalBytes`, `configurationSha256`, `inventorySha256`, `entrySha256`, the two `ownedPins`, `baselineRevision`, `previousAppPath` and `previousStylePath`. Inventory records use the field order `{name, bytes, sha256, contentType}`, sorted by codepoint name before JSON serialization and SHA-256. The configuration hash uses the same canonical settings fields as the retained M100 presentation helper; migration is separately required to remain `local-demo-v1`.

The self-contained `stageM20PresentationUpdate` runs only inside the authorized Cloudflare connector. It rechecks the current 100% deployment, latest version, complete inventory and runtime settings. It reads and hashes both already-uploaded app/CSS KV values. Missing/corrupt bytes, stale versions, unrelated targets, changed hashes or projected module bytes above the previously accepted 66,968,590-byte size reject before PATCH. It changes only two owned module bodies with `deploy:false`; it never uploads KV content or activates traffic.

A successful stage still requires a fresh full staged readback, compatible runtime/settings comparison and separate authorized activation and live checks. Source publication, this helper and isolated tests do not establish a deployed game or authenticated gameplay acceptance.

```sh
node --test codex-work/requested20-20261126/multi-hot-20/release/presentation-update.test.mjs
```
