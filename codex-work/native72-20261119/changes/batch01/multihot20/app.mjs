// Multi Hot 20 presentation. Only the existing authenticated Player API may
// authorize bets, choose outcomes, debit the account or settle winnings.
import {GAME_ID,GameController,validateReceipt} from './controller.mjs';
import {MultiHot20Scene} from './scene.mjs';
import {Session} from './session.mjs';
import {loadVerifiedAssets,createSoundEngine} from './assets.mjs';

// Captured Images-0..3 TexturePacker Buttons frames. Frame w/h describe the
// unrotated trimmed sprite; a rotated frame occupies h/w pixels in its atlas.
const CONTROL_ATLASES=[[2047,2047],[2047,2025],[2047,2047],[1093,1946]];
const controlFrame=(atlas,x,y,w,h,rotated=false,trimX=0,trimY=0,sourceW=w,sourceH=h)=>Object.freeze({
 atlas:`atlas-${atlas}.png`,atlasWidth:CONTROL_ATLASES[atlas][0],atlasHeight:CONTROL_ATLASES[atlas][1],
 x,y,w,h,rotated,trimX,trimY,sourceW,sourceH
});
const spinFrame=controlFrame(2,1593,1534,255,255,false,12,12,279,279);
const spinActiveFrame=controlFrame(2,868,1751,255,255,false,12,12,279,279);
const spinTurboFrame=controlFrame(2,1580,1791,255,255,false,12,12,279,279);
const spinTurboStopFrame=controlFrame(2,1080,1,255,255,false,12,12,279,279);
const autoActiveFrame=controlFrame(3,545,1715,136,135,false,4,6,141,141);
const autoStopActiveFrame=controlFrame(3,383,1769,141,141);
const betActiveFrame=controlFrame(3,956,1676,133,134);
const quickFrame=controlFrame(0,875,1984,61,75,true,12,18,84,99);
const quickActiveFrame=controlFrame(1,1820,1933,82,96,true,1,1,84,99);
const menuFrame=controlFrame(0,1,1984,48,33),menuActiveFrame=controlFrame(0,51,1984,48,33);
const soundOffActiveFrame=controlFrame(0,1856,1984,48,37,true,0,0,48,38);
const soundOnActiveFrame=controlFrame(0,1747,1667,38,37,true,0,0,48,38);
export const CONTROL_TEXTURES=Object.freeze({
 'Buttons/Spin':spinFrame,'Buttons/SpinDisabled':spinFrame,
 'Buttons/SpinActive':spinActiveFrame,'Buttons/SpinHover':spinActiveFrame,
 'Buttons/SpinStop':controlFrame(2,1125,1751,255,255,false,12,12,279,279),
 'Buttons/SpinTurbo':spinTurboFrame,'Buttons/SpinTurboHover':spinTurboFrame,
 'Buttons/SpinTurboStop':spinTurboStopFrame,'Buttons/SpinTurboStopHover':spinTurboStopFrame,
 'Buttons/AutoPlay':controlFrame(3,927,1539,136,135,false,4,6,141,141),
 'Buttons/AutoPlayActive':autoActiveFrame,'Buttons/AutoPlayHover':autoActiveFrame,
 'Buttons/AutoPlayDisabled':controlFrame(3,683,1715,136,135,false,4,6,141,141),
 'Buttons/AutoPlayStop':controlFrame(2,1850,1608,141,141),
 'Buttons/AutoPlayStopActive':autoStopActiveFrame,'Buttons/AutoPlayStopHover':autoStopActiveFrame,
 'Buttons/AutoPlayStopDisabled':controlFrame(3,788,1554,137,137,false,3,3,141,141),
 'Buttons/Bet':controlFrame(3,821,1693,133,134),
 'Buttons/BetActive':betActiveFrame,'Buttons/BetHover':betActiveFrame,
 'Buttons/BetDisabled':controlFrame(3,956,1812,133,134,true),
 'Buttons/QuickPlay':quickFrame,'Buttons/QuickPlayDisabled':quickFrame,
 'Buttons/QuickPlayActive':quickActiveFrame,'Buttons/QuickPlayTurbo':quickActiveFrame,
 'Buttons/QuickPlayHover':controlFrame(1,1719,1933,84,99,true),
 'Buttons/Menu':menuFrame,'Buttons/MenuDisabled':menuFrame,
 'Buttons/MenuActive':menuActiveFrame,'Buttons/MenuHover':menuActiveFrame,
 'Buttons/SoundOff':controlFrame(0,1817,1984,48,37,true,0,0,48,38),
 'Buttons/SoundOffActive':soundOffActiveFrame,'Buttons/SoundOffHover':soundOffActiveFrame,'Buttons/SoundOffDisabled':soundOffActiveFrame,
 'Buttons/SoundOn':controlFrame(0,1934,1984,38,37,true,0,0,48,38),
 'Buttons/SoundOnActive':soundOnActiveFrame,'Buttons/SoundOnHover':soundOnActiveFrame,
 'Buttons/SoundOnDisabled':controlFrame(0,1707,1667,39,38,true,0,0,48,38)
});

