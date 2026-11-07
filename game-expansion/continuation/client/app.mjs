import {ExpansionSession,formatMoney,fromMinor,moneyMinor,getRoundActions,bindPlayerEvents} from './session.mjs';
import {MachineScene,themeKind,frameList,featureLabel,displayFamily,gridGeometry,drawSymbol,presentationFrame,providedRules,confirmedTowerAmounts} from './scene.mjs';
import {stakeChoices,mineChoices,selectedChoice} from './controls.mjs';
import {AutoplayController,autoplayProfile} from './autoplay.mjs';
const $=id=>document.getElementById(id);
const ui=Object.fromEntries(['machineShell','headerTitle','wallet','gameCategory','gameTitle','connection','featureDescription','stage','scene','mineGrid','sequenceBadge','resultLabel','result','roundCaption','roundDetail','stake','stakeLabel','stakeRange','minus','plus','mines','mineOptions','play','playLabel','activeActions','step','cashout','cashoutAmount','riskSummary','bankedAmount','riskAmount','skip','notice','accountLink','otherGame','help','sound','refresh','playNote','footerGame','fullScreen','rulesDialog','rulesTitle','rulesContent','closeRules','autoplay','autoplayDialog','closeAutoplay','autoplayForm','autoplayCount','autoplayWinRow','autoplayWin','autoplayLoss','autoplayGain','autoplayFeatureStops','autoplayBonus','autoplayFreeSpins','autoplayBigWin','autoplayError','startAutoplay','autoplayRunning','autoplayStatus','stopAutoplay'].map(id=>[id,$(id)]));
const gameId=location.pathname.split('/').filter(Boolean).at(-1)||'';
const scene=new MachineScene(ui.scene);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let session=null,game=null,currentState=null,configSignature='',soundEnabled=true,audioContext=null,animation=null,seenRound='',lastDraw=0,lastRefresh=0;
const autoplay=new AutoplayController();let autoplayQueued=false;
function storage(){try{return window.sessionStorage;}catch{return null;}}
function tone(type){
 if(!soundEnabled)return;
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  audioContext??=new Audio();if(audioContext.state==='suspended')void audioContext.resume();
  const base=type==='win'?620:type==='pick'?800:330,t=audioContext.currentTime;
  for(let i=0;i<(type==='win'?3:1);i++){const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.setValueAtTime(base*(1+i*.25),t+i*.075);gain.gain.setValueAtTime(.035,t+i*.075);gain.gain.exponentialRampToValueAtTime(.0001,t+.18+i*.075);osc.connect(gain);gain.connect(audioContext.destination);osc.start(t+i*.075);osc.stop(t+.2+i*.075);}
 }catch{/* Sound cannot affect an action. */}
}
function option(value,label){const element=document.createElement('option');element.value=value;element.textContent=label??value;return element;}
function configure(next){
 game=next;scene.setGame(game);ui.gameTitle.textContent=game.name;ui.headerTitle.textContent=game.name;ui.footerGame.textContent=game.name;document.title=game.name+' · ZPLAY';
 document.body.className='theme-'+themeKind(game);
 for(const [key,value]of Object.entries(game.theme||{}))if(['bg','accent','secondary'].includes(key)&&/^#[a-f\d]{6}$/i.test(value))document.documentElement.style.setProperty('--'+key,value);
 const family=displayFamily(game);ui.gameCategory.textContent='ZPLAY · '+(family==='tower'?'SKYLINE SERIES':family==='mines'?'COIN VAULT':game.ways?'ROLLING REELS':game.columns===6?'LEGENDS SERIES':'SLOT COLLECTION');
 ui.featureDescription.textContent=String(game.featureDescription||'Choose your stake to start a round.').slice(0,210);
 ui.stakeLabel.textContent=game.controls?.stakeLabel||'Total stake (ETB)';
 const sig=JSON.stringify([game.id,game.version,game.minStake,game.maxStake,game.stakeValues,game.stakes,game.controls]);
 if(sig!==configSignature){
  const previous=ui.stake.value,min=moneyMinor(game.minStake),max=moneyMinor(game.maxStake);
  const choices=stakeChoices(game);
  ui.stake.replaceChildren(...choices.map(value=>option(value,formatMoney(value)+' ETB')));ui.stake.value=selectedChoice(choices,previous,game.defaultStake);
  ui.stakeRange.textContent=min!==null&&max!==null?formatMoney(game.minStake)+'–'+formatMoney(game.maxStake):'';
  if(game.controls?.mines){const options=game.controls.mines,chosen=ui.mines.value,values=mineChoices(options);ui.mines.replaceChildren(...values.map(value=>option(value)));ui.mines.value=selectedChoice(values,chosen,options.default||3);}
  configSignature=sig;
 }
 ui.mineOptions.hidden=family!=='mines';ui.mineGrid.hidden=family!=='mines';
 ui.playNote.textContent=family==='mines'?'Reveal a safe tile, then continue or collect. A mine ends the round.':game.id==='towerrush_native'?'Build the next floor or collect your confirmed win.':game.controls?.baseUnitsPerStake?'The displayed stake is the total cost of the building sequence.':'Each play starts one round. Bonus sequences complete within that round.';
 scene.resize();positionMineGrid();
}
function beginSequence(round){
 const frames=frameList(round);
 if(reducedMotion||!frames.length){animation=null;return;}
 const duration=Math.max(150,Math.min(800,20000/frames.length));
 animation={roundId:round.round_id,frames,index:0,next:performance.now()+duration,duration};
}
function drawState(state){
 currentState=state;if(state.game)configure(state.game);
 const round=state.round,active=round?.status==='active',settled=round?.status==='settled',key=round?round.round_id+':'+round.version:'';
 if(key!==seenRound){
  if(settled&&state.busy){beginSequence(round);tone(BigInt(round.payoutMinor||'0')>0n?'win':'settle');}
  else if(animation?.roundId!==round?.round_id)animation=null;
  seenRound=key;
 }
 autoplay.observe({...state,canStart:session.canStart(),animationRunning:!!animation});
 const automatic=autoplay.snapshot(),profile=autoplayProfile(game?.id);
 ui.wallet.textContent=formatMoney(state.balance);ui.wallet.title=state.balance===null?'Sign in to see your balance':formatMoney(state.balance)+' ETB';
 ui.connection.classList.toggle('online',state.connected&&state.authenticated);ui.connection.lastElementChild.textContent=state.connected?'Connected':state.authenticated?'Disconnected':'Sign in';
 const actions=getRoundActions(round,state.game),hasStep=actions.includes('step'),hasCashout=actions.includes('cashout');
 ui.play.hidden=active;ui.play.disabled=!session.canStart()||!!animation||automatic.active;ui.play.setAttribute('aria-busy',String(state.busy));
 ui.playLabel.textContent=state.busy?'CONFIRMING':state.pending?'CONFIRM ACTION':animation?'RESULT SEQUENCE':!state.authenticated?'SIGN IN TO PLAY':!state.accepting?'PAUSED':displayFamily(game)==='tower'?'BUILD':displayFamily(game)==='mines'?'START ROUND':'SPIN';
 ui.activeActions.hidden=!active||!(hasStep||hasCashout);ui.step.hidden=!hasStep;ui.cashout.hidden=!hasCashout;ui.step.disabled=!session.canAct('step');ui.cashout.disabled=!session.canAct('cashout');ui.cashoutAmount.textContent=fromMinor(round?.currentCashoutMinor)+' ETB';
 const towerAmounts=confirmedTowerAmounts(round);ui.riskSummary.hidden=game?.id!=='towerrush_native'||!active;ui.bankedAmount.textContent=towerAmounts.banked+' ETB';ui.riskAmount.textContent=towerAmounts.atRisk+' ETB';
 if(automatic.active&&!state.busy&&!animation)ui.playLabel.textContent='AUTOPLAY';
 const stakeLocked=active||state.busy||state.pending||state.confirming||state.recoveryBlocked||!state.authenticated||!!animation||automatic.active;
 ui.stake.disabled=stakeLocked;ui.minus.disabled=stakeLocked||ui.stake.selectedIndex<=0;ui.plus.disabled=stakeLocked||ui.stake.selectedIndex>=ui.stake.options.length-1;ui.mines.disabled=stakeLocked;
 ui.resultLabel.textContent=active?'COLLECT VALUE':'LAST WIN';ui.result.textContent=active?fromMinor(round.currentCashoutMinor):settled?fromMinor(round.payoutMinor):'—';
 ui.roundCaption.textContent=state.pending?'Confirmation needed':state.busy?'Confirming action…':active?'Round in progress':settled?'Round settled':state.authenticated?'Ready when you are':'Sign in to play';
 ui.roundDetail.textContent=active?(displayFamily(game)==='mines'?'Choose a tile or collect your win.':'Build another floor or collect.') :settled?(featureLabel(round.feature)||'Payout credited to your player balance.'):game?.launchable===false?'This game is being prepared.':'Your balance comes from your player account.';
 ui.notice.textContent=state.message;ui.notice.classList.toggle('error',state.error);ui.accountLink.hidden=state.authenticated;ui.otherGame.hidden=!state.otherActiveGame;
 if(state.otherActiveGame)ui.otherGame.href=/^[a-z0-9_]{1,64}$/.test(state.otherActiveGame)?'/games/'+state.otherActiveGame:'/';
 ui.refresh.disabled=state.busy;ui.refresh.classList.toggle('retry',state.pending);ui.refresh.replaceChildren();const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent='↻';ui.refresh.append(icon,document.createTextNode(state.pending?'Retry':'Refresh'));
 ui.skip.hidden=!animation;ui.sequenceBadge.hidden=!animation;if(animation)ui.sequenceBadge.textContent='RESULT '+(animation.index+1)+' / '+animation.frames.length;
 const picks=new Map((round?.picks||[]).map(pick=>[pick.index,pick]));
 [...ui.mineGrid.children].forEach((button,index)=>{const pick=picks.get(index);button.disabled=!!pick||!session.canAct('pick');button.textContent=pick?'':String(index+1);button.setAttribute('aria-label','Tile '+(index+1)+(pick?pick.safe?', coin revealed':', mine revealed':', unrevealed'));button.setAttribute('aria-pressed',String(!!pick));});
 ui.scene.setAttribute('aria-label',round?(game.name+'. '+(active?'Active round.': 'Settled round. Payout '+fromMinor(round.payoutMinor)+' ETB.')+' '+featureLabel(round.feature)):game?.name+'. Symbol preview. No round has been played.');
 ui.autoplay.hidden=!profile;ui.autoplay.disabled=automatic.active||!session.canStart()||!!animation;
 ui.autoplayRunning.hidden=!automatic.active;
 ui.autoplayStatus.textContent=automatic.count==='continuous'?automatic.completed+' spins completed':automatic.remaining+' spins remaining';
 queueAutoplay();
}

function automaticState(){return {...currentState,canStart:session?.canStart()===true,animationRunning:!!animation};}
function queueAutoplay(){
 if(autoplayQueued||!currentState||!autoplay.canLaunch(automaticState()))return;
 autoplayQueued=true;
 queueMicrotask(async()=>{
  autoplayQueued=false;if(!session||!autoplay.canLaunch(automaticState()))return;
  const value=BigInt(autoplay.snapshot().stakeMinor),stake=`${value/100n}.${String(value%100n).padStart(2,'0')}`;
  if(!autoplay.markSubmitted(currentState.round?.round_id??null))return;
  const confirmed=await session.start(stake,{});
  if(!confirmed){autoplay.stop('submission-not-confirmed');if(currentState)drawState(currentState);}
 });
}

function openAutoplay(){
 const profile=autoplayProfile(game?.id);if(!profile||!session?.canStart()||animation||autoplay.snapshot().active)return;
 ui.autoplayCount.replaceChildren(...profile.counts.map(value=>option(String(value),value==='continuous'?'Continuous':value+' spins')));
 ui.autoplayCount.value=String(profile.defaultCount);
 ui.autoplayWinRow.hidden=profile.kind!=='modern';
 ui.autoplayFeatureStops.hidden=!profile.stopFlagsAvailable;
 for(const input of [ui.autoplayWin,ui.autoplayLoss,ui.autoplayGain])input.value='';
 for(const input of [ui.autoplayBonus,ui.autoplayFreeSpins,ui.autoplayBigWin])input.checked=false;
 ui.autoplayError.hidden=true;ui.autoplayDialog.showModal();
}

function autoplayLimit(input,maximum){
 const text=input.value.trim();if(!text)return null;
 if(!/^(0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text))throw Error('Enter a valid amount with up to two decimal places.');
 const [whole,fraction='']=text.split('.'),value=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
 if(value===0n)return null;
 if(maximum!==null&&value>maximum)throw Error('A stop limit is above the amount available for this setting.');
 return String(value);
}

ui.autoplay.addEventListener('click',openAutoplay);
ui.closeAutoplay.addEventListener('click',()=>ui.autoplayDialog.close());
ui.stopAutoplay.addEventListener('click',()=>{autoplay.stop('user-stop');if(currentState)drawState(currentState);});
ui.autoplayForm.addEventListener('submit',event=>{
 event.preventDefault();const profile=autoplayProfile(game?.id);
 if(!profile||!session?.canStart()||animation||autoplay.snapshot().active)return;
 try{
  const stake=moneyMinor(ui.stake.value),balance=moneyMinor(currentState.balance);
  if(stake===null||balance===null)throw Error('Refresh your balance before starting autoplay.');
  autoplay.begin({gameId:game.id,modelVersion:game.version,sessionId:currentState.sessionId,stakeMinor:String(stake),count:ui.autoplayCount.value==='continuous'?'continuous':Number(ui.autoplayCount.value),startingBalanceMinor:String(balance),previousRoundId:currentState.round?.round_id??null,winLimitMinor:profile.kind==='modern'?autoplayLimit(ui.autoplayWin,moneyMinor(game.maxWin)):null,lossLimitMinor:autoplayLimit(ui.autoplayLoss,balance),gainLimitMinor:autoplayLimit(ui.autoplayGain,profile.kind==='modern'?stake*3000n:null),stopOnBonus:profile.stopFlagsAvailable&&ui.autoplayBonus.checked,stopOnFreeSpins:profile.stopFlagsAvailable&&ui.autoplayFreeSpins.checked,stopOnBigWin:profile.stopFlagsAvailable&&ui.autoplayBigWin.checked});
  ui.autoplayDialog.close();drawState(currentState);
 }catch(error){ui.autoplayError.textContent=error.message;ui.autoplayError.hidden=false;}
});
function positionMineGrid(){
 if(!game||displayFamily(game)!=='mines')return;
 const g=gridGeometry(scene.width,scene.height,5,5,'mines');Object.assign(ui.mineGrid.style,{left:g.x+'px',top:g.y+'px',width:g.w+'px',height:g.h+'px'});
}
function resize(){scene.resize();positionMineGrid();}
function animate(time){
 requestAnimationFrame(animate);if(document.visibilityState==='hidden'||time-lastDraw<(reducedMotion?250:30))return;lastDraw=time;
 if(animation&&time>=animation.next){animation.index++;animation.next=time+animation.duration;if(animation.index>=animation.frames.length){animation=null;drawState(currentState);}else ui.sequenceBadge.textContent='RESULT '+(animation.index+1)+' / '+animation.frames.length;}
 scene.draw(reducedMotion?0:time,{round:currentState?.round,busy:currentState?.busy,frame:animation?presentationFrame(currentState?.round,animation.index):null,preview:!currentState?.round});
}
function element(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);if(className)node.className=className;return node;}
function coefficient(value){
 if(value===null||value===undefined)return '—';if(typeof value==='number')return value.toLocaleString('en-US',{maximumFractionDigits:4})+'×';
 if(typeof value==='object'&&value.numerator!==undefined&&value.denominator!==undefined){const n=Number(value.numerator),d=Number(value.denominator);return Number.isFinite(n)&&Number.isFinite(d)&&d>0?(n/d).toLocaleString('en-US',{maximumFractionDigits:5})+'×':String(value.numerator)+' / '+String(value.denominator)+'×';}
 return String(value)+'×';
}
function showRules(){
 if(!game)return;ui.rulesTitle.textContent=game.name;const box=ui.rulesContent;box.replaceChildren();
 box.append(element('p',game.featureDescription||'Choose a stake to start a round.'));
 const family=displayFamily(game),steps=family==='mines'?['Choose your total stake and the number of mines before starting.','Reveal a tile. A coin increases your available collect value; a mine ends the round.','Collect the confirmed value whenever collection is available.']:game.id==='towerrush_native'?['Choose your total stake and start the tower.','Build the next floor to continue the round. A failed floor ends the attempt.','Collect the displayed value while the round is active.']:family==='tower'?['Choose your total stake. It covers the entire building sequence.','The buildings and their multipliers are revealed automatically.','The completed sequence settles once. No additional stake is taken for its animation.']:['Choose your total stake, then press Spin.','Winning symbols and combinations are highlighted when the result arrives.','Triggered bonus or rolling reel sequences are included in this round. Their animations never place additional wagers.'];
 const list=element('ul');steps.forEach(step=>list.append(element('li',step)));box.append(list);
 const supplied=providedRules(game);if(supplied.length){box.append(element('h3','Game rules'));const rules=element('ul');supplied.forEach(rule=>rules.append(element('li',rule)));box.append(rules);}
 if(game.id==='towerrush_native')box.append(element('p','Banked funds survive a floor collapse. The amount marked At risk is exposed to the next floor. Collect pays the full confirmed value, including banked funds.'));
 if(game.controls?.baseUnitsPerStake)box.append(element('p','One total stake contains '+game.controls.baseUnitsPerStake+' base units. Building multipliers apply to one base unit, not to the full stake.'));
 if(game.ways)box.append(element('p',game.ways+' ways. Matching symbols are evaluated according to the current game rules.'));else if(game.paylines)box.append(element('p',game.paylines+' fixed paylines. The stake shown is the total stake.'));
 if(game.minStake&&game.maxStake)box.append(element('p','Stake range: '+formatMoney(game.minStake)+'–'+formatMoney(game.maxStake)+' ETB.'));
 const symbols=game.symbols||[];if(symbols.length){box.append(element('h3','Symbols'));const legend=element('div',undefined,'symbol-key');symbols.forEach(symbol=>{const item=element('div'),canvas=element('canvas');canvas.width=84;canvas.height=74;canvas.style.width='42px';canvas.style.height='37px';canvas.style.margin='0 auto 6px';drawSymbol(canvas.getContext('2d'),symbol,42,37,63,themeKind(game));item.append(canvas,document.createTextNode(symbol.label));legend.append(item);});box.append(legend);}
 const paytable=Array.isArray(game.paytable)?game.paytable:game.paytable&&typeof game.paytable==='object'?Object.entries(game.paytable).map(([symbol,counts])=>({symbol,counts})):[];
 if(paytable.length){
  box.append(element('h3','Paytable'));if(game.math?.payoutBasis)box.append(element('p',String(game.math.payoutBasis)));const bases=[...new Set(paytable.map(entry=>entry.basis).filter(Boolean))];for(const basis of bases)box.append(element('p','Payout basis: '+basis+'.'));
  const counts=[...new Set(paytable.flatMap(row=>Object.keys(row.counts||row.pays||{})))].sort((a,b)=>Number(a)-Number(b));
  const table=element('table'),thead=element('thead'),head=element('tr');head.append(element('th','Symbol'));counts.forEach(count=>head.append(element('th',count+' match')));thead.append(head);table.append(thead);const body=element('tbody');
  for(const entry of paytable){const row=element('tr'),symbol=symbols.find(item=>item.id===entry.symbol);row.append(element('td',symbol?.label||entry.symbol));counts.forEach(count=>row.append(element('td',coefficient((entry.counts||entry.pays||{})[count]))));body.append(row);}table.append(body);box.append(table);
 }
 if(game.math){box.append(element('h3','Payout rules'));for(const key of ['description','evaluation','rounding','maximumWinDescription','probabilitiesDescription'])if(game.math[key])box.append(element('p',String(game.math[key])));}
 box.append(element('h3','Your account & connection'));box.append(element('p','The balance and each payout are confirmed by your ZPLAY player account. If confirmation is interrupted, use Retry to confirm the same action. Starting a new round stays paused until that action is resolved.'));
 box.append(element('p','This is an independent ZPLAY game with its own payout model. The rules and paytable shown here apply to this machine.'));
 if(currentState?.round){box.append(element('h3','Current round'));box.append(element('p',currentState.round.round_id,'round-reference'));if(currentState.round.commitment)box.append(element('p','Commitment: '+currentState.round.commitment,'round-reference'));}
 ui.rulesDialog.showModal();
}
ui.play.addEventListener('click',()=>{if(!session?.canStart()||animation||autoplay.snapshot().active)return;tone('start');const options=game.controls?.mines?{mines:Number(ui.mines.value)}:{};void session.start(ui.stake.value,options);});
ui.step.addEventListener('click',()=>{if(session?.canAct('step')){tone('pick');void session.act('step');}});
ui.cashout.addEventListener('click',()=>{if(session?.canAct('cashout'))void session.act('cashout');});
for(let i=0;i<25;i++){const button=document.createElement('button');button.type='button';button.disabled=true;button.textContent=String(i+1);button.setAttribute('aria-label','Tile '+(i+1)+', unrevealed');button.addEventListener('click',()=>{if(session?.canAct('pick')){tone('pick');void session.act('pick',{index:i});}});ui.mineGrid.append(button);}
ui.minus.addEventListener('click',()=>{if(!ui.stake.disabled&&ui.stake.selectedIndex>0){ui.stake.selectedIndex--;drawState(currentState);}});
ui.plus.addEventListener('click',()=>{if(!ui.stake.disabled&&ui.stake.selectedIndex<ui.stake.options.length-1){ui.stake.selectedIndex++;drawState(currentState);}});
ui.stake.addEventListener('change',()=>{if(currentState)drawState(currentState);});
ui.refresh.addEventListener('click',()=>{if(session?.pending)void session.retry();else if(session)void session.refresh();});
ui.skip.addEventListener('click',()=>{animation=null;if(currentState)drawState(currentState);});
ui.help.addEventListener('click',showRules);ui.closeRules.addEventListener('click',()=>ui.rulesDialog.close());
ui.rulesDialog.addEventListener('click',event=>{if(event.target===ui.rulesDialog){const r=ui.rulesDialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)ui.rulesDialog.close();}});
ui.sound.addEventListener('click',()=>{soundEnabled=!soundEnabled;ui.sound.setAttribute('aria-pressed',String(!soundEnabled));ui.sound.setAttribute('aria-label',soundEnabled?'Mute sound':'Enable sound');ui.sound.lastChild.textContent=soundEnabled?' Sound':' Muted';if(soundEnabled)tone('pick');});
ui.fullScreen.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{ui.fullScreen.hidden=true;}});
if(!document.documentElement.requestFullscreen)ui.fullScreen.hidden=true;
window.addEventListener('resize',resize);if(typeof ResizeObserver==='function')new ResizeObserver(resize).observe(ui.stage);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&session)void session.refresh({quiet:true});});
window.addEventListener('online',()=>{if(session)void session.refresh({quiet:true});});
window.addEventListener('offline',()=>{autoplay.stop('disconnected');if(currentState)drawState(currentState);});
window.addEventListener('pagehide',()=>autoplay.stop('page-left'));
async function boot(){
 try{
  if(!/^[a-z0-9_]{1,64}$/.test(gameId))throw Error('Game not found');
  const response=await fetch('/native-library/expansion/r1/games.json',{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw Error('Game list unavailable');
  const games=await response.json();if(!Array.isArray(games))throw Error('Game list unavailable');
  const found=games.find(item=>item.id===gameId);if(!found)throw Error('This game is still being prepared');
  session=new ExpansionSession({gameId,storage:storage(),onChange:drawState});bindPlayerEvents(window,session);session.setGame(found);await session.refresh();
  requestAnimationFrame(animate);
  setInterval(()=>{if(!session.state.busy&&document.visibilityState==='visible'&&Date.now()-lastRefresh>(session.state.round?.status==='active'?1800:6000)){lastRefresh=Date.now();void session.refresh({quiet:true});}},1000);
 }catch(error){ui.gameTitle.textContent='Game unavailable';ui.notice.textContent=error.message+'. Return to the lobby and try again.';ui.notice.classList.add('error');ui.accountLink.hidden=false;ui.playLabel.textContent='UNAVAILABLE';ui.connection.lastElementChild.textContent='Offline';}
}
void boot();
