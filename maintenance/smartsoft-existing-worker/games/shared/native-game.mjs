import {NativeAccount, moneyMinor, fromMinor, formatMoney, getRoundActions} from '/independent74/native/shared/native-account.mjs';

// This module owns presentation only. The retained account transport owns
// versioned actions, pending-request recovery and authoritative account state.
const MODEL_SLUGS=Object.freeze({
 multihot100_native:'multi-hot-100',habeshafortune5_native:'hab',
 multihotwildways_native:'multi-hot-wild-ways',multihot5wild_native:'multi-hot-5-wild',
 multihot5superwilds_native:'multi-hot-5-super-wilds',multihotdeluxe_native:'multi-hot-5-deluxe',
 burningice_native:'burning-ice-41',burningice10_native:'blazing-hot-10',burningice40_native:'burning-ice-40',
});
const $=id=>document.getElementById(id),SVG='http://www.w3.org/2000/svg';
let profile,game,account,snapshot,assetBase,phase='loading',stake,stakeChoice;
let columns=[],symbols=[],lastDisplayedRound='',lastWinMinor='0',currentGrid;
let motionEpoch=0,visualStopped=false,releaseVisualWait=null,operationStarted=0,lastStopAt=-1000;
let fast=false,resourceFailure=false,autoRemaining=0,autoLossLimit=0n,autoStopWin=true,autoStartBalance=0n,autoGeneration=0;
let historySort='recent',audioCache=new Map(),music=null,wheelAngle=0,featureEpoch=0;
let settings={consent:false,effects:false,music:false,effectsVolume:70,musicVolume:35,reducedMotion:false};
const now=()=>performance.now(),delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const busy=()=>['requesting','presenting','gambling','collecting','recovering'].includes(phase);
const reduced=()=>settings.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
const roundKey=round=>round?`${round.round_id}:${round.version}`:'';
const activeRound=()=>snapshot?.round?.status==='active';
const amountMinor=round=>round?.amountMinor??(round?.status==='active'?round?.currentCashoutMinor:round?.payoutMinor)??'0';
const numericMinor=value=>typeof value==='string'&&/^\d+$/.test(value)?BigInt(value):null;
const moneyFromMinor=value=>numericMinor(value)!==null?fromMinor(String(value)):'—';
const stakeLevels=()=>Array.isArray(snapshot?.game?.stakeValues)?snapshot.game.stakeValues:Array.isArray(game?.stakeValues)?game.stakeValues:[];

export function backendIdFromPath(pathname){
 const match=/^\/games\/([a-z0-9_]+)\/?$/.exec(pathname);
 if(match&&Object.hasOwn(MODEL_SLUGS,match[1]))return match[1];
 const direct=/^\/independent74\/native\/([a-z0-9-]+)\/index\.html$/.exec(pathname);
 return direct?Object.keys(MODEL_SLUGS).find(id=>MODEL_SLUGS[id]===direct[1])??null:null;
}
export function validateProfile(value,id){
 const definition=value?.backendGame??value?.game;
 if(!Object.hasOwn(MODEL_SLUGS,id)||!value||definition?.id!==id||typeof definition.version!=='string'||
  ![3,5].includes(definition.columns)||![3,4].includes(definition.rows)||!Array.isArray(definition.symbols)||
  !value.assets?.symbols||!value.assets?.buttons||!value.assets?.art||!value.assets?.sound)
  throw Error('GAME_PROFILE_UNAVAILABLE');
 if(value.backendId&&value.backendId!==id||value.officialId&&value.officialId!==MODEL_SLUGS[id])throw Error('GAME_PROFILE_IDENTITY_MISMATCH');
 const validName=name=>typeof name==='string'&&/^[a-z0-9-]+\.(?:webp|png|mp3|ogg|woff2)$/.test(name);
 for(const symbol of definition.symbols){
  if(typeof symbol.id!=='string'||!validName(value.assets.symbols[symbol.id]))throw Error('GAME_SYMBOL_ART_UNAVAILABLE');
 }
 for(const category of ['buttons','art','sound'])for(const name of Object.values(value.assets[category]))if(!validName(name))throw Error('INVALID_GAME_ASSET');
 for(const frames of Object.values(value.assets.animations??{}))if(!Array.isArray(frames)||frames.some(name=>!validName(name)))throw Error('INVALID_GAME_ANIMATION');
 if(!['top-wheel','left-wheel','burning'].includes(value.layout))throw Error('GAME_LAYOUT_UNAVAILABLE');
 return value;
}
function asset(name){return name?assetBase+name+'?v='+encodeURIComponent(profile.assetRevision):'';}
function imageAsset(element,name){
 if(!name){element.removeAttribute('src');element.hidden=true;return;}
 const target=asset(name);if(element.getAttribute('src')!==target)element.src=target;element.hidden=false;
}
function buttonArt(id,name){
 const element=$(id),image=element.querySelector('img');if(image)imageAsset(image,name);
 element.classList.toggle('has-picture',!!name);
}
function showMessage(text,error=false){$('message').textContent=text||'';$('message').classList.toggle('error',!!error);}
function statusMessage(){
 if(resourceFailure)return 'Faylasha ciyaarta ma dhammaan. Dib u soo celi.';
 if(!snapshot?.authenticated)return 'Gal akoonkaaga ZPLAY si aad u ciyaarto.';
 if(snapshot.otherActiveGame)return 'Marka hore dhammee wareegga kale ee akoonkaaga.';
 return snapshot?.message||'';
}
function stopAutoplay(){autoRemaining=0;autoGeneration++;updateControls();}
function openDialog(id){
 stopAutoplay();const element=$(id);if(!element.open)element.showModal();
}
function currentActions(){return getRoundActions(snapshot?.round,snapshot?.game??game);}
function actionAvailable(name){return currentActions().includes(name);}
function currentWin(){return numericMinor(amountMinor(snapshot?.round))??0n;}
function setPhase(next){phase=next;$('game').dataset.phase=next;updateControls();}

