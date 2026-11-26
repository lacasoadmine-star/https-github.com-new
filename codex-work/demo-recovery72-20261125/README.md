# SmartSoft demo reference recovery — 25 November 2026

The user requested recovery of the failed Cricket X, Vampires and Samurai demos,
continued independent work, and preservation of their exact current 72-title list.
This change repairs reference tooling and records fresh browser outcomes. It does
not introduce new self-hosted game implementations or a production deployment.

## Observed outcomes

| Game | Fresh browser result | Evidence scope |
| --- | --- | --- |
| Cricket X | Official DMO game opened; two settled 5.00 DMO rounds appeared in MY BETS | 2 manual rounds, no successful cash-out validation |
| Vampires | Official DMO game opened; 10-round AUTOPLAY completed; all ten appeared in BET HISTORY | 10 automatic rounds, 0.50 DMO total bet, 0.20 DMO total win |
| Samurai | Official launcher returned an embedded Runtime Error, including after one reload | Outer document HTTP 200; embedded HTTP status unmeasured; no rounds |
| Multi Hot 10 | Repaired exact public launcher rendered the branded game, grid, controls and DMO balance | Interface observed; no rounds |
| Book of Bonanza | Repaired exact public launcher rendered the branded game, grid, controls and DMO balance | Interface observed; no rounds |
| Wheel Of Destiny | Repaired launcher reached HTTP 200, but stayed at the SmartSoft loader after one reload | `CanvasRenderer is not yet implemented`; no visible playable interface or rounds |
| Bottle Mania | Exact lowercase launcher path reached HTTP 200, but stayed at the SmartSoft loader after one reload | `CanvasRenderer is not yet implemented`; no visible playable interface or rounds |

The user-facing date uses America/Los_Angeles. Machine records retain UTC dates,
which are 26 November during this session. Provider interface clocks use their own
zone and are not substituted for the recording timestamp.

`observations.json` records the exact scope and limitations. Current Samurai
failure belongs to SmartSoft's `/SlotsDemo` application. This repository cannot
repair that provider's application. The official Samurai identity remains
`GameName=Samurai` on `/games/samurai-deluxe`; no alternate path or variant is
invented. Other products continue independently.

Wheel Of Destiny and Bottle Mania expose game DOM elements behind the loader,
but that does not demonstrate a usable interface. Both emit the renderer exception
above in this browser. The cause has not been isolated between provider code and
browser compatibility; changing a reference URL cannot repair that renderer.

## Implemented repairs

`tools/smartsoft_demo_references.py` resolves current official product-page
anchors by exact provider game name and category. It preserves the original
href, records deterministic repairs, and returns a separate navigation URL.

| Observed source issue | Repair |
| --- | --- |
| Cricket X and Vampires published HTTP links | Use verified HTTPS transport on the exact official public launcher host |
| Multi Hot 10 Google redirect wrapper | Extract and validate its one-level `q` destination; no request to Google |
| Book of Bonanza missing URL scheme | Add HTTPS only to the exact observed provider hostname/path |
| Wheel Of Destiny malformed `ReturnUrl=http://google.com5` | Replace only that exact value for that exact game with its validated official product page |
| Bottle Mania lowercase `loader.aspx` | Accept and preserve the additional observed literal path |

Missing GameCategory and explicitly blank GameCategory remain different values.
GameName is never synthesized from a marketing title. For example Double X uses
SlicerX and AviaStar uses JetX3 in the current official links.

The older source survey now accepts validated HTTP and HTTPS official references,
selects the exact current product-page link, and never selects an unrelated game
or silently falls back to stale catalog data. Its historical requested queue is
preserved; the current 72-title input is a separate file here.

The browser audit now reports launcher HTTP status, document response statuses,
embedded runtime errors, renderer initialization errors, region/access failures
and interface observation separately. The observed CanvasRenderer exception
produces `render_error` even when controls exist behind the loader, and stops
optional demo clicks. Only its fixed diagnostic code is retained, without raw
exception text or stacks. Cricket's observed frame is diagnostic-only: its route does not
authorize automated wagers. Existing demo-only SPIN controls keep their owning
frame and per-action checks. Query tokens, page titles, response bodies and
credentials are not exported by the diagnostic logger. HTTP 200 or a canvas does
not set playableVerified or liveVerified.

## Current list and reproduction

`requested72.json` contains the exact supplied 72 names and their observed
provider identities. `reference-reconciliation.json` records 75 current catalog
cards, 71 exact requested-title matches, and one edition requiring review:
JetX currently points to **New Era of JetX**, `GameCategory=JetXNew`, with the
published token literal DEMO_EXH. That edition is not silently substituted for
older JetX and is not admitted by this public-DEMO resolver.

The IDs prefixed `reference-` identify reference records only. They are not
production game IDs or assertions that native modules exist.

Resolve all product-page links without launching games:

```bash
python3 tools/smartsoft_demo_references.py \
  --manifest codex-work/demo-recovery72-20261125/requested72.json \
  --output codex-work/demo-recovery72-20261125/resolved-references.json
```

The resolver permits up to six concurrent product requests. Its default is four
workers and at most two attempts for transient HTTP 500/502/503/504 or timeout
failures. It does not retry 404, access denial or unsupported URLs. A failed
product remains an explicit result and does not terminate the rest of the batch.
No launcher, account, wallet or game endpoint is requested by this command.

The fresh batch fetched all 72 official product pages with HTTP 200. Its result
is **71 MATCHED, 1 UNAVAILABLE, 0 AMBIGUOUS**. The unavailable reference is the
JetX edition described above; its product page is reachable, but its published
DEMO_EXH link is outside this resolver's exact public-DEMO contract. These results
are retained in `resolved-references.json`. MATCHED means that an exact public
reference was recovered; it does not mean playable gameplay was verified. The
separate browser record above provides that narrower evidence.

## Verification and publication scope

```bash
python3 -m unittest discover -s tests -p 'test_smartsoft*.py'
```

64 tests passed: 33 browser-audit regressions, 21 reference-resolver regressions,
and 10 source-survey regressions. Tests cover the actual HTTP/case/wrapper errors,
exact identity separation, missing versus blank categories, query redaction,
blocked/failed nested documents, continuation after one failure, bounded retry,
and execution of the actual browser inspection JavaScript.

The source change is based on `7e062f2d89b13a7814ee95e09d4c6dd72a7988a0`.
It changes reference tooling, focused tests, the active directive and evidence
only. The production Player/Agent Workers, backend, existing game modules,
accounts, balances, ledger and authentication are not modified. No production
wallet or real funds were used. No old native assets or screenshots were used as
new game references, and no browser screenshots/session tokens are committed.
