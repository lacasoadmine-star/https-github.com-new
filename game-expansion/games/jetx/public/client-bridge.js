/* Adapter for the captured public JetX client. Every wallet decision stays on
 * Superwin's server; no request is sent to a provider gambling endpoint. */
(function(){
 'use strict';
 const VERSION='superwin-jetx-1',BASE='/api/jetx/',PENDING='superwin.jetx.pending.';
 const ready=new Promise(resolve=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',resolve,{once:true}):resolve());
 let current=null,owner=null,session=null,epoch=0,stopped=false,streamAbort=null,poll=null,lastBoard=null,lastPhase=null,lastFinishedBoard=null,lastPlayer='',refreshing=null;
 const writes=new Map(),controllers=new Set();
 function stopAutomaticBets(){
  for(let i=0;i<4;i++){
   const input=document.getElementById('auto-bet-'+i);if(input?.checked)input.click();
   try{for(const key of ['jetxnew-bet-'+i,'bet-'+i]){const value=JSON.parse(localStorage.getItem(key)||'null');if(value&&typeof value==='object'){value.autoBet=false;localStorage.setItem(key,JSON.stringify(value));}}}catch{}
  }
  try{for(const key of ['jetxnew-prevBets','prevBets','jetxnew-prevBetSum','prevBetSum'])localStorage.removeItem(key);if(typeof player!=='undefined'){player.prevBets=[false,false,false,false,false,false];player.prevBetSum=0;}}catch{}
 }
 const noOp=()=>{};
 const analytics=new Proxy(noOp,{get:(_,key)=>key==='get_distinct_id'?()=> 'superwin':key==='then'?undefined:analytics,apply:()=>analytics});
 window.mixpanel=analytics;
 const withDone=promise=>{promise.done=fn=>{promise.then(fn).catch(noOp);return promise;};promise.fail=fn=>{promise.catch(fn);return promise;};return promise;};
 const hub={client:{},server:{},invoke};
 const connection={h:hub,hub:{state:1,qs:{},start:()=>withDone(ready.then(async()=>{await refresh();startFeed();schedulePoll();})),connectionSlow:noOp,reconnecting:noOp,reconnected:noOp,disconnected:noOp}};
 $.connection=connection;$.signalR={connectionState:{connected:1,disconnected:4}};
 function loginRequired(){
  if(stopped)return;stopped=true;epoch++;streamAbort?.abort();for(const c of controllers)c.abort();clearTimeout(poll);
  document.querySelectorAll('.bet-button').forEach(b=>b.classList.add('disabled'));
  const panel=document.createElement('div');panel.id='jetx-sign-in';panel.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#090b14ed;display:grid;place-items:center;color:white;font:16px Arial';
  const link=document.createElement('a');link.href='/account?view=login';link.textContent='Sign in to play JetX';link.style.cssText='background:#ffe10b;color:#171800;padding:18px 30px;border-radius:16px;text-decoration:none;font-weight:bold';panel.append(link);document.body.append(panel);
 }
 async function api(path,body){
  const controller=new AbortController();controllers.add(controller);const timeout=setTimeout(()=>controller.abort(),15000),startEpoch=epoch;
  try{
   const response=await fetch(BASE+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:{accept:'application/json',...(body?{'content-type':'application/json','X-Zplay-JetX-Session':session}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal});
   let data;try{data=await response.json();}catch{throw new Error('RETRY_SAME_REQUEST');}
   if([401,403].includes(response.status)){loginRequired();throw Object.assign(new Error('SIGN_IN_REQUIRED'),{status:response.status});}
   if(!response.ok)throw Object.assign(new Error(data.error||data.detail||'JETX_UNAVAILABLE'),{status:response.status});
   if(startEpoch!==epoch||stopped)throw new Error('SESSION_CHANGED');return data;
  }finally{clearTimeout(timeout);controllers.delete(controller);}
 }
 function accept(data){
  if(data.gameId!=='jetx_native'||data.modelVersion!==VERSION||data.currency!=='ETB'||typeof data.userId!=='string'||!/^\d+\.\d{2}$/.test(data.balance)||!/^\d+$/.test(data.board?.id||'')||!Array.isArray(data.bets))throw new Error('INVALID_JETX_STATE');
  if(owner&&owner!==data.userId){loginRequired();throw new Error('SESSION_CHANGED');}
  if(!owner)stopAutomaticBets();owner=data.userId;session=data.sessionId||session;if(!session)throw new Error('SESSION_BINDING_MISSING');
  if(!current||data.serverNow>=current.serverNow)current=data;
  let resume=document.getElementById('jetx-resume-existing');
  if(data.otherActiveGame){if(!resume){resume=document.createElement('a');resume.id='jetx-resume-existing';resume.style.cssText='position:fixed;top:60px;left:20px;z-index:100000;background:#ffe10b;color:#171800;padding:12px;border-radius:12px;font:600 14px Arial';document.body.append(resume);}resume.href='/native/'+encodeURIComponent(data.otherActiveGame);resume.textContent='Resume your active game';}
  else resume?.remove();
 }
 async function refresh(){
  if(refreshing)return refreshing;
  refreshing=api('state').then(data=>{accept(data);updatePlayer();return current;}).finally(()=>refreshing=null);return refreshing;
 }
 function schedulePoll(){clearTimeout(poll);if(!stopped&&!document.hidden)poll=setTimeout(()=>refresh().catch(noOp).finally(schedulePoll),2000);}
 function emptyBet(){return {ActiveButton:'placement',CashoutStep:0,WonAmount:0,IsActive:false,BetAmount:0,NextBetAmount:0,AutoCashout:false,AutoCashoutValue:0,NextAutoCashout:false,NextAutoCashoutValue:0};}
 function avatar(){const value=Number(localStorage.getItem('jetxnative.avatar.'+owner)||0);return Number.isInteger(value)&&value>=0&&value<=100?value:0;}
 function playerInfo(){
  const bets=Array.from({length:6},emptyBet);
  for(const bet of current.bets){if(bet.status==='cancelled')continue;const active=bet.status==='active';bets[bet.position]={...emptyBet(),ActiveButton:active?(current.board.phase==='flight'?'cashout':'disable'):'placement',IsActive:true,BetAmount:Number(bet.stake),CashoutStep:bet.coefficient/100,WonAmount:Number(bet.payout),AutoCashout:bet.auto!==null,AutoCashoutValue:Number(bet.auto||0)};}
  return {CounterId:owner,DisplayName:current.playerName,AvailableAmount:Number(current.balance),Currency:{CurrencyCode:'ETB',CurrencySymbol:'ETB',FractionDigit:2},Bets:bets,PortalName:'Superwin',ClientAvatar:avatar(),DisableCashGame:!current.accepting,IsDisabled:false,JackpotThrowAmount:null,JackpotThrowAmountPerPlayer:null,GiftSpinCount:0,GiftSpinAmount:0,GiftSpinTotalCreditWin:0,GiftSpinTotalWin:0,GiftSpinsStartAmount:0,GiftsStarted:false,GiftDebtAmount:0};
 }
 function config(){return {MinMultiplier:0,MinBetAmount:0.1,MaxBetAmount:100,MaxWinAmount:10000,AutoCashOutMinValue:1.01,AutoCashOutMaxValue:1000,AutoBetOn:true,TwoBetOn:true,ShowRtp:true,ShowGameInfoOnStart:!localStorage.getItem('jetxnew-local-help-seen'),ConvertToPlayerCurrency:false,ExchangeRate:1,ClientAvatar:avatar()};}
 function boardInfo(){
  const b=current.board;
  return {...config(),PlayerInfo:playerInfo(),IsFinnished:b.phase==='finished',IsGameStarted:b.phase==='flight',IsGameFinished:b.phase==='finished',Coefficient:b.coefficient/100,MaxCashoutCoeff:25000,ProgressPercent:b.phase==='betting'?Math.max(0.001,1-(current.serverNow-b.openedAt)/5500):0,ProgressTime:5.5,BoardVersion:Number(b.id),SpinNumber:Number(b.id),CurrentSpinHash:b.commitment,CurrentDateTime:new Date(current.serverNow).toISOString(),PlayerKey:owner,IsObserver:false,ShowPlayerBets:true,ClientChatKey:'',OnlinePlayers:current.onlinePlayers,TotalNetProfit:0,Options:[],Last100Spins:current.history.map(h=>({Coefficient:h.coefficient/100,SpinHash:h.commitment,Info:h.info,SpinTime:new Date(h.crashedAt).toISOString()})).reverse(),Last24ClientSpins:current.personalHistory.map(b=>({BetAmount:Number(b.stake),WonAmount:Number(b.payout),CashoutCoefficient:b.coefficient/100,Coefficient:b.roundCrash/100,SpinHash:b.commitment,SpinTimeParsed:new Date(b.settledAt).toISOString(),Currency:{CurrencyCode:'ETB',FractionDigit:2},BetPlace:b.position})).reverse(),TopDailyBigWins:[],TopWeeklyBigWins:[],TopMonthlyBigWins:[],TopDailyHugeWins:[],TopWeeklyHugeWins:[],TopMonthlyHugeWins:[],TopDailyCoeffs:[],TopWeeklyCoeffs:[],TopMonthlyCoeffs:[]};
 }
 function playerList(){return current.publicPlayers.map(b=>({i:b.id,x:b.position,d:b.name,b:Number(b.stake),c:b.coefficient/100,w:Number(b.payout),p:'Superwin',r:'ETB_2',currency:{currencyCode:'ETB',fractionDigit:2}}));}
 function updatePlayer(){
  if(!current||typeof window.jetX==='undefined'||typeof loadPlayerData!=='function')return;
  const info=playerInfo(),key=JSON.stringify(info);
  if(key!==lastPlayer){lastPlayer=key;loadPlayerData(info,false);if(typeof gameStats!=='undefined')gameStats.playersView.info(playerList());}
 }
 async function send(request){
  const mine=owner,binding=session,startEpoch=epoch,key=PENDING+binding+'.'+request.request_id;
  const saved={owner:mine,session:binding,request};localStorage.setItem(key,JSON.stringify(saved));
  for(let attempt=0;attempt<3;attempt++){
   if(owner!==mine||session!==binding||epoch!==startEpoch||stopped)throw new Error('SESSION_CHANGED');
   try{const data=await api('action',request);if(data.replayed)await refresh();else accept(data);localStorage.removeItem(key);updatePlayer();return playerInfo();}
   catch(error){if(error.status>=400&&error.status<500){localStorage.removeItem(key);await refresh().catch(noOp);return {ErrorMessage:error.message};}if(attempt===2)throw error;await new Promise(r=>setTimeout(r,500*(attempt+1)));}
  }
 }
 async function recover(){
  for(const key of Object.keys(localStorage).filter(k=>k.startsWith(PENDING+session+'.'))){
   let value;try{value=JSON.parse(localStorage.getItem(key));}catch{continue;}
   if(value?.owner!==owner||value.session!==session)continue;
   await send(value.request).catch(noOp);
  }
 }
 async function invoke(name,_token,input){
  await ready;
  if(stopped)return name==='GetList'?[]:{ErrorMessage:'SIGN_IN_REQUIRED'};
  if(!current){try{await refresh();}catch(error){if(stopped)return name==='GetList'?[]:{ErrorMessage:'SIGN_IN_REQUIRED'};throw error;}}
  switch(name){
   case 'CreateLoadTimeGameInfo':return config();
   case 'GetBoardInfo':return boardInfo();
   case 'GetPlayerInfo':return playerInfo();
   case 'GetList':return playerList();
   case 'TimerPing':return {OnlinePlayers:current.onlinePlayers,o:current.onlinePlayers};
   case 'PostBet':{
    const position=input.Position;if(writes.has(position))return writes.get(position);
    const value=Number(input.Amount);if(!Number.isFinite(value))return {ErrorMessage:'INVALID_STAKE'};
    const request={request_id:crypto.randomUUID(),type:'bet',board_id:current.board.id,position,stake:value.toFixed(2),auto_cashout:input.Autocashout==null?null:String(input.Autocashout),model_version:VERSION};
    const promise=send(request).finally(()=>writes.delete(position));writes.set(position,promise);return promise;
   }
   case 'Cashout':case 'CashoutMany':return send({request_id:crypto.randomUUID(),type:name==='Cashout'?'cashout':'cashout_many',board_id:current.board.id,...(name==='Cashout'?{position:input.Position}:{positions:input.Positions}),model_version:VERSION});
   case 'Post':
    if(input.EventCode==='jetx.no.info.on.start')localStorage.setItem('jetxnew-local-help-seen','1');
    if(input.EventCode==='jetx.change.client.avatar'){const value=Number(input.SelectedPieces);if(Number.isInteger(value)&&value>=0&&value<=100)localStorage.setItem('jetxnative.avatar.'+owner,String(value));}
    if(input.EventCode==='jetx.undo.bet')return send({request_id:crypto.randomUUID(),type:'cancel',board_id:current.board.id,position:input.SelectedPieces,model_version:VERSION});
    return playerInfo();
   default:throw new Error('UNSUPPORTED_LOCAL_JETX_METHOD');
  }
 }
 for(const [key,name]of Object.entries({getList:'GetList',getPlayerInfo:'GetPlayerInfo',getBoardInfo:'GetBoardInfo',createLoadTimeGameInfo:'CreateLoadTimeGameInfo',timerPing:'TimerPing',postBet:'PostBet',cashout:'Cashout',cashoutMany:'CashoutMany',post:'Post'}))hub.server[key]=(...args)=>withDone(invoke(name,...args));
 async function applyFeed(data){
  if(stopped||!current||typeof window.jetX==='undefined')return;
  if(data.version!==VERSION||typeof data.id!=='string'||!Number.isFinite(data.coefficient))return;
  if(lastBoard!==data.id){
   await refresh();lastBoard=data.id;lastPhase=null;hub.client.gBoard?.(boardInfo());
   if(data.phase!=='betting')window.jetX.hideLoader(false);
  }
  if(lastPhase!==data.phase){lastPhase=data.phase;await refresh();updatePlayer();}
  if(data.phase==='betting')return;
  if(data.phase==='finished'&&lastFinishedBoard===data.id)return;
  if(data.phase==='finished')lastFinishedBoard=data.id;
  const step=Math.max(0,Math.floor((data.serverNow-data.startsAt)/150));
  hub.client.response?.({f:data.phase==='finished',v:data.coefficient/100,n:data.coefficient/100,s:step,h:data.commitment});
  if(data.phase==='finished'&&lastPhase==='finished'&&typeof gameStats!=='undefined')gameStats.roundsView.load(boardInfo());
  if(current.bets.some(b=>b.status==='active'&&b.auto!==null&&data.coefficient>=Number(b.auto)*100))void refresh().catch(noOp);
 }
 async function startFeed(){
  streamAbort?.abort();const abort=new AbortController();streamAbort=abort;
  while(!stopped&&!abort.signal.aborted){
   try{
    const response=await fetch(BASE+'events',{credentials:'same-origin',cache:'no-store',signal:abort.signal});
    if([401,403].includes(response.status)){loginRequired();return;}if(!response.ok||!response.body)throw new Error('FEED_UNAVAILABLE');
    const reader=response.body.getReader(),decoder=new TextDecoder();let pending='';
    while(!stopped){const {done,value}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});let end;while((end=pending.indexOf('\n\n'))>=0){const line=pending.slice(0,end);pending=pending.slice(end+2);if(line.startsWith('data: '))await applyFeed(JSON.parse(line.slice(6)));}}
   }catch(error){if(abort.signal.aborted||stopped)return;try{window.jetX?.showInternetLost();}catch{}}
   if(!stopped&&!abort.signal.aborted)await new Promise(r=>setTimeout(r,300));
  }
 }
 for(const name of ['zplay:logout','zplay:session-expired','zplay:session-changing'])window.addEventListener(name,loginRequired);
 window.addEventListener('pagehide',()=>{stopped=true;epoch++;streamAbort?.abort();for(const c of controllers)c.abort();clearTimeout(poll);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAutomaticBets();streamAbort?.abort();clearTimeout(poll);}else if(!stopped){void refresh().then(()=>{startFeed();schedulePoll();}).catch(noOp);}});
 ready.then(()=>refresh()).then(recover).catch(noOp);
 window.JetXNative={refresh,invoke,async chatRequest(url,options={}){if(options.method==='POST'){const message=new URLSearchParams(options.body).get('Message');return api('chat',{message,requestId:crypto.randomUUID()});}const since=new URL(url,location.origin).searchParams.get('currentVersion')||'0';return api('chat?since='+encodeURIComponent(since));},get requiresLogin(){return stopped;},get state(){return current;}};
})();
