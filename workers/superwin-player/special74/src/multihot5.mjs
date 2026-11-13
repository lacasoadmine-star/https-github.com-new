import {TextureBank,image} from './textures.mjs';
import {Account,amount,cents} from './financial/account.mjs';
import {loadReferenceFonts} from './fonts.mjs';

// Geometry and original sprites from the dated official portrait reference:
// reports/special74/reference-sessions/1794530310579/001-multi-hot-5/.
// Outcomes and balances are accepted only from the retained account API.
// The separately verified server model is independently authored Superwin math.
const symbols=['orange','golden_bell','plum','lemon','watermelon','cherry','grapes','dollar','777'];
const profile={id:'001-multi-hot-5-v2',modelId:'special74_multi_hot_5_v1',transport:'fresh',requiresVersion:true,columns:3,rows:3,symbols:{orange:0,cherry:1,plum:2,lemon:3,watermelon:4,grapes:5,golden_bell:6,dollar:7,'777':8}};
const account=new Account(profile),bank=new TextureBank(),base='Images/MultiHot5/Mobile/';
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),controls=document.querySelector('#controls'),status=document.querySelector('#status'),dialog=document.querySelector('dialog');
const buttons=new Map(),sounds=new Map(),width=566,height=1117;
// Opening display matches the observed reference; it carries no financial result.
let ready=false,grid=[['lemon','plum','dollar'],['orange','777','cherry'],['watermelon','golden_bell','grapes']],multiplier=5,win='0.00',lastWin='0.00',betIndex=0,spinning=false,started=0,fast=false,auto=0,autoGeneration=0,closed=false,muted=true,music=true,gambleOpen=false,revealed=null,winCells=[],raf=0;
let takeIcon,takeDisabledIcon,menuSheet,background,dismissedRoundId=null,dialogGeneration=0;
const canGamble=()=>Boolean(account.state?.gamble?.available)&&account.state?.round?.roundId!==dismissedRoundId;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const bet=()=>account.state?.model.betLevels[betIndex]??'—';
const setStatus=(message='')=>{status.textContent=message;status.hidden=!message;};
function sound(name,loop=false){if(muted||loop&&!music)return;let audio=sounds.get(name);if(!audio){audio=new Audio('/special-games/assets/Sound/MultiHot5/'+name+'.mp3');sounds.set(name,audio);}audio.loop=loop;audio.currentTime=0;audio.play().catch(()=>{});}
function stopSounds(){for(const audio of sounds.values())audio.pause();}
function sprite(name,x,y,w,h){bank.draw(ctx,name,x,y,w,h);}
function text(value,x,y,size=22,color='#fff',align='center',font='IntroBlackCaps'){ctx.fillStyle=color;ctx.font=`${size}px ${font}`;ctx.textAlign=align;ctx.textBaseline='top';ctx.fillText(String(value),x,y);}
function layout(){const w=Math.min(innerWidth,(innerHeight-26)*width/height),h=w*height/width;document.querySelector('#machine').style.cssText=`width:${w}px;height:${h}px`;const ratio=Math.min(devicePixelRatio,3);canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);ctx.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);render();}
function button(id,label,x,y,w,h,fn,gamble=false){const b=document.createElement('button');b.id=id;b.ariaLabel=label;b.title=label;b.style.cssText=`left:${100*x/width}%;top:${100*y/height}%;width:${100*w/width}%;height:${100*h/height}%`;if(gamble)b.className='gamble-control';b.addEventListener('click',fn);controls.append(b);buttons.set(id,b);return b;}
function updateControls(){const enabled=ready&&account.state?.accepting&&!account.pending&&!account.busy&&!spinning&&auto===0;
 for(const [id,b]of buttons)b.disabled=!enabled||gambleOpen;
 buttons.get('spin').disabled=auto===0&&(!ready||!account.state?.accepting||!!account.pending||gambleOpen);
 // Stopping autoplay never waits for the in-flight wallet response.
 buttons.get('auto').disabled=auto===0&&(!ready||!account.state?.accepting||!!account.pending||gambleOpen||spinning);
 controls.dataset.phase=spinning?'spinning':auto>0?'autoplay-gap':'idle';
 buttons.get('spin').ariaLabel=auto>0?'Stop autoplay':spinning?'Stop animation':'Spin';
 buttons.get('minus').disabled=!enabled||gambleOpen||betIndex===0;
 buttons.get('plus').disabled=!enabled||gambleOpen||betIndex>=(account.state?.model.betLevels.length??1)-1;
 buttons.get('double').disabled=!enabled||gambleOpen||!canGamble();
 buttons.get('take').disabled=!enabled||gambleOpen||win==='0.00';
 for(const id of ['gamble-red','gamble-black','gamble-take','gamble-close']){const b=buttons.get(id);b.hidden=!gambleOpen;b.disabled=!gambleOpen||!!account.pending||account.busy||account.recoveryBlocked||(['gamble-red','gamble-black'].includes(id)&&!canGamble());}
 document.querySelector('#retry').hidden=!account.pending;
 document.querySelector('#account-readout').textContent=`Balance ${account.state?.balance??'unavailable'} ETB. Bet ${bet()} ETB. Win ${win} ETB. Multiplier ${multiplier}x.`;
}
function draw(now=performance.now()){
 if(!ready)return;const elapsed=Math.max(0,now-started);
 ctx.clearRect(0,0,width,height);ctx.fillStyle='#003b29';ctx.fillRect(0,0,width,height);
 if(background)ctx.drawImage(background,0,-17.5558,width,background.height*width/background.width);
 sprite('Logo/65',75,55.4442,408,110.4);
 for(let c=0;c<3;c++)sprite('Start/Column',108+c*152,164.4442,148,333);
 ctx.save();ctx.beginPath();ctx.rect(107,165.4442,455,330);ctx.clip();
 for(let c=0;c<3;c++)for(let row=-1;row<3;row++){
  if(row<0&&!spinning)continue;
  const index=spinning?(Math.floor(elapsed/75)+row+c*3+9)%9:profile.symbols[grid?.[row]?.[c]],offset=spinning?(elapsed*(fast?1.4:.65)+c*34)%110:0;
  if(index===undefined)continue;sprite((spinning?'BlurBox/':'Box/')+index,66+c*152,105.4442+row*110+offset,230,230);
 }
 ctx.restore();sprite('Start/LineIcons',99,141.4442,471,364);
 const shown=spinning?1+Math.floor(elapsed/90)%5:multiplier;
 for(let i=0;i<3;i++){sprite(i===1?'Multiplier/BottomActive':'Multiplier/Bottom',i===1?-11:1,i===1?263.9442:161.9442+i*110,i===1?126:103,i===1?132:114);sprite('Multiplier/'+(i===1?shown:((shown+(i===0?2:0))%5)+1),1,170.9442+i*110,104,104);}
 sprite('Multiplier/Background',-4,142.9442,113,361);
 for(let i=0;i<3;i++)sprite(i===1?'Multiplier/TopActive':'Multiplier/Top',i===1?-11:1,i===1?263.9442:161.9442+i*110,i===1?126:103,i===1?132:114);
 if(!spinning&&winCells.length){ctx.save();ctx.strokeStyle='#ffed22';ctx.lineWidth=3;ctx.globalAlpha=.65+.35*Math.sin(now/200)**2;for(const cell of winCells){const row=Array.isArray(cell)?cell[0]:cell.row,col=Array.isArray(cell)?cell[1]:cell.col;ctx.strokeRect(108+col*152,165.4442+row*110,148,108);}ctx.restore();}
 sprite('Start/Footer',2,507.4442,562,50);
 text(account.state?.balance??'—',115,515.4442,18);text('ETB',115,532.4442,12);text(win,293,515.4442,18);text('ETB',293,532.4442,12);text(lastWin,483,515.4442,18);text('ETB',483,532.4442,12);
 sprite('Buttons/AutoPlayVertical',59,627.1663,130,143);sprite(canGamble()?'Buttons/DoubleVertical':'Buttons/DoubleVerticalDisabled',223,628.1663,130,143);ctx.drawImage(win!=='0.00'&&!spinning?takeIcon:takeDisabledIcon,387,628.1663,130,143);
 sprite('Buttons/BackgroundVertical',61,862.8884,440,148);sprite(betIndex===0||spinning||auto>0||account.pending?'Buttons/MinusVerticalDisabled':'Buttons/MinusVertical',-2,892.8884,112,110);sprite(spinning||auto>0||account.pending||betIndex>=(account.state?.model.betLevels.length??1)-1?'Buttons/PlusVerticalDisabled':'Buttons/PlusVertical',459,892.8884,104,110);
 const next=account.state?.model.betLevels[betIndex+1];if(next){text(next,430,909.8884,22,'#fdff5b');text('ETB',430,939.8884,18,'#fdff5b','center','IntroRegular');}
 sprite(spinning||auto>0?'Buttons/SpinVerticalStop':'Buttons/SpinVertical',151,794.8884,265,242);text(bet(),283,850.8884,34,'#fdff5b');text('ETB',283,895.8884,22,'#fdff5b');
 if(spinning||auto>0)ctx.drawImage(menuSheet,406,39,150,136,227,920,113,103);else ctx.drawImage(menuSheet,204,8,200,130,209.1203,904.3654,151.053,97.8834);
 if(auto)text(auto,125,679,25,'#fdff5b');if(gambleOpen)drawGamble();
 if(spinning||winCells.length)raf=requestAnimationFrame(draw);else raf=0;
}
function drawGamble(){ctx.fillStyle='#000d';ctx.fillRect(40,154,496,854);ctx.strokeStyle='#e5cd55';ctx.lineWidth=2;ctx.strokeRect(40,154,496,854);text('GAMBLE AMOUNT',181,243,16,'#ffdc29');text('GAMBLE TO WIN',394,243,16,'#ffdc29');const stake=account.state?.gamble?.stake??'0.00';text(stake+' ETB',181,263,16,'#ff4545');text(amount(cents(stake)*2n)+' ETB',394,263,16,'#ff4545');text('Previous Cards',283,329,16,'#bbb');sprite(revealed==='RED'?'Cards/Ace_Hearts':revealed==='BLACK'?'Cards/Ace_Spades':'Cards/Hidden',218,447,143,218);sprite('Double/RedVertical',83,717,176,64);sprite('Double/BlackVertical',316,717,176,64);sprite('Double/TakeVertical',195,848,186,53);sprite('Double/CloseVertical',461,145,80,81);text('Choose Red or Black gamble, or take the win!',283,938,16,'#ddd','center','IntroRegular');}
function render(){if(!raf)draw();updateControls();}
function cancelAuto(){auto=0;autoGeneration++;}
function failed(error){spinning=false;cancelAuto();setStatus(account.recoveryBlocked?'A saved round cannot be read or matched to this session. New wagers are blocked. Contact support to recover the saved round.':error.status===401?'Sign in to your Superwin account to play.':account.pending?'The server result is unconfirmed. Check the pending round before playing again.':'The account service is unavailable. Reload to reconnect.');render();}
function applyResult(result){grid=result.grid;multiplier=result.wheelMultiplier;win=result.finalWin;if(win!=='0.00'){lastWin=win;sound('Start/Win2');}winCells=result.winLines.flatMap(line=>line.positions);}
async function spin({automatic=false,generation=autoGeneration}={}){
 // A user stop invalidates the queued continuation, including between rounds.
 if(!automatic&&auto>0){cancelAuto();if(spinning)fast=true;render();return;}
 if(automatic&&(generation!==autoGeneration||auto===0))return;
 if(spinning){fast=true;render();return;}
 if(account.busy||account.pending||gambleOpen||!account.state?.accepting)return;
 spinning=true;started=performance.now();fast=false;winCells=[];win='0.00';revealed=null;setStatus();sound('Buttons/Spin');render();
 try{
  const {result}=await account.spin(bet());
  while(performance.now()-started<(fast?250:1100))await sleep(25);
  applyResult(result);spinning=false;sound('Start/ObjectMoveStop');
  if(automatic&&generation===autoGeneration&&auto>0)auto--;
  render();
  if(automatic&&generation===autoGeneration&&auto>0){
   await sleep(600);
   if(generation===autoGeneration&&auto>0&&!closed&&!document.hidden)void spin({automatic:true,generation});
  }
 }catch(error){failed(error);}
}
async function recover(){if(account.busy||spinning)return;try{const response=await account.retry();if(response.kind==='spin')applyResult(response.result);else{win=response.result.payout;lastWin=win;revealed=response.result.revealed||response.result.cardColor;}setStatus();render();}catch(error){failed(error);}}
function take(){if(account.busy||account.pending)return;dismissedRoundId=account.state?.round?.roundId??null;gambleOpen=false;win='0.00';winCells=[];render();}
async function gamble(choice){if(account.busy||account.pending)return;revealed=null;render();try{const {result}=await account.gamble(choice);win=result.payout;lastWin=win;revealed=result.revealed||result.cardColor;render();}catch(error){failed(error);}}
function openDialog(title){cancelAuto();dialogGeneration++;dialog.querySelector('h2').textContent=title;const panel=/rules/i.test(title)?'rules':title==='Settings'?'settings':title==='History'?'history':'menu';dialog.dataset.panel=panel;document.querySelector('#panel-round').textContent=account.state?.round?'Spin ID #'+account.state.round.roundId:'Multi Hot 5';document.querySelector('#panel-tabs').hidden=panel==='menu';for(const tab of document.querySelectorAll('#panel-tabs button'))tab.setAttribute('aria-current',String(tab.dataset.panel===panel));const body=dialog.querySelector('.choices');body.replaceChildren();if(!dialog.open)dialog.showModal();render();return body;}
function choice(body,label,action){const b=document.createElement('button');b.textContent=label;b.addEventListener('click',action);body.append(b);return b;}
function chooseBet(){if(spinning||account.busy||account.pending||account.recoveryBlocked||gambleOpen||!account.state?.accepting)return;const body=openDialog('Choose bet');for(const [i,value] of (account.state?.model.betLevels??[]).entries())choice(body,value+' ETB',()=>{betIndex=i;dialog.close();render();});}
function rules(){const body=openDialog('Multi Hot 5 · Superwin rules'),p=document.createElement('p');p.textContent='Independent Superwin rules: theoretical base RTP 96%; maximum base win 375× total stake. Each of the five fixed paylines uses one fifth of the total bet. Matching three symbols on a payline pays the line stake multiplied by its award and the 1×–5× multiplier. Optional color gamble wins 2× with probability 1/2, up to five attempts and a 500 ETB gamble stake. RTP is a long-run expectation, not a promised session return. Wins are credited by the server immediately; Take closes the win display. These are not SmartSoft private probabilities.';body.append(p);
 const table=document.createElement('table');const head=table.createTHead().insertRow();for(const label of ['Symbol','3 matching symbols']){const th=document.createElement('th');th.textContent=label;head.append(th);}const rows=table.createTBody();for(const [i,symbol] of symbols.entries()){const r=rows.insertRow();r.insertCell().textContent=symbol.replaceAll('_',' ');r.insertCell().textContent=[10,25,10,10,20,10,20,50,75][i]+'× line bet';}body.append(table);
}
function reference(){const body=openDialog('Official demo reference');const note=document.createElement('p');note.textContent='Official Multi Hot 5 reference captured on 13 November 2026. This Superwin build uses independent rules and your ETB account; the reference image is not a playable game.';const picture=document.createElement('img');picture.src='/special-games/reference-multihot5.png';picture.alt='Official Multi Hot 5 portrait reference showing reels, multiplier and controls';picture.width=412;picture.height=839;picture.className='reference-image';body.append(note,picture);}
function settings(){const body=openDialog('Settings');for(const [label,get,set]of [['Sound Effects',()=>!muted,v=>{muted=!v;if(muted)stopSounds();}],['Background Music',()=>music,v=>{music=v;if(!v)sounds.get('Start/Background')?.pause();else sound('Start/Background',true);}]] ){const b=choice(body,label,()=>{set(!get());b.setAttribute('aria-pressed',String(get()));});b.className='toggle settings-toggle';b.setAttribute('aria-pressed',String(get()));}const full=choice(body,'Full Screen',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen?.();else await document.documentElement.requestFullscreen?.();full.setAttribute('aria-pressed',String(!!document.fullscreenElement));}catch{setStatus('Full screen is unavailable in this browser.');}});full.className='toggle settings-toggle fullscreen-toggle';full.setAttribute('aria-pressed',String(!!document.fullscreenElement));}
async function history(){
 const body=openDialog('History'),generation=dialogGeneration,p=document.createElement('p');p.textContent='Loading…';body.append(p);
 try{
  const response=await account.history();if(generation!==dialogGeneration)return;
  const source=Array.isArray(response)?response:response.items;if(!Array.isArray(source))throw Error('HISTORY_UNAVAILABLE');
  const rows=source.map(item=>{const value=item.result_json??item;return typeof value==='string'?JSON.parse(value):value;}).filter(row=>row.gameId===profile.modelId).slice(0,30);
  p.textContent=rows.length?'BET HISTORY':'No account rounds yet.';
  const table=document.createElement('table');table.id='panel-history-table';const head=table.createTHead().insertRow();for(const label of ['Game','Bet','Win']){const th=document.createElement('th');th.textContent=label;head.append(th);}const tbody=table.createTBody();
  for(const round of rows){const tr=tbody.insertRow(),title=tr.insertCell();title.textContent='MULTI HOT 5';title.title=round.roundId;tr.insertCell().textContent=round.bet+' ETB';tr.insertCell().textContent=round.finalWin+' ETB';}
  body.append(table);
 }catch{if(generation===dialogGeneration)p.textContent='Account history is currently unavailable.';}
}
button('auto','Autoplay',59,627,130,143,()=>{if(auto){cancelAuto();render();return;}const body=openDialog('Autoplay');const p=document.createElement('p');p.textContent='Autoplay stops when you press Spin, leave the page, lose connection or the account rejects a bet.';body.append(p);for(const count of [10,25,50,100])choice(body,String(count),()=>{dialog.close();auto=count;const generation=++autoGeneration;sound('AutoPlay/Start');spin({automatic:true,generation});});});
button('double','Gamble',223,628,130,143,()=>{cancelAuto();gambleOpen=true;revealed=null;render();});button('take','Take win',387,628,130,143,take);
button('minus','Decrease bet',0,893,110,110,()=>{betIndex=Math.max(0,betIndex-1);sound('Buttons/Minus');render();});button('plus','Increase bet',459,893,104,110,()=>{betIndex=Math.min(account.state.model.betLevels.length-1,betIndex+1);sound('Buttons/Plus');render();});button('bet','Choose bet',385,879,74,90,chooseBet);button('spin','Spin',151,795,265,242,()=>spin());
button('gamble-red','Gamble red',83,717,176,64,()=>gamble('RED'),true);button('gamble-black','Gamble black',316,717,176,64,()=>gamble('BLACK'),true);button('gamble-take','Take gamble win',195,848,186,53,take,true);button('gamble-close','Close gamble',461,145,80,81,()=>{gambleOpen=false;render();},true);
for(const tab of document.querySelectorAll('#panel-tabs button'))tab.addEventListener('click',()=>({rules,settings,history})[tab.dataset.panel]());
document.querySelector('#retry').onclick=recover;document.querySelector('#menu').onclick=()=>{sound('Buttons/Menu');const body=openDialog('Multi Hot 5');for(const [label,fn]of [['Rules',rules],['Official reference',reference],['Settings',settings],['History',history],['Choose bet',chooseBet],['Exit',()=>location.assign('/games')]])choice(body,label,fn);};
document.querySelector('#sound-yes').onclick=()=>{muted=false;document.querySelector('#sound').hidden=true;sound('Start/Background',true);};document.querySelector('#sound-no').onclick=()=>{document.querySelector('#sound').hidden=true;};
addEventListener('resize',layout);addEventListener('blur',()=>{cancelAuto();stopSounds();render();});addEventListener('pagehide',()=>{closed=true;cancelAuto();stopSounds();cancelAnimationFrame(raf);});document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAuto();stopSounds();render();}});
try{await loadReferenceFonts();await Promise.all([bank.add(base+'Images/Sprites/Images-0.json'),bank.add(base+'Images/Sprites/Images-1.json'),bank.add(base+'Sprite/Logo-1.json')]);[takeIcon,takeDisabledIcon,menuSheet,background]=await Promise.all(['Images/Buttons/DoubleTakeVertical.png','Images/Buttons/DoubleTakeVerticalDisabled.png','Spine/Start/Menu/meniu.png','background-vertical.jpg'].map(path=>image('/special-games/assets/'+base+path)));
 // The original background URL was freshly observed and hash-pinned in media-manifest.json.
 ready=true;layout();setStatus('Connecting to your account…');await account.connect();if(account.state.round)applyResult(account.state.round);if(account.state.gamble?.attempt>0){win=account.state.gamble.stake;lastWin=win;revealed=account.state.gamble.lastResult?.revealed||account.state.gamble.lastResult?.cardColor||null;}setStatus();render();
}catch(error){failed(error);}
