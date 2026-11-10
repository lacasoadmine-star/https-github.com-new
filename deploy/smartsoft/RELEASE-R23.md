The existing production Player now delegates the nine requested game apps and
native shell resources to `superwin-native-presentation` through the private
`NATIVE_PRESENTATION` service binding. The child is about 120 KB; the one-time
Player integration adds about 4 KB. Future presentation releases can update
the small child without uploading the large retained Player again.

The same `/games/<id>` and `/demo/games/<id>` URLs remain in the existing
website. Their app script and shell stylesheet use stable `/native-ui/`
entrypoints. Those return uncached pointers to immutable release resources.
An unavailable child can fall back to the retained R22 app and shell. No new
public child hostname is enabled. Worker logs and traces are enabled for the
child, which has no secrets, database bindings or financial endpoints.

MultiHot5 and FoxyHot20 keep their original routes and implementations. All
account, wager, collection, credit and identity APIs stay in the original
Player and backend. The parent forwards only public GET/HEAD requests to the
child and strips account headers, cookies and query strings. Original demo
session cookies remain on the HTML response.

The settings update inherits all 14 pre-existing bindings. The current API
also requires an explicit declaration of the already-provisioned
`LocalDemoWallet` export. Its SQLite storage kind and namespace identity were
read from Cloudflare and retained, with no migration or data operation. The
settings fingerprint with the single new service binding removed matches the
original fingerprint.

Build the current release using verified public R21 app baselines:

```sh
node deploy/smartsoft/build-presentation-r23.mjs BASELINE_DIR OUTPUT_DIR
```

`BASELINE_DIR/files.json` must contain each retained group's filename, SHA-256,
byte count and immutable source URL; the observed values are in
`presentation-evidence-r23.json`. The builder rejects a changed baseline and
keeps the existing financial API behavior. Only imports and the catalog URL
are moved to stable retained dependency paths.

For a later child-only release, retain the complete previous release manifest:

```sh
node deploy/smartsoft/build-presentation-r23.mjs BASELINE_DIR OUTPUT_DIR r24 PREVIOUS_RELEASE_MANIFEST
```

Use the generated `presentation-releases-r23.json` as that previous manifest.
Old immutable resources remain available to already-open pages. A changed
resource cannot reuse an existing release identifier. Publish the resulting
child entry to the same `superwin-native-presentation` Worker; the parent
binding and game HTML need no update.

Verification covers all nine native account controllers with isolated funds,
all nine local credits demos, deployed public resource hashes, private service
binding routing, and deployed credits-demo rounds. No player-account wager is
placed by the browser checks. See `release-status-r23.json` for results.
