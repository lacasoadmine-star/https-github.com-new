The nine account and credits-demo pages now use a scoped native shell from
first paint. The generic title, feature strip and cabinet no longer appear
when native artwork is loading or recovering. Canvas layout has an explicit
width and height before the legacy renderer runs; this avoids a zero-width
scene growing to an invalid height. Collection controls remain accessible
after the retained frame transitions from idle to a winning round.

Demo pages now load the repaired R21 app modules and the matching presentation
descriptor for the same game version. Their currency, stakes, financial rules
and API namespace remain credits-only. The HTML response preserves the demo
session cookie; public asset responses contain no cookies.

Build with `node deploy/smartsoft/build-native-shell-r22.mjs deploy/smartsoft`.
The resulting entry wraps the exact `runtime-player-entry-r21.mjs` already
retained in the existing Worker. It is a content update to that Worker, not a
standalone replacement of the financial service. The new CSS and script are
gzip resources with SHA-256 integrity checks.

The Worker size limit required removing three obsolete November 8 modules.
`unreachablePrune` permits only those exact names and proves that none is
reachable from the new entry, including its entire retained import graph.
No reachable module was removed. Worker bindings, settings and financial
modules retained their prior fingerprints.

Verification is recorded in `release-status-r22.json`: 54 native evaluator
rounds across nine account controllers, 27 local credits-demo rounds, and 27
deployed credits-demo rounds with stakes 1, 2 and 5. Each round sampled actual
canvas movement, completed without pressing Stop, and matched its balance
receipt. All nine also fit portrait and landscape and expose working menus,
sound, music, turbo, rules, history and revocable autoplay. Nine official free
demos were opened and played; screenshots cover the sampled layouts only.

The known-win regression fixture additionally exercises collection followed
by another spin and red/black collection without creating a new debit. Run
the loopback fixture with `SMARTSOFT_REVIEW_WIN_SEEDS` pointing to
`tests/smartsoft/fixtures/win-seeds-r22.json`, then run
`browser-wins-r22.py` against its loopback origin. These deterministic seeds
are test inputs to the retained native evaluator, not production controls or
claims about provider probabilities.

The production browser pass uses only `/demo/games/` and rejects every write
outside `/api/remaining20/demo/action`. It does not place player-account bets.
Unobserved bonuses and provider-private probability models remain unverified.
