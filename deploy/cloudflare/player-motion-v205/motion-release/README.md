# Player motion v205
Presentation-only wrapper over the current deployed v204 source. No game controller, financial API, RNG, account, wallet, binding or database changes. Existing 22 modules preserved byte-for-byte; added wrapper serves renderer, CSS, presentation script and two independently authored SVG backgrounds.

## Changes
Velocity-dependent seven-tap directional exposure replaces three offset ghost images. Gold outlines use only authoritative winning positions. Win plaque sits at reel edge without moving controls. Cancellation clears stale win highlights. Compact Foxy title, arched wheel and round controls. Original vector clover and forest scenery; no screenshots or videos used at runtime.

## Verification
Browser fixtures intercept every slots API call and block all other write requests. No real-money spins. Five existing primary machines tested normal spin, STOP before response and STOP after response at 360,390,430px. Assertions cover exact settled grid, multiplier, displayed balance, result amount, monotonically advancing reels, left-to-right stops, unique idempotency tokens, cleared pending token, no page errors or horizontal overflow. Fixture values do not validate payout math.

## Reference findings (cached; sampled, not exhaustive frame parity)
29237.mp4: Multi Hot 5 3x3 side wheel, clover background, shield spin, gold win boxes. Motion sampled at 0.25sec.
30742.mp4: dark navy lobby, neon green actions and bottom navigation.
30734.mp4 and 30824_part02/03: Safari Simba 3x3, left multiplier, savannah, rope/bamboo borders.
30740.mp4: Habesha Fortune 5 3x3, bamboo/thatch, landscape and cultural symbols, side multiplier.
30739_part00/01: Multi Hot Ways 3x3, side multiplier and circular spin.
30739_part02/03: Multi Hot 10 5x3, top arched multiplier, circular spin. part04 also sampled.
30824_part00/01: Multi Hot 5. part01 motion sampled at 0.25sec.
30824_part04/05/06: Hot Foxy 20 5x3, dark jade forest, upper-left title, broad arched wheel, circular spin. part05 motion sampled at 0.25sec.
29316.mp4: lobby navigation. 29239.mp4: account/withdrawal UI only, no transactions performed. 29240_part00: lobby/sport/casino navigation, no Wild Multi Stars interior found.
30825.mp4 is absent from supplied archive/index. Wild Multi Stars interior timing has not been reference-verified.

## Unfinished and contract differences
Not a complete all-machine rebuild or 100% visual/motion match. Sprite artwork and exact timings still differ. Safari existing sw-safari-simba is renamed Superwin Savanna Sunrise with 5x3/20 lines, incompatible with reference3x3. Legacy sw-multi-hot-ways-27 is3x3 but no multiplier result; r2/r3 are5x3. Habesha Fortune5 and MultiHot10 IDs not found in inspected config. Foxy model wheel permits2,3,5 while reference also shows1,4. Do not fake missing columns, multiplier outcomes or financial registrations. These games remain incomplete.

## Rollback
Previous version60cbde05-4119-4e58-9a91-8c891ece8423, deployment a920a987-a053-4e9b-8c79-da0a43de0f58. Restore that version at100% using existing Worker deployment API. Never deploy stale repository Worker bundles. No test fixture is included in the production wrapper.