export function controlTextureName(id,{disabled=false,pressed=false,hovered=false,spinning=false,
 autoplay=false,turbo=false,soundOn=false}={}){
 const suffix=disabled?'Disabled':pressed?'Active':hovered?'Hover':'';
 if(id==='spin'){
  if(disabled)return 'Buttons/SpinDisabled';
  if(spinning)return turbo?'Buttons/SpinTurboStop':'Buttons/SpinStop';
  return turbo?(hovered||pressed?'Buttons/SpinTurboHover':'Buttons/SpinTurbo'):'Buttons/Spin'+suffix;
 }
 if(id==='auto')return 'Buttons/AutoPlay'+(autoplay?'Stop':'')+suffix;
 if(id==='bet')return 'Buttons/Bet'+suffix;
 if(id==='turbo')return 'Buttons/QuickPlay'+(turbo&&!disabled?'Turbo':suffix);
 if(id==='menu')return 'Buttons/Menu'+suffix;
 if(id==='sound')return 'Buttons/Sound'+(soundOn?'On':'Off')+suffix;
 throw Error('UNKNOWN_CONTROL_TEXTURE');
}

export function createControlArt(name,url,dom=globalThis.document){
 const frame=CONTROL_TEXTURES[name];
 if(!frame||typeof url!=='string'||!url)throw Error('CONTROL_ART_UNAVAILABLE');
 const ns='http://www.w3.org/2000/svg',svg=dom.createElementNS(ns,'svg'),crop=dom.createElementNS(ns,'svg'),image=dom.createElementNS(ns,'image');
 svg.setAttribute('viewBox',`0 0 ${frame.sourceW} ${frame.sourceH}`);
 svg.setAttribute('preserveAspectRatio','xMidYMid meet');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 svg.classList.add('control-art');svg.dataset.texture=name;
 // The inner viewport clips exactly the packed sprite, including after a
 // quarter-turn. Atlas neighbours cannot bleed into transparent trim margins.
 for(const [key,value]of Object.entries({x:frame.trimX,y:frame.trimY,width:frame.w,height:frame.h,
  viewBox:`0 0 ${frame.w} ${frame.h}`,overflow:'hidden'}))crop.setAttribute(key,value);
 image.setAttribute('width',frame.atlasWidth);image.setAttribute('height',frame.atlasHeight);image.setAttribute('href',url);
 image.setAttribute('transform',frame.rotated?`matrix(0 -1 1 0 ${-frame.y} ${frame.x+frame.h})`:`translate(${-frame.x} ${-frame.y})`);
 crop.append(image);svg.append(crop);return svg;
}

