import {OFFICIAL_DEMO_CATALOG as SMARTSOFT_CATALOG} from './official-demo-catalog.mjs';

export const INTEGRATED_LOBBY_PATH = '/player-live-v251/lobby.mjs';

function once(source, anchor, replacement) {
  if (source.split(anchor).length !== 2) throw new Error('Unexpected lobby source: ' + anchor.slice(0, 70));
  return source.replace(anchor, replacement);
}

export function integrateLobbyScript(source) {
  const extra = Object.fromEntries(SMARTSOFT_CATALOG.games.map(game => [game.id, {
    ...game, title: game.name, provider:'smartsoft',external:true,demo_launcher_url:game.launch_url,
  }]));
  let script = once(source, "import './presence.mjs';", "import '/player-live-v244/presence.mjs';");
  script = once(script, "const FILTERS=new Set(['all','slots','popular','saved']);",
    'Object.assign(CATALOG,' + JSON.stringify(extra) + ");\nconst FILTERS=new Set(['all','slots','popular','saved','crash','arcade','demo','etb']);");
  script = once(script, "state.provider=url.searchParams.get('provider')==='zplaybet'?'zplaybet':'all';",
    "state.provider=['zplaybet','smartsoft'].includes(url.searchParams.get('provider'))?url.searchParams.get('provider'):'all';");
  script = once(script, "picture.className='game-image';", `picture.className='game-image';
  if(game.external){picture.classList.add('provider-cover');const image=document.createElement('img');image.src=game.cover;image.alt=game.title;image.width=493;image.height=617;image.loading='lazy';image.decoding='async';image.referrerPolicy='no-referrer';picture.append(image);const badge=document.createElement('span');badge.className='demo-badge';badge.textContent='DEMO';picture.append(badge);return picture;}`);
  script = once(script, "(state.provider==='all'||g.provider===state.provider));",
    "(state.provider==='all'||g.provider===state.provider)&&(state.filter==='demo'?g.external:state.filter==='etb'?!g.external:['slots','crash','arcade'].includes(state.filter)?(g.category||'Slots').toLowerCase()===state.filter:true));");
  script = once(script, "$('provider-count').textContent=String(state.games.length);",
    "$('provider-count').textContent=String(state.games.filter(g=>!g.external).length);$('smartsoft-count').textContent=String(state.games.filter(g=>g.external).length);");
  script = once(script, "const facts=[game.cols+' × '+game.rows+' reels',game.lines+' lines',game.wheel+' multiplier'];",
    "const facts=game.external?['SmartSoft Gaming',game.category,'DEMO · Virtual credits']:[game.cols+' × '+game.rows+' reels',game.lines+' lines',game.wheel+' multiplier'];");
  script = once(script, "status.hidden=true;status.textContent='';", `status.hidden=true;status.textContent='';
  const demo=$('play-demo');demo.removeAttribute('href');demo.setAttribute('aria-disabled','true');
  demo.hidden=!game.external;if(game.external){demo.href='#demo';demo.removeAttribute('aria-disabled');$('play-label').textContent='PLAY (ETB) · TEST';play.href='#etb-test';status.textContent='ETB TEST: hubi akoonkaaga, balance-ka iyo stake-ka. Tijaabadu wax lacag ah kama jarayso. PLAY DEMO wuxuu furayaa ciyaarta.';status.hidden=false;return;}`);
  script = once(script, "$('play-label').textContent='Play now';", "$('play-label').textContent='PLAY (ETB)';");
  script = once(script,
    "Object.values(CATALOG).filter(g=>received.has(g.id)).map(g=>{const model=received.get(g.id);return {...g,provider:'zplaybet',enabled:model.enabled===true};});",
    "Object.values(CATALOG).filter(g=>g.external||received.has(g.id)).map(g=>{if(g.external)return {...g,enabled:true};const model=received.get(g.id);return {...g,provider:'zplaybet',category:'Slots',enabled:model.enabled===true};});");
  script = once(script, "play.href='/play/'+game.slug;", "play.href=game.external?'/native/'+game.id:'/play/'+game.slug;");
  script += `
// External demos open inside the existing lobby and never call settlement.
function closeEmbeddedDemo(){if($('demo-player').open)$('demo-player').close();$('embedded-demo').removeAttribute('src');}
$('play-demo').addEventListener('click',event=>{
 event.preventDefault();const game=state.selected;if(!game?.external||$('play-demo').getAttribute('aria-disabled')==='true')return;
 let url;try{url=new URL(game.demo_launcher_url);}catch{return;}
 if(url.origin!=='https://eu-server.ssgportal.com'||url.username||url.password||url.pathname.toLowerCase()!=='/gamelauncher/loader.aspx'||url.searchParams.get('PortalName')?.toUpperCase()!=='DEMO'||!['DEMO','DEMO_EXH'].includes(url.searchParams.get('Token')))return;
 closeDialog('detail');$('embedded-title').textContent=game.title+' · DEMO';$('embedded-demo').title=game.title+' demo';$('demo-fallback').href=url.href;
 $('embedded-demo').src=url.href;$('demo-player').showModal();
});
$('play').addEventListener('click',event=>{if(state.selected?.external){event.preventDefault();openEtbTest(state.selected);}});
$('embedded-etb-test').addEventListener('click',()=>{if(state.selected?.external)openEtbTest(state.selected);});
$('close-demo').addEventListener('click',closeEmbeddedDemo);$('demo-player').addEventListener('close',()=>$('embedded-demo').removeAttribute('src'));
for(const event of ['popstate','pagehide','zplay:logout','zplay:session-expired','zplay:session-changing'])window.addEventListener(event,closeEmbeddedDemo);
`;
  script += `
let etbTestGame=null,etbTestAbort=null,etbTestEpoch=0,etbTestWallet=null,etbTestBusy=false;
function etbTestStake(){const raw=$('etb-test-stake').value.trim();if(!/^(?:0|[1-9]\\d{0,3})(?:\\.\\d{1,2})?$/.test(raw))return null;const [whole,part='']=raw.split('.');const minor=BigInt(whole)*100n+BigInt(part.padEnd(2,'0'));return minor>=100n&&minor<=100000n?{minor,value:whole+'.'+part.padEnd(2,'0')}:null;}
function etbTestControls(){const stake=etbTestStake(),wallet=etbTestWallet;const canCheck=wallet&&wallet.enabled===true&&stake&&BigInt(wallet.balance.replace('.',''))>=stake.minor;$('run-etb-test').disabled=etbTestBusy||!canCheck;$('refresh-etb-credit').disabled=etbTestBusy;$('etb-credit-state').textContent=!wallet?'AWAITING WALLET':BigInt(wallet.balance.replace('.',''))<100n?'CREDIT REQUIRED':wallet.enabled!==true?'ACCOUNT UNAVAILABLE':'CREDIT AVAILABLE';}
function closeEtbTest(){etbTestEpoch++;etbTestAbort?.abort();etbTestGame=null;etbTestWallet=null;etbTestBusy=false;$('etb-test-balance').textContent='—';$('etb-test-status').textContent='';$('etb-test-login').hidden=true;etbTestControls();if($('etb-test').open)$('etb-test').close();}
function openEtbTest(game){closeEtbTest();etbTestGame=game;$('etb-test-game').textContent=game.title+' · ETB Test mode';$('etb-test').showModal();void loadEtbTestWallet();}
async function loadEtbTestWallet(){
 if(!etbTestGame||!$('etb-test').open)return;
 etbTestAbort?.abort();const abort=new AbortController();etbTestAbort=abort;const epoch=++etbTestEpoch;etbTestBusy=true;etbTestWallet=null;etbTestControls();const status=$('etb-test-status');status.dataset.error='false';status.textContent='Waxaan akhrinayaa wallet-kaaga jira…';$('etb-test-balance').textContent='—';$('etb-test-login').hidden=true;
 const timeout=setTimeout(()=>abort.abort(),10000);
 try{
  const response=await fetch('/api/wallet',{credentials:'same-origin',cache:'no-store',signal:abort.signal}),data=await response.json();if(epoch!==etbTestEpoch||!$('etb-test').open)return;
  if(response.status===401){$('etb-test-login').hidden=false;throw Error('Gal akoonkaaga Player-ka si loo arko wallet-kaaga.');}
  if(!response.ok||data.currency!=='ETB'||!money(data.balance)||typeof data.user_id!=='string')throw Error('Wallet-ka lama akhrin. Riix REFRESH BALANCE.');
  etbTestWallet=data;$('etb-test-balance').textContent=money(data.balance);
  status.textContent=BigInt(data.balance.replace('.',''))<100n?'ETB Test waa diyaar. Credit ayaa loo baahan yahay ka hor isticmaalka. Marka wallet-ka credit la geliyo, riix REFRESH BALANCE.':data.enabled!==true?'Akoonka waa la helay, laakiin ciyaartiisu ma furna.':'Wallet-ka waa la helay. Geli stake, dabadeed adigu riix TEST WALLET. Waxba isma bilaabayaan.';
 }catch(error){if(epoch!==etbTestEpoch||!$('etb-test').open)return;status.dataset.error='true';status.textContent=error.name==='AbortError'?'Xidhiidhku wuu daahay. Riix REFRESH BALANCE.':error.message;}
 finally{clearTimeout(timeout);if(epoch===etbTestEpoch){etbTestBusy=false;etbTestControls();}}
}
async function runEtbTest(){
 const stake=etbTestStake();if(!etbTestGame||!$('etb-test').open||etbTestBusy||!etbTestWallet||etbTestWallet.enabled!==true||!stake||BigInt(etbTestWallet.balance.replace('.',''))<stake.minor)return;
 etbTestAbort?.abort();const abort=new AbortController();etbTestAbort=abort;const epoch=++etbTestEpoch,game=etbTestGame;etbTestBusy=true;etbTestControls();const status=$('etb-test-status');status.dataset.error='false';status.textContent='Waxaan hubinayaa stake-ka, wallet-ka iyo backend-kaaga…';
 const timeout=setTimeout(()=>abort.abort(),10000);
 try{
  const response=await fetch('/api/wallet/test',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({game_id:game.id,stake:stake.value}),signal:abort.signal}),data=await response.json();if(epoch!==etbTestEpoch||!$('etb-test').open)return;
  if(response.status===401){etbTestWallet=null;$('etb-test-balance').textContent='—';$('etb-test-login').hidden=false;throw Error('Gal akoonkaaga Player-ka si loo hubiyo wallet-kaaga.');}
  if(!response.ok){const messages={INSUFFICIENT_ETB_BALANCE:'Balance-ka ETB kuma filna stake-kan. Riix REFRESH BALANCE.',ACCOUNT_PLAY_DISABLED:'Ciyaarta akoonkan waa xidhantahay.',TEST_STAKE_OUTSIDE_LIMITS:'Stake-ku waa inuu ahaadaa ETB 1–1,000.'};throw Error(messages[data.detail]||'Wallet-ka lama hubin. Mar kale tijaabi.');}
  if(data.test_only!==true||data.ledger_mutated!==false||data.debit_executed!==false||data.currency!=='ETB'||!money(data.balance)||data.game_id!==game.id)throw Error('Jawaabta wallet-ka lama xaqiijin.');
  if(etbTestWallet.user_id!==data.user_id){etbTestWallet=null;$('etb-test-balance').textContent='—';throw Error('Akoonka waa is beddelay. Riix REFRESH BALANCE.');}
  etbTestWallet={...etbTestWallet,balance:data.balance};$('etb-test-balance').textContent=money(data.balance);status.textContent='TEST PASSED · Akoonkaaga, wallet-ka iyo backend-ku way isku xidhan yihiin. Stake-ka '+stake.value+' ETB wuu ku filan yahay. Wax lacag ah lagama jarin.';
  if(state.session==='signedin'&&data.user_id===state.identity){state.balance=data.balance;updateAccount();}
 }catch(error){if(epoch!==etbTestEpoch||!$('etb-test').open)return;status.dataset.error='true';status.textContent=error.name==='AbortError'?'Xidhiidhku wuu daahay. Adigu mar kale tijaabi.':error.message;}
 finally{clearTimeout(timeout);if(epoch===etbTestEpoch){etbTestBusy=false;etbTestControls();}}
}
$('etb-test-stake').addEventListener('input',etbTestControls);$('run-etb-test').addEventListener('click',()=>void runEtbTest());$('refresh-etb-credit').addEventListener('click',()=>void loadEtbTestWallet());$('close-etb-test').addEventListener('click',closeEtbTest);$('etb-test').addEventListener('close',closeEtbTest);
for(const event of ['popstate','pagehide','zplay:logout','zplay:session-expired','zplay:session-changing'])window.addEventListener(event,closeEtbTest);
`;
  return script;
}

