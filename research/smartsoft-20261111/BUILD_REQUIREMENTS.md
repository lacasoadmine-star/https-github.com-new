# Superwin: 74 official SmartSoft references and live game construction

The user chose every title in the official SmartSoft catalogue. The target is the existing https://superwin-player.apdiy61.workers.dev/ Worker and its current account backend/dashboard. Do not create another website or Worker.

## Required order

1. Finish collecting and saving official references for all 74 games first. Keep them as internal build materials; do not create a reference website, catalogue dashboard or replacement player site.
2. Audit the evidence and document missing elements honestly.
3. Complete the same unfinished game routes already listed in the player website, replacing the generic emoji/template presentation with each game's own observed appearance and controls.
4. Verify and deploy actual game code on the existing Worker. A screenshot or a video playing in a frame is a reference, not an implemented game.

## Per-game evidence

- Official page, official launcher URL, source timestamps, SHA-256 and asset provenance.
- At least 10 genuine screenshots of observable states when the public demo permits it: loaded layout, bets, rules/paytable, settings/sound, history, autoplay options, play/animation, result, mobile and desktop.
- Actual short gameplay recordings. Browser video is silent; capture the genuine audio files separately and record this distinction.
- Symbols and exact symbol identities; backgrounds, colours, typography, art, UI texture/sprite atlases and skeletal animation resources served publicly.
- Reels, row/column count, paylines/ways, visible multipliers, features, transitions, result highlights, response sequences and recovery states.
- Every discoverable control, its visual/DOM/canvas bounds, enabled/disabled states, actual native clicks and observed outcomes. Do not invoke internal game actions to fabricate a response.
- Actual visible rules and paytable, client configuration and bounded genuine network responses. The proprietary server source and exact provider math cannot be inferred from screenshots.

## Live implementation requirements

Use real interactive code and state machines. Buttons must open their own dialogs or trigger their own observed action; animations must respond to round state and recover after interruption. Each title needs its own measured layout and behaviour. Do not present a shared emoji renderer, generic dashboard, static image or looping recording as a finished game. Remove demo wording only from a genuinely implemented account game; official reference demos must remain honestly identified as demos with their own DMO/free credit currency.

## Backend and money

Use the existing authenticated ETB account, canonical wallet and ledger. Preserve balances and history. Verify stake and win in integer minor units, atomic accounting, idempotent requests and history/recovery. Reading the wallet does not prove SPIN is implemented. Do not enable unimplemented models or relabel fake credits as ETB. The new draft Multi Hot 10 engine is independently authored and its math is not the proprietary SmartSoft model.

## Existing resources

- Fresh collection: /workspace/official-game-research-2026-11-11
- Integration scripts: /workspace/superwin-existing-integration
- Cloudflare account: 288bc182291438b87a68193627f36ca0
- Existing Worker: superwin-player
- Fresh dedicated KV: smartsoft-official-reference-20261111 / 361c2fbf17b747ae8b76fb0e9540555a
- Do not publish a reference-library page, reference dashboard or public archive link. The user explicitly rejected these. Store research internally and use it to implement the existing game routes.
- Existing current wallet API: https://zplay-rebuild-api-staging.up.railway.app
- Existing slots backend: https://superwin-nine-slot-engine-staging.up.railway.app
- Existing native backend: https://superwin-native-family-engine-staging.up.railway.app

All source material for this collection must come from the official public demos/pages accessed for this task. Do not reuse the user's previous screenshots, videos, references or old machines as evidence. Reading current routing code to integrate the existing site is permitted by the user's later instructions.

## Accepted existing implementation examples

The user explicitly identified the two correct working NEW machines, MultiHot5 and FoxyHot20, as implementation examples. Inspect their live routing, account integration and control behaviour where useful. Keep their existing working cards/routes intact; do not add duplicate copies. Their screenshots are explanatory examples, not the reference artwork for other titles. Each new game still requires fresh official demo evidence, its own symbols/animations and real code that responds to each control.

## Latest workflow steering

The user subsequently asked to add parallel construction while official demo play/collection continues. Start implementing titles whose own reference evidence is already available, beginning with the new Multi Hot 10 game; keep the complete 74-game collection running. This supersedes the earlier strict collection-before-all-construction sequence. Publish actual game code in the existing Cloudflare Worker routes, with the existing backend engine. Do not publish a separate research website, dashboard or archive link.


## Latest owner steering and implementation checkpoint (12 November 2026, Addis Ababa)

Work in groups of ten, compare the existing live game and its freshly obtained official demo side by side, then continue the next group. Keep actual game construction running while official demo collection continues. Fix STOP, spin timing, button responses, portrait/landscape sizing. Do not create a reference website, archive dashboard, new Worker or screenshot-as-game. Preserve the accepted MultiHot5 and FoxyHot20 games. New game code and authentic assets belong behind the existing game cards and Play Now routes.

Cloudflare current release r24 corrects the stale remaining20 catalogue that rejected nine already-enabled backend models before forwarding. This does not grant access to unauthenticated accounts or change money. Exact deployed model versions, wallet bindings and all other original modules are retained. Nine native games receive a pending-animation STOP fix. Multi Hot 10 now uses actual fresh textures/sound and has tested STOP, retry, bet, history and seven phone/desktop sizes; financial browser flows are isolated fixtures, not real-money tests. Backend private fresh state filters unavailable stakes using its existing locked house row and treats only a definite reserve rejection as no-charge; uncertain responses retain their original retry token.

Active Worker version d34ea3b7-7f0f-443c-a53d-89bb41d1fdea; deployment38642714-d969-4662-aaa7-db253caaae31. Existing LocalDemoWallet namespace35b5522424774086b506e28e8ea3990b is unchanged. A separate NativeGameResources class in the SAME Worker serves only actual game modules/textures/audio; private SQL ingestion avoids the exhausted daily KV write quota. No public ingestion or research viewer exists.

The first ten research/control profiles are multi-hot-20, multi-hot-40, multi-hot-100, multi-hot-5-deluxe, burning-ice-41, blazing-hot-10, burning-ice-40, hab, hot-samba and boca-jamba-10. Native checked rounds and unresolved provider restrictions are recorded individually, not inferred from screenshots/clicks. Rebuilding all74 games is still incomplete; catalogue coverage, evidence completeness and live implementation are separate actual counts.
