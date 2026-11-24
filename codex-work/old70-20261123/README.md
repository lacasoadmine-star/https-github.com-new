# Dib-u-dhiska ciyaarihii hore

Codsiga hadda: 70 ciyaarood oo hore, mid-mid; shaqadii NEW90 waa la joojiyey. Ciyaar kasta waxay heshaa koodh cusub oo modular/minified ah, waxaana browser-ka lagu tijaabiyaa isla Player-ka. MultiHot5 iyo FoxyHot20 lama beddelayo.

## Tixraaca hadda iyo liiska70-ka

Tixraaca koowaad waa ZPLAY-gaagii hore: https://zplaybet.xyz/en/lobby/fastgames/all/ .72 ciyaarood oo SmartSoft ah ayaa si toos ah browser-ka looga arkay; laba ka reebis ayaa ka dhigtay70. Magacyada iyo kala horreynta: [source-catalogue-20261124.json](source-catalogue-20261124.json). Waxa dhab ahaan la arkay iyo waxa weli sugaya gelitaanka: [COMPARISON.md](COMPARISON.md). Liiskani ma aha ciyaaro la dhammeeyey.

## Ciyaarta koowaad: Multi Hot 40

Source-ka `multihot40/` wuxuu leeyahay xisaab integer ah, 40-ka payline ee chart-ka rasmiga ah ee hadda, reels 5×4 ah, renderer Canvas oo cusub, SPIN/STOP/BET/AUTO/TURBO, settings, history, TAKE iyo X2 practice ah. Outcome sampler-ka iyo red/black practice-ku waa kuwo madax-bannaan; ma aha probability/RTP-ga provider-ka. Credits-ku waxay bilaabmaan marka PLAY PRACTICE la riixo, browser-ka keliya ayaana lagu kaydiyaa.

Play route: `/native-ui/old70/multihot40/` oo ku jira isla `superwin-player.apdiy61.workers.dev`. Host-ku wuxuu ku lifaaqmaa presentation Worker-ka jira, wuxuuna sii daayaa kaliya faylasha iyo media-da la cayimay. Ma jiro wallet/backend financial request.

Minified build: `node codex-work/old70-20261123/build.mjs`. Tests-ka tooska ah: `node` ku orod `model.test.mjs`, `local-session.test.mjs`, `reel-motion.test.mjs` iyo `host/worker.test.mjs`. Node runner-ka deegaanka wuxuu `--test` ku soo koobaa tirada faylasha; 62 assertion ayaa ku jira toddobada suite.

Tixraaca cusub iyo farqiyada: [REFERENCE.md](REFERENCE.md). Deployment/browser acceptance waa in si gaar ah loo diiwaangeliyo; source ama passing unit tests ma dhammeystiraan 70 ciyaarood.

Ciyaarta xigta marka tan koowaad buuxiso shuruudaha: Safari Simba. Ciyaaraha kale ee jira, accounts, wallet, permissions, ledger iyo Telebirr lama beddelayo.
