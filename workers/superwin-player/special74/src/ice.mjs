import {TextureBank,image} from './textures.mjs';
import {LibraryAccount} from './financial/library-account.mjs';

// Geometry measured from the official BlazingHot10 portrait renderer, 566 logical px.
// This presentation does not generate outcomes, calculate prizes or own a balance.
const profile={id:'007-burning-ice-10-v2',modelId:'burningice10_native',columns:5,rows:3,multiplier:false,symbols:Object.fromEntries(Array.from({length:12},(_,i)=>[String(i),i]))};
const base='Images/BlazingHot/Mobile/';
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),controls=document.querySelector('#controls'),status=document.querySelector('#status');
const bank=new TextureBank(),account=new LibraryAccount(profile),buttons=new Map();
let grid=null,shownWin='—',lastWin='—',betIndex=0,spinning=false,presenting=false,started=0,fast=false,auto=0,held=false,holdTimer,raf=0,muted=true,winCells=[],freeze=[],ready=false,closed=false;
let logo,lineIcons,takeIcon,background,menuSheet;
const sounds=new Map();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const bet=()=>account.state?.model.betLevels[betIndex]??'—';
const setStatus=(text='')=>{status.textContent=text;status.hidden=!text;};
function sound(name,loop=false){if(muted)return;let a=sounds.get(name);if(!a){a=new Audio('/special-games/assets/Sound/BlazingHot/'+name+'.mp3');sounds.set(name,a);}a.loop=loop;a.currentTime=0;a.play().catch(()=>{});}
function stopSounds(){for(const a of sounds.values())a.pause();}
function sprite(name,x,y,w,h){bank.draw(ctx,name,x,y,w,h);}
function text(value,x,y,size=22,color='#fff',align='center'){ctx.fillStyle=color;ctx.font=`700 ${size}px Arial`;ctx.textAlign=align;ctx.textBaseline='top';ctx.fillText(String(value),x,y);}
function layout(){const w=Math.min(innerWidth,(innerHeight-26)*566/1117),h=w*1117/566;document.querySelector('#machine').style.cssText=`width:${w}px;height:${h}px`;const dpr=Math.min(devicePixelRatio,3);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(canvas.width/566,0,0,canvas.width/566,0,0);draw();}
function button(id,label,x,y,w,h,handler){const b=document.createElement('button');b.id=id;b.ariaLabel=label;b.title=label;b.style.cssText=`left:${100*x/566}%;top:${100*y/1117}%;width:${100*w/566}%;height:${100*h/1117}%`;b.addEventListener('click',handler);controls.append(b);buttons.set(id,b);return b;}
function updateControls(){
 const available=ready&&account.state?.accepting&&!account.pending&&!presenting;
 for(const [id,b]of buttons)b.disabled=!available||spinning;
 buttons.get('spin').disabled=!available&&!spinning;
 buttons.get('minus').disabled=!available||spinning||betIndex===0;
 buttons.get('plus').disabled=!available||spinning||betIndex>=((account.state?.model.betLevels.length??1)-1);
 buttons.get('collect').disabled=!available||spinning||!account.state?.nativeRound?.actions.includes('collect');
 buttons.get('double').disabled=!available||spinning||!account.state?.gamble?.available;
 document.querySelector('#retry').hidden=!account.pending;
}
function draw(now=performance.now()){
 if(!ready)return;
 ctx.clearRect(0,0,566,1117);ctx.drawImage(background,0,-17.5558,566,background.height*566/background.width);
 ctx.drawImage(logo,99,66.4442,375,159);
 sprite('Start/WildHeader',151,152.4442,265,42);
 for(let i=0;i<3;i++)sprite('Start/Wild',-4+i*110,142.4442,372,61);
 for(let c=0;c<5;c++)sprite('Start/Column',1+c*113,200.4442,110,334);
 ctx.save();ctx.beginPath();ctx.rect(0,200.4442,566,334);ctx.clip();
 for(let c=0;c<5;c++)for(let row=0;row<3;row++){
  const moving=spinning&&!freeze.includes(c),offset=moving?((now-started)*(fast?1.4:.65)+c*34)%112:0;
  const symbol=moving?String((Math.floor((now-started)/75)+row+c*3)%12):grid?.[row]?.[c];
  if(symbol===undefined)continue;
  const type=moving?'BlurBox/':'Box/',x=-45+c*113,y=153.4442+row*112+offset;
  sprite(type+symbol,x,y,202,202);
  if(moving&&row===2)sprite(type+symbol,x,153.4442-112+offset,202,202);
 }
 ctx.restore();ctx.drawImage(lineIcons,-16,151.4442,587,392);
 for(const c of freeze)sprite('Start/Ice',1+c*113,200.4442,110,334);
 if(!spinning&&winCells.length){ctx.save();ctx.strokeStyle='#fff05d';ctx.lineWidth=3;ctx.globalAlpha=.6+.4*Math.sin(now/200)**2;for(const [r,c]of winCells)ctx.strokeRect(c*113+3,200.4442+r*112,106,110);ctx.restore();}
 sprite('Start/FooterVertical',2,536.4442,562,63);
 text(account.state?.balance??'—',104,551.4442);text('ETB',104,577.4442,12,'#d4d9ce');
 text(shownWin,284,551.4442);text('ETB',284,577.4442,12,'#d4d9ce');
 text(lastWin,468,551.4442);text('ETB',468,577.4442,12,'#d4d9ce');
 sprite('Buttons/AutoPlayVertical',59,627.1663,130,143);
 sprite(account.state?.gamble?.available?'Buttons/DoubleVertical':'Buttons/DoubleVerticalDisabled',223,628.1663,130,143);
 ctx.drawImage(takeIcon,387,628.1663,130,143);
 sprite('Buttons/BackgroundVertical',61,862.8884,440,148);
 sprite(betIndex===0?'Buttons/MinusVerticalDisabled':'Buttons/MinusVertical',-2,892.8884,112,110);
 sprite('Buttons/PlusVertical',459,892.8884,104,110);
 const next=account.state?.model.betLevels[betIndex+1];if(next){text(next,430,909.8884,23,'#ffe451');text('ETB',430,939.8884,22,'#ffe451');}
 sprite(spinning?'Buttons/SpinVerticalStop':'Buttons/SpinVertical',151,794.8884,265,242);
 text(bet(),283,850.8884,35,'#ffe451');text('ETB',283,895.8884,23,'#ffe451');
 // Original menu atlas regions, measured on the reference mesh. Spine motion is reviewed separately.
 if(spinning)ctx.drawImage(menuSheet,406,39,150,136,227,920,113,103);
 else ctx.drawImage(menuSheet,204,8,200,130,209.1203,904.3654,151.053,97.8834);
 if(auto)text(auto,125,679,25,'#ffe451');
 if(spinning||winCells.length)raf=requestAnimationFrame(draw);else raf=0;
}
function render(){if(!raf)draw();updateControls();}
function cancel(){auto=0;held=false;clearTimeout(holdTimer);render();}
function handleError(e){cancel();setStatus(e.status===401?'Ku gal akoonkaaga si aad u ciyaarto.':account.pending?'Wareegga lama xaqiijin. Taabo dib u hubi.':'Ciyaarta hadda lama heli karo. Fadlan isku day mar kale.');render();}
async function present(result){
 presenting=true;
 const native=result.native;const frames=native.frames.length?native.frames:[{grid:native.grid,wins:native.wins}];
 for(let index=0;index<frames.length;index++){
  const frame=frames[index];
  if(index){spinning=true;started=performance.now();freeze=Array.isArray(frame.feature?.frozenColumns)?frame.feature.frozenColumns:[];sound('Start/Ice1');render();await sleep(fast?250:700);}
  grid=Array.from({length:3},(_,r)=>frame.grid.map(col=>col[r]));spinning=false;freeze=[];
  winCells=(frame.wins||[]).flatMap(w=>w.cells.map(([c,r])=>[r,c]));render();sound('Start/ObjectMoveStop');
  if(index<frames.length-1)await sleep(fast?150:650);
 }
 grid=result.grid;shownWin=result.finalWin;if(result.finalWin!=='0.00'){lastWin=result.finalWin;sound('Start/Win1');}
 spinning=false;presenting=false;freeze=[];render();
}
async function spin(){
 if(spinning||presenting){fast=true;cancel();return;}
 if(account.busy||account.pending||!account.state?.accepting)return;
 spinning=true;started=performance.now();fast=false;winCells=[];shownWin='—';setStatus();sound('Buttons/Spin');render();
 try{const response=await account.spin(bet());await sleep(Math.max(0,(fast?250:1100)-(performance.now()-started)));await present(response.result);if(auto>0||held){if(auto>0)auto--;await sleep(600);if((auto>0||held)&&!closed&&!document.hidden)void spin();}}
 catch(e){spinning=false;presenting=false;handleError(e);}
}
async function collect(){if(spinning||account.busy||account.pending)return;try{await account.collect();shownWin='0.00';winCells=[];setStatus();render();}catch(e){handleError(e);}}
async function recover(){if(spinning||account.busy)return;try{const r=await account.retry();setStatus();await present(r.result);}catch(e){handleError(e);}}
function dialog(title,options){cancel();const d=document.querySelector('dialog'),body=d.querySelector('.choices');d.querySelector('h2').textContent=title;body.replaceChildren();for(const [label,fn]of options){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{d.close();fn();};body.append(b);}d.showModal();}
button('auto','Autoplay',59,627,130,143,()=>dialog('Autoplay',[[10,()=>{auto=10;spin();}],[25,()=>{auto=25;spin();}],['Cancel',cancel]]));
button('double','Double',223,628,130,143,()=>dialog('Double',[['Red',()=>gamble('RED')],['Black',()=>gamble('BLACK')],['Take',collect]]));
button('collect','Take',387,628,130,143,collect);
button('minus','Decrease bet',0,893,110,110,()=>{betIndex=Math.max(0,betIndex-1);render();});
button('plus','Increase bet',459,893,104,110,()=>{betIndex=Math.min(account.state.model.betLevels.length-1,betIndex+1);render();});
const spinButton=button('spin','Spin',151,795,265,242,spin);
spinButton.addEventListener('pointerdown',()=>{clearTimeout(holdTimer);holdTimer=setTimeout(()=>{held=true;if(!spinning)spin();},700);});
for(const event of ['pointerup','pointercancel','pointerleave'])spinButton.addEventListener(event,()=>{held=false;clearTimeout(holdTimer);});
async function gamble(choice){try{const r=await account.gamble(choice);shownWin=r.result.finalWin;setStatus(r.kind==='collect'?'Win collected.':`${r.result.revealed} · ${r.result.payout} ETB`);render();}catch(e){handleError(e);}}
document.querySelector('#retry').onclick=recover;
document.querySelector('#menu').onclick=()=>dialog('Burning Ice 10',[['Sound',()=>{muted=!muted;if(muted)stopSounds();else sound('Start/Background',true);}],['Bet',()=>dialog('Bet',account.state?.model.betLevels.map((v,i)=>[v+' ETB',()=>{betIndex=i;render();}])||[])],['Special Games',()=>location.assign('/special-games/')]]);
document.querySelector('#sound-yes').onclick=()=>{muted=false;document.querySelector('#sound').hidden=true;sound('Start/Background',true);};
document.querySelector('#sound-no').onclick=()=>{document.querySelector('#sound').hidden=true;};
addEventListener('resize',layout);addEventListener('blur',()=>{cancel();stopSounds();});
addEventListener('pagehide',()=>{closed=true;cancel();stopSounds();cancelAnimationFrame(raf);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancel();stopSounds();}});
try{
 await bank.add(base+'Images/Sprites/Images-0.webp.json');
 [logo,lineIcons,takeIcon,background,menuSheet]=await Promise.all(['Images/Start/Logo-10.webp','Images/Start/LineIcons-10.webp','Images/Buttons/DoubleTakeVertical.webp','background-vertical.jpg','Spine/Start/Menu/meniu.webp'].map(p=>image('/special-games/assets/'+base+p)));
 ready=true;layout();setStatus('Connecting…');
 await account.connect();grid=account.state.round?.grid??null;shownWin=account.state.round?.finalWin??'0.00';setStatus();render();
}catch(e){handleError(e);}
