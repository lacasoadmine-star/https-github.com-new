import {GAMES as NATIVE_GAMES} from '../../apps/native-engine/catalog.mjs';
import {SMARTSOFT_CATALOG} from './smartsoft-catalog.mjs';

export const INTEGRATED_LOBBY_PATH = '/player-live-v248/lobby.mjs';

function once(source, anchor, replacement) {
  if (source.split(anchor).length !== 2) throw new Error('Unexpected lobby source: ' + anchor.slice(0, 70));
  return source.replace(anchor, replacement);
}

export function integrateLobbyScript(source) {
  const extra = Object.fromEntries(SMARTSOFT_CATALOG.games.map(game => [game.id, {
    ...game, title: game.name, provider: 'internal', external: true, family:NATIVE_GAMES[game.id].family, category:NATIVE_GAMES[game.id].family, demo_launcher_url:game.launch_url, launch_url:'/native/'+game.id,
  }]));
  let script = once(source, "import './presence.mjs';", "import '/player-live-v244/presence.mjs';");
  script = once(script, "const FILTERS=new Set(['all','slots','popular','saved']);",
    'Object.assign(CATALOG,' + JSON.stringify(extra) + ");\nconst FILTERS=new Set(['all','slots','popular','saved','crash','plinko','mines','dice','hilo','wheel','demo','etb']);");
  script = once(script, "state.provider=url.searchParams.get('provider')==='zplaybet'?'zplaybet':'all';",
    "state.provider=['zplaybet','internal'].includes(url.searchParams.get('provider'))?url.searchParams.get('provider'):'all';");
  script = once(script, "picture.className='game-image';", `picture.className='game-image';
  if(game.external){picture.classList.add('smartsoft-cover');picture.dataset.category=game.category.toLowerCase();picture.setAttribute('role','img');picture.setAttribute('aria-label',game.title);const mark=document.createElement('span');mark.className='smartsoft-category';mark.textContent=game.category;const name=document.createElement('strong');name.textContent=game.title;const badge=document.createElement('span');badge.className='smartsoft-badge';badge.textContent='INTERNAL · ETB';picture.append(mark,name,badge);return picture;}`);
  script = once(script, "(state.provider==='all'||g.provider===state.provider));",
    "(state.provider==='all'||g.provider===state.provider)&&(state.filter==='demo'?g.external:state.filter==='etb'?g.enabled:['slots','crash','plinko','mines','dice','hilo','wheel'].includes(state.filter)?(g.category||'Slots').toLowerCase()===state.filter:true));");
  script = once(script, "$('provider-count').textContent=String(state.games.length);",
    "$('provider-count').textContent=String(state.games.filter(g=>!g.external).length);$('smartsoft-count').textContent=String(state.games.filter(g=>g.external).length);");
  script = once(script, "const facts=[game.cols+' × '+game.rows+' reels',game.lines+' lines',game.wheel+' multiplier'];",
    "const facts=game.external?['Superwin internal',game.family,'Independent engine · ETB wallet']:[game.cols+' × '+game.rows+' reels',game.lines+' lines',game.wheel+' multiplier'];");
  script = once(script, "status.hidden=true;status.textContent='';", `status.hidden=true;status.textContent='';
  const demo=$('play-demo');demo.removeAttribute('href');demo.setAttribute('aria-disabled','true');
  if(game.external){demo.href='#demo';demo.removeAttribute('aria-disabled');status.textContent='Engine gudaha Superwin ah; ma aha ciyaarta rasmiga ah ee SmartSoft. Demo link-gu waa mid gooni ah oo aan la xaqiijin.';status.hidden=false;}`);
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
 if(url.origin!=='https://demo.smartsoftgaming.com'||url.username||url.password||!/^\\/games\\/[a-z0-9]+$/.test(url.pathname))return;
 closeDialog('detail');$('embedded-title').textContent=game.title+' · DEMO';$('embedded-demo').title=game.title+' demo';$('demo-fallback').href=url.href;
 $('embedded-demo').src=url.href;$('demo-player').showModal();
});
$('close-demo').addEventListener('click',closeEmbeddedDemo);$('demo-player').addEventListener('close',()=>$('embedded-demo').removeAttribute('src'));
for(const event of ['popstate','pagehide','zplay:logout','zplay:session-expired','zplay:session-changing'])window.addEventListener(event,closeEmbeddedDemo);
`;
  return script;
}

export function integrateLobbyHTML(source) {
  let html = once(source, '<script type="module" src="/player-live-v244/lobby.mjs"></script>',
    '<script type="module" src="' + INTEGRATED_LOBBY_PATH + '"></script>');
  html = once(html, '</head>', `<style>
