# Burning Ice meter clock candidate

This component implements the public BlazingHot meter selector from the original script observed on 10 November 2026. It accepts only server-supplied coinReels and elapsed presentation time. It has no network calls, wallet operations or RNG.

Source: https://static.ssg-public.com/cache/b1/SlotsDemo/Content/Scripts/Slots/blazinghot.js
SHA-256: a250e41a8a196a53f8f919d37a158d7a2e295f07de7ffa93caa0dba9a32dfa34

The original repeatedly adds 0.1 to an index on each gameAnimation callback, selects trunc(index) modulo 3, and stops when trunc(index/9) becomes positive. In JavaScript this boundary occurs after 91 increments because of floating point. The adapter uses a deterministic 60Hz presentation clock. Actual browser callback cadence is not established as a constant.

The selected inner reels are visited in ascending order. Their icons activate at c*200ms, and column effects start at c*200+200ms after cycling finishes. The 40-line variant hides the header container but retains column effects.

Four focused tests pass, including every source selector tick, ordering, cancellation, invalid input and protected-title exclusions.

This is an undeployed component candidate. Host integration still needs the accepted-response start timestamp, STOP cancellation, original HeadIce sequence and Header/HeaderIcon audio lifecycle, viewport-specific projection, and browser comparison. It must not be attached to the old completion-relative clock, which would start it too late. Current live Player v354 is unchanged by this candidate.
