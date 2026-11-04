import '/player-live-v244/presence.mjs';
const $=id=>document.getElementById(id),gameId=document.body.dataset.nativeGame;
const canvas=$('canvas'),ctx=canvas.getContext('2d');
const state={game:null,round:null,user:null,balance:null,pending:null,busy:false,other:null,epoch:0,stopped:false,recoveryBlocked:false,presenting:0,serverOffset:0};
let pollTimer,retryTimer,animation,readAbort,writeAbort,lastFrame=0;
const money=minor=>{minor=BigInt(minor);return `${(minor/100n).toLocaleString('en-ET')}.${String(minor%100n).padStart(2,'0')} ETB`;};
const decimalMoney=value=>{if(typeof value!=='string'||!/^\d+\.\d{2}$/.test(value))throw Error('INVALID_BALANCE');return money(BigInt(value.replace('.','')));};
const key=()=>state.user?`superwin.native.v1.pending.${state.user}.${gameId}`:null;
function message(text,error=false){$('message').textContent=text;$('message').dataset.error=String(error);}
function controls(){
 const r=state.round,active=r?.status==='active',locked=state.recoveryBlocked||!state.user||!state.game||state.busy||Boolean(state.pending)||performance.now()<state.presenting;
 $('play').disabled=locked||active||Boolean(state.other);$('play').textContent=active?'ROUND ACTIVE':'PLAY (ETB)';
 for(const id of ['stake','auto-target','risk','mine-count','dice-target'])$(id).disabled=locked||active;
 $('cashout').hidden=!['crash','mines','hilo'].includes(state.game?.family);
 $('cashout').disabled=locked||!active||(r?.family==='mines'&&!r.picked.length)||(r?.family==='hilo'&&!r.steps);
 for(const id of ['higher','lower']){$(id).hidden=state.game?.family!=='hilo';$(id).disabled=locked||!active||(id==='higher'?r?.rank===13:r?.rank===1);}
 $('retry').hidden=!state.pending;$('retry').disabled=state.busy||!state.user;$('verify').disabled=!r?.revealed_seed;
 $('other-game').hidden=!state.other;if(state.other)$('resume').href='/native/'+encodeURIComponent(state.other);
 $('round-status').textContent=state.pending?'CONFIRMING':r?.status==='active'?'ACTIVE':r?.reason||'READY';
 $('stake-meter').textContent=r?money(r.stake_minor):'—';
 $('payout').textContent=r?money(r.status==='active'?(r.cashout_minor||'0'):r.payout_minor):'—';
 if(state.game?.family==='mines')renderMines(locked);
 if(state.game?.family==='mines')$('stage-label').textContent=state.pending?'CONFIRMING SAVED REQUEST':active?`${r.picked.length} / ${r.max_picks} SAFE PICKS`:r?'PAYOUT '+money(r.payout_minor):'PLACE A STAKE TO START';
}
function updateRound(round){
 if(round){if(round.game_id!==gameId||round.family!==state.game.family||!Number.isSafeInteger(round.version)||typeof round.payout_minor!=='string'||!/^\d+$/.test(round.payout_minor))throw Error('INVALID_ROUND_RESPONSE');}
 state.round=round;
 $('verification').textContent=round?`Commitment: ${round.commitment}${round.revealed_seed?' · Revealed seed: '+round.revealed_seed:''}`:'A settled round reveals its server seed.';
 controls();
}
async function api(path,{body,signal}={}){
 const response=await fetch('/api/native-families/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'content-type':'application/json'}:{accept:'application/json'},body:body?JSON.stringify(body):undefined,signal});
 let data;try{data=await response.json();}catch{throw Object.assign(Error('Response interrupted. Confirm the saved request.'),{status:0});}
 if(!response.ok)throw Object.assign(Error(data.error||data.detail||'Connection unavailable'),{status:response.status});return data;
}
function saved(){
 if(!key())return null;
 const raw=localStorage.getItem(key());if(!raw)return null;const value=JSON.parse(raw);
 if(!value||value.game_id!==gameId||typeof value.request_id!=='string'||!['start','action'].includes(value.type))throw Error('Saved request could not be read. Keep this browser storage until the round is recovered.');
 return value;
}
function signOut(){
 state.epoch++;state.user=null;state.balance=null;state.round=null;state.busy=false;state.pending=null;state.recoveryBlocked=false;
 clearTimeout(pollTimer);clearTimeout(retryTimer);readAbort?.abort();writeAbort?.abort();$('balance').textContent='Sign in';$('signin').hidden=false;
 message('Sign in to your existing Player account.',true);controls();
}
async function refresh(){
 clearTimeout(pollTimer);if(document.hidden||state.stopped||!state.game)return;
 readAbort?.abort();const abort=new AbortController();readAbort=abort;const epoch=state.epoch;
 const timeout=setTimeout(()=>abort.abort(),10000);
 try{
  const data=await api('state?game_id='+encodeURIComponent(gameId),{signal:abort.signal});if(state.stopped||epoch!==state.epoch||readAbort!==abort)return;
  if(typeof data.user_id!=='string')throw Error('INVALID_IDENTITY');
  if(state.user&&state.user!==data.user_id){signOut();queueMicrotask(()=>void refresh());return;}
  state.user=data.user_id;state.balance=data.balance;state.serverOffset=data.server_now-Date.now();state.other=data.other_active_game;
  $('balance').textContent=decimalMoney(data.balance);$('signin').hidden=true;updateRound(data.round);
  if(!state.pending){try{state.pending=saved();state.recoveryBlocked=false;}catch(error){state.recoveryBlocked=true;controls();throw error;}}controls();
 }catch(error){
  if(state.stopped||epoch!==state.epoch||readAbort!==abort)return;
  if([401,403].includes(error.status)){signOut();return;}
  if(error.name!=='AbortError')message(error.message,true);
 }finally{
  clearTimeout(timeout);
  if(!state.stopped&&!document.hidden&&epoch===state.epoch&&readAbort===abort)pollTimer=setTimeout(refresh,state.round?.family==='crash'&&state.round.status==='active'?800:5000);
 }
}
function stake(){
 const input=$('stake').value.trim();if(!/^(0|[1-9]\d{0,3})(?:\.\d{1,2})?$/.test(input))throw Error('Enter a stake from ETB 1.00 to ETB 1,000.00.');
 const [whole,part='']=input.split('.'),minor=BigInt(whole)*100n+BigInt(part.padEnd(2,'0'));if(minor<100n||minor>100000n)throw Error('Stake must be ETB 1.00–1,000.00.');
 return `${minor/100n}.${String(minor%100n).padStart(2,'0')}`;
}
function start(){
 if(state.recoveryBlocked||!state.user||state.busy||state.pending||state.round?.status==='active'||state.other)return;
 try{
  const options={};if(state.game.family==='mines')options.mines=Number($('mine-count').value);
  if(state.game.family==='plinko')options.risk=$('risk').value;
  if(state.game.family==='dice')options.target=Number($('dice-target').value);
  if(state.game.family==='crash')options.auto_cashout=$('auto-target').value.trim();
  queue({type:'start',game_id:gameId,stake:stake(),options,request_id:crypto.randomUUID()});
 }catch(error){message(error.message,true);}
}
function action(name,input={}){
 if(state.recoveryBlocked||!state.user||state.busy||state.pending||state.round?.status!=='active')return;
 queue({type:'action',game_id:gameId,round_id:state.round.round_id,expected_version:state.round.version,action:name,input,request_id:crypto.randomUUID()});
}
function queue(request){
 try{localStorage.setItem(key(),JSON.stringify(request));}catch{message('Browser storage must be available before submitting a wager.',true);return;}
 state.pending=request;controls();void submit();
}
async function submit(){
 clearTimeout(retryTimer);if(!state.pending||state.busy||!state.user||state.stopped||document.hidden)return;
 const pending=state.pending,storageKey=key(),epoch=state.epoch;state.busy=true;controls();message('Confirming with the ETB ledger…');
 const abort=new AbortController();writeAbort=abort;const timeout=setTimeout(()=>abort.abort(),12000);
 try{
  const result=await api('action',{body:pending,signal:abort.signal});if(state.stopped||epoch!==state.epoch)return;
  updateRound(result.round);$('balance').textContent=decimalMoney(result.current_balance||result.balance);
  localStorage.removeItem(storageKey);state.pending=null;
  if(result.round.status==='settled'){
   state.presenting=performance.now()+800;message(`${result.round.reason} · Payout ${money(result.round.payout_minor)}`);
   setTimeout(controls,850);
  }else message(result.round.family==='crash'?'Round running. Server time decides cashout.':result.round.family==='mines'?'Pick a tile or cash out after a safe pick.':'Choose higher or lower. Ties lose.');
  await refresh();
 }catch(error){
  if(state.stopped||epoch!==state.epoch)return;
  if([401,403].includes(error.status)){signOut();return;}
  if(error.status>=400&&error.status<500){localStorage.removeItem(storageKey);state.pending=null;message(error.message,true);await refresh();}
  else{message('Round not confirmed. The same saved request will be retried.',true);retryTimer=setTimeout(submit,3000);}
 }finally{clearTimeout(timeout);if(epoch===state.epoch){state.busy=false;controls();}}
}
function renderMines(locked){
 const grid=$('mines'),r=state.round,active=r?.status==='active';grid.replaceChildren();
 for(let cell=0;cell<25;cell++){
  const button=document.createElement('button');button.type='button';const mine=r?.mines?.includes(cell),picked=r?.picked?.includes(cell);
  button.textContent=mine?'✹':picked?'◆':'?';button.className=mine?'mine':picked?'picked':'';
  button.setAttribute('aria-label',`Tile ${cell+1}${mine?', mine':picked?', safe':''}`);button.disabled=locked||!active||picked;
  button.addEventListener('click',()=>action('pick',{cell}));grid.append(button);
 }
}
function text(value,x,y,size=32,color='#edf6ff'){ctx.fillStyle=color;ctx.font=`800 ${size}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(value,x,y);}
function card(value,x,y,w,h,color='#203d5a'){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,14);ctx.fill();text(value,x+w/2,y+h/2,Math.min(42,w/3));}
function draw(now){
 animation=requestAnimationFrame(draw);if(document.hidden||state.stopped||now-lastFrame<30||state.game?.family==='mines')return;lastFrame=now;
 const rect=canvas.getBoundingClientRect();const scale=Math.min(devicePixelRatio||1,2);const width=Math.max(1,Math.floor(rect.width*scale)),height=Math.max(1,Math.floor(rect.height*scale));
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 ctx.setTransform(width/960,0,0,height/500,0,0);ctx.clearRect(0,0,960,500);const game=state.game,r=state.round;
 if(!game){text('CONNECTING',480,230);return;}
 const family=game.family;
 if(family==='crash'){
  const active=r?.status==='active',elapsed=active?Math.max(0,(Date.now()+state.serverOffset-r.started_at)/1000):0;
  const multiplier=active?Math.min(r.auto_cashout_target||10000,Math.floor(Math.exp(game.crash_growth*elapsed)*100)):r?.cashout_multiplier||r?.crash_point||100;
  ctx.strokeStyle='#33516f';ctx.lineWidth=1;for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(50,i*85);ctx.lineTo(910,i*85);ctx.stroke();}
  ctx.strokeStyle=active?'#8ce6d0':r?.payout_minor!=='0'?'#e4c674':'#f08088';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(70,420);
  const progress=Math.min(1,elapsed/16);for(let i=1;i<=80;i++){const f=i/80;ctx.lineTo(70+820*f*progress,420-310*f*f*progress);}ctx.stroke();
  text((multiplier/100).toFixed(2)+'×',480,180,76);text(active?'SERVER-TIMED ROUND':r?.reason||'READY TO START',480,270,22,'#bad0e6');
 }else if(family==='slots'){
  const symbols=['CHERRY','LEMON','GRAPE','BELL','GEM','SEVEN','CROWN','STAR'],colors=['#63283d','#5b4e22','#4b315b','#67511e','#1b555b','#3e526d','#65422a','#344864'];
  for(let y=0;y<3;y++)for(let x=0;x<5;x++){const symbol=state.busy?(Math.floor(now/70)+x+y)%game.symbols:r?.grid?.[y]?.[x]??(x+y)%game.symbols;card(symbols[symbol],60+x*170,35+y*125,155,110,colors[symbol]);}
 }else if(family==='plinko'){
  const rows=r?.rows||game.plinko_rows,dx=780/(rows+2),dy=350/(rows+1);
  ctx.fillStyle='#8aa9c7';for(let row=0;row<rows;row++)for(let k=0;k<=row;k++){ctx.beginPath();ctx.arc(480+(k-row/2)*dx,55+row*dy,4,0,Math.PI*2);ctx.fill();}
  let right=0;for(const bit of r?.path||[])right+=bit;
  ctx.fillStyle='#f5ce68';ctx.beginPath();ctx.arc(480+(right-rows/2)*dx,r?420:30,12,0,Math.PI*2);ctx.fill();
  if(r)text('BUCKET '+r.bucket+' · '+r.multipliers[r.bucket]+'×',480,455,22);
 }else if(family==='dice'){
  card(String(r?.rolls?.[0]||'?'),220,90,230,230,'#234e64');card(String(r?.rolls?.[1]||'?'),510,90,230,230,'#5d3452');text('SUM '+(r?.sum||'—')+' · TARGET '+(r?.target||$('dice-target').value),480,375,28);
 }else if(family==='hilo'){
  card(String(r?.rank||'?'),365,60,230,300,'#e0e7f0');if(r?.rank)text(String(r.rank),480,210,80,'#14304c');
  text(r?.status==='active'?`${13-r.rank}/13 HIGHER · ${r.rank-1}/13 LOWER`:'CHOOSE HIGHER OR LOWER',480,410,22);
 }else if(family==='wheel'){
  const multipliers=r?.multipliers||Array.from({length:12},()=>'?'),segment=r?.segment??0,spin=state.busy?now/300:-(segment+.5)*Math.PI/6;
  for(let i=0;i<12;i++){const start=spin+i*Math.PI/6;ctx.beginPath();ctx.moveTo(480,245);ctx.arc(480,245,190,start,start+Math.PI/6);ctx.closePath();ctx.fillStyle=i%2?'#294d64':'#715035';ctx.fill();const a=start+Math.PI/12;text(multipliers[i]+'×',480+Math.cos(a)*140,245+Math.sin(a)*140,14);}
  text('◀',700,245,35,'#ffe089');
 }
 $('stage-label').textContent=state.pending?'CONFIRMING SAVED REQUEST':state.user?(r?.status==='active'?'LIVE · SERVER SETTLEMENT':r?'PAYOUT '+money(r.payout_minor):'READY · PLAY (ETB)'):'SIGN IN TO PLAY';
}
async function boot(){
 try{
  const data=await api('catalog');const game=data.games.find(g=>g.id===gameId);if(!game)throw Error('Game unavailable');state.game=game;
  $('title').textContent=game.name;document.title=game.name+' · Superwin Internal';$('family').textContent=game.family;$('version').textContent=game.version;
  for(const [id,family]of [['auto-option','crash'],['risk-option','plinko'],['mines-option','mines'],['dice-option','dice']])$(id).hidden=game.family!==family;
  const rules={crash:'The multiplier rises using server time. Cash out before the server crash point. A 100× hard cap pays automatically. Optional auto cashout is executed by the server even if your connection is interrupted.',plinko:'A ball follows independent server-generated left/right peg decisions. The bucket and selected risk determine its payout. Multipliers are normalized to a 97% theoretical return before santim rounding.',mines:'A 5×5 board has hidden mines committed before your first pick. A mine loses the stake. Cash out after any safe pick; the fifth safe pick cashes out automatically. Higher mine counts increase both risk and cashout multipliers.',slots:'Five reels, three rows and five fixed paylines. Matching symbols pay from left to right for three, four or five symbols. Symbol ranks and match lengths determine payout, normalized to a 97% theoretical return.',dice:'Choose a total from 2 to 12. Two independent six-sided dice are rolled on the server. An exact match pays according to its true probability, normalized to a 97% theoretical return.',hilo:'Guess whether the next rank is higher or lower. Ranks 1–13 are independently generated; ties lose. Each correct guess multiplies the cashout using its actual probability and a 3% per-step edge. Three correct guesses or the 100× cap automatically cash out.',wheel:'Twelve equally likely wheel segments have different payouts, including zero. The server selects the segment. Payouts are normalized to a 97% theoretical return.'};
  $('rules').textContent=rules[game.family];$('family-note').textContent=['mines','hilo'].includes(game.family)?'Inactive rounds expire after 30 minutes. An untouched round refunds its stake; a round with successful picks or guesses automatically cashes out. One active interactive round is allowed per account.':'Crash continues during disconnection; optional auto cashout remains active on the server. One active interactive round is allowed per account.';
  $('canvas').hidden=game.family==='mines';$('mines').hidden=game.family!=='mines';
  await refresh();if(state.pending)void submit();else if(state.user)message('Connected to the existing ETB wallet.');controls();animation=requestAnimationFrame(draw);
 }catch(error){if([401,403].includes(error.status))signOut();else message(error.message,true);}
}
$('play').addEventListener('click',start);$('cashout').addEventListener('click',()=>action('cashout'));$('higher').addEventListener('click',()=>action('guess',{choice:'higher'}));$('lower').addEventListener('click',()=>action('guess',{choice:'lower'}));$('retry').addEventListener('click',()=>void submit());$('refresh').addEventListener('click',()=>void refresh());
$('verify').addEventListener('click',async()=>{const r=state.round;if(!r?.revealed_seed)return;const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(r.revealed_seed));const commitment=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');message(commitment===r.commitment?'Seed commitment verified.':'Seed commitment mismatch.',commitment!==r.commitment);});
for(const event of ['zplay:logout','zplay:session-expired','zplay:session-changing'])window.addEventListener(event,signOut);
window.addEventListener('zplay:session-ready',()=>void refresh());
document.addEventListener('visibilitychange',()=>{if(document.hidden){state.epoch++;readAbort?.abort();writeAbort?.abort();state.busy=false;clearTimeout(pollTimer);clearTimeout(retryTimer);}else{void refresh().then(()=>{if(state.pending)void submit();});}});
window.addEventListener('pagehide',()=>{state.stopped=true;state.epoch++;readAbort?.abort();writeAbort?.abort();clearTimeout(pollTimer);clearTimeout(retryTimer);cancelAnimationFrame(animation);});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
void boot();