function updateControls(){
 if(!profile)return;
 const authenticated=snapshot?.authenticated===true,locked=busy()||snapshot?.busy===true;
 const pending=!!snapshot?.pending||!!account?.pending;
 $('game').setAttribute('aria-busy',String(phase==='loading'||locked));
 $('balance').textContent=snapshot?.connected&&authenticated?formatMoney(snapshot.balance):'—';
 $('bet-amount').textContent=stake?formatMoney(stake):'—';$('spin-stake').textContent=stake?formatMoney(stake):'—';
 $('bet-next').textContent=stake?formatMoney(stake):'—';
 $('spin-label').textContent=locked&&['requesting','presenting'].includes(phase)?'STOP':'SPIN';
 $('spin').setAttribute('aria-label',locked&&['requesting','presenting'].includes(phase)?'STOP · dhammee muuqaalka wareeggan':'SPIN');
 const stopping=['requesting','presenting'].includes(phase);
 buttonArt('spin',profile.assets.buttons[stopping?'spin-stop':'spin']??profile.assets.buttons.spin);
 $('spin').disabled=resourceFailure||phase==='loading'||['gambling','collecting','recovering'].includes(phase)||(!stopping&&(snapshot?.busy||pending||snapshot?.confirming||snapshot?.recoveryBlocked));
 const levels=stakeLevels();
 for(const id of ['bet','bet-display','bet-step-open','bet-plus','bet-minus'])$(id).disabled=locked||autoRemaining>0||!levels.length;
 $('auto').disabled=locked&&autoRemaining===0;
 buttonArt('auto',profile.assets.buttons[autoRemaining?'autoplay-stop':'autoplay']??profile.assets.buttons.autoplay);
 $('auto-count').hidden=autoRemaining===0;$('auto-count').textContent=String(autoRemaining);
 $('turbo').setAttribute('aria-pressed',String(fast));
 $('retry').hidden=!(pending||resourceFailure);$('retry').disabled=!!snapshot?.busy;
 $('retry').textContent=resourceFailure&&!pending?'Dib u soo celi ciyaarta':'Dib u xaqiiji codsigii hore';
 const win=currentWin(),collect=authenticated&&activeRound()&&actionAvailable('collect'),gamble=authenticated&&activeRound()&&actionAvailable('gamble');
 $('take-win').hidden=profile.layout!=='burning'&&!collect;$('gamble-win').hidden=profile.layout!=='burning'&&!gamble;
 $('take-win').disabled=locked||!collect;$('gamble-win').disabled=locked||!gamble;
 $('gamble-take').disabled=locked||!collect;
 $('gamble-red').disabled=locked||!gamble;$('gamble-black').disabled=locked||!gamble;
 $('win-display').hidden=win===0n&&!collect&&!gamble;
 $('win-amount').textContent=moneyFromMinor(amountMinor(snapshot?.round));
 $('round-win').textContent=moneyFromMinor(amountMinor(snapshot?.round));
 $('last-win').textContent=moneyFromMinor(lastWinMinor);
 $('gamble-stake').textContent=moneyFromMinor(amountMinor(snapshot?.round))+' ETB';
}
function onSnapshot(next){
 snapshot=next;
 if(!profile)return;
 const latest=next.game;
 if(latest?.id===game.id&&latest?.version===game.version)game=latest;
 const levels=stakeLevels();if(levels.length&&!levels.includes(stake))stake=levels[0];
 if(!busy()&&next.round&&roundKey(next.round)!==lastDisplayedRound){displayRound(next.round,{effects:false});}
 updateControls();
 if(!busy()&&phase!=='loading')showMessage(statusMessage(),next?.error);
}

