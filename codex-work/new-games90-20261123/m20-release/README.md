# M20 existing Player release

This adds the canonical `/new-games72/multi-hot-20/` page for frontend identity `zplay72_multi_hot_20_v1`, backed exclusively by existing host game `fresh_multihot20`. All previous Worker handlers and exports remain inherited. The wrapper touches no financial request and changes no server readiness flag.

Build from the repository root:

```sh
ZPLAY_M20_RELEASE_ENABLED=true node codex-work/new-games90-20261123/m20-release/build.mjs new90superwildsr2/entry.mjs /absolute/scratch/output
```

Or call `buildM20Release({activeMainModule,enabled:true,sourceCommit})` and `writeM20Release(output,build)`. The default `enabled:false` delegates every request to the previous Worker. The caller must supply the actual previous main module and coordinate activation.

The three `build.staticFiles` records contain `key`, exact `source`, SHA-256, length and content type. Stage/read back these immutable values through the existing `SSG_OFFICIAL_REFERENCES` KV binding before serving the page. The three small Worker modules use `new90m20r1/`. The 13 image/audio records are the already retained same-game keys under `native72/batch01-20261121-r7/multihot20/assets/`; their expected hashes and lengths are in `build.config.media`. Missing or changed bytes fail closed. The source app and media remain outside the Worker source-size budget.

The existing session cookie authenticates state, SPIN and X2. Only a real accepted server receipt drives reels or balance. TAKE is read-only because this preserved host already credits spin/X2 results. The page shows the server's unavailable state if its approved release is closed. It does not fabricate local credits or override a server gate. A public route is not a full-completion claim.

No publication, KV stage, Worker activation, provider parity or paid live round is claimed by these files. Root deployment orchestration owns those steps and records the real outcome separately.
