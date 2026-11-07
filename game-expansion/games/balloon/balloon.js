// ZPLAY Balloon: Canvas is presentation only. The Railway ledger and rules
// alone decide stake, liability, pop point, collection and ETB balance.
const GAME_ID='balloon_native';
const API='/api/library/';
const $=id=>document.getElementById(id);
const scene=$('scene'),sky=$('sky'),ctx=scene.getContext('2d',{alpha:false});
const ui={button:$('holdButton'),hand:$('handIcon'),holdText:$('holdText'),wallet:$('wallet'),notice:$('notice'),roundLabel:$('roundLabel'),mult:$('balloonMultiplier'),value:$('balloonValue'),result:$('result'),status:$('roundStatus'),stake:$('stake'),sound:$('sound'),refresh:$('refresh')};
const stakes=[...ui.stake.options].map(option=>option.value);
const status={connected:false,authenticated:false,session:'',game:null,round:null,balance:null,offset:0,holding:false,pointerDown:false,pendingStart:false,working:false,popMoment:0,shownSettlement:'',requestInFlight:null,sound:true,holdLoop:null,lastError:''};
const money=value=>Number.isFinite(Number(value))?Number(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
const stamp=()=>Date.now()+status.offset;
const updateMessage=(msg='',error=false)=>{ui.notice.textContent=msg;ui.notice.classList.toggle('error',error);};
const id=()=>crypto.randomUUID();
function beep(kind){
 if(!status.sound)return;
 try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  const ac=beep.ac||(beep.ac=new Audio());if(ac.state==='suspended')void ac.resume();
  const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;
  o.type=kind==='pop'?'triangle':'sine';
  o.frequency.setValueAtTime(kind==='pop'?390:kind==='win'?700:540,t);
  o.frequency.exponentialRampToValueAtTime(kind==='pop'?110:kind==='win'?1040:650,t+.13);
  g.gain.setValueAtTime(.045,t);g.gain.exponentialRampToValueAtTime(.0001,t+.18);
  o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+.19);
 }catch{/* No audio permission: never affect a wager. */}
}
function apply(payload){
 if(!payload||typeof payload!=='object')throw Error('INVALID_SERVER_RESPONSE');
 if(payload.sessionId)status.session=payload.sessionId;
 if(payload.game?.id===GAME_ID)status.game=payload.game;
 if(typeof payload.balance==='string')status.balance=payload.balance;
 if(typeof payload.current_balance==='string')status.balance=payload.current_balance;
 if(typeof payload.server_now==='number')status.offset=payload.server_now-Date.now();
 if(payload.currency&&payload.currency!=='ETB')throw Error('CURRENCY_MISMATCH');
 if(payload.round?.game_id===GAME_ID){
  const next=payload.round,prev=status.round;
  if(!prev||prev.round_id!==next.round_id||next.version>=prev.version){
   status.round=next;
   if(next.status==='settled'&&next.round_id!==status.shownSettlement){
    status.shownSettlement=next.round_id;status.popMoment=Date.now();
    beep(next.reason==='POPPED'?'pop':'win');
   }
  }
 }
 status.connected=true;status.authenticated=true;status.lastError='';render();
}
const errorText={UNAUTHORIZED:'Sign in to the player account.',PLAYER_LOGIN_REQUIRED:'Sign in to the player account.',INSUFFICIENT_FUNDS:'Insufficient ETB balance.',LIBRARY_NEW_ROUNDS_DISABLED:'Balloon is temporarily unavailable for new wagers.',FINISH_ACTIVE_ROUND:'Finish your other active game first.',ROUND_ALREADY_SETTLED:'This round already finished.',ROUND_VERSION_CHANGED:'Updating round status.',GAME_RULES_UPDATED_RELOAD:'Game rules changed. Refresh required.'};
function describeError(code){
 if(!code)return 'Connection failed. Your wallet has not been changed locally.';
 const stem=String(code).split(':')[0];return errorText[stem]||String(code).replaceAll('_',' ').toLowerCase();
}
async function http(url,opts={}){
 const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...opts});
 let data;try{data=await response.json();}catch{throw Error('INVALID_SERVER_RESPONSE');}
 if(!response.ok)throw Error(data?.error||'HTTP_'+response.status);
 return data;
}
async function loadState({quiet=false}={}){
 try{
  const value=await http(API+'state?game_id='+GAME_ID);
  apply(value);if(!quiet)updateMessage(status.round?.status==='active'?'Hold to fly; release to collect.':'Press and hold to fly; release to collect.');
  return value;
 }catch(err){
  status.connected=false;status.lastError=err.message;
  if(err.message==='UNAUTHORIZED'||err.message==='PLAYER_LOGIN_REQUIRED'){
   status.authenticated=false;status.session='';status.balance=null;status.game=null;status.round=null;
   updateMessage('Log in to your ZPLAY player account. No demo balance is available.',true);
  }else updateMessage(describeError(err.message),true);
  render();return null;
 }
}
function submit(body){
 // On timeout / 503, reuse the exact same request_id and body, NEVER create
 // an alternative stake request automatically.
 return http(API+'action',{method:'POST',headers:{'content-type':'application/json','X-Zplay-Balloon-Session':status.session},body:JSON.stringify(body)});
}
function bodyBase(){return {request_id:id(),game_id:GAME_ID,model_version:status.game.version};}
function canStart(){
 return status.connected&&status.authenticated&&!!status.session&&!!status.game&&status.game.id===GAME_ID&&status.game.version&&status.game.minStake&&status.game.maxStake&&status.round?.status!=='active'&&status.gameReady!==false&&!status.pendingStart&&!status.working;
}
async function startRound(){
 if(!canStart())return;
 if(status.balance===null||Math.round(Number(status.balance)*100)<Math.round(Number(ui.stake.value)*100)){updateMessage('Insufficient ETB balance. Deposit before playing.',true);return;}
 status.pendingStart=true;status.working=true;status.shownSettlement='';render();beep('press');
 const request={...bodyBase(),type:'start',stake:ui.stake.value,options:{}};
 try{
  const payload=await submit(request);apply(payload);
  updateMessage(status.round?.status==='active'?'Release to collect before the balloon pops.':'Round complete.');
 }catch(err){
  updateMessage(describeError(err.message)+' Check the ledger before starting again.',true);
  await loadState({quiet:true});
 }finally{
  status.pendingStart=false;status.working=false;render();
  if(status.pointerDown&&status.round?.status==='active')beginHeartbeat();
  else if(status.round?.status==='active')void collectRound();
 }
}
async function perform(action){
 const round=status.round;
 if(!status.session||!round||round.status!=='active'||status.working)return false;
 status.working=true;
 const body={...bodyBase(),type:'action',round_id:round.round_id,expected_version:round.version,action,input:{}};
 try{
  const data=await submit(body);apply(data);return true;
 }catch(err){
  updateMessage(describeError(err.message),true);
  await loadState({quiet:true});return false;
 }finally{status.working=false;render();}
}
async function holdOnce(){if(status.pointerDown&&status.round?.status==='active'&&!status.working)await perform('hold');}
function beginHeartbeat(){
 if(status.holdLoop)return;
 status.holdLoop=setInterval(()=>{void holdOnce();},650);
 void holdOnce();
}
function stopHeartbeat(){if(status.holdLoop!==null){clearInterval(status.holdLoop);status.holdLoop=null;}}
async function collectRound(){
 if(!status.round||status.round.status!=='active')return;
 if(status.working){setTimeout(()=>{if(!status.pointerDown)void collectRound();},120);return;}
 const done=await perform('collect');if(done&&status.round?.status==='settled')updateMessage(status.round.reason==='POPPED'?'Balloon popped.':'Collected successfully.');
}
function pointerDown(event){
 if(event&&event.button!==undefined&&event.button!==0)return;
 if(status.pointerDown)return;
 if(!status.connected||!status.authenticated||!status.game){updateMessage('Sign in and refresh the game before wagering.',true);return;}
 status.pointerDown=true;ui.button.classList.add('pressed');ui.button.setAttribute('aria-pressed','true');
 if(event?.pointerId!==undefined)try{ui.button.setPointerCapture(event.pointerId);}catch{}
 if(status.round?.status==='active')beginHeartbeat();
 else void startRound();
}
function pointerUp(){
 if(!status.pointerDown)return;
 status.pointerDown=false;ui.button.classList.remove('pressed');ui.button.setAttribute('aria-pressed','false');stopHeartbeat();
 if(!status.pendingStart&&status.round?.status==='active')void collectRound();
}
function render(){
 ui.wallet.textContent=status.balance===null?'—':money(status.balance);
 const round=status.round,active=round?.status==='active',ended=round?.status==='settled';
 ui.button.disabled=!status.connected||!status.authenticated||!status.game||!status.session||status.pendingStart||(!active&&(!canStart()||status.gameReady===false));
 ui.button.setAttribute('aria-pressed',String(status.pointerDown));
 ui.hand.textContent=active?'✋':'☝';ui.holdText.textContent=status.pendingStart?'WAIT':active?'RELEASE':'HOLD';
 ui.roundLabel.textContent=active?'Balloon flying':ended?(round.reason==='POPPED'?'Balloon popped':'Collected'):'Hold to fly';
 if(ended){ui.result.textContent=money(Number(round.payoutMinor)/100)+' ETB';ui.status.textContent=round.reason==='POPPED'?'POPPED':'SETTLED';}
 else if(active){ui.result.textContent='IN FLIGHT';ui.status.textContent='Release to collect';}
 else {ui.result.textContent='—';ui.status.textContent=status.connected?'Ready':'Not connected';}
 ui.stake.disabled=active||status.pendingStart; $('minus').disabled=ui.stake.disabled;$('plus').disabled=ui.stake.disabled;
}
// Canvas scene: vector geometry, gradients, real animation. No video or screenshot overlay.
let size={w:0,h:0,dpr:1};
function fit(){const rect=sky.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
 size={w:Math.max(1,rect.width),h:Math.max(1,rect.height),dpr};
 scene.width=Math.round(size.w*dpr);scene.height=Math.round(size.h*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);
}
function cloud(x,y,scale,t){
 ctx.save();ctx.translate(x+t*.002*scale,y);ctx.scale(scale,scale);
 ctx.fillStyle='rgba(255,255,255,.77)';ctx.shadowColor='rgba(255,255,255,.65)';ctx.shadowBlur=16;
 ctx.beginPath();ctx.ellipse(-34,4,35,13,-.08,0,Math.PI*2);ctx.ellipse(-4,-9,34,19,0,0,Math.PI*2);ctx.ellipse(28,3,35,16,.08,0,Math.PI*2);ctx.fill();ctx.restore();
}
function balloon(cx,cy,rx,ry,t){
 // The soft vertical shadow is painted before the balloon.
 ctx.save();ctx.fillStyle='#0067b066';ctx.beginPath();ctx.ellipse(cx+16,cy+ry+25,rx*.66,10,0,0,Math.PI*2);ctx.fill();ctx.restore();
 const skin=ctx.createRadialGradient(cx-rx*.4,cy-ry*.65,rx*.04,cx+rx*.12,cy,rx*1.48);
 skin.addColorStop(0,'#fff7a9');skin.addColorStop(.2,'#ffe96a');skin.addColorStop(.43,'#ffd132');skin.addColorStop(.72,'#ffa40b');skin.addColorStop(1,'#d86406');
 ctx.save();ctx.shadowColor='#0446a455';ctx.shadowBlur=18;ctx.fillStyle=skin;
 ctx.beginPath();ctx.moveTo(cx,cy-ry);ctx.bezierCurveTo(cx+rx*.9,cy-ry,cx+rx*1.12,cy-ry*.15,cx+rx*.91,cy+ry*.44);
 ctx.bezierCurveTo(cx+rx*.64,cy+ry*1.04,cx-rx*.52,cy+ry*1.03,cx-rx*.92,cy+ry*.34);
 ctx.bezierCurveTo(cx-rx*1.12,cy-ry*.3,cx-rx*.7,cy-ry,cx,cy-ry);ctx.closePath();ctx.fill();ctx.restore();
 ctx.save();ctx.globalAlpha=.6;ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(cx-rx*.27,cy-ry*.57,rx*.31,ry*.13,-.35,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.save();ctx.fillStyle='#f59f16';ctx.strokeStyle='#fadb63';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx-rx*.86,cy+ry*.38);ctx.lineTo(cx-rx*.98,cy+ry*.5);ctx.lineTo(cx-rx*.87,cy+ry*.59);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}