function buildReels(){
 symbols=game.symbols.map(symbol=>symbol.id);
 const preview=validGrid(profile.initialGrid)?profile.initialGrid:Array.from({length:game.columns},(_,column)=>Array.from({length:game.rows},(_,row)=>symbols[(column*game.rows+row)%symbols.length]));
 columns=[];$('reels').replaceChildren();
 $('reels').style.setProperty('--columns',String(game.columns));$('reels').style.setProperty('--rows',String(game.rows));
 $('game').style.setProperty('--columns',String(game.columns));$('game').style.setProperty('--rows',String(game.rows));
 $('win-lines').setAttribute('viewBox',`0 0 ${game.columns*100} ${game.rows*100}`);
 for(let column=0;column<game.columns;column++){
  const reel=document.createElement('div');reel.className='reel';reel.dataset.column=String(column);
  for(let row=0;row<game.rows;row++){
   const cell=document.createElement('div');cell.className='cell';cell.dataset.column=String(column);cell.dataset.row=String(row);
   const image=document.createElement('img');image.className='symbol';image.draggable=false;cell.append(image);reel.append(cell);
  }
  $('reels').append(reel);columns.push(reel);
 }
 renderGrid(preview);$('reels').dataset.confirmed='false';
}
function validGrid(grid){
 return Array.isArray(grid)&&grid.length===game?.columns&&grid.every(column=>Array.isArray(column)&&column.length===game.rows&&column.every(symbol=>Object.hasOwn(profile.assets.symbols,String(symbol))));
}
function renderGrid(grid){
 if(!validGrid(grid))throw Error('INVALID_PRESENTATION_GRID');
 currentGrid=grid.map(column=>column.map(String));
 for(let column=0;column<game.columns;column++)for(let row=0;row<game.rows;row++){
  const symbol=currentGrid[column][row],image=columns[column].children[row].querySelector('.symbol');
  imageAsset(image,profile.assets.symbols[symbol]);image.alt=game.symbols.find(value=>value.id===symbol)?.label??'Symbol';
 }
}
function clearWinPresentation(){
 featureEpoch++;$('win-lines').replaceChildren();
 for(const cell of document.querySelectorAll('.cell')){cell.classList.remove('winning','expanded');cell.querySelector('.win-effect')?.remove();}
}
function setSpinning(frozen=[]){
 for(let column=0;column<columns.length;column++){
  columns[column].classList.remove('paused','stopping');columns[column].classList.toggle('spinning',!frozen.includes(column));columns[column].classList.toggle('frozen',frozen.includes(column));
 }
}
function beginPresentation(){
 clearWinPresentation();visualStopped=false;operationStarted=now();motionEpoch++;
 setSpinning();setPhase('requesting');$('reels').setAttribute('aria-label','Reels-ka oo wareegaya');
 playSound('spin');playSound('moving');showMessage('');tickDecoration(motionEpoch);
}
function tickDecoration(epoch){
 let previous=0,step=0;
 const tick=clock=>{
  if(epoch!==motionEpoch||!['requesting','presenting'].includes(phase)||visualStopped||document.hidden)return;
  if(clock-previous>75){
   for(let column=0;column<game.columns;column++)if(columns[column].classList.contains('spinning'))for(let row=0;row<game.rows;row++){
    const image=columns[column].children[row].querySelector('.symbol');imageAsset(image,profile.assets.symbols[symbols[(step+column*3+row)%symbols.length]]);image.alt='Reel-ka oo wareegaya';
   }
   previous=clock;step++;
  }
  requestAnimationFrame(tick);
 };
 requestAnimationFrame(tick);
}
function stopPresentation(){
 if(!['requesting','presenting'].includes(phase))return;
 visualStopped=true;lastStopAt=now();stopAutoplay();
 for(const reel of columns)reel.classList.add('paused');pauseSound('moving');releaseVisualWait?.();
 if(snapshot?.busy)showMessage('Hubinaya natiijada wareegga…');
 updateControls();
}
async function visualWait(milliseconds){
 if(visualStopped||reduced()||milliseconds<=0)return;
 await Promise.race([delay(milliseconds),new Promise(resolve=>{releaseVisualWait=resolve;})]);releaseVisualWait=null;
}
function featureIndices(value){
 if(!Array.isArray(value))return[];
 if(value.length===game.columns&&value.every(item=>typeof item==='boolean'))return value.flatMap((item,index)=>item?[index]:[]);
 return value.filter(item=>Number.isInteger(item)&&item>=0&&item<game.columns);
}
function paintFeature(feature={}){
 const frozen=featureIndices(feature.frozenReels??feature.freezeReels),coins=featureIndices(feature.coinReels);
 for(let column=0;column<columns.length;column++)columns[column].classList.toggle('frozen',frozen.includes(column));
 for(const coin of $('coin-row').children){const reel=Number(coin.dataset.reel);coin.classList.toggle('lit',coins.includes(reel));coin.setAttribute('aria-label',`Lucky coin reel ${reel+1}${coins.includes(reel)?' · active':''}`);}
 const multiplier=feature.multiplier;
 if(Number.isSafeInteger(multiplier)&&multiplier>=1&&multiplier<=100){
  $('multiplier').textContent=multiplier+'x';
  if(profile.assets.art['multiplier-'+multiplier])imageAsset($('wheel-current'),profile.assets.art['multiplier-'+multiplier]);
  if(profile.layout==='top-wheel'){
   const values=profile.wheelValues??[2,4,2,5,1,3,5,2,3,4,1,3,5],index=values.indexOf(multiplier);
   if(index>=0){wheelAngle=Math.ceil(wheelAngle/360)*360+720-index*360/values.length;$('wheel').style.transform=`rotate(${wheelAngle}deg)`;}
  }
 }
 const notes=[];if(frozen.length)notes.push('REELS HELD · '+frozen.map(index=>index+1).join(', '));
 if(coins.length)notes.push('LUCKY COINS · '+coins.map(index=>index+1).join(', '));
 if(feature.respin===true||feature.isRespin===true)notes.push('RESPIN');
 $('feature-note').textContent=notes.join(' · ');
 for(const wild of Array.isArray(feature.addedWilds)?feature.addedWilds:[]){
  const column=Array.isArray(wild)?wild[0]:wild?.column??wild?.reel,row=Array.isArray(wild)?wild[1]:wild?.row;
  if(Number.isInteger(column)&&Number.isInteger(row)&&columns[column]?.children[row])columns[column].children[row].classList.add('expanded');
 }
}
function winPositions(win){
 const positions=win.positions??win.cells;
 if(Array.isArray(positions))return positions.map(position=>Array.isArray(position)?{column:position[0],row:position[1]}:{column:position.column??position.col??position.reel,row:position.row}).filter(position=>Number.isInteger(position.column)&&Number.isInteger(position.row)&&columns[position.column]?.children[position.row]);
 const index=Number(win.line??win.lineIndex??win.payline);
 const path=Number.isInteger(index)?game.paylinePaths?.[index-1]??game.paylinePaths?.[index]:null;
 const count=Number(win.count??win.matchCount??game.columns);
 return Array.isArray(path)?path.slice(0,Number.isInteger(count)?count:game.columns).map((row,column)=>({column,row})).filter(position=>columns[position.column]?.children[position.row]):[];
}
function paintWins(round,{effects=true}={}){
 const winners=new Set();
 for(const win of round.wins??[]){
  const positions=winPositions(win);if(!positions.length)continue;
  if(positions.length>1){const line=document.createElementNS(SVG,'polyline');line.setAttribute('points',positions.map(position=>`${position.column*100+50},${position.row*100+50}`).join(' '));$('win-lines').append(line);}
  for(const position of positions){const cell=columns[position.column].children[position.row];cell.classList.add('winning');winners.add(cell);}
 }
 if(!effects||reduced()||!winners.size)return;
 const frames=profile.assets.animations?.win??profile.assets.animations?.flame;
 if(!frames?.length)return;
 const epoch=featureEpoch,started=now(),images=[...winners].map(cell=>{const image=document.createElement('img');image.className='win-effect';image.alt='';cell.append(image);return image;});
 const draw=clock=>{
  if(epoch!==featureEpoch||clock-started>5000){for(const image of images)image.remove();return;}
  const frame=frames[Math.floor((clock-started)/60)%frames.length];for(const image of images)imageAsset(image,frame);requestAnimationFrame(draw);
 };requestAnimationFrame(draw);
}
function displayRound(round,{effects=true}={}){
 if(!round||!validGrid(round.grid))return;
 clearWinPresentation();renderGrid(round.grid);paintFeature(round.feature??{});paintWins(round,{effects});
 lastDisplayedRound=roundKey(round);$('reels').dataset.confirmed='true';$('reels').setAttribute('aria-label','Natiijada wareegga la xaqiijiyey');
 const win=numericMinor(amountMinor(round))??0n;if(win>0n){lastWinMinor=amountMinor(round);if(effects)playSound('win');}
 if(Number(round.feature?.multiplier)>1&&effects)playSound('multiplier');
 updateControls();
}
async function presentConfirmedRound(round){
 if(!round||!validGrid(round.grid))throw Error('INVALID_PRESENTATION_GRID');
 setPhase('presenting');
 const minimum=reduced()?0:fast?220:Math.min(1800,Math.max(700,Number(profile.minimumSpinMs)||1100));
 await visualWait(minimum-(now()-operationStarted));
 const frames=Array.isArray(round.frames)?round.frames.filter(frame=>validGrid(frame.grid)).slice(0,32):[];
 for(const frame of frames){
  if(visualStopped||reduced())break;
  clearWinPresentation();renderGrid(frame.grid);paintFeature(frame.feature??{});paintWins({...round,...frame},{effects:false});
  const frozen=featureIndices(frame.feature?.frozenReels);setSpinning(frozen);
  await visualWait(fast?120:450);
 }
 motionEpoch++;pauseSound('moving');
 for(const reel of columns){reel.classList.remove('spinning','paused');reel.classList.add('stopping');}
 displayRound(round);
 for(let column=0;column<columns.length;column++)playSound('reel'+column);
 setTimeout(()=>{for(const reel of columns)reel.classList.remove('stopping');},240);
}

