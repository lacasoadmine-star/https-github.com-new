# Accepted Ice line presentation

Included in the combined Player v354 / Library v33 publication documented in
../accepted-controls-r12/deployment-receipt.json.

The existing engine allocates each paid line increment to its corresponding
freeze frame. An unchanged terminal respin therefore has no fresh wins. The
previous client used that empty list as the final result and dropped held-line
highlights. iceReceiptView combines only the accepted per-line amounts,
retains the most recent cells and match count, and verifies those cells still
match the final accepted grid. Interim highlights stay hidden. Receipt money,
grid, frames and actions are never mutated.

The official free BlazingHot40 demo supplied 25 completed spins, including
six freeze features. One three-frame observation awarded 2.40, improved to
8.40, then remained at 8.40. The provider's frame UserWin is a display value,
not an additional wallet credit. Native receipt increments are 2.40, 6.00,
and 0.00. The verified final award is 8.40 in both representations.

evidence/official-replay.json contains only whitelisted numeric observations
and comparison results; captured player/event identifiers are excluded.
evidence/paylines.json preserves the prior official coordinate mapping. The
public zero-based line indices correspond to one-based native line labels,
and the native grid reverses the provider's row-index convention.

Run node verify-receipts.mjs and node verify-worker.mjs. browser.py performs
an isolated component replay with real deployed presentation modules and art,
not an authenticated wallet test. The observed 0.40 stake is scaled to 2.00
for that replay; it does not assert an official ETB currency profile. The old
renderer shows zero held lines; the corrected renderer shows 24 lines with
42.00 total. Portrait and landscape passed with no financial POSTs.

The change applies to Burning Ice 10 and 40 only. The official 25-spin numeric
observation belongs to Burning Ice 40; it is not claimed for Ice 10. Private
provider probabilities, unseen features and overall presentation parity remain
outside this evidence.
