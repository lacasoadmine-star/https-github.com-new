Codsiga ugu dambeeya: dhammaan 74-ka SmartSoft Gaming; wallet-ka iyo xisaabinta waxay isticmaalaan Superwin-ka jira.

Waxa la xaqiijiyey:

- Bogga rasmiga ah ee SmartSoft wuxuu taxayaa 74 ciyaarood. Liiska waxaa hadda laga soo qaaday bogga rasmiga ah, lagamana soo qaadan kaydkii ciyaaraha mashruuca.
- Bogga badeecadda, magaca, category-ga, demo URL-ka iyo cover URL-ka mid kasta waa la qabtay. `discover.py` wuxuu mar kale ka soo akhriyaa bogga rasmiga ah.
- Toban demo oo cusub ayaa browser-ka lagu furay oo muuqaal laga qabtay. Tani ma aha caddayn ah in dhammaan 74 la ciyaaray ama la dhisay.
- `verify-server.mjs` wuxuu akhriyaa xaaladda server-ka jira isaga oo aan wax dhaqdhaqaaq lacageed ah samayn. Warbixintu waxay kala saartaa tixraac sax ah iyo taageero aan weli la xaqiijin.
- `draft-art/` wuxuu ka kooban yahay sawirro vector iyo codad synthesized cusub oo aan wali lagu xirin ciyaaro. Ma aha assets-kii ama codadkii rasmiga ahaa ee SmartSoft.

Weli lama dhammayn:

- Dhismaha iyo tijaabada 74 ciyaarood.
- Diiwaangelinta iyo xaqiijinta qandaraaska server-ka ee ciyaar kasta: model version, stake, actions, payout iyo recovery.
- Isbarbardhigga gameplay, animation, paytable iyo codka ciyaar kasta iyo demo-geeda.
- Wallet integration iyo daabacaadda live-ka ah ee shaqadan cusub.

Wallet tijaabo oo gooni ah iyo xisaab aan ka iman server-ka jira laguma darin. Draft-kii aan la daabicin ee wallet kale waa laga saaray repository-ga markii codsiga wallet-ka jira la caddeeyey. Website-ka live-ka ah iyo balances-ka waxba lagama beddelin.

Run the read-only verification:

```sh
node deploy/smartsoft74/verify-server.mjs
```