.smartsoft-cover{display:flex!important;position:relative;flex-direction:column;align-items:center;justify-content:center;gap:10px;aspect-ratio:854/576;padding:18px;text-align:center;isolation:isolate;background:radial-gradient(circle at 78% 22%,#427c864f,transparent 45%),linear-gradient(145deg,#183547,#111b2c);color:#eefaff;overflow:hidden}
.smartsoft-cover::before{content:'';position:absolute;width:70%;aspect-ratio:1;border:1px solid #87d7d635;border-radius:50%;transform:translate(35%,-30%);z-index:-1}
.smartsoft-cover[data-category=crash]{background:radial-gradient(circle at 80% 20%,#ffae5e42,transparent 46%),linear-gradient(145deg,#503222,#171a2d)}
.smartsoft-cover[data-category=slots]{background:radial-gradient(circle at 80% 20%,#b18aff4f,transparent 46%),linear-gradient(145deg,#30254c,#131b2b)}
.smartsoft-cover strong{font-size:clamp(15px,2.4vw,25px);line-height:1.12;letter-spacing:-.03em;overflow-wrap:anywhere}.smartsoft-category{font-size:10px;text-transform:uppercase;letter-spacing:.16em;color:#c6dce7}.smartsoft-badge{font-size:9px;padding:4px 7px;border-radius:20px;background:#0005;color:#bdd6d7}
.provider-tabs,.filters{overflow-x:auto}.provider-tabs button,.filters button{flex-shrink:0}.demo-catalog-note{margin:12px 0 18px;padding:12px 15px;border:1px solid #685a36;border-radius:10px;color:#e8d5a7;background:#272319;font-size:12px;line-height:1.6}
#play-demo{margin-top:10px;text-align:center;text-decoration:none;display:flex;justify-content:center;align-items:center;min-height:46px}#play-demo[aria-disabled=true]{opacity:.45;cursor:not-allowed}
#demo-player{width:min(1100px,96vw);max-width:96vw;padding:0;background:#0c1724;color:#e8f2ff;border:1px solid #385166;border-radius:12px;overflow:hidden}#demo-player::backdrop{background:#000c}
.embedded-header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid #33475c}.embedded-header button{border:1px solid #46617b;border-radius:8px;padding:9px 14px;background:#172e44;color:white;font:inherit;cursor:pointer}
.embedded-note{padding:10px 18px;margin:0;font-size:12px;line-height:1.5;color:#c6d4e5}.embedded-note a{color:#8ee5ce}#embedded-demo{display:block;width:100%;height:72dvh;min-height:280px;border:0;background:#070b12}
@media(max-width:500px){.smartsoft-cover{padding:12px;gap:7px}.smartsoft-cover strong{font-size:19px}.provider-tabs button{white-space:nowrap}#demo-player{width:100vw;max-width:100vw;border-radius:0}#embedded-demo{height:72dvh}.embedded-header{padding:12px}}
</style></head>`);
  html = once(html, '</nav>\n    <div class="search-row">', '<button type="button" data-provider="internal" aria-pressed="false">Superwin · ETB <span id="smartsoft-count"></span></button></nav>\n    <div class="search-row">');
  html = once(html, '<nav class="filters" aria-label="Game categories">', '<p class="demo-catalog-note">30 ciyaarood oo gudaha Superwin ah ayaa la socda 3-dii hore, isla wallet-ka ETB. Crash, Plinko, Mines, Slots iyo ciyaaro kale waxay leeyihiin xeerar u gaar ah; ma aha integration rasmi ah oo SmartSoft.</p><nav class="filters" aria-label="Game categories">');
  html = once(html, '<button type="button" data-filter="slots" aria-pressed="false">Slots</button>', '<button type="button" data-filter="slots" aria-pressed="false">Slots</button><button type="button" data-filter="crash" aria-pressed="false">Crash</button><button type="button" data-filter="plinko" aria-pressed="false">Plinko</button><button type="button" data-filter="mines" aria-pressed="false">Mines</button><button type="button" data-filter="dice" aria-pressed="false">Dice</button><button type="button" data-filter="hilo" aria-pressed="false">Hi-Lo</button><button type="button" data-filter="wheel" aria-pressed="false">Wheel</button><button type="button" data-filter="demo" aria-pressed="false">DEMO</button><button type="button" data-filter="etb" aria-pressed="false">ETB</button>');
  html = once(html, '<span id="play-label">Sign in to play</span></a>', '<span id="play-label">Sign in to play</span></a><a id="play-demo" class="secondary-action" aria-disabled="true">PLAY DEMO</a>');
  html = once(html, '</body>', `<dialog id="demo-player" aria-labelledby="embedded-title"><header class="embedded-header"><strong id="embedded-title">DEMO</strong><button type="button" id="close-demo">Xidh</button></header><p class="embedded-note">Demo URL aan la xaqiijin. Credits-ka demo-gu wallet-ka ETB kuma xidhna. Haddii uusan furmin: <a id="demo-fallback" target="_blank" rel="noopener noreferrer">fur link-ga</a>.</p><iframe id="embedded-demo" title="External demo" sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock" allow="fullscreen" referrerpolicy="no-referrer"></iframe></dialog></body>`);
  return html;
}