async function play({autoplay=false}={}){
 if(['requesting','presenting'].includes(phase)){stopPresentation();return null;}
 if(busy()||now()-lastStopAt<220)return null;
 if(!snapshot?.authenticated){openDialog('login-dialog');return null;}
 if(snapshot.pending||snapshot.confirming||snapshot.recoveryBlocked){showMessage('Dib u xaqiiji codsigii hore marka hore.',true);updateControls();return null;}
 if(resourceFailure)return null;
 if(activeRound()){
  if(!actionAvailable('collect')){showMessage('Marka hore dhammee wareegga hadda furan.',true);return null;}
  if(!await collect({quiet:true}))return null;
 }
 if(!snapshot?.canStart){showMessage(statusMessage(),true);return null;}
 if(moneyMinor(stake)===null||moneyMinor(snapshot.balance)===null||moneyMinor(stake)>moneyMinor(snapshot.balance)){stopAutoplay();showMessage('Hadhaaga wallet-ka kuma filna sharadkan.',true);return null;}
 beginPresentation();
 try{
  const ok=await account.start(stake,{autoCollect:autoplay});
  snapshot=account.state;
  if(!ok){motionEpoch++;pauseSound('moving');for(const reel of columns)reel.classList.remove('spinning','paused');if(currentGrid)renderGrid(currentGrid);setPhase('idle');showMessage(statusMessage(),true);return null;}
  const round=snapshot.round;
  await presentConfirmedRound(round);setPhase('idle');showMessage(statusMessage(),snapshot.error);return round;
 }catch{
  stopAutoplay();motionEpoch++;pauseSound('moving');for(const reel of columns)reel.classList.remove('spinning','paused');if(currentGrid)renderGrid(currentGrid);setPhase('idle');showMessage('Natiijada weli lama xaqiijin. Dib u xaqiiji codsigii hore.',true);return null;
 }finally{releaseVisualWait=null;updateControls();}
}
async function collect({quiet=false}={}){
 if(busy()||!actionAvailable('collect'))return false;
 setPhase('collecting');
 try{
  const ok=await account.collect();snapshot=account.state;
  if(ok){playSound('take');$('gamble-dialog').close();displayRound(snapshot.round,{effects:false});if(!quiet)showMessage('Guusha waxaa lagu qoray wallet-ka ETB.');}
  else showMessage(statusMessage(),true);
  return ok;
 }finally{setPhase('idle');}
}
async function gamble(color){
 if(busy()||!actionAvailable('gamble'))return;
 setPhase('gambling');$('gamble-message').textContent='Hubinaya natiijada…';
 try{
  const ok=await account.gamble(color);snapshot=account.state;
  if(!ok){$('gamble-message').textContent=statusMessage();return;}
  const result=snapshot.round?.lastGamble??snapshot.round?.gamble?.lastResult;
  const revealed=String(result?.revealed??result?.color??result?.result??'').toLowerCase();
  const card=$('revealed-card');card.hidden=!['red','black'].includes(revealed);
  if(!card.hidden){card.textContent=revealed.toUpperCase();card.classList.toggle('black',revealed==='black');}
  const won=result?.won===true||(typeof result?.success==='boolean'&&result.success);
  $('gamble-message').textContent=card.hidden?'Natiijada waxaa soo celiyey server-ka.':won?'Guul · ×2':'Wareeggan ma guulaysan.';
  playSound(won?'gambleWin':'gambleLose');displayRound(snapshot.round,{effects:false});
 }finally{setPhase('idle');updateControls();}
}
async function retry(){
 if(resourceFailure&&!snapshot?.pending){location.reload();return;}
 if(busy()||snapshot?.busy)return;
 setPhase('recovering');
 try{await account.retry();snapshot=account.state;displayRound(snapshot.round,{effects:false});showMessage(statusMessage(),snapshot.error);}
 finally{setPhase('idle');}
}

