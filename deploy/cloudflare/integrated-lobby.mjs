import {OFFICIAL_DEMO_CATALOG} from './official-demo-catalog.mjs';

export const INTEGRATED_LOBBY_PATH='/player-live-v256/lobby.mjs';
function once(source,anchor,replacement){if(source.split(anchor).length!==2)throw Error('Unexpected lobby source: '+anchor.slice(0,70));return source.replace(anchor,replacement);}

export function integrateLobbyScript(source){
 const extra=Object.fromEntries(OFFICIAL_DEMO_CATALOG.games.map(game=>[game.id,{...game,title:game.name,provider:'smartsoft',external:true,demo_launcher_url:game.launch_url}]));
 let script=once(source,"import './presence.mjs';","import '/player-live-v244/presence.mjs';");
 script=once(script,"const FILTERS=new Set(['all','slots','popular','saved']);",'Object.assign(CATALOG,'+JSON.stringify(extra)+");\nconst FILTERS=new Set(['all','slots','popular','saved','crash','arcade','demo','etb']);");
 script=once(script,"state.provider=url.searchParams.get('provider')==='zplaybet'?'zplaybet':'all';","state.provider=['zplaybet','smartsoft'].includes(url.searchParams.get('provider'))?url.searchParams.get('provider'):'all';");
 script=once(script,"picture.className='game-image';",`picture.className='game-image';
 if(game.external){picture.classList.add('provider-cover');const image=document.createElement('img');image.src=game.cover;image.alt=game.title;image.width=493;image.height=617;image.loading='lazy';image.decoding='async';image.referrerPolicy='no-referrer';picture.append(image);const badge=document.createElement('span');badge.className='demo-badge';badge.textContent='DEMO';picture.append(badge);return picture;}`);
 script=once(script,"(state.provider==='all'||g.provider===state.provider));","(state.provider==='all'||g.provider===state.provider)&&(state.filter==='demo'?g.external:state.filter==='etb'?!g.external:['slots','crash','arcade'].includes(state.filter)?(g.category||'Slots').toLowerCase()===state.filter:true));");
 script=once(script,"$('provider-count').textContent=String(state.games.length);","$('provider-count').textContent=String(state.games.filter(g=>!g.external).length);$('smartsoft-count').textContent=String(state.games.filter(g=>g.external).length);");
 script=once(script,"const facts=[game.cols+' × '+game.rows+' reels',game.lines+' lines',game.wheel+' multiplier'];","const facts=game.external?['SmartSoft demo',game.category,'Superwin ETB']:[game.cols+' × '+game.rows+' reels',game.lines+' lines',game.wheel+' multiplier'];");
 script=once(script,"status.hidden=true;status.textContent='';",`status.hidden=true;status.textContent='';const demo=$('play-demo');demo.hidden=!game.external;demo.removeAttribute('href');demo.setAttribute('aria-disabled','true');if(game.external){demo.href='#demo';demo.removeAttribute('aria-disabled');}`);
 script=once(script,"$('play-label').textContent='Play now';","$('play-label').textContent='PLAY (ETB)';");
 script=once(script,"play.href='/play/'+game.slug;","play.href=game.external?'#wallet-game':'/play/'+game.slug;");
 script=once(script,"Object.values(CATALOG).filter(g=>received.has(g.id)).map(g=>{const model=received.get(g.id);return {...g,provider:'zplaybet',enabled:model.enabled===true};});","Object.values(CATALOG).filter(g=>g.external||received.has(g.id)).map(g=>{if(g.external)return {...g,enabled:true};const model=received.get(g.id);return {...g,provider:'zplaybet',category:'Slots',enabled:model.enabled===true};});");
 script+=`
let walletLaunchAbort=null,walletLaunchEpoch=0,walletLaunchBusy=false,activeWalletUser=null,activeWalletIdentity=null,activeWalletGame=null;
function cancelWalletLaunch(){walletLaunchEpoch++;walletLaunchAbort?.abort();walletLaunchBusy=false;}
function clearEmbeddedGame(){activeWalletUser=null;activeWalletIdentity=null;activeWalletGame=null;$('embedded-demo').removeAttribute('src');$('embedded-wallet').hidden=true;$('embedded-wallet-balance').textContent='';}
function closeEmbeddedDemo(){cancelWalletLaunch();if($('demo-player').open)$('demo-player').close();clearEmbeddedGame();}
function providerDemoURL(value){try{const url=new URL(value);return url.origin==='https://eu-server.ssgportal.com'&&!url.username&&!url.password&&url.pathname.toLowerCase()==='/gamelauncher/loader.aspx'&&url.searchParams.get('PortalName')?.toUpperCase()==='DEMO'&&['DEMO','DEMO_EXH'].includes(url.searchParams.get('Token'))?url:null;}catch{return null;}}
function openEmbeddedGame(game,wallet=null,approved=null){
 const url=wallet?new URL('/native/'+game.id+'?embed=1',location.origin):providerDemoURL(game.demo_launcher_url);if(!url)return;
 clearEmbeddedGame();walletLaunchBusy=false;closeDialog('detail');$('embedded-title').textContent=game.title;$('embedded-demo').title=game.title+(wallet?' · Superwin ETB':' · Demo');$('demo-fallback').href=url.href;$('session-kind').textContent=wallet?'SUPERWIN':'DEMO';if(approved){activeWalletUser=approved.user_id;activeWalletIdentity=approved.wallet_identity;activeWalletGame=game.id;}
 $('embedded-wallet').hidden=!wallet;if(wallet)$('embedded-wallet-balance').textContent=money(wallet.balance);
 $('embedded-demo').src=url.href;if(!$('demo-player').open)$('demo-player').showModal();
}
async function launchWalletGame(game){
 if(walletLaunchBusy||state.session!=='signedin'||!state.enabled||!money(state.balance)||BigInt(state.balance.replace('.',''))<=0n)return;
 cancelWalletLaunch();const epoch=walletLaunchEpoch,identity=state.identity;const abort=new AbortController();walletLaunchAbort=abort;walletLaunchBusy=true;
 const status=$('detail-status');status.hidden=false;status.textContent='Opening…';$('play').setAttribute('aria-disabled','true');const timeout=setTimeout(()=>abort.abort(),10000);
 try{
  const response=await fetch('/api/gateway/launch',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({game_id:game.id,mode:'ETB'}),signal:abort.signal});const data=await response.json();
  if(epoch!==walletLaunchEpoch||state.identity!==identity)return;
  if(response.status===401){expireSession();return;}
  if(!response.ok){if(response.status===403)state.enabled=false;if(response.status===409&&data.user_id===identity&&money(data.balance))state.balance=data.balance;updateAccount();throw Error(response.status===409?'Insufficient balance.':'Unable to open. Please retry.');}
  if(data.game_id!==game.id||data.wallet_identity!==identity||typeof data.user_id!=='string'||data.session_mode!=='INTERNAL_ETB'||data.settlement_enabled!==true||data.launch_url!=='/native/'+game.id+'?embed=1'||data.wallet?.currency!=='ETB'||!money(data.wallet.balance)||BigInt(data.wallet.balance.replace('.',''))<=0n)throw Error('Unable to verify this session.');
  state.balance=data.wallet.balance;updateAccount();openEmbeddedGame(game,data.wallet,data);
 }catch(error){if(epoch!==walletLaunchEpoch||state.identity!==identity)return;status.hidden=false;status.textContent=error.name==='AbortError'?'Connection timed out. Please retry.':error.message;}
 finally{clearTimeout(timeout);if(epoch===walletLaunchEpoch){walletLaunchBusy=false;$('play').removeAttribute('aria-disabled');}}
}
$('play-demo').addEventListener('click',event=>{event.preventDefault();const game=state.selected;if(game?.external&&$('play-demo').getAttribute('aria-disabled')!=='true'){if(state.session==='signedin'&&state.enabled&&money(state.balance)&&BigInt(state.balance.replace('.',''))>0n){void launchWalletGame(game);}else{cancelWalletLaunch();openEmbeddedGame(game);}}});
$('play').addEventListener('click',event=>{const game=state.selected;if(!game?.external||state.session!=='signedin'||!state.enabled||!money(state.balance)||BigInt(state.balance.replace('.',''))<=0n)return;event.preventDefault();void launchWalletGame(game);});
window.addEventListener('message',event=>{const data=event.data;if(event.origin!==location.origin||event.source!==$('embedded-demo').contentWindow||!activeWalletUser||activeWalletIdentity!==state.identity||data?.type!=='superwin:wallet-updated'||data.game_id!==activeWalletGame||data.user_id!==activeWalletUser||data.currency!=='ETB'||!money(data.balance))return;state.balance=data.balance;$('embedded-wallet-balance').textContent=money(data.balance);updateAccount();});
$('close-demo').addEventListener('click',closeEmbeddedDemo);$('close-detail').addEventListener('click',cancelWalletLaunch);
$('detail').addEventListener('close',()=>{if(walletLaunchBusy)cancelWalletLaunch();});
$('demo-player').addEventListener('close',()=>{if(!$('demo-player').open){cancelWalletLaunch();clearEmbeddedGame();}});
for(const event of ['popstate','pagehide','zplay:logout','zplay:session-expired','zplay:session-changing'])window.addEventListener(event,closeEmbeddedDemo);
`;
 return script;
}

