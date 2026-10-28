
/* SUPERWIN game-only v2410. No result generation or client-side balance edits. */
(()=>{'use strict';
const id=new URLSearchParams(location.search).get('game');
const meta={
hot_foxy_20:{lines:20,title:'FOXY HOT 20',symbols:'FOX WILD · RED 7 · BELL · MELON · ORANGE · LEMON · CHERRY · STAR',wheel:'TOP WHEEL'},
multi_hot_5_video:{lines:5,title:'MULTI HOT 5',symbols:'777 · DOLLAR · BELLS · GRAPES · PLUM · LEMON · CHERRY',wheel:'SIDE MULTIPLIER'},
multi_hot_40:{lines:40,title:'MULTI HOT 40',symbols:'777 · BELLS · WILD · WATERMELON · CHERRY · GRAPES',wheel:'TOP WHEEL'},
burning_ice:{lines:5,title:'BURNING ICE',symbols:'777 · WILD · BELL · FRUITS',wheel:'TOP WHEEL'},
wild_multi_stars:{lines:20,title:'WILD MULTI STARS',symbols:'STAR WILD · 777 · FRUITS · BELL',wheel:'TOP WHEEL'}
};const m=meta[id];if(!m)return;
const $=x=>document.getElementById(x),main=document.querySelector('main.cabinet');
if(!main)return;
const source=$('bet-dec'),sink=$('bet-inc'),bet=$('bet-display');
const details=document.createElement('div');details.className='sw-v2410-game-features';details.innerHTML='<span>'+m.lines+' FIXED LINES</span><span>'+m.wheel+'</span>';
const parent=$('game-frame');parent?.parentElement?.insertBefore(details,parent);
if(id==='multi_hot_5_video'&&parent){const side=document.createElement('div');side.className='sw-v2410-sidewheel';side.setAttribute('aria-label','Wheel result: only server-confirmed');side.innerHTML=['5','4','3','2','1'].map(n=>'<div data-times="'+n+'" aria-current="false">'+n+'×</div>').join('');parent.appendChild(side);window.addEventListener('superwin:round-settled',({detail})=>{const n=Number(detail.wheelMultiplier);for(const el of side.children)el.setAttribute('aria-current',String(Number(el.dataset.times)===n));});}
const shell=document.createElement('section');shell.className='sw-v2410-controls';shell.setAttribute('aria-label','Bet controls, same server-controlled wager');
shell.innerHTML='<button type="button" id="sw-v2410-minus" aria-label="Decrease bet">−</button><span><small>BET · ETB</small><strong id="sw-v2410-bet">—</strong></span><button type="button" id="sw-v2410-plus" aria-label="Increase bet">+</button>';
const insertBefore=$('bottom-meters')||document.querySelector('.bottom-meters'); if(insertBefore)insertBefore.parentElement.insertBefore(shell,insertBefore);
const dec=$('sw-v2410-minus'),inc=$('sw-v2410-plus'),out=$('sw-v2410-bet');
const refresh=()=>{out.textContent=bet?.textContent||'—';dec.disabled=!source||source.disabled;inc.disabled=!sink||sink.disabled;};
dec.addEventListener('click',()=>{if(!dec.disabled)source.click();refresh();});inc.addEventListener('click',()=>{if(!inc.disabled)sink.click();refresh();});const obs=new MutationObserver(refresh);if(bet)obs.observe(bet,{subtree:true,childList:true,characterData:true});for(const target of [source,sink])if(target)obs.observe(target,{attributes:true,attributeFilter:['disabled']});refresh();
let mounted=false;const observer=new MutationObserver(()=>{if(mounted)return;const rules=document.querySelector('.sw-game-rules');if(!rules)return;mounted=true;const box=document.createElement('section');box.className='sw-v2410-reference';box.innerHTML='<h3>'+m.title+' — CONTROL GUIDE</h3><div class="sw-v2410-meaning"><span><strong>'+m.lines+'</strong>LINES</span><span><strong>1×–5×</strong>MULTIPLIER</span><span><strong>ETB</strong>SERVER WALLET</span></div><h3>CONTROLS</h3><div class="sw-v2410-paths"><div class="sw-v2410-path"><b>↻</b><span>AUTO SPIN — runs up to 10 spins</span></div><div class="sw-v2410-path"><b>⚡</b><span>TURBO — faster reel animation</span></div><div class="sw-v2410-path"><b>±</b><span>BET — choose allowed stake</span></div><div class="sw-v2410-path"><b>×2</b><span>GAMBLE — only when game rules and server allow</span></div><div class="sw-v2410-path"><b>✓</b><span>COLLECT — win is already included in server balance</span></div><div class="sw-v2410-path"><b>◉</b><span>SPIN — one authenticated server-settled round</span></div></div><h3>SYMBOLS</h3><p>'+m.symbols+'</p><p>Winning lines, payouts and free spins are determined by the server paytable shown above. The browser never creates a win, and a disconnected round must be recovered with its original round token.</p>';
rules.append(box);observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true}); 
window.addEventListener('pagehide',()=>{obs.disconnect();observer.disconnect();},{once:true});
})();
