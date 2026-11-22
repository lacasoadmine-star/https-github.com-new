# Super Wilds presentation

Fresh original Canvas vector artwork and presentation geometry from the current official Super Wilds inspection on 23 November 2026. The authored fruit, bell, seven, crowned WILD, clover background, cabinet and wheel are independent code, with no embedded provider image, old game asset or screenshot playback. This is a presentation implementation, not a claim of exact artwork parity or finished live financial integration.

`SuperWildsRenderer({canvas,onEvent,now})` exports `resize(width,height,dpr)`, `setDisplay(patch)`, `start({requestKey,quick,at})`, `acceptReceipt(receipt,at)`, `stop(at)`, `tick(at)`, `draw()`, `snapshot()` and `dispose()`. The exact layout rectangles come from `superWildsLayout(width,height)`. Use these same rectangles for DOM control hitboxes. Only show DOUBLE when the authenticated host permits it and an accepted win is pending.

Receipts have `roundId`, `grid` (five columns, each with three symbol keys), `multiplier` from 1 through 5, optional integer `winMinor`, `balanceMinor`, `betMinor` and optional `winningLines` containing five-element row paths. All data is copied and frozen, conflicting deliveries are rejected, and duplicate deliveries are ignored. No outcome, multiplier or money is generated in the browser. STOP can accelerate the existing presentation but cannot settle without an authoritative receipt. The initial cabinet is neutral until a server snapshot exists.

Symbol keys: `orange`, `lemon`, `plum`, `grapes`, `cherry`, `watermelon`, `bell`, `seven`, `wild`. Winning cells are displayed individually; an entire WILD reel is rendered only if all three accepted cells are WILD. There is no inferred WILD expansion.

Events are `spin`, `stop-request`, `reel-stop` (column), `wheel-stop` (multiplier), `win` (winMinor) and `settled`. Repeated ticks and STOP do not duplicate these events. The root controller owns authenticated transport, menus, settings and audio unlock/mapping. This renderer never calls any wallet or financial endpoint.