export function integrateLobbyHTML(source){
 let html=once(source,'<script type="module" src="/player-live-v244/lobby.mjs"></script>','<script type="module" src="'+INTEGRATED_LOBBY_PATH+'"></script>');
 html=once(html,'</head>',`<style>
.provider-cover{position:relative;display:block!important;aspect-ratio:854/576;overflow:hidden;background:#102329}.provider-cover img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 47%}.demo-badge{position:absolute;top:10px;left:10px;padding:5px 9px;border-radius:6px;background:#e9c651;color:#1b240c;font-size:10px;font-weight:900;letter-spacing:.04em}
.provider-tabs,.filters{overflow-x:auto}.provider-tabs button,.filters button{flex-shrink:0}#play-demo{margin-top:10px;text-align:center;text-decoration:none;display:flex;justify-content:center;align-items:center;min-height:46px}#play-demo[aria-disabled=true]{opacity:.45;cursor:not-allowed}
#demo-player{width:min(1100px,96vw);max-width:96vw;padding:0;background:#0c1724;color:#e8f2ff;border:1px solid #385166;border-radius:12px;overflow:hidden}#demo-player::backdrop{background:#000c}.embedded-header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #33475c;flex-wrap:wrap}.embedded-heading{display:flex;align-items:center;gap:9px;min-width:0}.embedded-heading strong{overflow-wrap:anywhere}.session-demo{font-size:9px;letter-spacing:.08em;border:1px solid #806b3f;border-radius:5px;padding:4px 6px;color:#e3d1a4}.embedded-tools{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.embedded-tools a{color:#9edfc9;font-size:11px;text-decoration:none}.embedded-header button{border:1px solid #46617b;border-radius:7px;padding:8px 12px;background:#172e44;color:white;font:inherit;cursor:pointer}#embedded-wallet{display:flex;align-items:center;gap:6px;font-size:10px;color:#aabeca}#embedded-wallet-balance{font-size:13px;color:#a7ead0;font-variant-numeric:tabular-nums}#embedded-demo{display:block;width:100%;height:78dvh;min-height:280px;border:0;background:#070b12}
@media(max-width:500px){#demo-player{width:100vw;max-width:100vw;border-radius:0}.embedded-header{padding:10px 12px;gap:8px}.embedded-heading{font-size:13px}.embedded-tools{gap:10px}#embedded-demo{height:78dvh}.provider-tabs button{white-space:nowrap}}
</style></head>`);
 html=once(html,'</nav>\n    <div class="search-row">','<button type="button" data-provider="smartsoft" aria-pressed="false">SmartSoft <span id="smartsoft-count"></span></button></nav>\n    <div class="search-row">');
 html=once(html,'<button type="button" data-filter="slots" aria-pressed="false">Slots</button>','<button type="button" data-filter="slots" aria-pressed="false">Slots</button><button type="button" data-filter="crash" aria-pressed="false">Crash</button><button type="button" data-filter="arcade" aria-pressed="false">Arcade</button><button type="button" data-filter="demo" aria-pressed="false">DEMO</button><button type="button" data-filter="etb" aria-pressed="false">ETB</button>');
 html=once(html,'<span id="play-label">Sign in to play</span></a>','<span id="play-label">Sign in to play</span></a><a id="play-demo" class="secondary-action" aria-disabled="true">PLAY DEMO</a>');
 html=once(html,'</body>',`<dialog id="demo-player" aria-labelledby="embedded-title"><header class="embedded-header"><div class="embedded-heading"><strong id="embedded-title"></strong><span class="session-demo" id="session-kind">DEMO</span></div><div class="embedded-tools"><span id="embedded-wallet" hidden>Wallet <strong id="embedded-wallet-balance"></strong></span><a id="demo-fallback" target="_blank" rel="noopener noreferrer">↗ Open</a><button type="button" id="close-demo" aria-label="Close game">×</button></div></header><iframe id="embedded-demo" title="Game" sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock" allow="fullscreen" referrerpolicy="no-referrer"></iframe></dialog></body>`);
 return html;
}
