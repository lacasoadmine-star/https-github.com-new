# Amarka shaqada ZPLAY — 22 November 2026

**Amarkan wuxuu ku darayaa joogtaynta shaqada hadda socota. Ciyaarta ama qaybta hadda la dhisayo lagama bilaabayo eber, lagamana tagayo.**

## Sixitaanka ugu dambeeyey: shaqadii sawirradu muujiyeen ka sii wad

Isticmaaluhu wuxuu caddeeyey in shaqadii **NEW71 iyo daabacaadda preview-ga Multi Hot 10, iyo renderer-yada Multi Hot 20 / Multi Hot 100** laga sii wado halkii ay joogeen. Tilmaantiisa **“2 ciyaarood + 69”** waxay ilaalinaysaa kala-qaybinta shaqada uu tixraacay; ma aha sabab dib loo bilaabo, modules cusub oo kale loo sameeyo ama tirooyinka mar kale su’aal looga celiyo. Qaybahaas socda iyo 69-ka kale ku wada hay safka. Laba ciyaarood looma calaamadinayo COMPLETED ilaa dhismaha iyo hubinta live-ka ee ciyaar kasta ay caddeeyaan.

## Safka firfircoon

Liiska ugu dambeeya ee isticmaaluhu soo qoray wuxuu ka kooban yahay **71 magac: 50 magac oo cayiman iyo Cube Nova 01 ilaa Cube Nova 21**. Magacyada iyo kala-horrayntooda saxda ah waxay ku jiraan [active-queue.json](active-queue.json). Qoraalladii hore ee 72 iyo safafkii hore ee catalog-ga waa la hayaa taariikh ahaan; laguma beddelayo liiskan cusub, lagumana abuurayo magac dheeraad ah si tiro loo buuxiyo.

71-ku waa tirada magacyada la dalbaday. Ma aha warbixin sheegaysa 71 ciyaarood oo la xaqiijiyey ama la dhammeeyey. Diiwaankii aqoonsiga ee commit-ka saldhigga ahi wuxuu isku xiray 36 saf iyo 35 badeeco oo kala gaar ah: JetX3 iyo Aviastar waxay markaas tilmaamayeen hal badeeco rasmi ah. Cube Nova 01–21 iyo aqoonsiyada kale ee aan weli la xaqiijin waxay sii ahaanayaan hawlo firfircoon; tixraac rasmi ah looma samaynayo qiyaas.

**MultiHot5, FoxyHot20 iyo HabeshaFortune5 waa laga reebay dhismaha cusub.** Ciyaarahaas, ciyaarihii kale ee jiray iyo shaqadii aan weli dhammaan ee ka baxsan safkan waa la ilaalinayaa. Magac isku mid ah oo ciyaar hore leeyahay ma oggola in aqoonsiga ama route-kii hore lagu dul qoro.

## Waxa la fulinayo ciyaar kasta

1. Fur bogga iyo demo-ga rasmiga ah ee ciyaartaas, xaqiiji variant-ka, kuna qor URL, waqtiga, viewport, orientation iyo version-ka muuqda.
2. Gudaha ciyaarta ka arag PLAY, intro/sound prompt iyo controls-ka ay dhab ahaan leedahay. Samee ugu yaraan toddobo SPIN oo kala gooni loo bilaabay; kaydi observations-ka, action log, screenshots iyo duubista uu deegaanku taageero. Cod aan dhab ahaan la maqal ha loo sheegin in la xaqiijiyey.
3. Inta tixraaca la baarayo, dhis koodhka nool ee ciyaartaas: renderer, symbols/assets, xeerar/evaluator, state, controls/settings, animations iyo sound events. Wixii ka dhiman waa hawl la dhisayo oo leh tallaabo xigta; ma aha meel shaqadu ku dhammaanayso.
4. Sax blur, kala-bax ama isdul-saar; scale/clipping-ka symbols-ka; hitboxes-ka; reels-ka iyo istaaggooda; multipliers; win presentation iyo isku-waafajinta codka. Badhamadu ha yeeshaan jawaabta ku habboon state-ka waqtigaas jira.
5. Ku xir server-ka, engine-ka, sessions-ka iyo wallet-ka ETB ee jira. Server-ku wuxuu abuuraa rounds cusub; toddobadii tixraac ma noqdaan playback ama xad wareegyo. Retry/reconnect wuxuu soo celiyaa round-kii la aqbalay, STOP-na bet cusub ma abuuro.
6. Ku tijaabi xeerarka iyo dhacdooyinka dhifka ah fixtures ku dhisan rules-ka la xaqiijiyey. Hubi mobile/input/controls, xisaabta iyo soo-kabashada request-ka; isbarbar dhig demo-ga saxda ah iyo live-ka marka session-ka iyo release-ku diyaar yihiin.
7. Marka isbeddelku la xaqiijiyo, ku daabac targets-ka jira ee la oggolaaday, dib u fur oo hubi natiijada live-ka. Kadib diiwaangeli caddeynta, dhammeystirka iyo game-ka xiga. Dhammeystirka ma aha tiro tests ama cards oo keliya.