function chooseStake(value){
 const levels=stakeLevels();if(!levels.includes(value))return;
 stakeChoice=value;$('bet-choice').textContent=formatMoney(value);
 for(const button of $('bet-levels').children)button.setAttribute('aria-pressed',String(button.dataset.amount===value));
}
function moveStake(delta,{immediate=false}={}){
 if(busy()||autoRemaining>0)return;
 const levels=stakeLevels(),current=immediate?stake:stakeChoice,index=Math.max(0,levels.indexOf(current));
 const next=levels[Math.max(0,Math.min(levels.length-1,index+delta))];if(!next)return;
 if(immediate){stake=next;updateControls();}else chooseStake(next);playSound('click');
}
function openBet(){
 if(busy()||autoRemaining>0)return;
 const levels=stakeLevels();$('bet-levels').replaceChildren();
 for(const value of levels){const button=document.createElement('button');button.type='button';button.textContent=formatMoney(value);button.dataset.amount=value;button.onclick=()=>{chooseStake(value);playSound('click');};$('bet-levels').append(button);}
 chooseStake(stake??levels[0]);playSound('click');openDialog('bet-dialog');
}
async function startAutoplay(){
 if(!snapshot?.authenticated){$('auto-dialog').close();openDialog('login-dialog');return;}
 const count=Number($('auto-spins').value),limit=moneyMinor($('auto-loss').value.trim());
 if(![5,10,20,50,100].includes(count)||limit===null||limit<=0n){$('auto-error').textContent='Dooro tiro wareegyo iyo xad khasaaro sax ah.';return;}
 if(!snapshot.canStart&&!actionAvailable('collect')){$('auto-error').textContent=statusMessage();return;}
 autoRemaining=count;autoLossLimit=limit;autoStopWin=$('auto-stop-win').checked;autoStartBalance=moneyMinor(snapshot.balance);const generation=++autoGeneration;
 $('auto-dialog').close();updateControls();
 while(autoRemaining>0&&generation===autoGeneration&&!document.hidden){
  autoRemaining--;updateControls();const round=await play({autoplay:true});
  if(!round||snapshot.pending||snapshot.confirming||generation!==autoGeneration)break;
  const win=numericMinor(round.payoutMinor)??0n,balance=moneyMinor(snapshot.balance);
  if(autoStopWin&&win>0n||balance===null||autoStartBalance-balance>=autoLossLimit)break;
  if(autoRemaining>0)await delay(fast?220:700);
 }
 autoRemaining=0;updateControls();
}