function line(w,h,cx,cy,rx,ry,t){
 ctx.save();ctx.strokeStyle='rgba(255,255,255,.96)';ctx.lineWidth=Math.max(2,w*.006);ctx.lineCap='round';ctx.lineJoin='round';
 ctx.shadowColor='#d9f7ff';ctx.shadowBlur=4;ctx.beginPath();ctx.moveTo(-20,h*.74);
 ctx.bezierCurveTo(w*.12,h*.73,w*.29,h*.68,cx-rx*1.3,cy+ry*.63);
 ctx.bezierCurveTo(cx-rx*.96,cy+ry*.4,cx-rx*1.32,cy+ry*.48,cx-rx*.91,cy+ry*.47);
 ctx.stroke();ctx.restore();
 ctx.save();ctx.strokeStyle='white';ctx.lineWidth=Math.max(2,w*.006);
 ctx.beginPath();ctx.moveTo(w*.78,h*.71);ctx.bezierCurveTo(w*.87,h*.61+Math.sin(t*.001)*2,w*.94,h*.54,w*.975,h*.75);ctx.bezierCurveTo(w*1.02,h*.9,w*.99,h*.95,w*1.05,h);ctx.stroke();ctx.restore();
}
function draw(ts){
 const w=size.w,h=size.h;if(w<1||h<1){requestAnimationFrame(draw);return;}
 const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#00bbf3');bg.addColorStop(.54,'#00a4f2');bg.addColorStop(1,'#0489f4');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 cloud(w*.21,h*.12,Math.max(.38,w/1250),ts);
 cloud(w*.55,h*.105,Math.max(.32,w/1450),-ts*.6);
 cloud(w*.82,h*.17,Math.max(.28,w/1560),ts*.33);
 const r=status.round,active=r?.status==='active',now=stamp(),elapsed=active?Math.max(0,now-r.startedAt):0;
 const grow=active?Math.min(1.21,1+elapsed/72000):1;
 const float=Math.sin(ts*.0015)*Math.min(4,h*.007);
 const cx=w*.51,cy=h*.50-float-(active?Math.min(h*.14,elapsed/120000*h):0),rx=Math.min(w*.18,h*.29)*grow,ry=Math.min(h*.29,w*.16)*grow;
 line(w,h,cx,cy,rx,ry,ts);balloon(cx,cy,rx,ry,ts);
 if(r?.status==='settled'&&r.reason==='POPPED'&&Date.now()-status.popMoment<900){
  const prog=(Date.now()-status.popMoment)/900;
  ctx.save();for(let i=0;i<25;i++){const a=i*2.399,dist=rx*(1+prog*2.6),xx=cx+Math.cos(a)*dist,yy=cy+Math.sin(a)*dist*.83;ctx.fillStyle=['#ffe963','#fff','#ff9c0f'][i%3];ctx.globalAlpha=1-prog;ctx.beginPath();ctx.arc(xx,yy,Math.max(1,rx*.035)*(1-prog*.5),0,Math.PI*2);ctx.fill()}ctx.restore();
 }
 if(active){const coeff=Math.max(100,Math.floor(Math.exp(Math.min(elapsed,120000)/11000)*100))/100;
  ui.mult.textContent=Math.min(coeff,r.maxMultiplier||25000).toFixed(2)+'×';ui.value.textContent=money(Number(r.stakeMinor)/100)+' ETB';
 }else if(r?.status==='settled'){
  ui.mult.textContent=r.reason==='POPPED'?'POP!':(r.coefficient/100).toFixed(2)+'×';ui.value.textContent=money(Number(r.payoutMinor)/100)+' ETB';
 }else {ui.mult.textContent='1.00×';ui.value.textContent=ui.stake.value+' ETB';}
 requestAnimationFrame(draw);
}
$('minus').addEventListener('click',()=>{ui.stake.selectedIndex=Math.max(0,ui.stake.selectedIndex-1);});
$('plus').addEventListener('click',()=>{ui.stake.selectedIndex=Math.min(stakes.length-1,ui.stake.selectedIndex+1);});
ui.button.addEventListener('pointerdown',pointerDown);
ui.button.addEventListener('pointerup',pointerUp);ui.button.addEventListener('pointercancel',pointerUp);ui.button.addEventListener('lostpointercapture',pointerUp);
// Release is attached to window as well because a disabled HOLD button may
// stop receiving pointerup during the first server-confirmed wager.
window.addEventListener('pointerup',pointerUp);window.addEventListener('pointercancel',pointerUp);
ui.button.addEventListener('contextmenu',e=>e.preventDefault());
ui.button.addEventListener('keydown',e=>{if((e.code==='Space'||e.code==='Enter')&&!e.repeat){e.preventDefault();pointerDown();}});
ui.button.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();pointerUp();}});
window.addEventListener('blur',pointerUp);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')pointerUp();else void loadState({quiet:true});});
ui.sound.addEventListener('click',()=>{status.sound=!status.sound;ui.sound.setAttribute('aria-pressed',String(!status.sound));ui.sound.textContent=status.sound?'♪':'♪̸';});
ui.refresh.addEventListener('click',()=>void loadState());
window.addEventListener('resize',fit);
fit();render();requestAnimationFrame(draw);
void loadState();
setInterval(()=>{if(!status.pendingStart&&!status.working&&document.visibilityState==='visible')void loadState({quiet:true});},1200);
