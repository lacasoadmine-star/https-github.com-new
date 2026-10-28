# ZPLAY STOP release

Worker: superwin-player
Deployed version: 195 / 00fe4a95-5744-4495-8563-c0b2213fd6a2
Deployment: 33b686fc-30f7-45e9-a244-c4ed75c5a263 (100%)
Previous version: 702ac152-afb8-43da-b295-bb27121c25c2

The entry module imports the existing sw-original-entry.mjs and serves two updated frontend assets. Upload it together with the 18 original modules downloaded from the Worker; it is not a standalone replacement Worker. Preserve current bindings and runtime settings. No backend, wallet, database, authentication or wagering changes are included.

STOP cancels further autoplay and requests early presentation of the existing server result. Before the response arrives it continues waiting without issuing another wager. The descending reel-strip index preserves symbol continuity when crossing cell boundaries.

Run: node deploy/cloudflare/tests/stop-controls.cjs
Also passed: three workspace frontend builds and nine disposable-database backend tests. Browser smoke: Hot Foxy at 390px, logged out, no JavaScript errors. No production wager was placed.

The requested standalone ZPLAY v3 HTML and complete ten-video reference set were unavailable in this session. This release does not implement the full seven-game v3 redesign.