function makePaytable(){
 $('paytable').replaceChildren();$('paylines').replaceChildren();$('rules-text').replaceChildren();
 const title=game.paylines?`${game.paylines} LINES FIXED`:game.ways?`${game.ways} WAYS`:'RULES';$('rules-title').textContent=title;$('line-count').textContent=title;$('bet-description').textContent=title;
 for(const entry of game.paytable??[]){
  if(!profile.assets.symbols[String(entry.symbol)])continue;
  const article=document.createElement('article'),image=document.createElement('img'),table=document.createElement('table');imageAsset(image,profile.assets.symbols[String(entry.symbol)]);image.alt=game.symbols.find(symbol=>symbol.id===String(entry.symbol))?.label??'Symbol';
  for(const[count,coefficient]of Object.entries(entry.counts??{}).reverse()){
   const tr=document.createElement('tr'),quantity=document.createElement('td'),pay=document.createElement('td');quantity.textContent=count+' ×';pay.textContent=typeof coefficient==='object'?String(coefficient.value??`${coefficient.numerator}/${coefficient.denominator}`):String(coefficient);tr.append(quantity,pay);table.append(tr);
  }
  const note=document.createElement('small');note.textContent=entry.basis??'';article.append(image,table,note);$('paytable').append(article);
 }
 for(const[pathIndex,path]of(game.paylinePaths??[]).entries()){
  if(!Array.isArray(path))continue;
  const picture=document.createElementNS(SVG,'svg');picture.setAttribute('viewBox',`0 0 ${game.columns*20} ${game.rows*20+12}`);picture.setAttribute('role','img');picture.setAttribute('aria-label','Line '+(pathIndex+1));
  const line=document.createElementNS(SVG,'polyline');line.setAttribute('points',path.map((row,column)=>`${column*20+10},${row*20+10}`).join(' '));const label=document.createElementNS(SVG,'text');label.setAttribute('x','3');label.setAttribute('y',String(game.rows*20+10));label.textContent=String(pathIndex+1);picture.append(line,label);$('paylines').append(picture);
 }
 const description=document.createElement('p');description.textContent=game.featureDescription??'';$('rules-text').append(description);
 for(const rule of game.rules??[]){if(typeof rule!=='string'||/53-bit|BigInt|models\/|probabilityEvidence|ticket|canonical|rational marginal|256-way|exact integer weighted enumeration/i.test(rule))continue;const p=document.createElement('p');p.textContent=rule;$('rules-text').append(p);}
 const math=game.math,percent=typeof math==='object'?(math.nativeReturn?.percent??(typeof math.nativeReturn?.value==='number'?(math.nativeReturn.value*100).toFixed(6):null)):null;
 $('model-note').textContent='Xisaabta madax-bannaan ee ZPLAY'+(percent?' · Celceliska xisaabeed '+percent+'%.':'.')+' Lacagta ciyaartu waa ETB.';
}
function selectTab(name){
 for(const panel of ['rules','settings','history'])$(panel+'-panel').hidden=panel!==name;
 for(const button of document.querySelectorAll('[data-tab]'))button.setAttribute('aria-selected',String(button.dataset.tab===name));
 if(name==='history')loadHistory();
}
async function loadHistory(){
 if(!snapshot?.authenticated){$('history-status').textContent='Gal akoonkaaga si aad u aragto history-ga.';return;}
 $('history-status').textContent='Soo qaadaya history-ga…';
 try{
  const rows=await account.history(historySort);$('history').replaceChildren();
  for(const entry of rows){
   const li=document.createElement('li'),date=document.createElement('time'),bet=document.createElement('span'),win=document.createElement('strong');
   const created=new Date(entry.created_at??entry.createdAt??entry.started_at??'');date.textContent=Number.isFinite(created.getTime())?created.toLocaleString():'—';
   bet.textContent=entry.stakeMinor!==undefined?moneyFromMinor(entry.stakeMinor):typeof entry.stake==='string'?formatMoney(entry.stake):'—';
   const payout=entry.payoutMinor??entry.payout_minor??entry.round?.payoutMinor;win.textContent=payout!==undefined?moneyFromMinor(payout):typeof entry.payout==='string'?formatMoney(entry.payout):'—';
   li.append(date,bet,win);$('history').append(li);
  }
  $('history-status').textContent=rows.length?'ETB':'Wareeg hore oo ciyaartan ah ma jiro.';
 }catch{$('history-status').textContent='History-ga lama soo qaadi karin. Dib u hubi.';}
}

