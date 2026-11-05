# Published local demo

The existing ZPLAY catalog links to `/local-demo` on the same Player host.
This is a separate Superwin test game, not a conversion of third-party games.
The user explicitly starts a session with 1,000 fictional credits. No account
registration, real-wallet transfer, Telebirr call, or provider call is made.

Each browser session has a random, HttpOnly, Secure, SameSite=Strict cookie and
a separate SQLite Durable Object. Rounds update the balance and history in one
synchronous transaction. A repeated round ID cannot settle twice. Sessions
expire after 24 hours and an alarm clears their rows. Maximum stake is 100 credits
and each session permits at most 1,000 rounds. No public demo admin endpoint exists.

`local-wrapper.mjs` delegates all other requests and scheduled events to the
existing Worker. HTMLRewriter adds links to the existing lobby and game detail.
The original seven modules from the actually deployed version
`22f3aab3-6699-4d35-9389-72b00f6596f2` (v281) were preserved byte for byte.
Do not use the legacy script-download endpoint as the source of a live patch:
it can return a newer uploaded version that is not serving traffic after rollback.
Retrieve the active version's modules with the Workers version API.

Production target: `superwin-player.apdiy61.workers.dev`.
Entrypoint: `local-wrapper.mjs`. Added binding: `LOCAL_DEMO_WALLETS`, class
`LocalDemoWallet`. Migration: `local-demo-v1` (`new_sqlite_classes`).
Existing bindings were preserved, with secret bindings inherited rather than read.
The compatibility date remains the existing `2026-10-01`.
The included Wrangler config is for isolated tests, not a complete production config.

```sh
cd cloudflare/local-demo
npm ci
npm test
```

To remove the feature without deleting its namespace, publish a wrapper that
exports `LocalDemoWallet` and delegates all requests to the preserved original
default export. Retain the binding and migration tag. A direct rollback across
a Durable Object migration may be rejected by Cloudflare.
