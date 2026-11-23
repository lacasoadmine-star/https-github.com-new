# Player v472 — verified Cloudflare deployment (23 November 2026)

This is an exact operational checkpoint, not a claim of 90 live games or live authenticated ETB spins.

- Existing Worker URL: https://superwin-player.apdiy61.workers.dev/
- Active Worker version: **472** (`8eca6097-07b7-427b-acb9-8c9a13d4eb6f`), **100% traffic**.
- Deployment ID: `b8e9dbf8-b496-49d4-b85e-b8e103fc833e`, activated 2026-11-23T02:00:00.549314Z.
- Rollback: previous active v471 `e24b63fe-c020-4ed3-85f3-cb500c0bf255`.
- Current main module: `new90m20r1/entry.mjs`; 425 modules and 18 existing bindings. The original Durable Object migration tag remains `local-demo-v1`.
- This release retains 417 of v471's 419 modules byte-for-byte, modifies only the requested90 stored-catalogue worker/descriptor and appends six game-page modules. Total Worker source 66,950,468 bytes (down 11,616 bytes from v471). Configuration including exports/bindings remained unchanged.
- The r2 catalogue config is externally stored under `SSG_OFFICIAL_REFERENCES` at `new90/catalogue/941b93e5620fadbe08a41f54/config.json`; its record metadata was confirmed.
- New same-site routes in the active entry chain: `/new-games72/multi-hot-5-super-wilds/` and `/new-games72/multi-hot-20/`. Version-pinned Super Wilds JS/CSS and Multi Hot 20 app/CSS/manifest plus 13 PNG/MP3 media values already exist in the **existing** KV namespace. The Worker serves them with exact SHA-256/byte-length verification, not by replaying uploaded screenshots/videos.
- The existing financial gate is not overridden, sessions/wallet/ledger are not reset and no live player spin or balance mutation was performed. Source and isolated tests are not live ETB acceptance. Both games require authenticated live PLAY/control/audio/ETB settlement verification before being tagged **LIVE VERIFIED**; NEW90's readiness count is not advanced without actual proof.
- External direct access to `*.apdiy61.workers.dev` through this execution environment was denied by network policy. Deployment/version/traffic were verified via authorized Cloudflare API, not an end-to-end browser interaction.

**Next concrete work:** verify the already prepared Multi Hot 20 existing-server runtime release on Railway using the expected actual health/release identities, then authenticated Player test session and financial idempotency proof; finish Super Wilds integration and official-demo parity, and progress remaining exact90 in coordinated groups. Preserve existing MultiHot5, FoxyHot20 and HabeshaFortune5 without counting them as new.