// A held pointer requests ordinary controller spins one at a time. The next
// request is scheduled only after animation AND the authenticated ledger GET
// finish. Releasing/cancelling invalidates even an already queued callback.
export function createHoldSpin({getController,visible=()=>true,schedule=fn=>setTimeout(fn,0),cancelScheduled=id=>clearTimeout(id)}={}){
 if(typeof getController!=='function')throw Error('HOLD_CONTROLLER_REQUIRED');
 let pointer=null,sequence=0,scheduled=null,roundTask=Promise.resolve(false);
 const suppressedPointers=new Set();
 const cancel=()=>{pointer=null;sequence++;if(scheduled!==null){cancelScheduled(scheduled);scheduled=null}};
 const valid=(owner,version,stake,guard,initial=false)=>owner===getController()&&owner.generation===version&&
  owner.account?.sessionGuard===guard&&owner.bet===stake&&visible()&&owner.phase==='ready'&&!owner.pending&&!owner.auto?.started&&(initial||!owner.error);
 const run=async(owner,version,stake,guard,token,initial=false)=>{
  if(pointer===null||token!==sequence||!valid(owner,version,stake,guard,initial)){if(token===sequence)cancel();return false}
  let completed=false;
  try{completed=await owner.spin()}catch{/* The controller retains any unresolved request. */}
  if(pointer!==null&&token===sequence){
   if(completed&&valid(owner,version,stake,guard))scheduled=schedule(()=>{
    scheduled=null;if(pointer!==null&&token===sequence)roundTask=run(owner,version,stake,guard,token);
   });
   else cancel();
  }
  return completed;
 };
 return {
  get active(){return pointer!==null},get pointerId(){return pointer},get currentRound(){return roundTask},
  begin(id){
   const owner=getController();
   if(!Number.isInteger(id)||!visible()||!owner||!['ready','spinning'].includes(owner.phase))return false;
   // A second finger must not consume the first finger's release suppression.
   // Its rejected down/up gesture must not fall back to a fresh click either.
   suppressedPointers.add(id);
   if(suppressedPointers.size>32)for(const saved of suppressedPointers){if(saved!==pointer&&saved!==id){suppressedPointers.delete(saved);break}}
   if(pointer!==null)return false;
   if(owner.auto?.started)owner.stopAuto('HOLD_SPIN');
   if(owner.phase==='spinning'){owner.stop();return true}
   if(owner.pending)return false;
   pointer=id;const token=++sequence;
   roundTask=run(owner,owner.generation,owner.bet,owner.account?.sessionGuard,token,true);
   return true;
  },
  release(id){if(id===pointer)cancel()},cancel,
  consumeClick(event){
   if(event?.detail>0||!!event?.pointerType){
    if(Number.isInteger(event.pointerId)&&suppressedPointers.has(event.pointerId)){suppressedPointers.delete(event.pointerId);return true}
    // Legacy MouseEvent clicks have no pointerId. Keep the other pending IDs
    // so an out-of-order touch click cannot re-enable a primary release.
    if(!Number.isInteger(event.pointerId)&&suppressedPointers.size)return true;
   }
   return false;
  }
 };
}

// The controller announces its settled phase before its finally releases the
// pending lock. Disabling the focused held button in that short transition
// causes a native blur and cancels an otherwise valid held gesture. Keep its
// STOP presentation until the lock clears; canStart still forbids a new bet.
export function spinControlRunning(state,holding=false){
 return state.phase==='spinning'||(holding&&state.phase==='ready'&&state.pending&&!state.error);
}

