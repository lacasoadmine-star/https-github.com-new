# Habesha mobile code and HTTP checkpoint

The existing live route returns HTTP 200 with Habesha r7. This checkpoint prepares Habesha r9 and shared r1 (20 November) for that same Worker route. Publication has **not** occurred: the connected Cloudflare app returned `oauth_token_invalid_grant`. No game is marked DONE on the basis of the older live page.

The shared controller ignores superseded balance requests and their session failures. Single-game packaging selects only Habesha and shared dependencies; Deluxe and the two protected original games are not selected. The original model and existing `/api/slots/*` wallet endpoints are retained. No backend, wallet, database, dashboard, Worker, or desktop layout was created.

The official demo launcher was fetched by HTTP and identified as HabeshaFortune5. No browser or new screenshots were used. Existing title artwork is served by code-driven reels and controls. Code and HTTP verification does not establish visual parity.

From `codex-work/native72-20261119`:

```sh
node qa/restore-dedicated-inputs.mjs --game habesha --out /tmp/habesha-baseline
node qa/build-dedicated-packages.mjs --game habesha --release zplay-native-machines-20261120-habesha-r9 --shared-release zplay-native-shared-20261120-r1 --baseline /tmp/habesha-baseline --out /tmp/habesha-r9
node changes/dedicated-resume/deployment/build-pins.mjs /tmp/habesha-r9 /tmp/habesha-r9/worker
DEDICATED_QA_STAGE=/tmp/habesha-r9 node --test qa/package-http-smoke.test.mjs
```

The HTTP test starts only an isolated Node HTTP fixture server. It does not start a browser. All test balances and rounds remain in memory, and retries must preserve the same idempotency token.

Before a live upload, read the current Worker version and preserve its exact modules, bindings, existing routes and rollback version. The stored module inventory names the historical v457 baseline; it is not authority to replace a newer deployment. After deployment, require the candidate release header, exact manifest hashes, valid HTML/JSON, and HTTP 200. The next target in the preserved catalog order is Multi Hot 40, target 2 (lobby position 3).
