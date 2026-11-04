import {createVisuals} from './visuals.mjs';
import '/player-live-v244/presence.mjs';
const $=id=>document.getElementById(id),gameId=document.body.dataset.nativeGame;
const canvas=$('canvas'),visuals=createVisuals(canvas);
const state={game:null,round:null,user:null,balance:null,pending:null,busy:false,other:null,epoch:0,stopped:false,recoveryBlocked:false,presenting:0,visualReceived:0,serverOffset:0};
let pollTimer,retryTimer,animation,readAbort,writeAbort,lastFrame=0;
const money=minor=>{minor=BigInt(minor);return `${(minor/100n).toLocaleString('en-ET')}.${String(minor%100n).padStart(2,'0')} ETB`;};
const decimalMoney=value=>{if(typeof value!=='string'||!/^\d+\.\d{2}$/.test(value))throw Error('INVALID_BALANCE');return money(BigInt(value.replace('.','')));};
const key=()=>state.user?`superwin.native.v1.pending.${state.user}.${gameId}`:null;
function publishBalance(balance){if(window.parent!==window&&state.user)window.parent.postMessage({type:'superwin:wallet-updated',game_id:gameId,user_id:state.user,balance,currency:'ETB'},location.origin);}
function message(text,error=false){$('message').textContent=text;$('message').dataset.error=String(error);}
function controls(){
 const r=state.round,active=r?.status==='active',locked=state.recoveryBlocked||!state.user||!state.game||state.busy||Boolean(state.pending)||performance.now()<state.presenting;
 $('play').disabled=locked||active||Boolean(state.other)||state.game?.accepting_new_rounds===false||!state.balance||BigInt(state.balance.replace('.',''))===0n;$('play').textContent=active?'ROUND ACTIVE':'PLAY (ETB)';
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
 if(state.game?.family==='mines')$('stage-label').textContent=state.pending?'CONFIRMING ROUND':active?`${r.picked.length} / ${r.max_picks} SAFE PICKS`:r?'PAYOUT '+money(r.payout_minor):'PLACE A STAKE TO START';
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
  $('balance').textContent=decimalMoney(data.balance);publishBalance(data.balance);$('signin').hidden=true;updateRound(data.round);
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
 const pending=state.pending,storageKey=key(),epoch=state.epoch;state.busy=true;controls();message('Playing…');
 const abort=new AbortController();writeAbort=abort;const timeout=setTimeout(()=>abort.abort(),12000);
 try{
  const result=await api('action',{body:pending,signal:abort.signal});if(state.stopped||epoch!==state.epoch)return;
  updateRound(result.round);state.balance=result.current_balance||result.balance;$('balance').textContent=decimalMoney(state.balance);publishBalance(state.balance);
  localStorage.removeItem(storageKey);state.pending=null;
  if(result.round.status==='settled'){
   state.visualReceived=performance.now();state.presenting=state.visualReceived+1600;message(`${result.round.reason} · Payout ${money(result.round.payout_minor)}`);
   setTimeout(controls,1650);
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
function draw(now){
 animation=requestAnimationFrame(draw);if(document.hidden||state.stopped||now-lastFrame<30||state.game?.family==='mines')return;lastFrame=now;
 const rect=canvas.getBoundingClientRect(),scale=Math.min(devicePixelRatio||1,2);
 const width=Math.max(1,Math.floor(rect.width*scale)),height=Math.max(1,Math.floor(rect.height*scale));
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 if(!state.game)return;
 const phase=state.busy?(now%500)+1:now<state.presenting?Math.max(1,now-state.visualReceived):0;
 visuals.render(state.game,state.round,phase,now,Date.now()+state.serverOffset);
 $('stage-label').textContent=state.pending?'CONFIRMING WITH YOUR WALLET':state.user?(phase?'SPINNING…':state.round?.status==='active'?'LIVE · CASH OUT ANY TIME':state.round?'PAYOUT '+money(state.round.payout_minor):'CHOOSE YOUR STAKE · GOOD LUCK'):'SIGN IN TO PLAY';
}
async function boot(){
 try{
  const data=await api('catalog');const game=[...data.games,...(data.recovery_games||[])].find(g=>g.id===gameId);if(!game)throw Error('Game unavailable');state.game=game;
  document.body.dataset.family=game.family;document.body.dataset.theme=String(game.theme);$('title').textContent=game.name;document.title=game.name+' · Superwin Internal';$('family').textContent=game.family;$('game-mark').textContent=({slots:'777',crash:'↗',plinko:'●',mines:'◆',dice:'⚄',wheel:'✦',hilo:'A♠'})[game.family];$('version').textContent=game.version;
  for(const [id,family]of [['auto-option','crash'],['risk-option','plinko'],['mines-option','mines'],['dice-option','dice']])$(id).hidden=game.family!==family;
  const rules={crash:'The multiplier rises using server time. Cash out before the server crash point. A 100× hard cap pays automatically. Optional auto cashout is executed by the server even if your connection is interrupted.',plinko:'A ball follows independent server-generated left/right peg decisions. The bucket and selected risk determine its payout. Multipliers are normalized to a 97% theoretical return before santim rounding.',mines:'A 5×5 board has hidden mines committed before your first pick. A mine loses the stake. Cash out after any safe pick; the fifth safe pick cashes out automatically. Higher mine counts increase both risk and cashout multipliers.',slots:'Five reels, three rows and five fixed paylines. Matching symbols pay from left to right for three, four or five symbols. Symbol ranks and match lengths determine payout, normalized to a 97% theoretical return.',dice:'Choose a total from 2 to 12. Two independent six-sided dice are rolled on the server. An exact match pays according to its true probability, normalized to a 97% theoretical return.',hilo:'Guess whether the next rank is higher or lower. Ranks 1–13 are independently generated; ties lose. Each correct guess multiplies the cashout using its actual probability and a 3% per-step edge. Three correct guesses or the 100× cap automatically cash out.',wheel:'Twelve equally likely wheel segments have different payouts, including zero. The server selects the segment. Payouts are normalized to a 97% theoretical return.'};
  $('rules').textContent=rules[game.family];$('family-note').textContent=['mines','hilo'].includes(game.family)?'Inactive rounds expire after 30 minutes. An untouched round refunds its stake; a round with successful picks or guesses automatically cashes out. One active interactive round is allowed per account.':'Crash continues during disconnection; optional auto cashout remains active on the server. One active interactive round is allowed per account.';
  $('canvas').hidden=game.family==='mines';$('mines').hidden=game.family!=='mines';
  await refresh();if(state.pending)void submit();else if(state.user)message('Ready.');controls();animation=requestAnimationFrame(draw);
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
