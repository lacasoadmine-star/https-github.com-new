# Existing Player: construction inventory and native review

The original Player remains `https://play.superwinn.net`. Its existing
`superwin-player` Worker uses the same canonical API, PostgreSQL ledger and
account sessions. MultiHot5 and FoxyHot20 are excluded from this change.

The upcoming-game inventory has 1,000 distinct published official references:
69 retained SmartSoft entries, 438 Relax-distributed titles, 478 Play'n GO titles
and 15 Hacksaw titles. All 1,000 cover images were downloaded and fingerprinted.
References are construction work, not completed games or financial approvals.
Each title retains its own name, official page, demo URL and source fingerprint.

The inventory is searchable and paginated in the existing lobby. Its read-only
API is `/api/game-construction-queue`. It does not add casino definitions to
`/api/config`, invent payouts or enable wagers. Public artwork passes through
the existing `EXPANSION100` asset service without account credentials.

Six current portrait games now use the vertical background images actually
observed in their own official demos, with their own sizing, placement and spin
caption colors. Their scoped canvas uses transparency so these images remain
visible. The ten existing new-game card buttons enter their account page
directly. Existing receipts, model versions, payout rules and server release
decisions remain authoritative.

## Repeat the isolated review

The review needs the recovered existing native model directory. It deliberately
does not contain a database connection or production credentials:

```bash
SMARTSOFT_REVIEW_MODELS=/path/to/remaining20/models \
  node --use-env-proxy tests/smartsoft/local-review.mjs
python tests/smartsoft/browser-playback.py
```

The server binds only `127.0.0.1:8765`, marks the page **LOCAL REVIEW**, uses
temporary simulated money and blocks every outgoing write. It uses the retained
native evaluator for actual test receipts, reel motion, AUTO and sound controls.
It cannot place a real-money wager or change the canonical wallet. The tests
accept only a loopback origin. A successful review does not approve production
rounds or establish the provider's private probability distribution.

Run public, read-only deployed checks with:

```bash
SMARTSOFT_TEST_ORIGIN=https://superwin-player.apdiy61.workers.dev \
  python tests/smartsoft/browser-queue.py
SMARTSOFT_TEST_ORIGIN=https://superwin-player.apdiy61.workers.dev \
  python tests/smartsoft/browser-reference.py
node --test tests/smartsoft/*.test.mjs
```

`browser-reference.py` substitutes isolated account envelopes and rejects writes;
it does not impersonate a real player or place a production round.

## Package within the existing Worker limit

```bash
node deploy/smartsoft/build-player-r15.mjs /tmp/superwin-player-r15
```

The Player package bundles the new wrapper into one entry and minifies only
three previously owned adapters. The publisher verifies the exact old module
hash before replacing each one. It retains every old asset and the original
financial transport. The larger inventory and media metadata reside in the
existing library Worker, preserving its Durable Object export and old routes.

Publish only the content of these two existing Workers through
`publish-content.mjs`, using freshly verified ETags. Preserve every binding,
secret, asset binding, compatibility setting and named export. The source-byte
guard is not the complete Cloudflare size calculation: module names and metadata
also consume space. Do not add large files to the Player or remove old assets.

New ETB starts remain disabled until the missing title rules, bonus behavior,
full reference comparison and release evidence are complete. The 1,000-reference
inventory must never be relabelled as 1,000 implemented, reviewed or live games.
