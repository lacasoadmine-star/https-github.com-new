# Player reference update r9

Status: published as version302 (`a199bef5-8c1b-49af-a8e4-29c2c0a5cd7b`) on the existing superwin-player Worker at100% traffic. Deployment `0029f921-a297-405b-86e3-1b9238a824f4`,6November2026 at02:52:31UTC. Runtime source `3fe2bf1a8726abeaa9e545353b01f9accf4e4edd`. Rollback remains version299 (`bf28fdef-f880-4a82-8238-94aa44c98c0d`);301 also retained. Version300 was uploaded but never promoted.

Multi Hot 5 now shows the selected stake on its main button and starts SPIN on the first tap, including after a win. The third meter retains the last positive win across losing rounds and read-only history restoration. Its right stake control previews the next legal bet and opens the existing selector. Revised clovers, cleaned symbol/digit edges, multiplier frame, orange payline rims and medium/big-win presentations follow the supplied references.

Official Smartsoft product imagery and the public DMO demo confirmed that the Stars wheel should be purple/gold. Its existing starsPalette is now applied to the sector gradients, rim and inactive numbers; this presentation-only correction was checked before promotion.

Hot Foxy 20 has brighter green dotted reels, an orange multiplier, refined wheel shield and botanical win panel, simultaneous receipt-backed winning lines with pink endpoints, and cleaner bell/seven/star edges. Existing authoritative outcomes drive all animation and displayed amounts. The sound consent YES/NO choice is persistent; sound starts only after a gesture. Existing seamless loop samples, mute/volume and hidden-tab suspension remain in use. Settings include fullscreen where the browser supports it.

The homepage adapter retains the existing React authentication/account/payment handlers. It adds distinct Home/Games layouts, six featured Home cards, the actual 57-entry catalogue, search, provider/category filters, details sheets and server-backed favourites. Five isolated reference cover components are used only for cards; the playable cabinets use Canvas/DOM code. Original account ID, balance, copy/hide, authentication validation and payment error state remain API-backed. No recording overlays, recorded private values, fabricated winner counts or provider availability are introduced.

## Verified checkpoint

- 460 Node tests and 12 native Canvas renders across all four games at 360/390/430px.
- 677 trusted browser checks across six frozen-source cases: all four games at390px and the original two at360px; 51 synthetic rounds,12 synthetic gambles; every ledger balanced and no JavaScript errors.
- After the Stars-only palette correction, all460Node tests and12Canvas cases were rerun, plus a focused trusted Stars390px case. Full behavior evidence above predates only that palette adjustment.
- 236 Cloudflare Browser Rendering checks for Multi Hot5 and Foxy20 at390px using self-contained synthetic fixtures. These verify state, motion, audio, recovery and controls; no production wallet was contacted.
- 129 portal checks across360/390/430px exercise original React login/register/validation/account handlers, search, favourites, details, deposit-error truthfulness and Home6/Games57 against isolated localhost API responses.
- Eight portal wrapper tests cover routing/cache/headers and gzip safety. Nine backend tests on disposable SQLite, Player/Agent/Admin production builds and ten portal regression checks passed.

Detailed results and frozen source hashes are in `test/player-qa-r9.json`. Publication replaced only the machine asset module and the tiny main export, and adds three portal modules. All other original Worker modules and settings compared byte-for-byte before promotion. Server mathematics, wallet adapters, payment implementations and databases are preserved.

## Reference coverage and limits

Five of the six newly supplied videos were downloaded and sampled at every second, with denser examination of touch/spin transitions. The 050916 Samsung Browser recording exceeds the tool32MiB download limit and was not inspected. The available split042800 videos were inspected. Several recordings have no audio stream. Inline screenshots and older available videos remain the cabinet references.

Exact pixel/waveform identity is not established; reconstructed artwork and typography remain. Physical-phone listening and authenticated production-wallet settlement are not established by synthetic QA. Unavailable providers stay unavailable. Remaining gaps, evidence requirements and official online demo comparison are tracked in `FIX-REGISTER-r9.md`; public demo findings will be recorded separately without delaying this verified checkpoint.


Post-publication checks passed25HTTP routes/assets, weak ETag304 revalidation, homepage injection, Home6/Games57, four details links, search, and all four guest game renders/audio. Each game decoded seven sound samples and reached a running AudioContext. No JavaScript errors or unexpected mutation occurred; only the existing presence heartbeat was allowed. The edge-compression weak ETag issue found in version301 was fixed in a router-only version302 and rechecked. Full evidence: `worker/live-qa-r9.json`, `worker/deployment-302.json`.

The57-title official catalogue audit is in `references/r9-online-catalog-audit.md`; primary-four public demo observations are in `references/r9-online-reference-audit.json`. These identify unresolved backend/variant differences in other games; r9 does not claim that all57 games became vendor-equivalent.