export function integrateLobbyHTML(source) {
  let html = once(source, '<script type="module" src="/player-live-v244/lobby.mjs"></script>',
    '<script type="module" src="' + INTEGRATED_LOBBY_PATH + '"></script>');
  html = once(html, '</head>', `<style>
.provider-cover{position:relative;display:block!important;aspect-ratio:854/576;overflow:hidden;background:#102329}.provider-cover img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 47%}.demo-badge{position:absolute;top:10px;left:10px;padding:5px 9px;border-radius:6px;background:#e9c651;color:#1b240c;font-size:10px;font-weight:900;letter-spacing:.04em}.smartsoft-cover{display:flex!important;position:relative;flex-direction:column;align-items:center;justify-content:center;gap:10px;aspect-ratio:854/576;padding:18px;text-align:center;isolation:isolate;background:radial-gradient(circle at 78% 22%,#427c864f,transparent 45%),linear-gradient(145deg,#183547,#111b2c);color:#eefaff;overflow:hidden}
.smartsoft-cover::before{content:'';position:absolute;width:70%;aspect-ratio:1;border:1px solid #87d7d635;border-radius:50%;transform:translate(35%,-30%);z-index:-1}
.smartsoft-cover[data-category=crash]{background:radial-gradient(circle at 80% 20%,#ffae5e42,transparent 46%),linear-gradient(145deg,#503222,#171a2d)}
.smartsoft-cover[data-category=slots]{background:radial-gradient(circle at 80% 20%,#b18aff4f,transparent 46%),linear-gradient(145deg,#30254c,#131b2b)}
.smartsoft-cover strong{font-size:clamp(15px,2.4vw,25px);line-height:1.12;letter-spacing:-.03em;overflow-wrap:anywhere}.smartsoft-category{font-size:10px;text-transform:uppercase;letter-spacing:.16em;color:#c6dce7}.smartsoft-badge{font-size:9px;padding:4px 7px;border-radius:20px;background:#0005;color:#bdd6d7}
.provider-tabs,.filters{overflow-x:auto}.provider-tabs button,.filters button{flex-shrink:0}.demo-catalog-note{margin:12px 0 18px;padding:12px 15px;border:1px solid #685a36;border-radius:10px;color:#e8d5a7;background:#272319;font-size:12px;line-height:1.6}
#play-demo{margin-top:10px;text-align:center;text-decoration:none;display:flex;justify-content:center;align-items:center;min-height:46px}#play-demo[aria-disabled=true]{opacity:.45;cursor:not-allowed}
#demo-player{width:min(1100px,96vw);max-width:96vw;padding:0;background:#0c1724;color:#e8f2ff;border:1px solid #385166;border-radius:12px;overflow:hidden}#demo-player::backdrop{background:#000c}
.embedded-header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid #33475c}.embedded-header button{border:1px solid #46617b;border-radius:8px;padding:9px 14px;background:#172e44;color:white;font:inherit;cursor:pointer}
.embedded-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.embedded-actions #embedded-etb-test{background:#2b654e;color:#e7ffef;border-color:#69b68c;font-size:11px}#etb-test{width:min(460px,94vw);max-width:94vw;padding:0;background:#101e2b;color:#ecf6ff;border:1px solid #4b776b;border-radius:14px}#etb-test::backdrop{background:#000b}.etb-test-body{padding:18px;font-size:13px;line-height:1.6}.etb-test-body label{display:block;margin-top:18px}.etb-test-body input{box-sizing:border-box;width:100%;padding:12px;margin:7px 0 12px;background:#07131d;border:1px solid #46617b;color:white;border-radius:8px;font:inherit}.etb-test-body button{width:100%;padding:13px;border:1px solid #a8e4be;border-radius:8px;background:#94ddb1;color:#092a1a;font:inherit;font-weight:800;cursor:pointer}#refresh-etb-credit{margin-top:9px;background:#1b3344;color:#d9e9f3;border-color:#476174}.etb-test-body button:disabled{opacity:.5;cursor:wait}.test-badge{color:#f1d99a;font-size:10px;letter-spacing:.1em;font-weight:bold}.etb-test-note{font-size:11px;color:#aabccc}#etb-test-status[data-error=true]{color:#ffb9b1}#etb-test-login{color:#a4e5bc}.embedded-note{padding:10px 18px;margin:0;font-size:12px;line-height:1.5;color:#c6d4e5}.embedded-note a{color:#8ee5ce}#embedded-demo{display:block;width:100%;height:72dvh;min-height:280px;border:0;background:#070b12}
@media(max-width:500px){.smartsoft-cover{padding:12px;gap:7px}.smartsoft-cover strong{font-size:19px}.provider-tabs button{white-space:nowrap}#demo-player{width:100vw;max-width:100vw;border-radius:0}#embedded-demo{height:72dvh}.embedded-header{padding:12px}}
</style></head>`);
  html = once(html, '</nav>\n    <div class="search-row">', '<button type="button" data-provider="smartsoft" aria-pressed="false">SmartSoft · DEMO <span id="smartsoft-count"></span></button></nav>\n    <div class="search-row">');
  html = once(html, '<nav class="filters" aria-label="Game categories">', '<p class="demo-catalog-note">30 demo oo laga keenay catalog-ka rasmiga ah ee SmartSoft. PLAY DEMO wuxuu furaa ciyaarta. PLAY (ETB) · TEST wuxuu hubiyaa wallet-kaaga jira; lacag kama jarayo. 3-dii ciyaarood ee ETB waxay ku sii jiraan isla player-ka.</p><nav class="filters" aria-label="Game categories">');
  html = once(html, '<button type="button" data-filter="slots" aria-pressed="false">Slots</button>', '<button type="button" data-filter="slots" aria-pressed="false">Slots</button><button type="button" data-filter="crash" aria-pressed="false">Crash</button><button type="button" data-filter="arcade" aria-pressed="false">Arcade</button><button type="button" data-filter="demo" aria-pressed="false">DEMO</button><button type="button" data-filter="etb" aria-pressed="false">ETB</button>');
  html = once(html, '<span id="play-label">Sign in to play</span></a>', '<span id="play-label">Sign in to play</span></a><a id="play-demo" class="secondary-action" aria-disabled="true">PLAY DEMO</a>');
  html = once(html, '</body>', `<dialog id="demo-player" aria-labelledby="embedded-title"><header class="embedded-header"><strong id="embedded-title">DEMO</strong><div class="embedded-actions"><button type="button" id="embedded-etb-test">PLAY (ETB) · TEST</button><button type="button" id="close-demo">Xidh</button></div></header><p class="embedded-note">SmartSoft DEMO · Credits-ka demo-gu wallet-ka ETB kuma xidhna. Haddii aad rabto shaashad buuxda: <a id="demo-fallback" target="_blank" rel="noopener noreferrer">fur link-ga</a>.</p><iframe id="embedded-demo" title="External demo" sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock" allow="fullscreen" referrerpolicy="no-referrer"></iframe></dialog><dialog id="etb-test" aria-labelledby="etb-test-title"><header class="embedded-header"><strong id="etb-test-title">ETB Wallet Test</strong><button type="button" id="close-etb-test">Xidh</button></header><div class="etb-test-body"><p class="test-badge">TEST ONLY · NO WALLET DEBIT</p><p id="etb-test-game"></p><p id="etb-credit-state" class="test-badge">AWAITING WALLET</p><p>Wallet-kaaga jira: <strong id="etb-test-balance">—</strong></p><label for="etb-test-stake">Stake lagu hubiyo · ETB 1–1,000</label><input id="etb-test-stake" inputmode="decimal" value="10.00" maxlength="9" autocomplete="off"><button type="button" id="run-etb-test" disabled>TEST WALLET</button><button type="button" id="refresh-etb-credit">REFRESH BALANCE</button><p id="etb-test-status" role="status" aria-live="polite"></p><a id="etb-test-login" href="/account?view=login" hidden>Gal akoonkaaga Player-ka</a><p class="etb-test-note">ETB Test waa la geli karaa balance-ku xataa yahay 0.00. Credit ayaa ka horreeya isticmaalka. Credit halkan laguma abuurayo; wallet-ka jira ayaa laga akhrinayaa. Guul/khasaaro lama xisaabinayo, lacag lama jarayo, waxna iskood uma bilaabmayaan.</p></div></dialog></body>`);
  return html;
}
