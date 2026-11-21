# Multi Hot 100 — continued presentation component

This checkpoint continues the retained current-task presentation and controls for `zplay72_multi_hot_100_v1`. It preserves the existing game identity and earlier work. It contains no private captures, observed balances, provider program or artwork files, and changes no shared routes, wallet service or live runtime. The original M100 symbol-frame names remain unchanged.

## Fixed and verified

The retained presentation accepted another receipt during animation when its game, request key and stake matched the pending intent. A different round ID or grid could therefore replace the result already being shown. Identical delivery was also treated as another acceptance.

The presentation now retains its accepted immutable receipt, rejects a conflicting replacement and treats identical delivery as a no-op during and after presentation. Both controls and presentation reject a repeated STOP transition. Receipt shape validation now rejects missing rows and cells in sparse arrays before they can reach symbol drawing.

Seven focused tests pass; five failed against the retained source before these corrections. The suite covers changed round identity/grid, duplicate delivery, sparse grids, repeated STOP, waiting for an actual receipt and preserving the original request after a binding error. It uses a synthetic shape-only receipt, with no claimed financial outcome or provider observation.

```sh
node --test codex-work/continue71-20261122/multi-hot-100-component/render/presentation.test.mjs
```

The four-module import closure is complete. Its atlas and minimal image-region decoder are retained own implementation dependencies for the symbol map; no asset loading occurs in these tests. Source hashes are recorded in `source-provenance.json`. The tests do not establish actual-browser, official-demo, live-player or deployment acceptance.

## Next work and financial boundary

Integrate these guards into the retained own renderer/host. Its wheel currently changes directly from a clock-driven moving angle to the receipt-selected stationary sector; settle timing and portrait controls still need own-reference implementation and actual browser comparison. No timing profile has been invented here.

The retained bounded math still needs clarification of the official chart's duplicated printed paths 45 and 46, both transcribed as `[2,2,2,1,1]`. Their settlement meaning is unresolved; the existing math component rejects named evaluation for those two labels. Do not invent a substitute path.

The complete model also needs legal reel/outcome constraints, symbol and multiplier probabilities, full line aggregation, rounding policy and the scope of the displayed MAX X2500 limit. Gamble probabilities, eligibility/limits, any Gift Spin rules and the operator's ETB stake/settlement policy need their own approved specification. The existing server must then supply durable receipts, collection, retry/reconnect idempotency and wallet/ledger integration. This presentation component is not an outcome generator or a financial validator, and remains an unfinished game component.
