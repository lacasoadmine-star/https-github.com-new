# NEW74 — interrupted implementation and verified references

All 74 requested positions are retained in `requested74-status.json`, including the repeated Hot 40 and Lucky 40 entries. The existing Worker is the only deployment target. Existing games and the wallet/backend are outside the change scope.

This commit contains research and recovery records, not a deployed game implementation. Multi Hot 5 and Multi Hot 10 were newly authored under `/workspace/superwin-pair01/workers/superwin-player/new74`, and local unit/browser checks passed as recorded in `first-pair-status.json`. The execution environment failed before code persistence, final backend contract verification, asset upload or deployment. The local files may be recoverable when that workspace returns; their durability is not established by this commit.

Official demos were observed for 15 rounds per first-pair game. Remaining entries have zero completed observation rounds. Reports distinguish official primary evidence, secondary attribution, ambiguous titles and unavailable exact matches. The requested list spans multiple providers and includes at least one casino brand, so it must not be represented as 74 verified SmartSoft games. A generic cloned reel layout is not a substitute for the requested game's actual interface.

Resume with the existing feature worktree and its untracked `workers/` and `reports/` directories. Do not deploy until the fresh API contract gaps are resolved. Use only the new `/new74/` frontend and existing same-origin account routes. Do not reuse the abandoned draft in `/workspace/scratch/superseded-pair01/`.

The planned Cloudflare upload must preserve every previous module as raw bytes. Downloaded multipart modules lack filenames and may be binary; `Response.formData()` interprets these as strings and corrupts binary bytes. Use a byte-preserving multipart parser before appending the two new modules, then the content-only endpoint to preserve bindings/configuration. No upload was attempted. No Railway staged change was applied.
