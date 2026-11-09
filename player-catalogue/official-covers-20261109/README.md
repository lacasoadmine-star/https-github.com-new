# Existing Player catalogue artwork update

Ten official title images replace the generic covers in the existing Player grid. Each opens a game sheet with a Play demo link. The separate demo section is removed. Existing game modules, financial routes, wallet bindings and cash-release gates remain unchanged.

This is an additive Worker package. Its entry wraps the live remaining20-credits-lobby-entry-r2.mjs; it is not a complete site or a replacement deployment. Original images are recorded in covers.provenance.json and embedded in the immutable assets module.

Validation: 13 assets checked for bytes and SHA-256, HEAD and conditional GET; prior handler/API pass-through. Chromium preview confirmed all10 images, same-grid placement, mobile sheet/link, existing search-event behavior and preserved MultiHot5/FoxyHot20 cards. Home currently hides the existing search input; filtering was checked by dispatching its input event.

The ten games remain demos. Real-wallet release and game-specific outstanding rules/audio are separate work; this package does not relabel credits as ETB.