function soundFile(role){
 const map=profile?.assets.sound??{},roles={click:['ButtonsDefault','ButtonsSpin'],spin:['ButtonsSpin'],moving:['ObjectMove'],win:['Win','LineWin','ObjectMoveStop'],multiplier:['WinMultiplier'],take:['DoubleTake','ButtonsDoubleTake'],gambleWin:['DoubleWin'],gambleLose:['DoubleLose']};
 const candidates=role.startsWith('reel')?['BoxReelStop'+role.slice(4),'BoxReelStopFast','ObjectMoveStop']:roles[role]??[role];
 return candidates.map(name=>map[name]).find(Boolean);
}
function playSound(role){
 if(!settings.effects||document.hidden)return;
 const file=soundFile(role);if(!file)return;
 let audio=audioCache.get(role);if(!audio){audio=new Audio(asset(file));audio.preload='none';if(role==='moving')audio.loop=true;audioCache.set(role,audio);}
 try{audio.volume=settings.effectsVolume/100;audio.currentTime=0;audio.play().catch(()=>{});}catch{}
}
function pauseSound(role){audioCache.get(role)?.pause();}
function applyAudio(){
 if(music){music.volume=settings.musicVolume/100;if(settings.music&&!document.hidden)music.play().catch(()=>{});else music.pause();}
 $('sound').setAttribute('aria-pressed',String(settings.effects||settings.music));
 imageAsset($('sound').querySelector('img'),profile.assets.buttons[settings.effects||settings.music?'sound-on':'sound-off']);
 $('effects-enabled').checked=settings.effects;$('music-enabled').checked=settings.music;$('effects-volume').value=settings.effectsVolume;$('music-volume').value=settings.musicVolume;$('motion-reduced').checked=settings.reducedMotion;
}
function saveSettings(){
 try{localStorage.setItem('zplay.native.audio.v1:'+game.id,JSON.stringify(settings));}catch{}
 applyAudio();
}
function installControls(){
 for(const close of document.querySelectorAll('[data-close]'))close.onclick=()=>close.closest('dialog').close();
 for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const bounds=dialog.getBoundingClientRect();if(event.clientX<bounds.x||event.clientY<bounds.y||event.clientX>bounds.x+bounds.width||event.clientY>bounds.y+bounds.height)dialog.close();});
 $('spin').onclick=()=>play();$('retry').onclick=retry;
 $('bet').onclick=openBet;$('bet-display').onclick=openBet;$('bet-step-open').onclick=openBet;
 $('bet-minus').onclick=()=>moveStake(-1,{immediate:true});$('bet-plus').onclick=()=>moveStake(1,{immediate:true});
 $('bet-less').onclick=()=>moveStake(-1);$('bet-more').onclick=()=>moveStake(1);
 $('bet-confirm').onclick=()=>{if(!stakeLevels().includes(stakeChoice))return;stake=stakeChoice;$('bet-dialog').close();playSound('click');updateControls();};
 $('turbo').onclick=()=>{fast=!fast;playSound('click');updateControls();};
 $('auto').onclick=()=>{if(autoRemaining){stopAutoplay();return;}if(!snapshot?.authenticated){openDialog('login-dialog');return;}if(!busy()){playSound('click');$('auto-error').textContent='';openDialog('auto-dialog');}};
 $('auto-start').onclick=startAutoplay;
 $('take-win').onclick=()=>collect();$('gamble-take').onclick=()=>collect();
 $('gamble-win').onclick=()=>{if(busy()||!actionAvailable('gamble'))return;$('gamble-message').textContent='';$('revealed-card').hidden=true;openDialog('gamble-dialog');updateControls();};
 $('gamble-red').onclick=()=>gamble('red');$('gamble-black').onclick=()=>gamble('black');
 $('menu').onclick=()=>{playSound('click');selectTab('rules');openDialog('menu-dialog');};
 for(const tab of document.querySelectorAll('[data-tab]'))tab.onclick=()=>{playSound('click');selectTab(tab.dataset.tab);};
 for(const button of document.querySelectorAll('[data-history-sort]'))button.onclick=()=>{historySort=button.dataset.historySort;for(const sibling of document.querySelectorAll('[data-history-sort]'))sibling.setAttribute('aria-pressed',String(sibling===button));loadHistory();};
 $('history-refresh').onclick=loadHistory;
 $('sound-yes').onclick=()=>{settings.consent=true;settings.effects=true;settings.music=true;saveSettings();$('sound-dialog').close();};
 $('sound-no').onclick=()=>{settings.consent=true;settings.effects=false;settings.music=false;saveSettings();$('sound-dialog').close();};
 $('sound').onclick=()=>{const enabled=!(settings.effects||settings.music);settings.consent=true;settings.effects=enabled;settings.music=enabled;saveSettings();if(enabled)playSound('click');};
 for(const[id,key]of[['effects-enabled','effects'],['music-enabled','music'],['motion-reduced','reducedMotion']])$(id).onchange=()=>{settings[key]=$(id).checked;saveSettings();};
 for(const[id,key]of[['effects-volume','effectsVolume'],['music-volume','musicVolume']])$(id).oninput=()=>{settings[key]=Math.max(0,Math.min(100,Number($(id).value)));saveSettings();};
 $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('game').requestFullscreen();$('settings-message').textContent='';}catch{$('settings-message').textContent='Fullscreen kama furna browser-kan.';}};
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){stopAutoplay();for(const sound of audioCache.values())sound.pause();music?.pause();}
  else{applyAudio();if(['requesting','presenting'].includes(phase)&&!visualStopped)tickDecoration(motionEpoch);if(!busy())account.refresh();}
 });
 window.addEventListener('blur',()=>stopAutoplay());
 window.addEventListener('pagehide',()=>{stopAutoplay();for(const sound of audioCache.values())sound.pause();music?.pause();});
 window.addEventListener('online',()=>{if(!busy())account.refresh();});
}

