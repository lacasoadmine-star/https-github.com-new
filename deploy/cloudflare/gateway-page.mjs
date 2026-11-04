export const GATEWAY_HTML = `<!doctype html>
<html lang="so"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Superwin · Demo Catalog</title><style>
:root{font-family:system-ui,sans-serif;color-scheme:dark;background:#0b111b;color:#ecf3ff}*{box-sizing:border-box}
body{margin:0;display:grid;grid-template-columns:280px minmax(0,1fr);min-height:100dvh}a{color:#82edd1}button,input{font:inherit}
button{cursor:pointer;border:1px solid #3a4c65;border-radius:9px;padding:11px 15px;background:#203047;color:#eff6ff}button:disabled{cursor:not-allowed;opacity:.45}
button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #82edd1;outline-offset:3px}aside{min-width:0;padding:22px;background:#131e2e;border-right:1px solid #293a51}
h1{font-size:20px;margin:0 0 10px}h2{font-size:20px;margin:0}h3{font-size:13px;color:#aabbd2;margin:24px 0 10px}p{line-height:1.6}small{display:block;color:#aabbd2;line-height:1.6}
input{width:100%;padding:11px;color:white;background:#091421;border:1px solid #3a4c65;border-radius:9px;margin-top:18px}
.card{width:100%;display:block;text-align:left;margin:8px 0}.card[aria-pressed=true]{border-color:#82edd1;background:#143c37}.card small{font-size:11px}
main{min-width:0;padding:24px;display:flex;flex-direction:column;gap:18px}header{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:18px}
.wallet{border:1px solid #315b58;background:#152d33;padding:12px 18px;border-radius:12px;min-width:180px}.wallet strong{font-size:22px;font-variant-numeric:tabular-nums}
.hint{padding:14px 18px;background:#302b1b;border:1px solid #60512a;border-radius:12px;color:#f0d89c;margin:0;font-size:13px}
#arena{position:relative;flex:1;min-height:520px;background:radial-gradient(ellipse at center,#213d55,#0a111d);border:1px solid #2d425c;border-radius:18px;overflow:hidden}
#intro{position:absolute;inset:0;display:grid;place-content:center;text-align:center;padding:28px}#intro p{max-width:530px;color:#b6c9df}
iframe{width:100%;height:75dvh;min-height:520px;border:0;background:#080c13}#controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
#play-etb{background:#82edd1;color:#08251d;font-weight:800}#play-demo{background:#c8d1ff;color:#1b2444;font-weight:800}
#status{margin:0;min-height:28px;color:#b6c9df}#status[data-error=true]{color:#ffb1ab}#retry-wallet{font-size:12px;padding:6px 10px;margin-top:6px}
[hidden]{display:none!important}@media(max-width:760px){body{grid-template-columns:minmax(0,1fr)}aside{padding:16px;border-right:0;border-bottom:1px solid #293a51}
#demo-list,#native-list{display:flex;gap:8px;overflow-x:auto}.card{min-width:165px;width:165px;flex-shrink:0}h3{margin-top:16px}main{padding:16px}#arena{min-height:430px}iframe{min-height:430px}}
</style><script type="module" src="/gateway-player.mjs"></script>
<script type="module" src="/player-live-v244/presence.mjs"></script></head><body>
<aside><h1>Superwin Player</h1><a href="/">← Lobby</a><label><span class="search-label">Raadi ciyaar</span><input id="search" type="search" placeholder="Magaca ciyaarta" autocomplete="off"></label>
<h3 id="demo-heading">Demo links</h3><nav id="demo-list" aria-labelledby="demo-heading"></nav>
<h3 id="native-heading">Ciyaaraha ETB ee jira</h3><nav id="native-list" aria-labelledby="native-heading"></nav></aside>
<main><header><div><h2 id="title">Dooro ciyaar</h2><small id="category">Catalog</small></div>
<div class="wallet"><small>Wallet-ka akoonkaaga · ETB</small><strong id="balance">—</strong><small><a id="login" href="/account?view=login">Soo gal akoonkaaga</a></small><button id="retry-wallet" type="button">Cusboonaysii balance</button></div></header>
<p class="hint">30 demo links ayaa la soo gudbiyey; lama xaqiijin inay shaqaynayaan. Provider gateway-ga ETB kuma xidhna ciyaarahan. Credits-ka demo-ga dibadda iyo wallet-ka ETB waa kala madax bannaan yihiin.</p>
<section id="arena" aria-label="Game player"><div id="intro"><h2 id="intro-title">Demo iyo ETB</h2><p id="intro-text">Dooro ciyaar liiska. Badhamadu waxay muujinayaan mode-ka loo heli karo ciyaartaas.</p></div>
<iframe id="game-frame" title="Selected game" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock" allow="fullscreen" hidden></iframe></section>
<div id="controls"><button id="play-demo" type="button" disabled>PLAY DEMO</button><button id="play-etb" type="button" disabled>PLAY (ETB)</button><a id="open-tab" target="_blank" rel="noopener noreferrer" hidden>Ku fur tab cusub</a><button id="close-game" type="button" hidden>Xidh ciyaarta</button></div>
<p id="status" role="status" aria-live="polite">Soo dejinaya catalog-ka…</p>
</main></body></html>`;
