// ZPLAY Balloon: Canvas is presentation only. The Railway ledger and rules
// alone decide stake, liability, pop point, collection and ETB balance.
const GAME_ID='balloon_native';
const API='/api/library/';
const $=id=>document.getElementById(id);
const scene=$('scene'),sky=$('sky'),ctx=scene.getContext('2d',{alpha:false});
const ui={button:$('holdButton'),hand:$('handIcon'),holdText:$('holdText'),wallet:$('wallet'),notice:$('notice'),roundLabel:$('roundLabel'),mult:$('balloonMultiplier'),value:$('balloonValue'),result:$('result'),status:$('roundStatus'),stake:$('stake'),sound:$('sound'),refresh:$('refresh')};
const stakes=[...ui.stake.options].map(option=>option.value);
const status={connected:false,authenticated:false,session:'',game:null,round:null,balance:null,offset:0,pointerDown:false,pendingStart:false,working:false,popMoment:0,shownSettlement:'',requestInFlight:null,sound:true,holdLoop:null,lastError:'',accepting:false,otherActiveGame:null,readGeneration:0,readSequence:0,collectRequested:false,collecting:false,keyboardKey:null,intentSession:'',intentRound:null,confirming:false};
const money=value=>Number.isFinite(Number(value))?Number(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
const stamp=()=>Date.now()+status.offset;
const updateMessage=(msg='',error=false)=>{ui.notice.textContent=msg;ui.notice.classList.toggle('error',error);};
const id=()=>crypto.randomUUID();
const pendingMessage='Your last action is awaiting confirmation. Tap Retry.';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
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
function clearSession(){
 stopHeartbeat();status.authenticated=false;status.session='';status.balance=null;status.game=null;status.round=null;
 status.accepting=false;status.otherActiveGame=null;status.requestInFlight=null;status.collectRequested=false;status.pointerDown=false;status.intentSession='';status.intentRound=null;status.confirming=false;status.keyboardKey=null;
 ui.button.classList.remove('pressed');
}
function apply(payload){
 if(!payload||typeof payload!=='object'||payload.game?.id!==GAME_ID||typeof payload.sessionId!=='string'||!payload.sessionId)throw Error('INVALID_SERVER_RESPONSE');
 if(payload.currency!=='ETB')throw Error('CURRENCY_MISMATCH');
 if(status.session&&status.session!==payload.sessionId)clearSession();
 status.session=payload.sessionId;status.game=payload.game;
 status.accepting=payload.accepting===true;status.otherActiveGame=typeof payload.other_active_game==='string'?payload.other_active_game:null;
 if(typeof payload.balance==='string')status.balance=payload.balance;
 if(typeof payload.current_balance==='string')status.balance=payload.current_balance;
 if(typeof payload.server_now==='number')status.offset=payload.server_now-Date.now();
 if(payload.round===null)status.round=null;
 else if(payload.round?.game_id===GAME_ID){
  const next=payload.round,prev=status.round;
  if(!prev||prev.round_id!==next.round_id||next.version>=prev.version){
   status.round=next;
   if(next.status==='settled'){
    stopHeartbeat();status.collectRequested=false;
    if(next.round_id!==status.shownSettlement){
     status.shownSettlement=next.round_id;status.popMoment=Date.now();
     beep(next.reason==='POPPED'?'pop':'win');
    }
   }
  }
 }
 status.connected=true;status.authenticated=true;status.lastError='';render();
}
const errorText={UNAUTHORIZED:'Sign in to the player account.',PLAYER_LOGIN_REQUIRED:'Sign in to the player account.',INSUFFICIENT_FUNDS:'Insufficient ETB balance.',LIBRARY_NEW_ROUNDS_DISABLED:'Balloon is temporarily unavailable for new wagers.',FINISH_ACTIVE_ROUND:'Finish your other active game first.',ROUND_ALREADY_SETTLED:'This round already finished.',ROUND_VERSION_CHANGED:'Updating round status.',GAME_RULES_UPDATED_RELOAD:'Game rules changed. Refresh required.',BALLOON_SESSION_CHANGED:'Your player session changed. Refresh the game.',REQUEST_TIMEOUT:'The connection timed out.',ACTION_PENDING:'Confirm your previous action first.'};
function describeError(code){
 if(!code)return 'Connection failed. Refresh to check the round.';
 const stem=String(code).split(':')[0];return errorText[stem]||String(code).replaceAll('_',' ').toLowerCase();
}
async function http(url,opts={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
 try{
  const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...opts,signal:controller.signal});
  let data;try{data=await response.json();}catch{throw Object.assign(Error('INVALID_SERVER_RESPONSE'),{retryable:true});}
  if(!response.ok){
   const code=data?.error||'HTTP_'+response.status;
   const rejected=['LIBRARY_NEW_ROUNDS_DISABLED','NATIVE_ENGINE_ORIGIN_UNAVAILABLE'].includes(code);
   throw Object.assign(Error(code),{status:response.status,retryable:!rejected&&(response.status>=500||[408,425,429].includes(response.status))});
  }
  return data;
 }catch(error){
  if(typeof error.retryable==='boolean')throw error;
  throw Object.assign(Error(error.name==='AbortError'?'REQUEST_TIMEOUT':error.message||'CONNECTION_FAILED'),{retryable:true});
 }finally{clearTimeout(timer);}
}
async function loadState({quiet=false,afterAction=false}={}){
 if(status.working&&!afterAction)return null;
 const generation=status.readGeneration,sequence=++status.readSequence;
 const current=()=>generation===status.readGeneration&&sequence===status.readSequence&&(!status.working||afterAction);
 try{
  const value=await http(API+'state?game_id='+GAME_ID);
  if(!current())return null;
  apply(value);
  status.confirming=false;
  if(!quiet)updateMessage(status.requestInFlight?pendingMessage:status.round?.status==='active'?'Hold to fly; release to collect.':status.otherActiveGame?'Finish your other active game first.':!status.accepting?'Balloon is temporarily unavailable for new wagers.':'Press and hold to fly; release to collect.',!!status.requestInFlight);
  followIntent();return value;
 }catch(err){
  if(!current())return null;
  status.connected=false;status.lastError=err.message;
  if(err.message==='UNAUTHORIZED'||err.message==='PLAYER_LOGIN_REQUIRED'){
   clearSession();updateMessage('Log in to your ZPLAY player account.',true);
  }else updateMessage(describeError(err.message),true);
  render();return null;
 }
}
async function submit(body){
 let pending=status.requestInFlight;
 if(body){
  if(pending)throw Object.assign(Error('ACTION_PENDING'),{retryable:false});
  // Freeze the exact intent and its original authenticated session. A retry
  // must never acquire another account's session or mint another request ID.
  pending=Object.freeze({body:JSON.stringify(body),requestId:body.request_id,session:status.session,type:body.type,action:body.action,roundId:body.round_id??null});
  status.requestInFlight=pending;
 }
 if(!pending)throw Object.assign(Error('ACTION_PENDING'),{retryable:false});
 for(let attempt=0;attempt<3;attempt++){
  if(status.requestInFlight!==pending||status.session!==pending.session){
   if(status.requestInFlight===pending)status.requestInFlight=null;
   throw Object.assign(Error('BALLOON_SESSION_CHANGED'),{retryable:false});
  }
  try{
   const payload=await http(API+'action',{method:'POST',headers:{'content-type':'application/json','X-Zplay-Balloon-Session':pending.session},body:pending.body});
   if(payload?.status!=='SUCCESS'||payload.request_id!==pending.requestId||payload.game_id!==GAME_ID||payload.currency!=='ETB'||payload.sessionId!==pending.session)throw Object.assign(Error('INVALID_SERVER_RESPONSE'),{retryable:true});
   if(status.requestInFlight===pending)status.requestInFlight=null;
   return payload;
  }catch(error){
   if(!error.retryable){if(status.requestInFlight===pending)status.requestInFlight=null;throw error;}
   if(attempt===2)throw error;
   await pause(attempt===0?150:350);
  }
 }
}
async function runRequest(body){
 const intent=body?{session:status.session,type:body.type,roundId:body.round_id??null}:status.requestInFlight;
 status.working=true;status.readGeneration++;render();
 let data=null,error=null,synced=true;
 try{
  data=await submit(body);
  if(intent?.session===status.session&&data.round?.game_id===GAME_ID){
   status.intentSession=intent.session;status.intentRound=intent.type==='start'?data.round.round_id:intent.roundId;
  }
  // Replays contain the old receipt snapshot plus current_balance. Read fresh
  // state instead of putting a historical round or balance back on screen.
  if(!data.replayed)apply(data);
  else {status.confirming=true;synced=!!await loadState({quiet:true,afterAction:true});}
 }catch(err){
  error=err;await loadState({quiet:true,afterAction:true});
  updateMessage(status.requestInFlight?pendingMessage:describeError(err.message),true);
 }finally{
  status.working=false;status.readGeneration++;render();
 }
 return {ok:!!data&&!error&&synced,code:error?.message||(!synced?'STATE_REFRESH_REQUIRED':undefined)};
}
function bodyBase(version=status.game?.version){return {request_id:id(),game_id:GAME_ID,model_version:version};}
function canStart(){
 return Boolean(status.connected&&status.authenticated&&status.session&&status.game?.id===GAME_ID&&status.game.version&&status.game.minStake&&status.game.maxStake&&status.accepting&&!status.otherActiveGame&&status.round?.status!=='active'&&!status.pendingStart&&!status.working&&!status.requestInFlight&&!status.collecting);
}
function matchingIntent(){return status.intentSession===status.session&&status.intentRound&&status.intentRound===status.round?.round_id;}
function followIntent(){
 if(!matchingIntent()||!status.connected||status.working||status.pendingStart||status.requestInFlight||status.round?.status!=='active')return;
 if(status.pointerDown)beginHeartbeat();
 else if(status.collectRequested)void collectRound();
}
async function startRound(){
 if(!canStart())return;
 if(status.balance===null||Math.round(Number(status.balance)*100)<Math.round(Number(ui.stake.value)*100)){updateMessage('Insufficient ETB balance. Deposit before playing.',true);return;}
 const originalSession=status.session;
 status.intentSession=originalSession;status.intentRound=null;status.pendingStart=true;status.shownSettlement='';render();beep('press');
 try{
  const result=await runRequest({...bodyBase(),type:'start',stake:ui.stake.value,options:{}});
  if(result.ok)updateMessage(status.round?.status==='active'?'Release to collect before the balloon pops.':'Round complete.');
 }finally{
  status.pendingStart=false;
  if(status.session===originalSession&&!status.pointerDown&&(matchingIntent()&&status.round?.status==='active'||status.confirming))status.collectRequested=true;
  render();followIntent();
 }
}
async function perform(action){
 const round=status.round;
 if(!status.connected||!status.authenticated||!status.session||!round||round.status!=='active'||status.working||status.requestInFlight)return {ok:false,code:'ACTION_PENDING'};
 if(typeof round.model_version!=='string'||!round.model_version)return {ok:false,code:'GAME_RULES_UPDATED_RELOAD'};
 // A round accepted under an earlier model continues under that stored model.
 return runRequest({...bodyBase(round.model_version),type:'action',round_id:round.round_id,expected_version:round.version,action,input:{}});
}
async function holdOnce(){
 if(matchingIntent()&&status.pointerDown&&status.round?.status==='active'&&!status.working&&!status.requestInFlight){
  await perform('hold');followIntent();
 }
}
function beginHeartbeat(){
 if(!matchingIntent()||status.holdLoop||!status.pointerDown||!status.connected||status.requestInFlight)return;
 status.holdLoop=setInterval(()=>{void holdOnce();},650);
 void holdOnce();
}
function stopHeartbeat(){if(status.holdLoop!==null){clearInterval(status.holdLoop);status.holdLoop=null;}}
async function collectRound(){
 status.collectRequested=true;
 if(status.working||status.pendingStart||status.requestInFlight||status.collecting)return;
 if(status.round?.status!=='active'){status.collectRequested=false;return;}
 if(!status.intentSession){status.intentSession=status.session;status.intentRound=status.round.round_id;}
 if(!matchingIntent())return;
 const originalSession=status.session,originalRound=status.round.round_id;
 status.collecting=true;
 try{
  for(let attempt=0;attempt<2;attempt++){
   const result=await perform('collect');
   if(result.ok&&status.round?.status==='settled'){
    status.collectRequested=false;updateMessage(status.round.reason==='POPPED'?'Balloon popped.':'Collected successfully.');break;
   }
   // A definitive version rejection committed no action. After runRequest's
   // fresh read, a new collect has a new ID and the new expected_version.
   if(result.code!=='ROUND_VERSION_CHANGED'||status.session!==originalSession||status.round?.round_id!==originalRound||!status.connected||status.requestInFlight||status.round?.status!=='active')break;
  }
 }finally{status.collecting=false;render();}
}
async function retryPending(){
 const pending=status.requestInFlight;if(!pending||status.working)return;
 status.pendingStart=pending.type==='start';
 try{await runRequest();}
 finally{
  status.pendingStart=false;
  if(status.session===pending.session&&!status.pointerDown&&(matchingIntent()&&status.round?.status==='active'||status.confirming))status.collectRequested=true;
  render();followIntent();
 }
}
function pointerDown(event){
 if(event&&event.button!==undefined&&event.button!==0)return;
 if(status.pointerDown)return;
 if(!status.connected||!status.authenticated||!status.game){updateMessage('Sign in and refresh the game before wagering.',true);return;}
 if(status.requestInFlight&&!status.working){updateMessage(pendingMessage,true);return;}
 status.intentSession=status.session;status.intentRound=status.round?.status==='active'?status.round.round_id:null;
 status.pointerDown=true;status.collectRequested=false;ui.button.classList.add('pressed');ui.button.setAttribute('aria-pressed','true');
 if(event?.pointerId!==undefined)try{ui.button.setPointerCapture(event.pointerId);}catch{}
 if(status.round?.status==='active')beginHeartbeat();
 else void startRound();
}
function pointerUp(){
 if(!status.pointerDown)return;
 status.pointerDown=false;ui.button.classList.remove('pressed');ui.button.setAttribute('aria-pressed','false');stopHeartbeat();
 if(status.pendingStart||status.round?.status==='active'||status.confirming)void collectRound();
 render();
}
function render(){
 ui.wallet.textContent=status.balance===null?'—':money(status.balance);
 const round=status.round,active=round?.status==='active',ended=round?.status==='settled',pending=!!status.requestInFlight;
 // Keep a held button interactive while confirming its start, so pointer and
 // keyboard release can always record the player's collection intent.
 ui.button.disabled=!status.connected||!status.authenticated||!status.game||!status.session||(!active&&!status.pointerDown&&!canStart())||(pending&&!status.working&&!status.pointerDown);
 ui.button.setAttribute('aria-pressed',String(status.pointerDown));ui.button.setAttribute('aria-busy',String(status.working));
 ui.hand.textContent=active?'✋':'☝';ui.holdText.textContent=status.pendingStart||pending&&!status.working?'WAIT':active?'RELEASE':'HOLD';
 ui.roundLabel.textContent=active?'Balloon flying':ended?(round.reason==='POPPED'?'Balloon popped':'Collected'):'Hold to fly';
 if(ended){ui.result.textContent=money(Number(round.payoutMinor)/100)+' ETB';ui.status.textContent=round.reason==='POPPED'?'POPPED':'SETTLED';}
 else if(active){ui.result.textContent='IN FLIGHT';ui.status.textContent=pending?'Confirming action':'Release to collect';}
 else {ui.result.textContent='—';ui.status.textContent=pending?'Confirming action':!status.connected?'Not connected':!status.accepting?'Unavailable':'Ready';}
 ui.stake.disabled=active||status.pendingStart||pending; $('minus').disabled=ui.stake.disabled;$('plus').disabled=ui.stake.disabled;
 ui.refresh.disabled=status.working;ui.refresh.textContent=pending?'↻ Retry':'↻ Refresh';
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
ui.button.addEventListener('keydown',e=>{if((e.code==='Space'||e.code==='Enter')&&!e.repeat){e.preventDefault();status.keyboardKey=e.code;pointerDown();}});
function keyRelease(e){if(e.code===status.keyboardKey){e.preventDefault();status.keyboardKey=null;pointerUp();}}
ui.button.addEventListener('keyup',keyRelease);window.addEventListener('keyup',keyRelease);
window.addEventListener('blur',pointerUp);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')pointerUp();else void loadState({quiet:true});});
ui.sound.addEventListener('click',()=>{status.sound=!status.sound;ui.sound.setAttribute('aria-pressed',String(!status.sound));ui.sound.textContent=status.sound?'♪':'♪̸';});
ui.refresh.addEventListener('click',()=>{if(status.requestInFlight)void retryPending();else void loadState();});
window.addEventListener('resize',fit);
fit();render();requestAnimationFrame(draw);
void loadState();
setInterval(()=>{if(!status.pendingStart&&!status.working&&document.visibilityState==='visible')void loadState({quiet:true});},1200);
