# SmartSoft 69-title continuation

Recovered on 2026-11-10 from the supplied prior-work screenshots and the
74-title official snapshot. The five separately preserved titles are JetX,
Balloon, Football X, Multi Hot 5 and Foxy Hot 20. The original official slug
for Football X is `fotballx`; do not silently substitute `football-x`.
The 69-title order matches the screenshot anchors, including Burning Ice 40
at 37 and Burning Ice 10, Roll X, Double X and Samurai at 66–69.

`references.json` contains one identity record per title, all 69 local official
cover files with SHA-256 and source URLs, and all 69 normalized public demo
links. Eleven records reuse existing native IDs. Nine of those official titles
appear in the existing ten-title credits-demo catalogue; Multi Hot 40 and
Safari Simba retain their separate existing native IDs. Coin Miner is the
existing tenth demo client but does
not occur in this SmartSoft-only 69-title list. No new machine is invented from
a poster, and the existing client IDs and launch routes are retained.

The product pages have five outstanding identity metadata issues: BalloonX,
Dice Jungle and Cheesy Road Classic have empty OG titles; Multi Fruits Charging
Wilds reports Gems Crown Charging Wilds; Mariachi Coins reports the misspelling
Mairachi Coins. Their cover art was recovered independently by exact title from
the official gallery. Related-game images are never used for a different title.
Google-wrapped and scheme-less demo links are unwrapped only for the known
launcher host; its HTTP links are normalized to HTTPS. This does not establish
that the launcher loads or that its mechanics were inspected.

Run the offline integrity and identity checks:

```sh
python game-expansion/smartsoft69/verify.py
python -m unittest discover -s game-expansion/smartsoft69 -p 'test_*.py'
```

To resume collection with a persistent HTML cache outside the repository:

```sh
python game-expansion/smartsoft69/collect.py \
  --cache /workspace/work/smartsoft-reference
```

The collector uses six concurrent public read-only requests. Existing cached
pages and cover files with matching source URLs and hashes are reused. It
fetches no demo executable, creates no account and submits no financial action.
Exit status 1 reports unresolved product-page issues even if all covers and
demo links have been recovered. Each problem stays attached to its own record.

These are construction references. Per-game visible rules, paytables, controls,
animation/audio, native mathematics, wallet integration and browser evidence
remain necessary before declaring a new machine complete. Existing receipts
and individual release gates are not replaced by this inventory.
