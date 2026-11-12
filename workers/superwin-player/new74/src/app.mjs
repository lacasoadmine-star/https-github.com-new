import {games} from './games.mjs';
import {Account,cents,amount} from './account.mjs';
import {Art} from './art.mjs';
const $=id=>document.getElementById(id),id=location.pathname.split('/').filter(Boolean).at(-1),game=games.find(g=>g.id===id);
if(!game)throw Error('UNKNOWN_NEW_GAME');
document.title=game.name+' · New 74 · ZPLAY';$('game').dataset.art=game.art;$('game-name').textContent=$('menu-title').textContent=game.name;
const account=new Account(game),spriteData=await fetch('/new74/sprites.json').then(r=>r.json()),art=new Art(spriteData[game.art]);
let state=null,bet=null,busy=false,phase='loading',audioEnabled=false,musicEnabled=false,volume=.6,turbo=false,autoLeft=0,runEpoch=0,holdTimer=null,holding=false,suppressClick=false,shownWin='0.00',lastWin='0.00',taken=false;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const sounds=new Map(),music=new Audio(`/new74/assets/${game.art}/background.mp3`);music.loop=true;music.preload='none';
const audioKey='superwin.new74.audio.v1';
let consent=false;
try{const saved=JSON.parse(localStorage.getItem(audioKey)||'null');if(saved){consent=true;audioEnabled=saved.effects===true;musicEnabled=saved.music===true;volume=Number.isFinite(saved.volume)?Math.max(0,Math.min(1,saved.volume)):.6;}}catch{}
function sound(name){if(!audioEnabled)return;let a=sounds.get(name);if(!a){a=new Audio(`/new74/assets/${game.art}/${name}.mp3`);sounds.set(name,a);}a.volume=volume;a.currentTime=0;a.play().catch(()=>{});}
function audioSettings(){music.volume=volume*.45;if(musicEnabled&&!document.hidden)music.play().catch(()=>{});else music.pause();$('sound').setAttribute('aria-pressed',String(audioEnabled));$('sound').textContent=audioEnabled?'♫':'♪';$('volume').value=String(volume*100);$('music-toggle').setAttribute('aria-pressed',String(musicEnabled));if(consent)try{localStorage.setItem(audioKey,JSON.stringify({effects:audioEnabled,music:musicEnabled,volume}));}catch{}}
function message(value){$('message').textContent=value;}
function stopRepeats(){clearTimeout(holdTimer);holdTimer=null;holding=false;autoLeft=0;runEpoch++;}
function modal(id){stopRepeats();update();const d=$(id);if(!d.open)d.showModal();}
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>b.closest('dialog').close();
for(const d of document.querySelectorAll('dialog'))d.addEventListener('close',()=>{stopRepeats();update();});

