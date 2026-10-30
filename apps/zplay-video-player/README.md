# Independent ZPLAY visual preview

New standalone website, no import or call to superwin-player, no production bindings, database, account credentials, deposits or withdrawals. Eight independently implemented Canvas cabinets: Multi Hot5(3x3,left wheel), Hot Foxy20(5x3,top wheel), Wild Multi Stars(5x3,purple top wheel), Habesha Fortune5(3x3,bamboo/highlands), Safari Simba(3x3,savannah), Multi Hot10(5x3,top wheel), Multi Hot Ways(3x3,27 ways layout), Burning Ice40(5x4,no wheel,shield spin). Original code and artwork. Each control opens a real dialog or changes real demo state. STOP waits for the result and accelerates its presentation; navigation aborts pending demo fetch. Browser demo credits have no monetary value.

## Scope limits
This is an independent playable visual preview, not a real-money production casino and not a pixel-identical recreation of the reference videos. Demo outcomes use a deliberately documented simple horizontal-match rule, not provider paytables. Multiplier distribution is a uniform demo choice. Financial operations and sports show explicit unavailable notices; no fake payment flow. No authentication or fake live account data. No claim 100% artwork, motion or functional parity.

## Reference evidence reused
New upload20261018_173145: MultiHot5 shield/side wheel/green cabinet. New20261030_062814: BurningIce40 5x4/shield/green-gold cabinet. New062844/062954/015622/015811: dark navy dashboard, green navigation/actions, drawer and dialogs. New014854: Safari launcher/loading only. New015648/015708: offline/OS screens, not gameplay. Previous30734,30740,30739parts and30824parts supply Safari/Habesha/Ways/10/Foxy interiors. WildMultiStars timing has not been verified against an interior recording. No reference screen is used as a gameplay background.

## Running
Run `npm install` and `npm run build`, then `npm start`. In another terminal run `npm test`. Chromium must be installed at `/usr/bin/chromium`. The embedded original image is restored by the build script. Node24, Chromium and Playwright used. The test does not call production. ZPLAY_TEST_URL may target the independent deployed preview; only demo spins are sent. worker.mjs bundles the public assets and imports server.mjs and games.js. No extra paid services or storage are configured.

## Artwork
New image-generation16-symbol atlas, decoded before catalogue rendering; additional symbols/scenery independently drawn in Canvas. Runtime crops use connected-component bounds measured from atlas alpha to avoid adjacent symbols leaking into a cell. It is original approximation, not exact supplier artwork.

## Deployment
https://zplay-video-player.apdiy61.workers.dev/
Deploymentd7242213-1a72-4a9c-af37-af91a2bd5883. No production Worker modified. Live demo spins exercise only this new Worker.

## Public access
An exact-host Access application makes only `zplay-video-player.apdiy61.workers.dev` public. Existing All Workers, production Player and Agent policies were not changed. Removing this new application restores inheritance of the existing Access protection.

## Verified checks
48 local normal/STOP demo spins across all eight games at360/390/430px passed. After final artwork update,16 local checks at390px passed; after publishing and configuring exact-host public access,16 live normal/STOP checks at390px passed. Live checks verified each rendered grid, dimensions, displayed win and multiplier against its demo API response, search/saved games, wheel presence and no horizontal overflow or page errors. These checks do not establish visual parity with provider recordings.
