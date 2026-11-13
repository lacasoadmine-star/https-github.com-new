# Fresh 74 — halkan ka bilow

**Ka fur ZIP-ka dhammaantiis, faylashana isku hay.**

## Internet la'aan

Fur **`reference-preview/index.html`** si aad u hesho 74-ka cinwaan, sawirrada cusub, clips-ka aamusan iyo qoraallada. `index.html` ee folder-kan ayaa isla halkaas ku geynaya.

Fur **`reel-study/index.html`** si aad u isticmaasho SPIN, STOP iyo autoplay-ka tijaabada saddexda ciyaarood.

## Ku celi dhammaan kuwa aan dhammaystirnayn

Daawadaha qaybtiisa **Retry every incomplete title** waxay haynaysaa dhammaan 74-ka capture ee aan weli dhammaystirnayn. Tirada 13-ka failed scenes waa qayb gaar ah; kama saarayso ciyaaraha muuqaalka qayb ahaan laga helay.

Queue-ku wuxuu raacaa kala horreynta 1 ilaa 74, wuxuuna xafidaa booska iyo cinwaanka hakaday. **Save checkpoint** ayaa soo dejinaya booskaas; **Restore checkpoint** ayaa dib u soo celinaya. Saddex transient network retry oo xaddidan kadib, cilad kale waxay cinwaanka u dhigtaa deferred oo u gudbisaa kan xiga. Cinwaankaas weli incomplete ayuu ahaanayaa.

Badhamada queue-ku waa diiwaangelin oo keliya: demo dibadda ah ma furaan, mana caddaynayaan in capture cusub la sameeyey.

## Server maxalli ah

Python 3.10+ ayaa ku filan; package kale lama rakibayo. Terminal-ka ka dhex fur folder-kan:

```sh
python3 server.py --root . --port 8740
```

Kadib fur **http://127.0.0.1:8740/**. Ctrl+C ayaa joojinaya. Server-ku waa akhris-keliya, wuxuu ku xiran yahay loopback oo keliya, codsina uma diro provider-ka.

## Xadka caddeynta

Captures-ku weli waa qayb ahaan: audio asal ah iyo video xiriir ah lama helin, daqiiqad dhan oo ciyaar firfircoon ahna lama xaqiijin. Clips-ku waxay dib u ciyaaraan sawirro leh timestamps; gaps-ka si cad ayaa loo diiwaangeliyey. Tijaabada reel-ku waa dhaqdhaqaaq maxalli ah, mana xaqiijinayso mechanics-ka provider-ka.

**Browser QA:** muuqaalka desktop/mobile iyo playback-ka app-kan laguma xaqiijin deegaanka shaqada. Cloud browser-ku wuxuu diiday file URLs, ma gaarin loopback server-ka, Chromium maxalli ahna wuxuu istaagay socket permission. Tijaabooyinka xogta, server-ka iyo state engine-ka waa gudbeen; eeg `validation.json` iyo `README.md`.
