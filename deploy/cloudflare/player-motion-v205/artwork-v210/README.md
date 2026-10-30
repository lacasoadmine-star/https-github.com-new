# Four-symbol artwork cleanup (v210)

Changed only Foxy cherry/melon, Multi Hot5 plum pair and Wild Multi Stars single plum. Image-generation editing removed opaque screenshot-like mattes and reconstructed transparent fruit edges from the four existing assets. Generated shapes are approximate, not pixel-identical. Other symbols, artwork, layouts and palette differences remain. Not a complete artwork replacement or video-parity claim.

The1254x1254 transparent2x2 atlas is served as WebP under a stable versioned PNG-named route (Content-Type:image/webp). Renderer crops by actual half-dimensions, preserving symbol IDs. No API/controller/RNG/wallet changes. Exported WebP corner alpha0,0,0,1 of255; final check permits<=1/255, documenting the negligible residual.

27 isolated normal/STOP spins across3affected machines and360/390/430 passed, using PNG source. Exported WebP decode/alpha and deployed byte checks separately verified. No live wagers. v209 rollback:c2a41ff3-b596-4e0f-bda8-95cfd3f7c449.

The deployable wrapper embeds the WebP as base64. To extract for tests, parse the JSON string following `const image=` and base64-decode to symbols.webp. For fixture tests use that image and image/webp. Original PNG/reference captures are not committed.