// Presentation helpers can be tested without mounting a Player or making API
// requests. Browsers mount the same application below.
if(typeof document!=='undefined'){
const $=id=>document.getElementById(id);
const ui=Object.fromEntries([...document.querySelectorAll('[id]')].map(el=>[el.id,el]));
ui.signin.href='/?login=1&return='+encodeURIComponent('/new74/multi-hot-20/');
const session=new Session();
const live=()=>!document.hidden&&document.hasFocus();
let resources=null,scene=null,sound=null,controller=null,assetsReady=false,loading=false;
let loadAbort=null,loadGeneration=0,assetFailed=false,autoCount=100,previewIndex=0,lastCelebrated=null;
const holdSpin=createHoldSpin({getController:()=>controller,visible:()=>assetsReady&&live()&&!document.querySelector('dialog[open]')});
const soundBridge={play:name=>sound?.play(name),stop:name=>sound?.stop(name),pauseAll:()=>sound?.pauseAll(),resumeOptedInMusic:()=>sound?.resumeOptedInMusic()};
const settingsKey='zplay:multihot20:audio:v1';
let savedSettings={chosen:false,effects:false,music:false};
const controlPointers=new Map(['spin','auto','bet','turbo','menu','sound'].map(id=>[id,{pressed:false,hovered:false}]));
try{const s=JSON.parse(localStorage.getItem(settingsKey)||'null');if(s&&s.chosen===true)savedSettings={chosen:true,effects:s.effects===true,music:s.music===true}}catch{/* Preferences never block game loading. */}
// Display-only coefficients and line geometry verified in the official help.
// This view does not evaluate a spin; finalWin always comes from its receipt.
const DISPLAY_PAYTABLE={seven:{3:50,4:400,5:2000},bell:{3:20,4:100,5:200},grape:{3:10,4:50,5:100},watermelon:{3:10,4:50,5:100},lemon:{3:5,4:10,5:50},plum:{3:5,4:10,5:50},orange:{3:5,4:10,5:50},cherry:{3:5,4:10,5:50}};
const DISPLAY_LINES=[[0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],[2,1,1,1,2],[0,0,0,0,1],[2,2,2,2,1],[0,1,0,1,0],[2,1,2,1,2],[1,1,0,1,1],[1,1,2,1,1],[0,0,1,0,0],[2,2,1,2,2],[1,2,1,2,1]];
const money=n=>{const v=BigInt(n);return String(v/100n)+'.'+String(v%100n).padStart(2,'0')};
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);if(className)el.className=className;return el}
function open(dialog){if(!dialog||dialog.open)return;holdSpin.cancel();if(controller?.auto.started)controller.stopAuto('MENU');dialog.showModal()}
function close(dialog){if(dialog?.open)dialog.close()}
function status(message){ui.status.textContent=message}
function clearControlPointers(){for(const pointer of controlPointers.values()){pointer.pressed=false;pointer.hovered=false}}
function syncControlArt(){
 if(!resources)return;
 for(const [id,pointer]of controlPointers){
  const button=ui[id],name=controlTextureName(id,{...pointer,disabled:button.disabled,
   spinning:ui.spin.dataset.spinning==='true',autoplay:ui.auto.dataset.active==='true',
   turbo:ui.turbo.getAttribute('aria-pressed')==='true',soundOn:ui.sound.getAttribute('aria-pressed')==='true'});
  const url=resources.urls.get(CONTROL_TEXTURES[name].atlas);
  if(!url)throw Error('CONTROL_ATLAS_MISSING');
  const previous=button.querySelector('[data-control-art]');
  if(previous?.dataset.texture===name&&previous.dataset.atlasUrl===url)continue;
  const svg=createControlArt(name,url);svg.dataset.controlArt=id;svg.dataset.atlasUrl=url;
  if(previous)previous.replaceWith(svg);else button.prepend(svg);
  button.dataset.controlTexture=name;button.classList.add('has-art');
 }
}
function syncSound(){
 sound?.set(savedSettings.effects,savedSettings.music);
 if(controller)controller.musicOptedIn=savedSettings.music;
 ui.sound.setAttribute('aria-pressed',String(savedSettings.effects||savedSettings.music));
 ui['effects-opt'].checked=savedSettings.effects;ui['music-opt'].checked=savedSettings.music;
 syncControlArt();
}
function saveSound(effects,music){
 savedSettings={chosen:true,effects:effects===true,music:music===true};
 try{localStorage.setItem(settingsKey,JSON.stringify(savedSettings))}catch{}
 syncSound();sound?.play('button');
}
function sync(){
 const state=controller?.status()??{phase:'loading',pending:false,lastReceipt:null},account=controller?.account;
 const receipt=state.lastReceipt,activeAuto=state.auto?.started===true;
 if(!['ready','spinning'].includes(state.phase)||activeAuto||state.error||!live())holdSpin.cancel();
 const spinning=spinControlRunning(state,holdSpin.active);
 const canStart=assetsReady&&state.phase==='ready'&&!state.pending&&live();
 ui.zplay.dataset.phase=assetFailed?'load-error':state.phase;
 ui.zplay.dataset.roundId=receipt?.roundId||'';
 ui.balance.textContent=account?.balance??session.account?.balance??'—';
 ui['bet-value'].textContent=account?state.bet:'—';
 ui['spin-label'].textContent=spinning?'STOP':'HOLD & SPIN';
 ui['spin-label'].classList.toggle('sr-only',spinning);
 ui.spin.dataset.spinning=String(spinning);
 ui.spin.setAttribute('aria-label',spinning?'Stop reel animation':'Spin reels; hold to repeat');
 ui.spin.disabled=!spinning&&!canStart;
 ui.bet.disabled=!canStart;ui['bet-panel'].disabled=!canStart;
 // AUTO remains an enabled STOP control throughout an accepted round.
 ui.auto.disabled=!activeAuto&&!canStart;
 ui.auto.dataset.active=String(activeAuto);
 ui.auto.setAttribute('aria-label',activeAuto?'Stop autoplay':'Autoplay options');
 ui['auto-label'].textContent=activeAuto?String(state.auto.armed):'AUTO';
 ui.turbo.disabled=!assetsReady||!!state.pending;
 ui.turbo.setAttribute('aria-pressed',String(!!controller?.turbo));
 syncControlArt();
 ui.signin.hidden=!!account?.authenticated||state.phase==='loading'||assetFailed;
 ui.retry.hidden=state.phase!=='confirm';ui.retry.disabled=!!state.pending;
 ui.reconnect.hidden=!assetsReady||(!['unavailable','disconnected'].includes(state.phase)&&state.gamble?.reason!=='ROUND_CHANGED');ui.reconnect.disabled=loading;
 const g=state.gamble,matchingWin=!!g&&g.roundId===receipt?.roundId;
 const settledView=['ready','unavailable'].includes(state.phase)&&!state.pending&&!state.actionPending;
 const hasWin=matchingWin&&Number(g.stake)>0&&g.reason!=='WIN_TAKEN';
 ui['win-actions'].hidden=!hasWin||activeAuto||!settledView;
 ui.gamble.hidden=!matchingWin||!g?.available;
 ui.gamble.disabled=!canStart||!matchingWin||!g?.available;
 ui['take-win'].disabled=!matchingWin||!!state.pending||!['ready','unavailable'].includes(state.phase)||state.actionPending;
 ui['gamble-red'].disabled=!canStart||!matchingWin||!g?.available;
 ui['gamble-black'].disabled=!canStart||!matchingWin||!g?.available;
 ui['gamble-take'].disabled=ui['take-win'].disabled;
 ui['gamble-stake'].textContent=matchingWin?g.stake:'0.00';
 ui['gamble-limits'].textContent=matchingWin?`Attempt ${g.attempt} of ${g.maxAttempts} · Maximum stake ${g.maxStake} ETB`:'';
 const cardCandidate=g?.lastResult??state.lastAction;
 const card=cardCandidate?.roundId===receipt?.roundId?cardCandidate:null;
 ui['gamble-card'].textContent=card?(card.color==='RED'?'♥':'♠'):'?';
 ui['gamble-card'].dataset.colour=card?.color??'';
 ui['gamble-card'].setAttribute('aria-label',card?`${card.color.toLowerCase()} card`:'Card not drawn');
 ui['gamble-status'].textContent=state.phase==='gambling'?'Revealing card…':state.phase==='confirm'?'Reconnect to recover this result.':g?.reason==='WIN_TAKEN'?'Win collected':card?(card.won?'Win doubled':`${card.stake} ETB lost`):'Choose a colour';
 const shownWin=card?card.payout:receipt?.finalWin??'0.00';
 ui['win-value'].textContent=shownWin;ui['multiplier-value'].textContent=receipt?.wheelMultiplier??1;
 ui['win-banner'].hidden=!settledView||Number(shownWin)<=0;
 if(receipt&&settledView&&Number(shownWin)>0&&lastCelebrated!==receipt.roundId){
  lastCelebrated=receipt.roundId;ui['win-banner'].classList.remove('celebrate');
  requestAnimationFrame(()=>ui['win-banner'].classList.add('celebrate'));
 }
 if(assetFailed){status('Game files could not load. Please try again.');return}
 const messages={loading:'Connecting…',disconnected:'Sign in to play.',unavailable:'This game is temporarily unavailable.',ready:activeAuto?`Autoplay · ${state.auto.armed} spins remaining`:'Ready',spinning:activeAuto?`Autoplay · ${state.auto.armed} spins remaining`:'Spinning…',confirm:'Your round needs to be recovered before you play again.',gambling:'Revealing card…',collecting:'Updating balance…'};
 let message=messages[state.phase]||'Connecting…';
 if(state.error==='INSUFFICIENT_FUNDS')message='Not enough balance for this bet.';
 else if(account?.blockedByActiveGame)message='Finish your active game before starting another.';
 else if(state.gamble?.reason==='ROUND_CHANGED')message='A newer round is available. Reconnect to update the game.';
 else if(account?.game?.wagerAvailability==='house_capacity')message='This bet is temporarily unavailable. Please reconnect.';
 else if(state.error&&state.phase==='ready')message='The round could not start. Please try again.';
 if(!navigator.onLine)message='Connection lost. Your accepted round is saved.';
 status(message);
}
function disposeResources(){holdSpin.cancel();loadAbort?.abort();scene?.dispose();sound?.destroy();resources?.dispose();scene=null;sound=null;resources=null;assetsReady=false}
function restoreHistoricalRound(account){
 const r=account?.round?.result;
 if(!r||session.pending||(session.pendingAction&&session.pendingAction.roundId!==r.roundId))return false;
 const historicalModel={...account.game,...Object.fromEntries(['mathVersion','engineVersion','mathSha256'].map(k=>[k,r[k]]))};
 try{validateReceipt(r,historicalModel,r.bet);scene.restore(r);controller.lastReceipt=r;return true}catch{return false}
}
async function connectAccount(){
 if(!controller||controller.pending)return;
 loading=true;controller.change('loading');sync();
 try{
  const account=await session.connect();
  controller.connect(account);
  // A completed authenticated historical receipt retains its own math identity.
  // Restoring it is presentation only and never replays or posts a wager.
  restoreHistoricalRound(account);
 }catch(error){
  if(controller.disconnectExpiredSession(error))return;
  const auth=['LOGIN_REQUIRED','PLAYER_LOGIN_REQUIRED','SESSION_UNAVAILABLE','SESSION_CHANGED','PLAYER_SESSION_CHANGED'].includes(error?.code);
  if(auth){controller.account=null;controller.lastReceipt=null;controller.lastAction=null;scene?.reset()}
  controller.change(auth?'disconnected':'unavailable',error?.code||'CONNECTION_UNAVAILABLE');
 }finally{loading=false;sync()}
}
async function loadGame(){
 if(loading)return;
 const generation=++loadGeneration;loading=true;assetFailed=false;disposeResources();loadAbort=new AbortController();
 ui.loading.hidden=false;ui['load-progress'].hidden=false;ui['load-retry'].hidden=true;ui['loading-text'].textContent='Loading game…';
 try{
  resources=await loadVerifiedAssets({signal:loadAbort.signal});
  if(generation!==loadGeneration)return;
  const audioClips=await resources.primeAudio();
  if(generation!==loadGeneration)return;
  sound=createSoundEngine({clipUrls:audioClips});
  scene=new MultiHot20Scene({canvas:ui.reels,backdropCanvas:ui['game-backdrop'],symbols:resources.manifest.symbols,assets:resources.images,audio:soundBridge,strictAssets:true});
  scene.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  controller=new GameController({session,scene,onChange:sync,visible:live});
  for(let atlas=0;atlas<4;atlas++)if(!resources.urls.get(`atlas-${atlas}.png`))throw Error('CONTROL_ATLAS_MISSING');
  assetsReady=true;loading=false;ui.loading.hidden=true;syncSound();sync();
  const connection=connectAccount();
  if(!savedSettings.chosen)open(ui['sound-prompt']);
  await connection;
 }catch(error){
  if(generation!==loadGeneration||loadAbort?.signal.aborted)return;
  disposeResources();assetFailed=true;loading=false;
  ui['loading-text'].textContent='Game files could not load.';ui['load-progress'].hidden=true;ui['load-retry'].hidden=false;
  sync();
 }
}
function showBet(){
 ui['bet-options'].replaceChildren();
 for(const amount of controller?.account?.game?.betLevels??[]){
  const button=node('button',amount+' ETB');button.type='button';button.setAttribute('aria-pressed',String(controller.bet===amount));
  button.addEventListener('click',()=>{if(controller.setBet(amount)){sound?.play('button');close(ui['bet-dialog']);sync()}});
  ui['bet-options'].append(button);
 }
 open(ui['bet-dialog']);
}
function previewLevels(){return controller?.account?.game?.betLevels??['1.00','2.00','5.00','10.00']}
function renderPaytable(){
 const levels=previewLevels();previewIndex=Math.max(0,Math.min(previewIndex,levels.length-1));
 const stake=levels[previewIndex],table=controller?.previewPaytable()??DISPLAY_PAYTABLE;
 ui['preview-bet'].textContent=stake+' ETB';ui['preview-down'].disabled=previewIndex===0;ui['preview-up'].disabled=previewIndex===levels.length-1;
 ui.paytable.replaceChildren();
 for(const symbol of Object.keys(DISPLAY_PAYTABLE)){
  const card=node('article',undefined,'paytable-card'),art=node('canvas');art.width=144;art.height=144;art.setAttribute('aria-label',symbol);
  const source=resources?.images[symbol];
  if(source){const w=source.width||source.naturalWidth,h=source.height||source.naturalHeight,scale=Math.min(144/w,144/h);art.getContext('2d').drawImage(source,(144-w*scale)/2,(144-h*scale)/2,w*scale,h*scale)}
  const info=node('div'),list=node('dl');info.append(node('h4',symbol));
  for(const count of [5,4,3]){const value=BigInt(stake.replace('.',''))*BigInt(table[symbol]?.[count]??0)/20n;list.append(node('dt',count),node('dd',money(value)))}
  info.append(list);card.append(art,info);ui.paytable.append(card);
 }
}
function renderLines(){
 const ns='http://www.w3.org/2000/svg';
 const svgNode=(name,attrs)=>{const el=document.createElementNS(ns,name);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,value);return el};
 ui.paylines.replaceChildren();
 DISPLAY_LINES.forEach((rows,index)=>{
  const figure=node('figure',undefined,'payline'),svg=svgNode('svg',{viewBox:'0 0 110 70',role:'img','aria-label':`Payline ${index+1}`});
  const grid=svgNode('path',{d:'M5 5H105V65H5Z M25 5V65 M45 5V65 M65 5V65 M85 5V65 M5 25H105 M5 45H105',class:'payline-grid'});
  const line=svgNode('polyline',{points:rows.map((row,col)=>`${15+20*col},${15+20*row}`).join(' '),class:'payline-path'});
  svg.append(grid,line);rows.forEach((row,col)=>svg.append(svgNode('circle',{cx:15+20*col,cy:15+20*row,r:3,class:'payline-dot'})));
  figure.append(svg,node('figcaption',index+1));ui.paylines.append(figure);
 });
}
function showRules(){previewIndex=Math.max(0,previewLevels().indexOf(controller?.bet));renderPaytable();renderLines();open(ui['rules-dialog'])}
function showHistory(){
 const r=controller?.lastReceipt??controller?.account?.round?.result;
 ui['history-text'].replaceChildren();
 if(!r){ui['history-text'].append(node('p','No completed round in this session.'));open(ui['history-dialog']);return}
 const list=node('dl'),entries=[['Round',r.roundId],['Bet',r.bet+' ETB'],['Win',r.finalWin+' ETB'],['Multiplier',r.wheelMultiplier+'×'],['Balance after',r.walletReceipt.balanceAfter+' ETB']];
 const actionCandidate=controller.status().lastAction??controller.status().gamble?.lastResult;
 const action=actionCandidate?.roundId===r.roundId?actionCandidate:null;
 if(action)entries.push(['X2 result',action.payout+' ETB'],['Balance after X2',action.balanceAfter+' ETB']);
 for(const [label,value]of entries)list.append(node('dt',label),node('dd',value));
 ui['history-text'].append(list);open(ui['history-dialog']);
}
function showSound(){syncSound();open(ui['sound-dialog'])}
function parseLimit(text){const value=String(text).trim();if(!/^(0|[1-9]\d{0,10})(\.\d{1,2})?$/.test(value))return null;const [whole,fraction='']=value.split('.');const canonical=whole+'.'+fraction.padEnd(2,'0');return BigInt(canonical.replace('.',''))>0n?canonical:null}
const listen=(id,type,fn)=>ui[id].addEventListener(type,fn);
for(const [id,pointer]of controlPointers){
 const paint=()=>syncControlArt();
 listen(id,'pointerenter',event=>{pointer.hovered=event.pointerType==='mouse';paint()});
 listen(id,'pointerleave',()=>{pointer.hovered=false;pointer.pressed=false;paint()});
 listen(id,'pointerdown',()=>{if(id!=='spin')holdSpin.cancel();pointer.pressed=!ui[id].disabled;paint()});
 for(const event of ['pointerup','pointercancel','blur'])listen(id,event,()=>{pointer.pressed=false;paint()});
 listen(id,'keydown',event=>{if([' ','Enter'].includes(event.key)){pointer.pressed=!ui[id].disabled;paint()}});
 listen(id,'keyup',event=>{if([' ','Enter'].includes(event.key)){pointer.pressed=false;paint()}});
}
listen('spin','pointerdown',event=>{if(event.button===0&&!ui.spin.disabled&&holdSpin.begin(event.pointerId))sound?.play('button')});
listen('spin','pointerleave',()=>holdSpin.cancel());
listen('spin','pointercancel',()=>holdSpin.cancel());
listen('spin','lostpointercapture',()=>holdSpin.cancel());
listen('spin','blur',()=>holdSpin.cancel());
window.addEventListener('pointerup',event=>holdSpin.release(event.pointerId),true);
window.addEventListener('pointercancel',event=>holdSpin.release(event.pointerId),true);
window.addEventListener('pointermove',event=>{
 if(event.pointerId!==holdSpin.pointerId)return;
 const box=ui.spin.getBoundingClientRect();
 if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)holdSpin.cancel();
},true);
listen('spin','click',event=>{if(holdSpin.consumeClick(event))return;if(!controller)return;sound?.play('button');if(controller.phase==='spinning')controller.stop();else void controller.spin().then(sync)});
for(const id of ['bet','bet-panel'])listen(id,'click',()=>{if(controller?.phase==='ready'){sound?.play('button');showBet()}});
listen('auto','click',()=>{if(controller?.auto.started){controller.stopAuto();sync()}else if(controller?.phase==='ready'){ui['auto-error'].textContent='';open(ui['auto-dialog'])}});
for(const button of document.querySelectorAll('[data-auto-count]'))button.addEventListener('click',()=>{autoCount=Number(button.dataset.autoCount);for(const b of document.querySelectorAll('[data-auto-count]'))b.setAttribute('aria-pressed',String(b===button));sound?.play('button')});
for(const name of ['win','loss','gain'])listen(`auto-${name}-enabled`,'change',()=>{ui[`auto-${name}-limit`].disabled=!ui[`auto-${name}-enabled`].checked});
listen('auto-start','click',()=>{
 const options={};
 for(const [name,key]of [['win','winLimit'],['loss','lossLimit'],['gain','balanceIncreaseLimit']])if(ui[`auto-${name}-enabled`].checked){
  const value=parseLimit(ui[`auto-${name}-limit`].value);
  if(!value){ui['auto-error'].textContent='Enter a positive ETB amount for each enabled limit.';ui[`auto-${name}-limit`].focus();return}options[key]=value;
 }
 if(controller?.armAuto(autoCount,options)){close(ui['auto-dialog']);void controller.startPlay().then(sync)}
});
listen('auto-stop','click',()=>{controller?.stopAuto();close(ui['auto-dialog']);sync()});
listen('turbo','click',()=>{if(controller?.turbo){controller.setTurbo(false);sync()}else open(ui['quick-dialog'])});
listen('quick-confirm','click',()=>{controller?.setTurbo(true);sound?.play('button');close(ui['quick-dialog']);sync()});
listen('menu','click',()=>open(ui['menu-dialog']));listen('rules','click',showRules);listen('sound','click',showSound);
for(const [id,action]of [['menu-rules',showRules],['menu-history',showHistory],['menu-sound',showSound]])listen(id,'click',()=>{close(ui['menu-dialog']);action()});
listen('preview-down','click',()=>{previewIndex--;renderPaytable()});listen('preview-up','click',()=>{previewIndex++;renderPaytable()});
listen('sound-on','click',()=>{saveSound(true,true);close(ui['sound-prompt'])});
listen('sound-off','click',()=>{saveSound(false,false);close(ui['sound-prompt'])});
listen('sound-save','click',()=>{saveSound(ui['effects-opt'].checked,ui['music-opt'].checked);close(ui['sound-dialog'])});
listen('gamble','click',()=>{sync();open(ui['gamble-dialog'])});
for(const [id,colour]of [['gamble-red','RED'],['gamble-black','BLACK']])listen(id,'click',()=>{sound?.play('button');void controller?.gamble(colour).then(ok=>{if(ok&&controller?.lastAction?.won)sound?.play('win');sync()})});
for(const id of ['take-win','gamble-take'])listen(id,'click',()=>{void controller?.takeWin().then(ok=>{if(ok)close(ui['gamble-dialog']);sync()})});
listen('retry','click',()=>{if(controller?.phase==='confirm')void controller.reconcile().then(ok=>{if(ok&&!controller.lastReceipt&&!session.pending&&!session.pendingAction)restoreHistoricalRound(controller.account);sync()})});
listen('reconnect','click',()=>void connectAccount());listen('load-retry','click',()=>void loadGame());
for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=>close(button.closest('dialog')));
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('cancel',()=>sound?.play('button'));
window.addEventListener('resize',()=>scene?.resize());
window.addEventListener('blur',()=>{holdSpin.cancel();clearControlPointers();controller?.onHidden();sync()});
window.addEventListener('focus',()=>{controller?.onVisible();sync()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){holdSpin.cancel();clearControlPointers();controller?.onHidden()}else controller?.onVisible();sync()});
window.addEventListener('offline',()=>{holdSpin.cancel();controller?.stopAuto('OFFLINE');sync()});
window.addEventListener('online',sync);
window.addEventListener('pagehide',()=>{holdSpin.cancel();clearControlPointers();scene?.pauseAudio();sound?.pauseAll();controller?.stopAuto();if(loading){loadGeneration++;loadAbort?.abort()}});
window.addEventListener('pageshow',event=>{if(event.persisted){if(!assetsReady){loading=false;void loadGame()}else{controller?.onVisible();sync()}}});
window.addEventListener('beforeunload',()=>{loadGeneration++;disposeResources()});
void loadGame();
}