class Scene {
 constructor(){this.canvas=$('scene');this.context=this.canvas.getContext('2d');this.grid=game.preview.map(r=>[...r]);this.multiplier=game.columns===3?5:2;this.spinning=false;this.started=0;this.fastStop=false;this.win=null;this.winUntil=0;this.logoUntil=0;this.settled=0;this.frame=0;}
 resize(){const b=$('game').getBoundingClientRect(),d=Math.min(devicePixelRatio,2);this.width=b.width;this.height=b.height;this.canvas.width=Math.round(b.width*d);this.canvas.height=Math.round(b.height*d);this.context.setTransform(d,0,0,d,0,0);this.draw();}
 layout(){const w=this.width,h=this.height,land=w>h;
  return game.columns===3?{land,x:land?w*.28:w*.185,y:land?h*.15:h*.146,w:land?w*.47:w*.81,h:land?h*.64:h*.30,title:[land?w*.32:w*.185,land?0:h*.05,land?w*.39:w*.68,land?h*.17:h*.09]}:{land,x:land?w*.245:0,y:land?h*.32:h*.302,w:land?w*.51:w,h:land?h*.49:w*.605,title:[land?w*.01:w*.18,land?h*.18:h*.045,land?w*.22:w*.64,land?h*.17:h*.085]};
 }
 draw(){
  const c=this.context,w=this.width,h=this.height;if(!w)return;c.clearRect(0,0,w,h);const l=this.layout();
  const logo=game.columns===3&&performance.now()<this.logoUntil&&!reduced()?`Logo/${Math.floor((this.logoUntil-performance.now())/45)%126+1}`:'Title';
  art.draw(c,logo,...l.title,{tight:true});
  if(game.columns===3){
   const mx=l.land?w*.17:0,mw=l.land?w*.10:w*.18;
   art.draw(c,'Multiplier/Background',mx,l.y,mw,l.h,{tight:true});
   const order=[3,5,1,4,2],at=order.indexOf(this.multiplier),values=[order[(at+4)%5],this.multiplier,order[(at+1)%5]];
   values.forEach((v,i)=>art.draw(c,`Multiplier/${v}`,mx+mw*.05,l.y+l.h*i/3+4,mw*.9,l.h/3-8,{tight:true,alpha:i===1?1:.55}));
   art.draw(c,'Multiplier/TopActive',mx,l.y+l.h/3,mw,l.h/3,{tight:true});
   for(let col=0;col<3;col++)art.draw(c,'Start/Column',l.x+l.w*col/3,l.y,l.w/3,l.h,{tight:true});
   c.strokeStyle='#dab85b';c.lineWidth=2;c.strokeRect(l.x,l.y,l.w,l.h);
   if(!l.land)art.draw(c,'Start/Footer',w*.01,h*.453,w*.98,h*.05,{tight:true});
   c.font=`${Math.max(8,w*.022)}px IntroBlack`;c.fillStyle='#ffdf66';c.textAlign='right';c.fillText('5 LINES FIXED',l.x+l.w-2,l.y-6);
  }else{
   const arcH=l.w*.254,arcY=l.y-arcH*.9;
   art.draw(c,'Multiplier/Background',l.x+l.w*.045,arcY,l.w*.91,arcH,{tight:true});
   c.save();c.beginPath();c.rect(l.x,arcY,l.w,arcH);c.clip();
   const values=[2,4,2,5,1,3,5,2,3,4,1,3,5],size=l.w*.99,centerX=l.x+l.w/2,centerY=arcY+size/2;
   c.translate(centerX,centerY);c.rotate(-values.indexOf(this.multiplier)*Math.PI*2/values.length+(this.spinning&&!this.fastStop?(performance.now()-this.started)/300:0));
   art.draw(c,'Multiplier/Numbers',-size/2,-size/2,size,size);c.restore();
   art.draw(c,'Box/Background',l.x,l.y,l.w,l.h,{tight:true});
  }
  const inset=game.columns===3?2:4,cw=(l.w-inset*2)/game.columns,ch=(l.h-inset*2)/3,keys=Object.keys(game.symbols),step=Math.floor((performance.now()-this.started)/65);
  c.save();c.beginPath();c.rect(l.x+inset,l.y+inset,l.w-inset*2,l.h-inset*2);c.clip();
  for(let col=0;col<game.columns;col++){
   if(game.columns===5){const gradient=c.createLinearGradient(l.x+col*cw,0,l.x+(col+1)*cw,0);gradient.addColorStop(0,'#031f17');gradient.addColorStop(.5,'#03492e');gradient.addColorStop(1,'#031f17');c.fillStyle=gradient;c.fillRect(l.x+inset+col*cw,l.y+inset,cw-1,ch*3);}
   for(let row=0;row<3;row++){
    const animated=this.spinning&&col>=this.settled&&!this.fastStop&&!reduced(),symbol=animated?keys[(step+col*3+row)%keys.length]:this.grid[row][col],sprite=`${animated&&game.columns===3?'BlurBox':'Box'}/${game.symbols[symbol]}`,meta=art.frames[sprite],f=meta?.spriteSourceSize;
    if(!f)continue;
    const scale=Math.min(cw*.98/f.w,ch*.97/f.h),sw=f.w*scale,sh=f.h*scale;
    const x=l.x+inset+col*cw+(cw-sw)/2,y=l.y+inset+row*ch+(ch-sh)/2;
    art.draw(c,sprite,x,y,sw,sh,{tight:true});
   }
  }
  if(this.win&&!this.spinning){
   c.strokeStyle='#fff36e';c.lineWidth=2;c.shadowColor='#ffcc00';c.shadowBlur=6;
   for(const line of this.win.winLines){c.beginPath();line.positions?.forEach((p,i)=>{const row=Array.isArray(p)?p[0]:p.row,col=Array.isArray(p)?p[1]:p.col;if(!Number.isInteger(row)||!Number.isInteger(col))return;const x=l.x+inset+(col+.5)*cw,y=l.y+inset+(row+.5)*ch;i?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();}
   if(!reduced()&&performance.now()<this.winUntil){c.shadowBlur=0;const positions=new Set(this.win.winLines.flatMap(line=>line.positions.map(p=>Array.isArray(p)?p.join(','):`${p.row},${p.col}`)));for(const p of positions){const[row,col]=p.split(',').map(Number);art.draw(c,`BoxWin/${Math.floor(performance.now()/40)%45+1}`,l.x+col*cw-cw*.1,l.y+row*ch-ch*.1,cw*1.2,ch*1.2,{alpha:.8});}}
  }
  c.restore();
  if(game.columns===5){c.strokeStyle='#c7b55c';c.lineWidth=2;c.strokeRect(l.x+2,l.y+2,l.w-4,l.h-4);}
 }
 loop(){cancelAnimationFrame(this.frame);const tick=()=>{this.draw();if(!document.hidden&&(this.spinning||this.win&&performance.now()<this.winUntil||performance.now()<this.logoUntil))this.frame=requestAnimationFrame(tick);};tick();}
 start(){this.spinning=true;this.fastStop=false;this.settled=0;this.win=null;this.started=performance.now();this.loop();}
 stop(){this.fastStop=true;this.draw();}
 async present(result){const min=reduced()?0:turbo?250:game.columns===3?1200:950;while(!this.fastStop&&performance.now()-this.started<min)await wait(20);this.grid=result.grid.map(r=>[...r]);for(let col=1;col<=game.columns;col++){this.settled=col;if(!this.fastStop&&!reduced()){sound('stop');await wait(turbo?40:130);}}this.spinning=false;this.multiplier=result.wheelMultiplier;this.win=cents(result.finalWin)>0n?result:null;this.winUntil=performance.now()+4000;this.loop();}
 cancel(){this.spinning=false;this.win=null;cancelAnimationFrame(this.frame);this.draw();}
}
const scene=new Scene();
function controlArt(){
 const five=game.columns===3;
 const mapping={auto:five?'Buttons/AutoPlayVertical':'Buttons/AutoPlay',double:five?'Buttons/DoubleVertical':'Buttons/Double',take:five?'Buttons/DoubleTakeVertical':'Buttons/DoubleTake',spin:five?(busy?'Buttons/SpinVerticalStop':'Buttons/SpinVertical'):(busy?'Buttons/SpinStop':turbo?'Buttons/SpinTurbo':'Buttons/Spin'),less:'Buttons/MinusVertical',more:'Buttons/PlusVertical',bet:'Buttons/Bet',turbo:turbo?'Buttons/QuickPlayTurbo':'Buttons/QuickPlay'};
 for(const[id,name]of Object.entries(mapping)){const canvas=$(id).querySelector('canvas');if(canvas&&$(id).getClientRects().length)art.canvas(canvas,name);}
 if(five)art.canvas($('bar-art'),'Buttons/BackgroundVertical');
}
function update(){
 const ready=!!state?.authenticated&&!!state.accepting,levels=state?.model.betLevels||[],index=levels.indexOf(bet),locked=busy||holding||autoLeft>0||!!account.pending;
 $('spin').disabled=phase==='loading'||!ready||phase==='gambling'||!!account.pending&&!busy;
 $('spin').dataset.busy=String(busy);
 $('spin-label').textContent=busy?'STOP':game.columns===3?(bet||'—'):'HOLD\n&\nSPIN';$('spin-unit').textContent=busy?'':'ETB';
 $('spin').setAttribute('aria-label',busy?'STOP · dhammee muuqaalka wareeggan':`SPIN ${bet||''} ETB · hold to repeat`);
 $('balance').textContent=state?.balance||'—';$('win').textContent=shownWin;$('bet-value').textContent=bet||'—';
 if(game.columns===3){$('bet-meter').querySelector('.caption').textContent='LAST WIN';$('bet-value').textContent=lastWin;}
 $('previous-bet').textContent=index>0?levels[index-1]+'\nETB':'';$('next-bet').textContent=index>=0&&index<levels.length-1?levels[index+1]+'\nETB':'';
 for(const id of ['bet','bet-meter','less','more'])$(id).disabled=locked||!ready||!!state?.round?.freeSpinsRemaining;
 $('less').disabled||=index<=0;$('more').disabled||=index>=levels.length-1;
 $('auto').disabled=!ready||busy&&!autoLeft||holding||!!account.pending;
 $('auto-count').hidden=!autoLeft;$('auto-count').textContent=String(autoLeft);
 const gamble=ready&&!busy&&!account.pending&&!taken&&state?.gamble?.available;
 $('double').disabled=!gamble;$('take').disabled=!gamble;
 if(game.columns===5){$('double').hidden=!gamble;$('take').hidden=!gamble;}
 $('recover').hidden=!account.pending;$('recover').disabled=busy;
 $('free-spins').textContent=state?.round?.freeSpinsRemaining?'FREE SPINS '+state.round.freeSpinsRemaining:'';
 $('login').hidden=!!state?.authenticated;
 controlArt();
}
function explain(error){
 if(error.status===401||error.status===403)return 'Gal akoonkaaga ZPLAY si aad u ciyaarto.';
 if(error.code==='INSUFFICIENT_FUNDS')return 'Hadhaaga wallet-ka kuma filna sharadkan.';
 if(account.pending)return 'Wareegga weli lama xaqiijin. Taabo “Dib u xaqiiji wareegga”.';
 if(error.code==='GAME_UNAVAILABLE')return 'Ciyaartani hadda diyaar uma aha sharad.';
 return 'Xiriirka ciyaarta lama xaqiijin. Dib u fur marka xiriirku soo noqdo.';
}
async function connect(){
 try{state=await account.connect();if(!bet||!state.model.betLevels.includes(bet))bet=state.round?.freeSpinsRemaining?state.round.bet:state.model.betLevels[0];if(state.round){scene.grid=state.round.grid.map(r=>[...r]);scene.multiplier=state.round.wheelMultiplier;shownWin=state.gamble?.stake||state.round.finalWin;scene.draw();}message(state.accepting?'':'Ciyaartani hadda diyaar uma aha sharad.');}
 catch(error){if(error.status===401||error.status===403)state=null;message(explain(error));}
 finally{phase='idle';update();}
}
async function spin(){
 if(busy){stopRepeats();scene.stop();message('Hubinaya natiijada wareegga…');return null;}
 if(!state?.authenticated||!state.accepting||account.pending)return null;
 busy=true;phase='spinning';taken=false;scene.start();sound('spin');message('');update();
 try{const {result}=await account.spin(bet);await scene.present(result);state=account.state;shownWin=result.finalWin;message(cents(shownWin)>0n?'WIN '+shownWin+' ETB':'');if(cents(shownWin)>0n){lastWin=shownWin;sound('win');}return result;}
 catch(error){scene.cancel();stopRepeats();message(explain(error));return null;}
 finally{busy=false;phase='idle';update();}
}
$('spin').onclick=()=>{if(suppressClick){suppressClick=false;return;}if(autoLeft&&!busy){stopRepeats();update();return;}void spin();};
$('spin').addEventListener('pointerdown',event=>{
 if(event.button!==0||busy||autoLeft||holding||!state?.accepting||account.pending)return;
 stopRepeats();suppressClick=false;const epoch=runEpoch;
 holdTimer=setTimeout(async()=>{if(epoch!==runEpoch||document.hidden||document.querySelector('dialog[open]'))return;holding=true;suppressClick=true;while(holding&&epoch===runEpoch&&!document.hidden){const r=await spin();if(!r||epoch!==runEpoch)break;await wait(turbo?250:850);}if(epoch===runEpoch){holding=false;update();}},600);
});
for(const event of ['pointerup','pointercancel'])window.addEventListener(event,()=>{if(holdTimer||holding){stopRepeats();update();}});
$('spin').addEventListener('pointerleave',()=>{if(holdTimer||holding){stopRepeats();update();}});
$('spin').addEventListener('contextmenu',event=>event.preventDefault());
$('spin').addEventListener('keydown',event=>{if(event.repeat&&[' ','Enter'].includes(event.key))event.preventDefault();});
function changeBet(value){if(busy||holding||autoLeft||account.pending||!state?.model.betLevels.includes(value))return;bet=value;sound('click');update();}
$('less').onclick=()=>changeBet(state.model.betLevels[state.model.betLevels.indexOf(bet)-1]);$('more').onclick=()=>changeBet(state.model.betLevels[state.model.betLevels.indexOf(bet)+1]);
function bets(){if(!state||busy||account.pending)return;$('bet-list').replaceChildren();for(const value of state.model.betLevels){const b=document.createElement('button');b.textContent=value+' ETB';b.setAttribute('aria-pressed',String(value===bet));b.onclick=()=>{changeBet(value);$('bet-dialog').close();};$('bet-list').append(b);}modal('bet-dialog');}
$('bet').onclick=$('bet-meter').onclick=bets;
$('turbo').onclick=()=>{turbo=!turbo;$('turbo').setAttribute('aria-pressed',String(turbo));sound('click');update();};
$('auto').onclick=()=>{if(autoLeft){stopRepeats();update();}else modal('auto-dialog');};
$('auto-start').onclick=async()=>{
 let loss;try{loss=cents($('loss-limit').value);if(loss<=0n)throw Error();}catch{$('auto-error').textContent='Qor xad khasaaro sax ah, tusaale 10.00.';return;}
 const count=Number($('auto-spins').value);if(![10,25,50,100].includes(count)||!state?.accepting||busy||account.pending)return;
 $('auto-dialog').close();await wait(0);stopRepeats();const epoch=runEpoch,start=cents(state.balance);autoLeft=count;
 while(autoLeft>0&&epoch===runEpoch&&!document.hidden){autoLeft--;const result=await spin();if(!result||$('stop-win').checked&&cents(result.finalWin)>0n||start-cents(state.balance)>=loss)break;if(autoLeft)await wait(turbo?250:850);}
 if(epoch===runEpoch){autoLeft=0;update();}
};
function collect(){stopRepeats();taken=true;scene.win=null;scene.draw();$('gamble-dialog').close();message('Guusha waxaa lagu qoray wallet-ka ETB.');sound('take');update();}
$('take').onclick=$('collect').onclick=collect;
$('double').onclick=()=>{if(!state?.gamble?.available||busy||account.pending)return;$('gamble-amount').textContent=state.gamble.stake+' ETB';$('card').textContent='';$('gamble-message').textContent='';modal('gamble-dialog');};
async function gamble(choice){
 if(busy||!state?.gamble?.available||account.pending)return;stopRepeats();busy=true;phase='gambling';$('red').disabled=$('black').disabled=true;update();
 try{const {result}=await account.gamble(choice);state=account.state;shownWin=result.payout;$('gamble-amount').textContent=result.payout+' ETB';const colour=result.revealed||result.cardColor;$('card').textContent=colour==='RED'?'♥':'♠';$('card').style.color=colour==='RED'?'#fa335d':'#fff';$('gamble-message').textContent=result.won?'WIN · ×2':'0.00 ETB';sound(result.won?'win':'click');}
 catch(error){$('gamble-message').textContent=explain(error);}
 finally{busy=false;phase='idle';$('red').disabled=$('black').disabled=!state?.gamble?.available||!!account.pending;update();}
}
$('red').onclick=()=>gamble('RED');$('black').onclick=()=>gamble('BLACK');
async function history(){const root=$('history-list');root.textContent='Soo dejinaya…';try{const data=await account.history();root.replaceChildren();for(const row of data.items.filter(r=>r.result_json?.gameId===game.modelId).slice(0,30)){const r=row.result_json,a=document.createElement('article');a.textContent=`${new Date(row.created_at).toLocaleString()} · BET ${r.bet} · WIN ${r.finalWin} ETB`;root.append(a);}if(!root.children.length)root.textContent='Weli wareeg ma jiro.';}catch{root.textContent='Taariikhda hadda lama heli karo.';}}
function rules(){
 $('rules').textContent=`${game.lines} lines fixed · ${game.columns} reels. Guuluhu waxay ka bilaabmaan reel-ka bidix. STOP wuxuu dedejiyaa muuqaalka wareegga. Hay SPIN si wareegyo loogu celiyo sharadka la doortay; sii daa si ay u joogsadaan.`;
 const root=$('paytable');root.replaceChildren();const pays=state?.model.paytable;
 if(!pays){const p=document.createElement('p');p.textContent='Jadwalka guulaha ayaa la heli karaa marka akoonku xirmo.';root.append(p);return;}
 for(const[symbol,pay]of Object.entries(pays)){if(!Object.hasOwn(game.symbols,symbol))continue;const a=document.createElement('article'),canvas=document.createElement('canvas'),p=document.createElement('p');a.className='pay';p.textContent=Object.entries(pay).map(([count,m])=>`${count} · ×${m}`).join('\n');a.append(canvas,p);root.append(a);art.canvas(canvas,`Box/${game.symbols[symbol]}`);}
}
function tab(name){for(const n of ['rules','audio','history'])$(n+'-panel').hidden=n!==name;if(name==='history')void history();if(name==='rules')rules();}
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>tab(b.dataset.tab);
$('menu').onclick=$('menu-top').onclick=()=>{modal('menu-dialog');tab('rules');};
for(const [id,enabled]of [['sound-yes',true],['sound-no',false]])$(id).onclick=()=>{audioEnabled=musicEnabled=enabled;consent=true;audioSettings();$('sound-dialog').close();};
$('sound').onclick=()=>{audioEnabled=!audioEnabled;musicEnabled=audioEnabled;consent=true;audioSettings();};
$('volume').oninput=()=>{volume=Number($('volume').value)/100;audioSettings();};$('music-toggle').onclick=()=>{musicEnabled=!musicEnabled;audioSettings();};
$('fullscreen').disabled=!document.fullscreenEnabled;$('fullscreen').onclick=async()=>{try{document.fullscreenElement?await document.exitFullscreen():await $('game').requestFullscreen();}catch{message('Fullscreen lama heli karo qalabkan.');}};
$('recover').onclick=async()=>{if(busy||!account.pending)return;stopRepeats();busy=true;update();try{const response=await account.retry();state=account.state;if(response.kind==='spin')await scene.present(response.result);shownWin=response.kind==='spin'?response.result.finalWin:response.result.payout;message('Wareeggii hore waa la xaqiijiyey.');}catch(error){message(explain(error));}finally{busy=false;update();}};
window.addEventListener('blur',()=>{stopRepeats();update();});window.addEventListener('pagehide',()=>{stopRepeats();music.pause();});
document.addEventListener('visibilitychange',()=>{stopRepeats();if(document.hidden)music.pause();else{audioSettings();if(!busy&&!account.pending)void connect();}update();});
document.addEventListener('keydown',event=>{if(event.code==='Space'&&!event.repeat&&!document.querySelector('dialog[open]')&&!/BUTTON|INPUT|SELECT|A/.test(event.target.tagName)){event.preventDefault();void spin();}});
function clock(){$('clock').textContent=new Date().toLocaleTimeString('en-GB',{timeZone:'Africa/Addis_Ababa'});}clock();setInterval(clock,1000);
await art.load();new ResizeObserver(()=>{scene.resize();controlArt();}).observe($('game'));scene.resize();await connect();scene.logoUntil=performance.now()+5600;scene.loop();audioSettings();if(!consent)$('sound-dialog').showModal();
