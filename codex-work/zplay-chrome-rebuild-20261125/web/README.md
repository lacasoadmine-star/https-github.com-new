# Fresh ZPLAY lobby source

This directory contains new native HTML, CSS and JavaScript written for the current rebuild. It uses the freshly observed public catalogue, artwork URLs, theme values and icon-font mappings from the user's connected Chrome tab at `https://zplaybet.xyz`. It does not reuse the earlier draft, game renderers or old game implementations.

It is **unpublished and incomplete**. It must not replace the live Player dashboard or be described as a completed website or 70 completed games.

## Inputs and provenance

- `data/catalogue.json`: 100 entries observed in the Casino All grid and eight entries in Most Liked.
- `data/smartsoft-catalogue.json`: 72 entries observed after selecting the SmartSoft provider filter.
- `data/icons.json`: fresh computed icon content and font-family observations.
- `theme.css`: fresh CSS theme rules read from the reference's stylesheet.
- Exact current image and font URLs are retained. There is no generated artwork or substitute image fallback. Unavailable artwork is identified rather than replaced.
- Desktop measurements were supplied from a 1280 × 585 reference viewport; phone measurements came from 390 × 844. Intermediate breakpoints and complete visual fidelity still require comparison in the browser.

The all-catalogue and SmartSoft captures are merged by name and the actual cover path, retaining each source entry. Known horizontal and `Vertical` variants of the same named cover share a device-favourite identity. Provider membership is assigned only from the independently observed SmartSoft selection. Provider names are never inferred from asset folders. Other provider/category memberships have not yet been captured.

## Implemented source behavior

- Search actual captured names; filter the confirmed SmartSoft membership.
- Save and remove favourites on the current device; no wallet or account data is stored locally.
- Open/close the menu, including Escape, tap-outside and keyboard focus handling.
- Scroll the Most Liked rail and switch between the captured light/dark theme values.
- Read `GET /api/me` using existing same-origin cookies. The confirmed server contract is a direct user object with `id` and integer minor-unit `balance`; ETB display divides by 100. A 401/403 clears the displayed user. Other failures do not create a balance.
- Emit cancellable `zplay:account` and `zplay:section` events for the integration layer. Unknown category membership, unconnected account screens and unsupported sections are disclosed; no fake result lists or sign-in success are produced.
- Require an explicit verified new-game manifest entry before enabling Play. The manifest is empty. Each enabled entry must have `newImplementation: true`, `liveVerified: true`, an observed `referenceUrl` under `https://zplaybet.xyz`, and a query-free same-origin `/rebuild/games/…` route. Existing game routes cannot be passed off as fresh builds.

## Remaining work

- Exact browser comparison at desktop and 360/390/430 phone widths.
- Complete provider/category capture and matching public-page behavior.
- Connect newly built account screens, the existing presence lease and all account actions without altering established session/wallet contracts.
- Capture and implement the actual remaining page states; the prototype does not fabricate top winners, account balances, cashbacks, game histories or transaction results.
- Native game implementation, original assets/audio acquisition, authoritative game rules, controls, game/server tests and actual live verification for each new game.
- Self-hosting or otherwise verifying availability of the observed original assets. External original asset URLs are dependencies, not bundled media.
- Supply the observed Home icon mapping; the bottom Home label is present without a fabricated icon.

`5% daily cashback` and navigation labels reproduce the observed reference text; their corresponding product/backend behavior is not implemented here and requires verification before production publication.

## Checks

```sh
node --check lobby.mjs
node --check catalogue-model.mjs
node --test catalogue-model.test.mjs
```

The five model tests exercise provider provenance, same-name identity and combined filtering, rejection of unverified/old/external launch routes, device-storage failure handling, and server minor-unit balance conversion. They do not certify visual parity, games or deployment.

Desktop browser checks also verified search, the confirmed SmartSoft filter, menu opening/closing, theme switching and a device favourite. The original featured covers were unavailable in this browser, and icon glyphs were missing. This is not a visual-parity pass. Detailed observations are in `../qa-browser.json`.