## Shaqada isbarbar socota

Kooxaha tobanka ah waa abaabul iyo warbixin. Shaqaalaha la heli karo waxay wadaan qaybaha madax-bannaan, iyadoo hal isku-duwe maamulo wallet/API, faylasha wadajirka ah, navigation iyo deployment. Cillad hal game ah ma joojiso kuwa kale. Cilladdaas lama tirtiro: mas'uul, xal la raadinayo iyo action-ka xiga ayaa la sii hayaa ilaa la saxo.

Multi Hot 10, Multi Hot 20, Multi Hot 100 iyo Roll X waxay leeyihiin shaqo qaybo ah oo ku diiwaangashan checkpoint-ka la aqbalay. Qaybahaas waa laga sii wadaa; diiwaankan cusubi ma sheeganayo in uu dhisay ama dib u tijaabiyey. Multi Hot 5 Deluxe iyo Multi Hot 40 kuma jiraan liiska ugu dambeeya ee la taxay, laakiin shaqadooda hore lama tuurayo mana lagu tirinayo ciyaaro cusub oo safkan dhammaaday.

## Oggolaanshaha iyo ilaalinta

Isticmaaluhu wuxuu si cad u oggolaaday baaritaanka, qorista koodhka, hagaajinta, tijaabinta, isku-xirka iyo daabacaadda GitHub, Cloudflare iyo Railway ee mashruuca jira. Hawlaha caadiga ah ee xadkaas ku jira oggolaansho cusub looma baahna. Haddii credential/session ama permission aan la hayn dhab ahaan loo baahdo, sheegi waxa saxda ah ee loo baahan yahay, iyadoo shaqada kale la sii wado.

Ilaali accounts, sessions, ETB balances, ledger, round history, auth/permissions, Player/Agent/Admin, Telebirr, domains iyo adeegyada jira. Ha samayn reset, wallet labaad, fake balance, public secrets ama martigelin kale oo aan la oggolaan. Isticmaalka credits-ka iyo tijaabooyinka ha noqdo mid loo baahan yahay oo kooban. Haddii badbaadada ama access-ku xannibo tallaabo gaar ah, xannibaadda ha loo wareegin si qarsoon; shaqada madax-bannaan waa la sii wadi karaa.

Dashboard-ka qaybta **NEW** ha ka sarrayso safafka jira, iyadoo kuwii hore la heli karo. Aqoonsiyo/routes/modules gaar ah ayaa kala saaraya. Magac ama card cusub keligiis looma tirin karo ciyaar cusub oo shaqaysa.

## Sida session-ka xiga loo sii wado

Akhri root `AGENTS.md`, order-kan, `active-queue.json` iyo qaybta ugu dambaysa ee `PROJECT_PROGRESS.md`. Hubi commit-ka iyo deployment-ka hadda jira. Qor action-kii ugu dambeeyey ee dhab ahaan la dhammeeyey, caddeyntiisa iyo action-ka xiga. Sii wad qaybta socota adigoon ku celin shaqadii isla version-ka hore loo xaqiijiyey. Diyaarinta iyo diiwaangelintu ma aha ballanqaad shaqo aan session jirin oo si qarsoodi ah u socota.

Diiwaankani wuxuu ka bilaabmay commit `b99c93d90999fc3298b4bbead964f9b9997b09ba`. Wuxuu keydinayaa amarka iyo safka; ma beddelo runtime, wallet, release gate ama deployment. Xaaladaha ku jira queue-ga waa kuwa laga soo qaaday checkpoint-kaas ilaa hawl cusub oo dhab ahaan la fuliyey lagu cusboonaysiiyo.
