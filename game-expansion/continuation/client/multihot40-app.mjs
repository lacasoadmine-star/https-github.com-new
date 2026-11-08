import {ExpansionSession,bindPlayerEvents,moneyMinor,fromMinor,formatMoney,getRoundActions} from './session.mjs';
import {AutoplayController} from './autoplay.mjs';
import {MultiHot40Presentation} from './multihot40-presentation.mjs';

const ID='multihot40_native',PREFIX='/native-library/expansion/r1/';
const $=id=>document.getElementById(id);
const nodes=Object.fromEntries([...document.querySelectorAll('[id]')].map(node=>[node.id,node]));
const auto=new AutoplayController();
let config=null,manifest=null,session=null,state=null,ready=false,entered=false,operation='',visualBusy=false,visualRound='',lastRound='',queuePending=false,disposed=false;
let selectedStake='0.40',historyOrder='recent',historySequence=0,renderTick=0,initialSnapshot=true;
const preferences={sound:true,music:true,turbo:false};
try{const saved=JSON.parse(localStorage.getItem('zplay:multihot40:preferences')||'{}');for(const name of Object.keys(preferences))if(typeof saved[name]==='boolean')preferences[name]=saved[name];}catch{}
const presenter=new MultiHot40Presentation(nodes.scene,{onEvent:event=>{
 if(event.type==='animation-complete'){
  if(event.roundId&&visualRound&&event.roundId!==visualRound)return;
  visualBusy=false;syncControls();queueAutomatic();
 }
}});
const dialogNames=['menuDialog','settingsDialog','betDialog','autoDialog','rulesDialog','historyDialog','gambleDialog'];
function element(tag,text){const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);return node;}
function amount(value){return moneyMinor(value)?.toString()??null;}
function savePreferences(){try{localStorage.setItem('zplay:multihot40:preferences',JSON.stringify(preferences));}catch{}applyPreferences();}
function applyPreferences(){
 nodes.soundSetting.checked=preferences.sound;nodes.musicSetting.checked=preferences.music;nodes.turboSetting.checked=preferences.turbo;
 nodes.sound.setAttribute('aria-pressed',String(preferences.sound));nodes.sound.setAttribute('aria-label',preferences.sound?'Mute sound':'Enable sound');nodes.turbo.setAttribute('aria-pressed',String(preferences.turbo));
 presenter.setState({soundEnabled:entered&&preferences.sound,musicEnabled:entered&&preferences.music,turbo:preferences.turbo});
}
function closeDialogs(){for(const name of dialogNames)nodes[name].close();}
function openDialog(name){closeDialogs();nodes[name].showModal();}
function actionAllowed(action){return !disposed&&document.visibilityState==='visible'&&(action==='collect'||ready&&entered)&&!operation&&!visualBusy&&!auto.snapshot().active&&session?.canAct(action)===true;}
function canStart(){return !disposed&&document.visibilityState==='visible'&&ready&&entered&&!operation&&!visualBusy&&session?.canStart()===true;}
function hostState(){return {...state,canStart:canStart(),animationRunning:visualBusy};}
function presenterState(next){
 const round=next?.round;
 return {grid:round?.grid,multiplier:round?.feature?.multiplier,winMinor:round?.status==='active'?round.currentCashoutMinor:round?.payoutMinor??'0',pendingWinMinor:round?.status==='active'?round.currentCashoutMinor:'0',baseWinMinor:round?.baseWinMinor,betMinor:amount(selectedStake),balanceMinor:amount(next?.balance),lines:round?.wins??[],roundId:round?.round_id??'',soundEnabled:entered&&preferences.sound,musicEnabled:entered&&preferences.music,turbo:preferences.turbo,authenticated:next?.authenticated===true,canSpin:canStart()||actionAllowed('collect'),canGamble:actionAllowed('gamble'),autoPlaying:auto.snapshot().active};
}
function onState(next){
 if(disposed)return;
 const previousSession=state?.sessionId;state=next;
 if(previousSession&&previousSession!==next.sessionId){auto.stop('session-change');visualBusy=false;visualRound='';lastRound='';historySequence++;nodes.historyContent.replaceChildren();nodes.historyDialog.close();presenter.setState({phase:'error',balanceMinor:null});}
 const round=next.round,newRound=!!round&&round.round_id!==lastRound;
 if(newRound){
  lastRound=round.round_id;
  if(operation==='start'&&!initialSnapshot){visualRound=round.round_id;presenter.setState({...presenterState(next),phase:'result_received'});}
  else{visualBusy=false;presenter.setState({...presenterState(next),phase:'idle'});}
 }else presenter.setState(presenterState(next));
 if(next.connected&&next.authenticated)initialSnapshot=false;
 if(!next.connected||!next.authenticated||next.error)auto.stop('connection-change');
 auto.observe(hostState());
 syncControls();syncGamble();queueAutomatic();
}
function syncControls(){
 if(!state)return;
 const automatic=auto.snapshot(),round=state.round,active=round?.status==='active',hasCollect=getRoundActions(round,state.game).includes('collect');
 const available=ready&&entered&&!operation&&!state.busy&&!state.pending&&!state.confirming&&!state.recoveryBlocked;
 nodes.spin.disabled=!entered||!ready||!!operation&&!visualBusy||!visualBusy&&!available||automatic.active&&!visualBusy||!state.authenticated&&!available||state.authenticated&&!visualBusy&&!canStart()&&!actionAllowed('collect');
 nodes.spin.setAttribute('aria-label',visualBusy?'Stop animation':!state.authenticated?'Sign in to play':active&&hasCollect?'Collect win and spin':'Spin');
 nodes.spin.setAttribute('aria-busy',String(state.busy||visualBusy));
 nodes.auto.disabled=!canStart()&&!automatic.active;nodes.auto.setAttribute('aria-label',automatic.active?'Stop autoplay':'Autoplay');
 nodes.bet.disabled=!available||active||visualBusy||automatic.active;
 nodes.collect.hidden=!active||!hasCollect;nodes.gamble.hidden=!active||!getRoundActions(round,state.game).includes('gamble');
 nodes.collect.disabled=!actionAllowed('collect');nodes.gamble.disabled=!actionAllowed('gamble');
 nodes.recoveryPanel.hidden=ready;nodes.recoveryCollect.hidden=!active||!hasCollect;nodes.recoveryCollect.disabled=!actionAllowed('collect');nodes.recoveryRetry.disabled=!!operation||state.busy;nodes.recoveryStatus.textContent=state.message;
 nodes.autoRunning.hidden=!automatic.active;nodes.autoStatus.textContent=automatic.remaining+' spins remaining';
 nodes.accessibleBalance.textContent='Balance '+formatMoney(state.balance)+' ETB';
 nodes.accessibleWin.textContent=round?'Win '+fromMinor(active?round.currentCashoutMinor:round.payoutMinor)+' ETB':'';
 nodes.scene.setAttribute('aria-label','Multi Hot 40, five reels and four rows. '+(visualBusy?'Reels spinning.':round?'Win '+fromMinor(active?round.currentCashoutMinor:round.payoutMinor)+' ETB.':'Ready to play.'));
 nodes.statusBar.classList.toggle('error',state.error);
 const message=state.error||state.pending||!state.authenticated||!state.connected||state.otherActiveGame||!ready?state.message:state.busy?'Confirming…':!state.accepting?'New rounds are paused.':moneyMinor(state.balance)===0n&&!active?'Add funds to your player account to play.':'';
 nodes.status.textContent=message;nodes.statusBar.classList.toggle('quiet',!message);
 nodes.retry.hidden=!(state.error||state.pending)&&state.connected;nodes.retry.disabled=!!operation||state.busy;
 nodes.signIn.hidden=state.authenticated;nodes.otherGame.hidden=!state.otherActiveGame;
 if(state.otherActiveGame)nodes.otherGame.href=/^[a-z0-9_]+$/.test(state.otherActiveGame)?'/games/'+state.otherActiveGame:'/';
 presenter.setState({canSpin:canStart()||actionAllowed('collect'),canGamble:actionAllowed('gamble'),autoPlaying:automatic.active});
}
async function doStart({automatic=false}={}){
 if(operation||disposed||document.visibilityState!=='visible'||!ready||!entered)return false;
 if(visualBusy){presenter.speedUp();return false;}
 if(!state?.authenticated){location.href=nodes.signIn.href;return false;}
 if(!automatic&&auto.snapshot().active)return false;
 const initiatingSession=state.sessionId,initiatingModel=state.game?.version;
 operation='collect-before-spin';syncControls();
 if(session.canAct('collect')){
  const collected=await session.act('collect');
  if(!collected){operation='';syncControls();return false;}
 }
 operation='';
 if(!canStart()||state.sessionId!==initiatingSession||state.game?.version!==initiatingModel||automatic&&!auto.snapshot().active)return false;
 if(moneyMinor(state.balance)<moneyMinor(selectedStake)){nodes.status.textContent='Your balance is below this stake.';nodes.statusBar.classList.remove('quiet');auto.stop('insufficient-funds');return false;}
 operation='start';visualBusy=true;visualRound='';closeDialogs();presenter.setState({...presenterState(state),phase:'spinning'});syncControls();
 const confirmed=await session.start(selectedStake,automatic?{autoCollect:true}:{});
 operation='';
 if(!confirmed){visualBusy=false;presenter.setState({...presenterState(state),phase:'error'});auto.stop('unconfirmed-round');}
 auto.observe(hostState());syncControls();queueAutomatic();return confirmed;
}
async function collectWin(){
 if(!actionAllowed('collect'))return;
 operation='collect';syncControls();const confirmed=await session.act('collect');operation='';if(disposed)return;presenter.setState({...presenterState(state),phase:'idle'});if(confirmed)void presenter.playSound?.('Buttons/DoubleTake.mp3');syncControls();syncGamble();
}
async function gamble(color){
 if(!actionAllowed('gamble')||!['red','black'].includes(color))return;
 operation='gamble';syncControls();syncGamble();
 nodes.gambleCard.textContent='…';
 const confirmed=await session.act('gamble',{color});operation='';if(disposed)return;presenter.setState(presenterState(state));if(confirmed)void presenter.playSound?.(state.round?.gambleHistory?.at(-1)?.won?'Double/Win.mp3':'Double/Lose.mp3');syncControls();syncGamble();
}
function syncGamble(){
 if(!state)return;const round=state.round,history=round?.gambleHistory||[],last=history.at(-1),suits={clubs:'♣',diamonds:'♦',hearts:'♥',spades:'♠'};
 nodes.gambleWin.textContent=fromMinor(round?.status==='active'?round.currentCashoutMinor:round?.payoutMinor);
 if(operation!=='gamble'){nodes.gambleCard.textContent=last?'A'+suits[last.suit]:'?';nodes.gambleCard.classList.toggle('red',last?.color==='red');}
 nodes.gambleCards.replaceChildren(...history.map(item=>{const span=element('span',suits[item.suit]);span.className=item.color==='red'?'red':'';span.title='Attempt '+item.attempt+': '+(item.won?'won':'lost');return span;}));
 nodes.red.disabled=nodes.black.disabled=!actionAllowed('gamble');nodes.gambleCollect.disabled=!actionAllowed('collect');
 nodes.gambleStatus.textContent=operation==='gamble'?'Confirming your choice…':last&&!last.won?'No win.':round?.status!=='active'?'Round finished.':round.gambleAvailable?'Choose a colour. '+round.gambleAttemptsRemaining+' attempts left.':'Take your win.';
}
function queueAutomatic(){
 if(queuePending||!session||disposed)return;
 auto.observe(hostState());if(!auto.canLaunch(hostState()))return;
 queuePending=true;queueMicrotask(async()=>{
  queuePending=false;if(disposed||!auto.canLaunch(hostState())||operation)return;
  if(!auto.markSubmitted(state.round?.round_id??null))return;
  const success=await doStart({automatic:true});if(!success){auto.stop('submission-stopped');syncControls();}
 });
}
function stopAuto(reason='user-stop'){auto.stop(reason);syncControls();}
function limitValue(input){const text=input.value.trim();if(!text)return null;if(!/^(0|[1-9]\d{0,10})(?:\.\d{1,2})?$/.test(text))throw Error('Enter a valid ETB amount.');const[whole,fraction='']=text.split('.');return String(BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0')));}
function resize(){
 const rect=nodes.machine.getBoundingClientRect(),layout=presenter.layout(rect.width,rect.height);
 for(const[name,box]of Object.entries(layout.controls||{})){const button=nodes[name];if(!button||!box)continue;Object.assign(button.style,{left:box.x+'px',top:box.y+'px',width:box.width+'px',height:box.height+'px'});}
 presenter.resize?.(rect.width,rect.height);
}
function tick(time){if(disposed)return;renderTick=requestAnimationFrame(tick);if(document.visibilityState!=='hidden')presenter.render(time);}
function chooseStake(value){if(!config.stakeValues.includes(value))return;selectedStake=value;nodes.betDialog.close();nodes.bet.setAttribute('aria-label','Choose bet, current '+value+' ETB');presenter.setState({betMinor:amount(value)});renderStakeOptions();syncControls();}
function renderStakeOptions(){nodes.stakeOptions.replaceChildren(...config.stakeValues.map(value=>{const button=element('button',formatMoney(value)+' ETB');button.type='button';button.setAttribute('aria-pressed',String(value===selectedStake));button.addEventListener('click',()=>{if(!nodes.bet.disabled)chooseStake(value);});return button;}));}
async function buildRules(){
 const content=nodes.rulesContent;content.replaceChildren(element('p','5 reels · 4 rows · 40 fixed paylines'));
 const table=element('table'),head=element('thead'),tr=element('tr');for(const title of ['SYMBOL','3','4','5'])tr.append(element('th',title));head.append(tr);table.append(head);const body=element('tbody');
 for(const row of config.paytable||[]){const tr=element('tr'),symbol=config.symbols.find(symbol=>String(symbol.id)===String(row.symbol));tr.append(element('td',symbol?.label||row.symbol));for(const count of [3,4,5])tr.append(element('td',(row.counts?.[count]?.value??0)+'×'));body.append(tr);}table.append(body);content.append(table,element('p','Prizes are multiplied by the line bet (total bet ÷ 40) and the 1×–5× wheel. Only the highest matching award per line pays. Winning lines add together.'));
 const rules=element('ol');for(const rule of config.rules||[])rules.append(element('li',rule));content.append(rules);
 const paths=element('details');paths.append(element('summary','View all 40 paylines'));const lineGrid=element('div');lineGrid.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:15px';
 for(const[pathIndex,path]of (config.paylinePaths||[]).entries()){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 60 60');svg.setAttribute('role','img');svg.setAttribute('aria-label','Payline '+(pathIndex+1));
  const title=document.createElementNS(svg.namespaceURI,'text');title.setAttribute('x','30');title.setAttribute('y','10');title.setAttribute('text-anchor','middle');title.setAttribute('font-size','9');title.setAttribute('fill','#fff');title.textContent=String(pathIndex+1);svg.append(title);
  for(let x=0;x<5;x++)for(let y=0;y<4;y++){const r=document.createElementNS(svg.namespaceURI,'rect');r.setAttribute('x',String(x*11+3));r.setAttribute('y',String(y*10+16));r.setAttribute('width','9');r.setAttribute('height','8');r.setAttribute('fill',path[x]===y?'#fff4a0':'#5a751b');svg.append(r);}lineGrid.append(svg);
 }paths.append(lineGrid);content.append(paths);
 const math=element('p','ZPLAY native game · theoretical RTP '+(config.math?.nativeReturn?.percent||'95.9014892578125')+'%. This uses an independent probability model. The original reference game has a separate provider model.');math.className='native-math';content.append(math);
}
async function showHistory(order=historyOrder){
 historyOrder=order;const seq=++historySequence,historySession=state?.sessionId;nodes.historyRecent.setAttribute('aria-pressed',String(order==='recent'));nodes.historyBiggest.setAttribute('aria-pressed',String(order==='wins'));
 nodes.historyContent.replaceChildren(element('p','Loading your settled rounds…'));if(!nodes.historyDialog.open)openDialog('historyDialog');
 try{
  const response=await fetch('/api/expansion/history?game_id='+ID+'&sort='+order,{credentials:'same-origin',cache:'no-store'}),data=await response.json();
  if(seq!==historySequence||disposed||state?.sessionId!==historySession)return;
  if(!response.ok||data.game_id!==ID||data.currency!=='ETB'||!Array.isArray(data.rows))throw Error(response.status===401?'Sign in to see your history.':'History is unavailable. Try again.');
  if(!historySession||data.sessionId!==historySession)throw Error('Your player session changed. Reopen history.');
  if(!data.rows.length){nodes.historyContent.replaceChildren(element('p','No settled rounds yet.'));return;}
  const table=element('table'),tr=element('tr');for(const label of ['TIME','BET','WIN','REPLAY'])tr.append(element('th',label));const head=element('thead');head.append(tr);table.append(head);const body=element('tbody');
  for(const entry of data.rows){const round=entry.round;if(round?.game_id!==ID||round.status!=='settled')continue;const row=element('tr');row.append(element('td',new Date(entry.createdAt).toLocaleString()),element('td',fromMinor(round.stakeMinor)),element('td',fromMinor(round.payoutMinor)));const cell=element('td'),button=element('button','View');button.type='button';button.addEventListener('click',()=>showReplay(entry));cell.append(button);row.append(cell);body.append(row);}table.append(body);nodes.historyContent.replaceChildren(table);
 }catch(error){if(seq===historySequence)nodes.historyContent.replaceChildren(element('p',error.message));}
}
function showReplay(entry){
 // Replays are read-only. They never enter the live presenter or session.
 const round=entry.round,box=nodes.historyContent;box.replaceChildren();const back=element('button','‹ Back to history');back.type='button';back.addEventListener('click',()=>void showHistory());box.append(back,element('p','Round '+round.round_id),element('p','Bet '+fromMinor(round.stakeMinor)+' ETB · Win '+fromMinor(round.payoutMinor)+' ETB'));
 const table=element('table');for(let row=0;row<4;row++){const tr=element('tr');for(let col=0;col<5;col++){const id=round.grid?.[col]?.[row];tr.append(element('td',config.symbols.find(symbol=>String(symbol.id)===String(id))?.label??'—'));}table.append(tr);}box.append(table);
 const wins=element('ul');for(const win of round.wins||[])wins.append(element('li','Line '+win.line+': '+fromMinor(win.payoutMinor)+' ETB'));box.append(wins);
}
function enteredGame(sound){entered=true;preferences.sound=sound;preferences.music=sound;nodes.startup.hidden=true;savePreferences();if(sound)void presenter.unlockAudio();syncControls();resize();}

nodes.spin.addEventListener('click',()=>{if(visualBusy)presenter.speedUp();else void doStart();});
nodes.collect.addEventListener('click',()=>void collectWin());nodes.gamble.addEventListener('click',()=>{if(actionAllowed('gamble')){syncGamble();openDialog('gambleDialog');}});
nodes.recoveryCollect.addEventListener('click',()=>void collectWin());
nodes.red.addEventListener('click',()=>void gamble('red'));nodes.black.addEventListener('click',()=>void gamble('black'));nodes.gambleCollect.addEventListener('click',()=>void collectWin());
nodes.menu.addEventListener('click',()=>openDialog('menuDialog'));nodes.bet.addEventListener('click',()=>{renderStakeOptions();openDialog('betDialog');});
nodes.openSettings.addEventListener('click',()=>openDialog('settingsDialog'));nodes.openRules.addEventListener('click',()=>openDialog('rulesDialog'));nodes.openHistory.addEventListener('click',()=>void showHistory());
nodes.historyRecent.addEventListener('click',()=>void showHistory('recent'));nodes.historyBiggest.addEventListener('click',()=>void showHistory('wins'));
nodes.sound.addEventListener('click',()=>{preferences.sound=!preferences.sound;savePreferences();if(preferences.sound)void presenter.unlockAudio();});nodes.turbo.addEventListener('click',()=>{preferences.turbo=!preferences.turbo;savePreferences();});
nodes.soundSetting.addEventListener('change',()=>{preferences.sound=nodes.soundSetting.checked;savePreferences();if(preferences.sound)void presenter.unlockAudio();});nodes.musicSetting.addEventListener('change',()=>{preferences.music=nodes.musicSetting.checked;savePreferences();if(preferences.music)void presenter.unlockAudio();});nodes.turboSetting.addEventListener('change',()=>{preferences.turbo=nodes.turboSetting.checked;savePreferences();});
nodes.fullscreenSetting.addEventListener('change',async()=>{try{if(nodes.fullscreenSetting.checked)await nodes.machine.requestFullscreen();else if(document.fullscreenElement)await document.exitFullscreen();}catch{nodes.fullscreenSetting.checked=!!document.fullscreenElement;}});
document.addEventListener('fullscreenchange',()=>{nodes.fullscreenSetting.checked=!!document.fullscreenElement;resize();});
nodes.soundYes.addEventListener('click',()=>enteredGame(true));nodes.soundNo.addEventListener('click',()=>enteredGame(false));
for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=>button.closest('dialog').close());
for(const name of dialogNames)nodes[name].addEventListener('click',event=>{if(event.target!==nodes[name])return;const r=nodes[name].getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)nodes[name].close();});
nodes.retry.addEventListener('click',async()=>{if(operation||state?.busy)return;operation='retry';syncControls();if(session.state.pending)await session.retry();else await session.refresh();operation='';syncControls();});
nodes.recoveryRetry.addEventListener('click',()=>nodes.retry.click());
nodes.auto.addEventListener('click',()=>{if(auto.snapshot().active){stopAuto();return;}if(!canStart())return;nodes.autoStake.textContent='Each spin: '+selectedStake+' ETB';nodes.autoError.textContent='';openDialog('autoDialog');});nodes.autoStop.addEventListener('click',()=>stopAuto());
nodes.autoForm.addEventListener('submit',event=>{event.preventDefault();if(!canStart()||auto.snapshot().active)return;try{auto.begin({gameId:ID,modelVersion:state.game.version,sessionId:state.sessionId,stakeMinor:amount(selectedStake),count:Number(nodes.autoCount.value),startingBalanceMinor:amount(state.balance),previousRoundId:state.round?.round_id??null,winLimitMinor:limitValue(nodes.autoWin),lossLimitMinor:limitValue(nodes.autoLoss),gainLimitMinor:limitValue(nodes.autoGain)});nodes.autoDialog.close();syncControls();queueAutomatic();}catch(error){nodes.autoError.textContent=error.message;}});
window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){stopAuto('page-hidden');presenter.setState({soundEnabled:false,musicEnabled:false});}else{applyPreferences();if(!operation)void session?.refresh({quiet:true});}});
window.addEventListener('pagehide',()=>{disposed=true;stopAuto('pagehide');cancelAnimationFrame(renderTick);presenter.dispose();});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
window.addEventListener('keydown',event=>{if(event.code==='Space'&&!dialogNames.some(name=>nodes[name].open)&&!['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName)){event.preventDefault();if(!nodes.spin.disabled)nodes.spin.click();}});

async function boot(){
 let storage;try{storage=sessionStorage;}catch{storage=null;}
 session=new ExpansionSession({gameId:ID,storage,onChange:onState});bindPlayerEvents(window,session);session.setGame({id:ID,name:'Multi Hot 40',launchable:false});
 const connected=session.refresh();
 try{
  const response=await fetch(PREFIX+'games.json',{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw Error('Game configuration is unavailable.');const games=await response.json();config=games.find(game=>game.id===ID);if(!config||!config.referencePresentation)throw Error('This game is not available yet.');
  selectedStake=config.stakeValues.includes(config.defaultStake)?config.defaultStake:config.stakeValues[0];
  session.setGame(config);
  const spec=config.referencePresentation,url=new URL(spec.manifestURL,location.origin);if(url.origin!==location.origin)throw Error('Invalid game artwork origin.');
  const assetResponse=await fetch(url,{credentials:'same-origin',redirect:'error'});if(!assetResponse.ok)throw Error('Game artwork is unavailable.');const bytes=await assetResponse.arrayBuffer();
  const actual=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');if(actual!==spec.manifestSha256)throw Error('Game artwork could not be verified.');manifest=JSON.parse(new TextDecoder().decode(bytes));
  if(manifest.id!==ID||manifest.grid.columns!==5||manifest.grid.rows!==4)throw Error('Game artwork does not match this game.');
  nodes.loadingProgress.value=25;presenter.configure({manifest,paylines:config.paylinePaths,assetBase:new URL(spec.assetBaseURL,location.origin).href});await presenter.load();ready=true;nodes.loadingProgress.value=100;nodes.loadingStatus.textContent='Ready';nodes.soundConsent.hidden=false;
  applyPreferences();if(state)presenter.setState({...presenterState(state),phase:'idle'});resize();renderTick=requestAnimationFrame(tick);renderStakeOptions();await buildRules();syncControls();
  await connected;
  setInterval(()=>{if(!disposed&&!operation&&!visualBusy&&!session.state.busy&&document.visibilityState==='visible')void session.refresh({quiet:true});},10000);
 }catch(error){ready=false;visualBusy=false;presenter.setState({phase:'error'});nodes.loadingStatus.textContent=error.message+' Return to the lobby and try again.';nodes.status.textContent=error.message;nodes.loadingProgress.value=0;nodes.statusBar.classList.add('error');await connected;syncControls();}
}
void boot();
