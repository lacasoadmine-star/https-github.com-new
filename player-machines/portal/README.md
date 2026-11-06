The r9 portal decorates the existing Player application. It does not replace React, authentication, session handling, payments, wallet data, the server catalogue, or game settlement.

`portal.mjs` restores distinct Home/Games surfaces and reads the existing `/api/config` catalogue. The four published machine routes map to their verified cabinet implementations. Search, category/provider filters, favourite actions and the bottom game sheet use actual catalogue/account state. Account, registration, login, copy-ID, balance visibility, history and payment controls remain the original React components. Password visibility is a presentation-only input type toggle. No winner values, recorded identity or balances are embedded.

`cover-art.mjs` contains five isolated cover-art components from the owner's supplied videos. These components contain no page, navigation, balances, counts, buttons or private data. All game cabinets remain live code; cover images are used only for lobby cards and game details.

Build with `node portal/build.mjs`. Verify wrapper routing with `node --test portal/router.test.mjs` from `player-machines`.

Deployment integration uses flat Worker module names:

1. Add `portal-assets-r9.mjs`, `portal-router-r9.mjs` and `portal-entry-r9.mjs` from this directory.
2. In `restore-20261102.mjs`, change only the default re-export to `export { default } from './portal-entry-r9.mjs';`.
3. Keep `export { LocalDemoWallet } from './local-demo.mjs';` and every other original module, binding, migration, setting and API unchanged.

The wrapper delegates every non-Player request, API, financial method and game route to the previous application. It serves versioned public presentation assets and injects them only into the existing `/` Player HTML. An unavailable catalogue keeps the existing gallery fallback visible. Unavailable external providers remain disabled; their presence in metadata does not create a provider connection.