function buildArt(){
 $('game').dataset.layout=profile.layout;$('game').dataset.rows=String(game.rows);$('game').dataset.columns=String(game.columns);$('title-suffix').textContent=profile.titleSuffix??'';$('game').dataset.backendId=game.id;$('game').setAttribute('aria-label',profile.name??game.name);
 const background=profile.assets.art['background-vertical']??profile.assets.art.background;
 if(background)$('game').style.setProperty('--background',`url("${asset(background)}")`);
 if(profile.assets.art.background)$('game').style.setProperty('--background-landscape',`url("${asset(profile.assets.art.background)}")`);
 document.title=(profile.name??game.name)+' · ZPLAY';$('top-title').textContent=profile.name??game.name;$('menu-title').textContent=profile.name??game.name;
 imageAsset($('title-image'),profile.assets.art.title);$('title-image').alt=profile.name??game.name;
 imageAsset($('reel-frame'),profile.assets.art['reel-frame']);
 imageAsset($('wheel-background'),profile.assets.art['wheel-background']);imageAsset($('wheel-numbers'),profile.assets.art['wheel-numbers']);
 const hasWheel=profile.layout!=='burning'&&!!(profile.assets.art['wheel-background']||profile.assets.art['wheel-numbers']||profile.assets.art['multiplier-1']);$('multiplier-box').hidden=!hasWheel;
 if(profile.assets.art['multiplier-1'])imageAsset($('wheel-current'),profile.assets.art['multiplier-1']);
 for(const[id,key]of[['auto','autoplay'],['bet','bet'],['spin','spin'],['turbo','turbo'],['take-win','collect'],['gamble-win','gamble']])buttonArt(id,profile.assets.buttons[key]);
 imageAsset($('menu').querySelector('img'),profile.assets.buttons.menu);
 const coinArt=profile.assets.art.coin??profile.assets.art['lucky-coin'];
 if(profile.layout==='burning'&&coinArt&&game.id!=='burningice40_native'){
  for(const reel of profile.coinReels??[1,2,3]){const coin=document.createElement('div');coin.className='coin';coin.dataset.reel=String(reel);const image=document.createElement('img');imageAsset(image,coinArt);image.alt='';coin.append(image);$('coin-row').append(coin);}$('coin-row').hidden=false;
 }
 if(profile.assets.art['double-background'])$('gamble-dialog').style.setProperty('--gamble-background',`url("${asset(profile.assets.art['double-background'])}")`);
 $('game').append(document.querySelector('.feature-controls'));if(profile.layout==='burning')document.querySelector('.feature-controls').prepend($('auto'));
 $('turbo').hidden=!profile.assets.buttons.turbo;
 buildReels();makePaytable();
}
async function preloadCoreArt(){
 const names=[...new Set([...Object.values(profile.assets.symbols),profile.assets.buttons.spin,profile.assets.art.title].filter(Boolean))];
 await Promise.all(names.map(name=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve();image.onerror=()=>reject(Error('GAME_ART_UNAVAILABLE'));image.src=asset(name);})));
}
async function initialize(){
 const id=backendIdFromPath(location.pathname);
 if(!id){showMessage('Ciyaartan lama xaqiijin.',true);$('game').setAttribute('aria-busy','false');return;}
 try{
  const response=await fetch('/independent74/native/'+MODEL_SLUGS[id]+'/profile.json',{credentials:'same-origin',cache:'no-store'});
  if(!response.ok)throw Error('GAME_PROFILE_UNAVAILABLE');profile=validateProfile(await response.json(),id);game=profile.backendGame??profile.game;
  assetBase='/independent74/native/'+MODEL_SLUGS[id]+'/assets/';
  try{const saved=JSON.parse(localStorage.getItem('zplay.native.audio.v1:'+game.id)||'{}');for(const key of ['consent','effects','music','reducedMotion'])if(typeof saved[key]==='boolean')settings[key]=saved[key];for(const key of ['effectsVolume','musicVolume'])if(Number.isFinite(saved[key]))settings[key]=Math.max(0,Math.min(100,saved[key]));}catch{}
  stake=Array.isArray(game.stakeValues)?game.stakeValues[0]:game.minStake;stakeChoice=stake;
  buildArt();installControls();
  const background=profile.assets.sound.Background;if(background){music=new Audio(asset(background));music.preload='none';music.loop=true;}
  applyAudio();
  account=new NativeAccount({gameId:id,game,onChange:onSnapshot});snapshot=account.state;
  const results=await Promise.allSettled([preloadCoreArt(),account.refresh()]);
  if(results[0].status==='rejected'){resourceFailure=true;showMessage('Faylasha ciyaarta ma dhammaan. Dib u soo celi.',true);}
  snapshot=account.state;setPhase('idle');if(!resourceFailure)showMessage(statusMessage(),snapshot.error);
  if(snapshot.round)displayRound(snapshot.round,{effects:false});
  if(!settings.consent)$('sound-dialog').showModal();
  updateControls();
 }catch{
  resourceFailure=true;phase='error';$('game').setAttribute('aria-busy','false');showMessage('Ciyaarta lama soo qaadi karin. Dib u soo celi.',true);$('retry').hidden=false;$('retry').disabled=false;$('retry').textContent='Dib u soo celi ciyaarta';$('retry').onclick=()=>location.reload();
 }
 const clock=()=>{$('clock').textContent=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'Africa/Addis_Ababa'}).format(new Date());};clock();setInterval(clock,1000);
}
if(typeof document!=='undefined')initialize();
