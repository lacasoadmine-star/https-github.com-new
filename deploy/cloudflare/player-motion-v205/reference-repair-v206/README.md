# Reference repair v206

## Scope and actual change
Existing Player only; wrapper over deployed v205. Restore Home categories, existing hero, deposit/withdraw actions, existing banner and Slots heading. Games retains combined searchable catalogue. Reset hidden search/favourite/category filters when returning Home. Restyle existing authentication dialog, remove legacy superwin.net pseudo-brand, compact header/footer and Multi Hot5 controls. Existing handlers, API, wallet and game result contracts unchanged. No new financial or provider integrations.

## New uploads inspected once using six representative frames each
- Screen_Recording_20261018_173145_Chrome_1.mp4: Multi Hot5 3x3, side multiplier, thin meter rail, hex controls and shield spin. Reels start/stop across samples. Exact frame timing remains unmeasured in this upload; previous recordings had quarter-second motion samples.
- Screen_Recording_20261030_062814_Chrome.mp4: Burning Ice40, 5 columns and 4 rows, no top multiplier, green shield cabinet. This is not the primary five-line Burning Ice game. Not rebuilt in v206.
- Screen_Recording_20261030_014854_Chrome_1.mp4: Safari launcher and provider loading screen; does not establish playable interior.
- Screen_Recording_20261030_015622_Chrome.mp4 and _Chrome_1.mp4: registration, existing lobby and account dialogs. Do not retain or transcribe any credentials visible in recording.
- Screen_Recording_20261030_015648_Chrome.mp4 and 015708_Chrome.mp4: OS quick settings and browser offline screen, not gameplay.
- Screen_Recording_20261030_015811_Chrome.mp4: Home and deposit provider form/navigation.
- Screen_Recording_20261030_062844_Chrome.mp4: mobile drawer, Home hero, deposit/withdraw actions, bottom navigation.
- Screen_Recording_20261030_062954_Chrome_1.mp4: connectivity transitions, deposit form and account menu.

## Limits
Not an exact clone or complete machine rebuild. Existing hero/art differ from references; no proprietary art extracted. Existing payment integration preserved, reference provider not implemented. Missing/mismatched games from v205 remain unresolved. No claim all videos watched in full or100% visual parity. Reference captures containing personal information are not committed.

## Verification
Home/Games/register/search/game launcher/returnHome at360/390/430, all non-GET/HEAD blocked. Nine isolated fixture spins for MultiHot5 normal/STOP-before-response/STOP-after-response atthree widths; server-grid, multiplier, result and balance display, monotonic motion and stop order asserted. No real wager or registration submitted.

## Rollback
v205 version afe12c8d-3e27-47b3-90da-b8edf58c4b89, deployment2ea0b441-3876-4b34-810a-4260768451c8. Preserve all23existing modules andbindings on upload; add only new wrapper. Restore previous version100% if needed.
