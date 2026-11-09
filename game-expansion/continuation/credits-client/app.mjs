import {ExpansionSession,formatMoney,fromMinor,moneyMinor,getRoundActions,bindPlayerEvents} from './session.mjs';
import {MachineScene,themeKind,frameList,featureLabel,displayFamily,gridGeometry,drawSymbol,presentationFrame,providedRules,confirmedTowerAmounts} from './scene.mjs';
import {stakeChoices,mineChoices,selectedChoice} from './controls.mjs';
import {AutoplayController,autoplayProfile} from './autoplay.mjs';
import {roundRequest,paidMode} from './machine-options.mjs';
import {SpinHold} from './spin-hold.mjs';
import {ReferencePresentationHost} from './reference-presentation.mjs';
import {smartSoftWinTier} from './presentation/smartsoft-native-presentation.mjs';
import {availableCoinTiles,selectCoinRandomTile,isCoinRandomSelectionCurrent} from './coin-random.mjs';
import {SmartSoftStartup} from './smartsoft-startup.mjs';
import {mountSmartSoftHelp,supportsSmartSoftHelp} from './smartsoft-help.mjs';
import {mountCoinHelp} from './coin-help.mjs';
import {SmartSoftDialogs} from './smartsoft-dialogs.mjs';
import {usesSmartSoftWide,smartSoftWideSize} from './presentation/smartsoft-wide-layout.mjs';
import {isRemainingLegacy} from './presentation/smartsoft-remaining7-wide.mjs';
import {createDemoMode,mountDemoNotice} from './demo-mode.mjs';
import {supportsBurningIcePair,burningIcePairWagerView,createBurningIcePairIntent,resolveBurningIcePairIntent} from './burningice-wager-actions.mjs';
const demoMode=createDemoMode(),displayCurrency=demoMode.currency,gameFetch=demoMode.fetch;
mountDemoNotice(document,demoMode);
const $=id=>document.getElementById(id);
const ui=Object.fromEntries(['machineShell','headerTitle','wallet','gameCategory','gameTitle','connection','featureDescription','stage','scene','presentationNote','mineGrid','sequenceBadge','resultLabel','result','roundCaption','roundDetail','stake','stakeLabel','stakeRange','minus','plus','mines','mineOptions','play','playLabel','activeActions','step','cashout','cashoutAmount','riskSummary','bankedAmount','riskAmount','skip','notice','accountLink','otherGame','help','sound','refresh','playNote','footerGame','fullScreen','rulesDialog','rulesTitle','rulesContent','closeRules','autoplay','autoplayDialog','closeAutoplay','autoplayForm','autoplayCount','autoplayWinRow','autoplayWin','autoplayLoss','autoplayGain','autoplayFeatureStops','autoplayBonus','autoplayFreeSpins','autoplayBigWin','autoplayError','startAutoplay','autoplayRunning','autoplayStatus','stopAutoplay'].map(id=>[id,$(id)]));
for(const node of document.querySelectorAll('[id]'))ui[node.id]??=node;
const gameId=location.pathname.split('/').filter(Boolean).at(-1)||'';
const scene=new MachineScene(ui.scene);
const referenceScene=new ReferencePresentationHost(scene.ctx,{origin:location.origin});
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let session=null,game=null,currentState=null,configSignature='',soundEnabled=true,audioContext=null,animation=null,seenRound='',lastDraw=0,lastRefresh=0;
let presentationFailed=false,presentationReady=true,presentationKey='',presentationSequence=0,pageSuspended=false,configuredReferenceKey='',explicitRefreshPending=false;
const autoplay=new AutoplayController();let autoplayQueued=false,turboEnabled=false,musicEnabled=true,requestingSpin=false,requestedPreviousRound='',historyEpoch=0,hold=null;
const nativeButtons=new Map();
let pairWagerView=null;
let nativeHelpView=null,lastWinPresentationRunning=false;
let dialogEpoch=0;
let pendingCoinPick=null;
let coinBetView=null,coinBetIdentity='',coinMenuView=null,coinMenuIdentity='';
function disposeCoinMenu(){coinMenuView?.dispose();coinMenuView=null;coinMenuIdentity='';}
function disposeCoinBet(){coinBetView?.dispose();coinBetView=null;coinBetIdentity='';}
const nativeDialogs=new SmartSoftDialogs({gameId,document,currency:displayCurrency,getResources:()=>({manifest:referenceScene.manifest,store:referenceScene.store}),onSound:event=>referenceScene.playSound(event)});
const startup=new SmartSoftStartup({gameId,document,onChoice:value=>applySoundChoice(value,{prime:true}),onChange:()=>{if(currentState)drawState(currentState);},onTimeout:()=>{if(currentState&&!currentState.error)ui.notice.textContent='Game artwork is taking longer to load. Use Refresh to retry.';}});
if(startup.active){soundEnabled=false;referenceScene.setAudio({sound:false,music:musicEnabled});}
const clock=()=>performance.now();
const usesReference=()=>!!game?.referencePresentation;
const canStartVisible=()=>startup.allowsStart()&&!requestingSpin&&!pageSuspended&&!explicitRefreshPending&&session?.canStart()===true&&currentState?.connected===true&&(!usesReference()||presentationReady);
const canActVisible=action=>!pageSuspended&&currentState?.connected===true&&session?.canAct(action)===true&&!animation&&(action==='cashout'||action==='collect'||!explicitRefreshPending&&(!usesReference()||presentationReady));
const referenceBindingKey=value=>JSON.stringify([value?.id,value?.version,value?.referencePresentation,value?.columns,value?.rows,Array.isArray(value?.symbols)?value.symbols.map(symbol=>[String(symbol?.id),symbol?.providerSymbolId]):null]);
function storage(){try{return window.sessionStorage;}catch{return null;}}
function tone(type){
 if(!soundEnabled)return;if(usesReference()){
  const round=currentState?.round;
  const winCue=type==='win'?smartSoftWinTier(game?.id,round?.baseWinMinor??round?.payoutMinor,round?.stakeMinor)?.cue:null;
  void referenceScene.playSound(type==='start'?'spin-start':type==='win'?winCue??'win':type==='pick'?'pick':'button');return;
 }
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  audioContext??=new Audio();if(audioContext.state==='suspended')void audioContext.resume();
  const base=type==='win'?620:type==='pick'?800:330,t=audioContext.currentTime;
  for(let i=0;i<(type==='win'?3:1);i++){const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.setValueAtTime(base*(1+i*.25),t+i*.075);gain.gain.setValueAtTime(.035,t+i*.075);gain.gain.exponentialRampToValueAtTime(.0001,t+.18+i*.075);osc.connect(gain);gain.connect(audioContext.destination);osc.start(t+i*.075);osc.stop(t+.2+i*.075);}
 }catch{/* Sound cannot affect an action. */}
}
function option(value,label){const element=document.createElement('option');element.value=value;element.textContent=label??value;return element;}
function configure(next){
 if(coinMenuView&&coinMenuIdentity!==JSON.stringify([currentState?.sessionId,next.id,next.version])){disposeCoinMenu();closeGameDialogs();}
 if(coinBetView&&coinBetIdentity!==JSON.stringify([currentState?.sessionId,next.id,next.version,next.stakeValues,next.controls?.mines])){disposeCoinBet();closeGameDialogs();}
 const nextReferenceKey=referenceBindingKey(next),changed=configuredReferenceKey!==nextReferenceKey;
 configuredReferenceKey=nextReferenceKey;
 game=next;scene.setGame(game);ui.gameTitle.textContent=game.name;ui.headerTitle.textContent=game.name;ui.footerGame.textContent=game.name;document.title=game.name+' · ZPLAY';
 referenceScene.setGame(game);
 const wide=usesReference()&&usesSmartSoftWide(game.id,window.innerWidth,window.innerHeight);
 document.body.className='theme-'+themeKind(game)+(usesReference()?' reference-art':'')+(game.id==='coinminer_native'&&usesReference()?' coin-reference':'')+(wide?' new-smartsoft-wide':'')+(referenceScene.lastPaint?.scene.controlsGeometry?' integrated-reference':'');
 const nativeSize=wide?smartSoftWideSize(game.id):game.id==='coinminer_native'?(window.innerWidth>window.innerHeight?{width:640,height:360}:{width:360,height:640}):referenceScene.lastPaint?.scene??{width:420,height:900};
 document.documentElement.style.setProperty('--reference-aspect',nativeSize.width+' / '+nativeSize.height);
 document.documentElement.style.setProperty('--reference-ratio',String(nativeSize.width/nativeSize.height));
 ui.sound.hidden=false;configureOptions(game);
 ui.gameOptions.hidden=usesReference()||!(game.controls?.risk||game.controls?.lines||game.controls?.paidModes);
 ui.turbo.hidden=!usesReference()||displayFamily(game)!=='slots';
 for(const [key,value]of Object.entries(game.theme||{}))if(['bg','accent','secondary'].includes(key)&&/^#[a-f\d]{6}$/i.test(value))document.documentElement.style.setProperty('--'+key,value);
 const family=displayFamily(game);ui.gameCategory.textContent='ZPLAY · '+(family==='tower'?'SKYLINE SERIES':family==='mines'?'COIN VAULT':game.ways?'ROLLING REELS':game.columns===6?'LEGENDS SERIES':'SLOT COLLECTION');
 ui.featureDescription.textContent=String(game.featureDescription||'Choose your stake to start a round.').slice(0,210);
 ui.stakeLabel.textContent=game.controls?.paidModes?'Base stake ('+displayCurrency+')':game.controls?.stakeLabel||'Total stake ('+displayCurrency+')';
 const sig=JSON.stringify([game.id,game.version,game.minStake,game.maxStake,game.stakeValues,game.stakes,game.controls,ui.gameMode.value]);
 if(sig!==configSignature){
  const previous=ui.stake.value,min=moneyMinor(game.minStake),max=moneyMinor(game.maxStake);
  const mode=paidMode(game,ui.gameMode.value||'base');const choices=stakeChoices(game).filter(value=>{const amount=moneyMinor(value);return (!mode?.baseMinMinor||amount>=BigInt(mode.baseMinMinor))&&(!mode?.baseMaxMinor||amount<=BigInt(mode.baseMaxMinor));});
  ui.stake.replaceChildren(...choices.map(value=>option(value,formatMoney(value)+' '+displayCurrency)));ui.stake.value=selectedChoice(choices,previous,game.defaultStake);
  ui.stakeRange.textContent=mode?.baseMinMinor&&mode?.baseMaxMinor?fromMinor(mode.baseMinMinor)+'–'+fromMinor(mode.baseMaxMinor)+' base':min!==null&&max!==null?formatMoney(game.minStake)+'–'+formatMoney(game.maxStake):'';
  if(game.controls?.mines){const options=game.controls.mines,chosen=ui.mines.value,values=mineChoices(options);ui.mines.replaceChildren(...values.map(value=>option(value)));ui.mines.value=selectedChoice(values,chosen,options.default||3);}
  configSignature=sig;
 }
 ui.mineOptions.hidden=family!=='mines';ui.mineGrid.hidden=family!=='mines';
 ui.playNote.textContent=family==='mines'?'Reveal a safe tile, then continue or collect. A mine ends the round.':game.id==='towerrush_native'?'Build the next floor or collect your confirmed win.':game.controls?.baseUnitsPerStake?'The displayed stake is the total cost of the building sequence.':'Each play starts one round. Bonus sequences complete within that round.';
 if(changed){presentationFailed=false;presentationKey='';presentationSequence++;presentationReady=!usesReference();scene.resize();referenceScene.resize(scene.width,scene.height);}
 positionMineGrid();renderCost();
}
function beginSequence(round){
 const frames=frameList(round);
 if(reducedMotion){animation=null;referenceScene.cancelMotion();return;}
 if(usesReference()&&referenceScene.motion?.running){animation={roundId:round.round_id,frames,index:frames.length?0:null,reference:true,awaiting:false,completedAt:null};return;}
 if(!frames.length){animation=null;return;}
 const duration=turboEnabled?150:game?.id==='towerx_native'?900:Math.max(300,Math.min(800,20000/frames.length));
 animation={roundId:round.round_id,frames,index:0,next:clock()+duration,duration};
}

function drawState(state){
 if(pendingCoinPick&&(state.sessionId!==pendingCoinPick.sessionId||state.round?.round_id!==pendingCoinPick.roundId||state.round?.model_version!==pendingCoinPick.modelVersion||state.round?.version!==pendingCoinPick.version||state.connected!==true||state.error===true))pendingCoinPick=null;
 const priorSession=currentState?.sessionId;currentState=state;if(priorSession&&priorSession!==state.sessionId){animation=null;referenceScene.cancelMotion();hold?.stop();autoplay.stop('session-change');historyEpoch++;ui.historyContent.replaceChildren();closeGameDialogs();}
 if(state.game)configure(state.game);
 const round=state.round,active=round?.status==='active',settled=round?.status==='settled',key=round?round.round_id+':'+round.version:'';
 // The accepted active receipt owns the locked BET display, including reload.
 // Settled results preserve the player's choice for the next wager.
 if(active&&["multihotwildways_native","multihot5wild_native","multihot5superwilds_native","multihotdeluxe_native","burningice_native","burningice10_native","burningice40_native"].includes(game?.id)&&round.game_id===game.id&&typeof round.stakeMinor==='string'&&/^[1-9]\d*$/.test(round.stakeMinor)){
  const acceptedStake=BigInt(round.stakeMinor),acceptedOption=[...ui.stake.options].find(item=>moneyMinor(item.value)===acceptedStake);
  if(acceptedOption&&ui.stake.value!==acceptedOption.value){ui.stake.value=acceptedOption.value;renderCost();}
 }
 if(key!==seenRound){
  if(requestingSpin&&round&&round.round_id!==requestedPreviousRound){beginSequence(round);}
  else if(!requestingSpin&&animation?.roundId!==round?.round_id){animation=null;referenceScene.cancelMotion();}
  seenRound=key;
 }
 drawReference();
 startup.sync(state,{ready:presentationReady,failed:presentationFailed,suspended:pageSuspended,progress:referenceScene.startupProgress?.()});
 autoplay.observe({...state,canStart:canStartVisible(),animationRunning:!!animation||referenceScene.isWinPresentationRunning()});
 const automatic=autoplay.snapshot(),profile=autoplayProfile(game?.id);
 ui.wallet.textContent=formatMoney(state.balance);ui.wallet.title=state.balance===null?'Sign in to see your balance':formatMoney(state.balance)+' '+displayCurrency;
 ui.connection.classList.toggle('online',state.connected&&state.authenticated);ui.connection.lastElementChild.textContent=state.connected?'Connected':state.authenticated?'Disconnected':'Sign in';
 const actions=getRoundActions(round,state.game),hasStep=actions.includes('step'),hasCashout=actions.includes('cashout');
 ui.play.hidden=active&&!actions.includes('collect');ui.play.disabled=animation?.reference?false:(!canStartVisible()&&!canActVisible('collect'))||!!animation||automatic.active;ui.play.setAttribute('aria-busy',String(state.busy));
 ui.playLabel.textContent=animation?.reference?'STOP':state.busy?'CONFIRMING':state.pending?'CONFIRM ACTION':animation?'RESULT SEQUENCE':!state.authenticated?'SIGN IN TO PLAY':!state.accepting?'PAUSED':active&&actions.includes('collect')?'TAKE WIN & SPIN':displayFamily(game)==='tower'?'BUILD':displayFamily(game)==='mines'?'START ROUND':'SPIN';
 ui.activeActions.hidden=!active||!(hasStep||hasCashout);ui.step.hidden=!hasStep;ui.cashout.hidden=!hasCashout;ui.step.disabled=!canActVisible('step');ui.cashout.disabled=!canActVisible('cashout');ui.cashoutAmount.textContent=fromMinor(round?.currentCashoutMinor)+' '+displayCurrency;
 const towerAmounts=confirmedTowerAmounts(round);ui.riskSummary.hidden=game?.id!=='towerrush_native'||!active;ui.bankedAmount.textContent=towerAmounts.banked+' '+displayCurrency;ui.riskAmount.textContent=towerAmounts.atRisk+' '+displayCurrency;
 if(automatic.active&&!state.busy&&!animation)ui.playLabel.textContent='AUTOPLAY';
 const stakeLocked=!startup.allowsStart()||active||state.busy||state.pending||state.confirming||state.recoveryBlocked||!state.authenticated||!!animation||automatic.active;
 ui.stake.disabled=stakeLocked;ui.minus.disabled=stakeLocked||ui.stake.selectedIndex<=0;ui.plus.disabled=stakeLocked||ui.stake.selectedIndex>=ui.stake.options.length-1;ui.mines.disabled=stakeLocked;
 ui.resultLabel.textContent=active?'TAKE WIN':'LAST WIN';ui.result.textContent=active?fromMinor(round.currentCashoutMinor):settled?fromMinor(round.payoutMinor):'—';
 ui.roundCaption.textContent=state.pending?'Confirmation needed':state.busy?'Confirming action…':active?'Round in progress':settled?'Round settled':state.authenticated?'Ready when you are':'Sign in to play';
 ui.roundDetail.textContent=active?(displayFamily(game)==='mines'?'Choose a tile or collect your win.':displayFamily(game)==='tower'?'Build another floor or collect.':'Take your win or choose Double when offered.') :settled?(featureLabel(round.feature)||'Payout credited to your player balance.'):game?.launchable===false?'This game is being prepared.':'Your balance comes from your player account.';
 ui.notice.textContent=state.message;ui.notice.classList.toggle('error',state.error);ui.accountLink.hidden=state.authenticated;ui.otherGame.hidden=!state.otherActiveGame;
 if(state.otherActiveGame)ui.otherGame.href=/^[a-z0-9_]{1,64}$/.test(state.otherActiveGame)?(demoMode.active?'/demo/games/':'/games/')+state.otherActiveGame:'/';
 ui.refresh.disabled=state.busy||explicitRefreshPending;ui.refresh.classList.toggle('retry',state.pending);ui.refresh.replaceChildren();const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent='↻';ui.refresh.append(icon,document.createTextNode(state.pending?'Retry':'Refresh'));
 ui.skip.hidden=!animation;ui.sequenceBadge.hidden=!animation||animation.awaiting||animation.frames.length<2;if(animation&&!animation.awaiting)ui.sequenceBadge.textContent='RESULT '+((animation.index??0)+1)+' / '+Math.max(1,animation.frames.length);
 syncWinControls();
 const picks=new Map((round?.picks||[]).map(pick=>[pick.index,pick]));
 [...ui.mineGrid.children].forEach((button,index)=>{const pick=picks.get(index);button.disabled=!!pick||!canActVisible('pick');button.textContent=pick?'':String(index+1);button.setAttribute('aria-label','Tile '+(index+1)+(pick?pick.safe?', coin revealed':', mine revealed':', unrevealed'));button.setAttribute('aria-pressed',String(!!pick));});
 ui.scene.setAttribute('aria-label',round?(game.name+'. '+(active?'Active round.': 'Settled round. Payout '+fromMinor(round.payoutMinor)+' '+displayCurrency+'.')+' '+featureLabel(round.feature)):game?.name+'. Symbol preview. No round has been played.');
 ui.autoplay.hidden=!profile;ui.autoplay.disabled=automatic.active||!canStartVisible()||!!animation;
 ui.autoplayRunning.hidden=!automatic.active;
 ui.autoplayStatus.textContent=automatic.count==='continuous'?automatic.completed+' spins completed':automatic.remaining+' spins remaining';
 coinBetView?.sync();
 syncNativeControls();
 queueAutoplay();
}

function automaticState(){return {...currentState,canStart:canStartVisible(),animationRunning:!!animation||referenceScene.isWinPresentationRunning()};}
function queueAutoplay(){
 if(requestingSpin||autoplayQueued||!currentState||!autoplay.canLaunch(automaticState()))return;
 autoplayQueued=true;
 queueMicrotask(async()=>{
  autoplayQueued=false;if(requestingSpin||!session||!autoplay.canLaunch(automaticState()))return;
  const value=BigInt(autoplay.snapshot().stakeMinor),stake=`${value/100n}.${String(value%100n).padStart(2,'0')}`;
  if(!autoplay.markSubmitted(currentState.round?.round_id??null))return;
  const confirmed=await startRound({automatic:true,stake});
  if(!confirmed){autoplay.stop('submission-not-confirmed');if(currentState)drawState(currentState);}
 });
}

async function openAutoplay(){
 const profile=autoplayProfile(game?.id);if(!profile||!canStartVisible()||animation||autoplay.snapshot().active)return;
 closeGameDialogs();const epoch=dialogEpoch,owner=currentState.sessionId,model=game.version;
 ui.autoplayCount.replaceChildren(...profile.counts.map(value=>option(String(value),value==='continuous'?'Continuous':value+' spins')));
 ui.autoplayCount.value=String(profile.defaultCount);
 ui.autoplayWinRow.hidden=profile.kind!=='modern';
 ui.autoplayFeatureStops.hidden=!profile.stopFlagsAvailable;
 for(const [flag,input]of [['bonus',ui.autoplayBonus],['freeSpins',ui.autoplayFreeSpins],['bigWin',ui.autoplayBigWin]])input.closest('label').hidden=!profile.referenceStopFlags.includes(flag);
 for(const input of [ui.autoplayWin,ui.autoplayLoss,ui.autoplayGain])input.value='';
 for(const input of [ui.autoplayBonus,ui.autoplayFreeSpins,ui.autoplayBigWin])input.checked=false;
 ui.autoplayError.hidden=true;if(nativeDialogs.profile)await nativeDialogs.prepare('auto');
 if(epoch!==dialogEpoch||pageSuspended||document.visibilityState==='hidden'||currentState.sessionId!==owner||game.version!==model||!canStartVisible()||animation||autoplay.snapshot().active)return;
 ui.autoplayDialog.showModal();
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
 if(!profile||!canStartVisible()||animation||autoplay.snapshot().active)return;
 try{
  const stake=moneyMinor(ui.stake.value),balance=moneyMinor(currentState.balance);
  if(stake===null||balance===null)throw Error('Refresh your balance before starting autoplay.');
  autoplay.begin({gameId:game.id,modelVersion:game.version,sessionId:currentState.sessionId,stakeMinor:String(stake),count:ui.autoplayCount.value==='continuous'?'continuous':Number(ui.autoplayCount.value),startingBalanceMinor:String(balance),previousRoundId:currentState.round?.round_id??null,winLimitMinor:profile.kind==='modern'?autoplayLimit(ui.autoplayWin,moneyMinor(game.maxWin)):null,lossLimitMinor:autoplayLimit(ui.autoplayLoss,balance),gainLimitMinor:autoplayLimit(ui.autoplayGain,profile.kind==='modern'?stake*3000n:null),stopOnBonus:profile.stopFlagsAvailable&&ui.autoplayBonus.checked,stopOnFreeSpins:profile.stopFlagsAvailable&&ui.autoplayFreeSpins.checked,stopOnBigWin:profile.stopFlagsAvailable&&ui.autoplayBigWin.checked});
  ui.autoplayDialog.close();drawState(currentState);
 }catch(error){ui.autoplayError.textContent=error.message;ui.autoplayError.hidden=false;}
});
function drawReference(){
 if(!usesReference()){presentationReady=true;ui.presentationNote.hidden=true;return;}
 if(pageSuspended){presentationReady=false;return;}
 const state=currentState;if(!state)return;
 const key=JSON.stringify([configuredReferenceKey,state.sessionId,state.connected,state.authenticated,state.error,state.balance,state.currency,state.round?.round_id,state.round?.model_version,state.round?.version,state.round?.status,state.pending,state.busy,animation?.index??null,!!animation,ui.stake.value,ui.mines.value,soundEnabled,autoplay.snapshot().active,scene.width,scene.height,pendingCoinPick]);
 if(key===presentationKey)return;
 presentationKey=key;const sequence=++presentationSequence;presentationReady=false;
 ui.presentationNote.hidden=!state.connected||!state.authenticated||state.error;
 ui.presentationNote.textContent='Loading game artwork…';positionMineGrid();
 void referenceScene.draw(state,{frameIndex:animation?.index??null,selectedStake:requestValue()?.stake??ui.stake.value,mines:ui.mines.value||undefined,soundEnabled,autoplayActive:autoplay.snapshot().active,animating:!!animation,width:scene.width,height:scene.height,pendingCoinPick,...(isRemainingLegacy(game.id)?{remainingLegacyWager:{nextStake:ui.stake.options[ui.stake.selectedIndex+1]?.value,previousStake:ui.stake.options[ui.stake.selectedIndex-1]?.value}}:{})}).then(result=>{
  if(sequence!==presentationSequence)return;
  presentationReady=result.status==='painted';
  const unavailable=['error','unsupported','disposed'].includes(result.status);presentationFailed=unavailable;
  ui.presentationNote.hidden=!unavailable;
  if(unavailable||result.status==='unconfirmed'){animation=null;referenceScene.cancelMotion();hold?.stop();}
  if(unavailable){ui.presentationNote.textContent='Game artwork is unavailable. Refresh to try again.';autoplay.stop('presentation_unavailable');}
  positionMineGrid();positionNativeControls(result);
  if(currentState)drawState(currentState);
 });
}
function positionMineGrid(){
 if(!game||displayFamily(game)!=='mines')return;
 if(usesReference()){
  const geometry=presentationReady?referenceScene.getCoinGeometry(scene.width,scene.height):null;
  ui.mineGrid.hidden=!geometry;
  if(!geometry)return;
  Object.assign(ui.mineGrid.style,{display:'block',left:'0px',top:'0px',width:scene.width+'px',height:scene.height+'px',pointerEvents:'none'});
  [...ui.mineGrid.children].forEach((button,index)=>{const cell=geometry.cells[index];Object.assign(button.style,{position:'absolute',left:cell.x+'px',top:cell.y+'px',width:cell.width+'px',height:cell.height+'px',margin:'0px',pointerEvents:'auto'});});
  return;
 }
 ui.mineGrid.hidden=false;ui.mineGrid.style.display='grid';ui.mineGrid.style.pointerEvents='';
 for(const button of ui.mineGrid.children)for(const key of ['position','left','top','width','height','margin','pointerEvents'])button.style[key]='';
 const g=gridGeometry(scene.width,scene.height,5,5,'mines');Object.assign(ui.mineGrid.style,{left:g.x+'px',top:g.y+'px',width:g.w+'px',height:g.h+'px'});
}
function resize(){scene.resize();referenceScene.resize(scene.width,scene.height);presentationKey='';if(currentState)drawState(currentState);else positionMineGrid();}
function animate(time){
 requestAnimationFrame(animate);if(document.visibilityState==='hidden'||time-lastDraw<(reducedMotion?250:30))return;lastDraw=time;
 if(animation?.reference){
  const sample=referenceScene.render(time);
  if(sample?.complete&&!animation.awaiting){
   animation.completedAt??=time;
   if(time-animation.completedAt>=(turboEnabled?100:450)){
    if(animation.index!==null&&animation.index+1<animation.frames.length){
     const previous=animation.frames[animation.index];animation.index++;animation.completedAt=null;
     referenceScene.beginSpin(time,{turbo:turboEnabled,frozenReels:previous?.feature?.frozenReels??previous?.frozenReels??[]});presentationKey='';drawReference();
    }else{animation=null;if(BigInt(currentState?.round?.baseWinMinor??currentState?.round?.payoutMinor??'0')>0n)tone('win');drawState(currentState);hold?.queue();}
   }
  }
 }else if(animation&&time>=animation.next){animation.index++;animation.next=time+animation.duration;if(animation.index>=animation.frames.length){animation=null;drawState(currentState);}else ui.sequenceBadge.textContent='RESULT '+(animation.index+1)+' / '+animation.frames.length;}
 if(usesReference()){drawReference();if(!animation?.reference)referenceScene.render(time);if(['loading','fading'].includes(startup.phase))startup.updateProgress(referenceScene.startupProgress?.(),presentationReady);}
 else scene.draw(reducedMotion?0:time,{round:currentState?.round,busy:currentState?.busy,frame:animation?presentationFrame(currentState?.round,animation.index):null,preview:!currentState?.round});
 const winRunning=referenceScene.isWinPresentationRunning();if(winRunning!==lastWinPresentationRunning){lastWinPresentationRunning=winRunning;if(currentState)drawState(currentState);}
}

function element(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);if(className)node.className=className;return node;}
function coefficient(value){
 if(value===null||value===undefined)return '—';if(typeof value==='number')return value.toLocaleString('en-US',{maximumFractionDigits:4})+'×';
 if(typeof value==='object'&&value.numerator!==undefined&&value.denominator!==undefined){const n=Number(value.numerator),d=Number(value.denominator);return Number.isFinite(n)&&Number.isFinite(d)&&d>0?(n/d).toLocaleString('en-US',{maximumFractionDigits:5})+'×':String(value.numerator)+' / '+String(value.denominator)+'×';}
 return String(value)+'×';
}
function showRules(){
 if(!game)return;ui.rulesTitle.textContent=game.name;const box=ui.rulesContent;box.replaceChildren();
 nativeHelpView?.dispose();nativeHelpView=null;
 if(supportsSmartSoftHelp(game)){
  nativeHelpView=mountSmartSoftHelp({displayCurrency,container:box,game,selectedStake:ui.stake.value,manifest:referenceScene.manifest,store:referenceScene.store});
  ui.rulesDialog.showModal();return;
 }
 if(game.id==='coinminer_native'){
  mountCoinHelp(box,{game,stake:ui.stake.value,mines:Number(ui.mines.value)});
  ui.rulesDialog.showModal();return;
 }
 box.append(element('p',game.featureDescription||'Choose a stake to start a round.'));
 const family=displayFamily(game),steps=family==='mines'?['Choose your total stake and the number of mines before starting.','Reveal a tile. A coin increases your available collect value; a mine ends the round.','Collect the confirmed value whenever collection is available.']:game.id==='towerrush_native'?['Choose your total stake and start the tower.','Build the next floor to continue the round. A failed floor ends the attempt.','Collect the displayed value while the round is active.']:family==='tower'?['Choose your total stake. It covers the entire building sequence.','The buildings and their multipliers are revealed automatically.','The completed sequence settles once. No additional stake is taken for its animation.']:['Choose your total stake, then press Spin.','Winning symbols and combinations are highlighted when the result arrives.','Triggered bonus or rolling reel sequences are included in this round. Their animations never place additional wagers.'];
 const list=element('ul');steps.forEach(step=>list.append(element('li',step)));box.append(list);
 const supplied=providedRules(game);if(supplied.length){box.append(element('h3','Game rules'));const rules=element('ul');supplied.forEach(rule=>rules.append(element('li',rule)));box.append(rules);}
 if(game.id==='towerrush_native')box.append(element('p','Banked funds survive a floor collapse. The amount marked At risk is exposed to the next floor. Collect pays the full confirmed value, including banked funds.'));
 if(game.controls?.baseUnitsPerStake)box.append(element('p','One total stake contains '+game.controls.baseUnitsPerStake+' base units. Building multipliers apply to one base unit, not to the full stake.'));
 if(game.ways)box.append(element('p',game.ways+' ways. Matching symbols are evaluated according to the current game rules.'));else if(game.paylines)box.append(element('p',(game.controls?.lines?'Up to '+game.paylines+' paylines; '+ui.lineCount.value+' selected.':game.paylines+' fixed paylines.')+' The stake shown is the total stake.'));
 if(game.minStake&&game.maxStake)box.append(element('p','Stake range: '+formatMoney(game.minStake)+'–'+formatMoney(game.maxStake)+' '+displayCurrency+'.'));
 const symbols=game.symbols||[];if(symbols.length){box.append(element('h3','Symbols'));const legend=element('div',undefined,'symbol-key');symbols.forEach(symbol=>{const item=element('div');if(!usesReference()){const canvas=element('canvas');canvas.width=84;canvas.height=74;canvas.style.width='42px';canvas.style.height='37px';canvas.style.margin='0 auto 6px';drawSymbol(canvas.getContext('2d'),symbol,42,37,63,themeKind(game));item.append(canvas);}item.append(document.createTextNode(symbol.label));legend.append(item);});box.append(legend);}
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
let optionsKey='';
function configureOptions(config){
 const key=config.id+'@'+config.version;if(key===optionsKey)return;optionsKey=key;
 const modes=config.controls?.paidModes||[{id:'base',label:'Base game',multiplier:1}];
 ui.gameMode.replaceChildren(...modes.map(mode=>option(mode.id==='feature'?'feature:'+mode.feature:mode.id,mode.label+(mode.multiplier>1?' · '+mode.multiplier+'× base bet':''))));
 ui.modeRow.hidden=modes.length<2;
 const lines=config.controls?.lines;ui.linesRow.hidden=!lines;
 ui.lineCount.replaceChildren(...(lines?.values||[]).map(value=>option(value,value+' paylines')));if(lines)ui.lineCount.value=String(lines.default);
 ui.riskRow.hidden=!config.controls?.risk?.supported;ui.riskEnabled.checked=config.controls?.risk?.default===true;
 if((usesReference()||config.id==='coinminer_native')&&ui.stake.parentElement.parentElement!==ui.betContent){
  const heading=ui.stakeLabel.closest('.stake-heading'),control=ui.stake.closest('.stake-control');
  ui.betContent.prepend(heading,control);
 }
 if((usesReference()||config.id==='coinminer_native')&&config.controls?.mines&&ui.mineOptions.parentElement!==ui.betContent)ui.betContent.append(ui.mineOptions);
}
function requestValue({automatic=false,stake=ui.stake.value}={}){try{return roundRequest(game,stake,{mode:ui.gameMode.value,lines:Number(ui.lineCount.value),mines:Number(ui.mines.value),risk:ui.riskEnabled.checked,automatic});}catch{return null;}}
function renderCost(){const request=requestValue();ui.totalCost.textContent=request?'Total cost '+request.stake+' '+displayCurrency+(request.options.mode?' · base bet '+request.baseStake+' '+displayCurrency:''):'Choose a stake within the limits for this mode.';}
function closeGameDialogs(){disposeCoinBet();dialogEpoch++;for(const id of ['menuDialog','betDialog','rulesDialog','gambleDialog','historyDialog','autoplayDialog'])ui[id].close();}
async function openGameDialog(id){
 hold?.stop();closeGameDialogs();const epoch=dialogEpoch,owner=currentState?.sessionId,kind=id==='betDialog'?'bet':id==='gambleDialog'?'gamble':null;
 if(kind&&nativeDialogs.profile)await nativeDialogs.prepare(kind);
 if(epoch!==dialogEpoch||pageSuspended||document.visibilityState==='hidden'||currentState?.sessionId!==owner)return;
 if(kind==='bet'&&game?.id==='coinminer_native'){
  const model=game.version,modelId=game.id;
  try{
   const {mountCoinBetHost}=await import('./coin-bet-host.mjs');
   if(epoch!==dialogEpoch||pageSuspended||document.visibilityState==='hidden'||currentState?.sessionId!==owner||game.version!==model||game.id!==modelId)return;
   ui[id].showModal();
   coinBetIdentity=JSON.stringify([owner,game.id,game.version,game.stakeValues,game.controls?.mines]);
   coinBetView=mountCoinBetHost({game,ui,document,window,getSelection:()=>({...currentState,gameId:game.id,modelVersion:game.version,stake:ui.stake.value,mines:Number(ui.mines.value),active:currentState?.round?.status==='active',confirmed:!pageSuspended&&!explicitRefreshPending&&!requestingSpin&&!animation&&!autoplay.snapshot().active&&startup.allowsStart()&&!presentationFailed})});
  }catch{disposeCoinBet();ui[id].close();ui.notice.textContent='Bet controls are unavailable. Refresh and try again.';}
  return;
 }
 if(id==='menuDialog'&&game?.id==='coinminer_native'){
  const model=game.version,modelId=game.id;
  try{
   const {mountCoinMenuGlyphs}=await import('./coin-menu-host.mjs');
   if(epoch!==dialogEpoch||pageSuspended||document.visibilityState==='hidden'||currentState?.sessionId!==owner||game.version!==model||game.id!==modelId)return;
   coinMenuIdentity=JSON.stringify([owner,game.id,game.version]);coinMenuView??=mountCoinMenuGlyphs({ui,document,soundEnabled});coinMenuView.sync({soundEnabled});
  }catch{/* Decorative glyph loading cannot disable the existing text menu. */}
  if(epoch!==dialogEpoch||pageSuspended||document.visibilityState==='hidden'||currentState?.sessionId!==owner||game.version!==model||game.id!==modelId)return;
 }
 if(kind==='gamble')syncWinControls();ui[id].showModal();
}
async function startRound({automatic=false,holding=false,stake=ui.stake.value}={}){
 if(animation?.reference){referenceScene.speedUp();return false;}
 if(requestingSpin||pageSuspended||document.visibilityState==='hidden'||animation||!automatic&&autoplay.snapshot().active)return false;
 if(holding&&!hold?.active)return false;
 const owner=currentState?.sessionId,version=game?.version;
 if(canActVisible('collect')){const collected=await session.act('collect');if(!collected)return false;}
 if(!canStartVisible()||document.visibilityState==='hidden'||holding&&!hold?.active||automatic&&!autoplay.snapshot().active||!automatic&&autoplay.snapshot().active||currentState.sessionId!==owner||game.version!==version)return false;
 let request;try{request=roundRequest(game,stake,{mode:ui.gameMode.value,lines:Number(ui.lineCount.value),mines:Number(ui.mines.value),risk:ui.riskEnabled.checked,automatic});}catch(error){ui.notice.textContent=error.message;return false;}
 if(moneyMinor(currentState.balance)<BigInt(request.totalMinor)){ui.notice.textContent='Your balance is below the total cost.';return false;}
 closeGameDialogs();void referenceScene.unlockAudio();requestedPreviousRound=currentState.round?.round_id??'';requestingSpin=true;
 if(usesReference()&&!reducedMotion&&referenceScene.beginSpin(clock(),{turbo:turboEnabled,afterRoundId:currentState.round?.round_id??''}))animation={reference:true,awaiting:true,roundId:null,index:null,frames:[],completedAt:null};
 else tone('start');
 drawState(currentState);
 const confirmed=await session.start(request.stake,request.options);requestingSpin=false;
 if(!confirmed){animation=null;referenceScene.cancelMotion();autoplay.stop('unconfirmed-round');}
 if(currentState)drawState(currentState);return confirmed;
}
function syncWinControls(){
 const round=currentState?.round,actions=getRoundActions(round,game),hasCollect=actions.includes('collect'),hasGamble=actions.includes('gamble');
 ui.winActions.hidden=!hasCollect&&!hasGamble;ui.collect.hidden=!hasCollect;ui.gamble.hidden=!hasGamble;
 ui.collect.disabled=!canActVisible('collect');ui.gamble.disabled=!canActVisible('gamble');
 ui.collect.textContent='TAKE WIN · '+fromMinor(round?.currentCashoutMinor)+' '+displayCurrency;
 if(supportsBurningIcePair(game?.id))ui.collect.setAttribute('aria-label','Take confirmed win');
 const collectAction=hasCollect?'collect':'cashout';ui.gambleCollect.disabled=!canActVisible(collectAction);
 ui.red.disabled=ui.black.disabled=!canActVisible('gamble');
 ui.gambleWin.textContent=fromMinor(round?.status==='active'?round.currentCashoutMinor:round?.payoutMinor);
 const history=(round?.gambleHistory??round?.risk?.history??[]).map(item=>({...item,color:item.color??item.card})),last=history.at(-1),suits={clubs:'♣',diamonds:'♦',hearts:'♥',spades:'♠'};
 ui.gambleCard.textContent=last?(suits[last.suit]??(last.color==='red'?'♥':'♠')):'?';ui.gambleCard.classList.toggle('red',last?.color==='red');
 ui.gambleCards.replaceChildren(...history.map(item=>{const card=element('span',suits[item.suit]??(item.color==='red'?'♥':'♠'));card.className=item.color==='red'?'red':'';return card;}));
 ui.gambleStatus.textContent=currentState?.busy?'Confirming…':round?.status!=='active'?'Round finished.':hasGamble?'Choose a colour or take your win.'+(Number.isInteger(round.gambleAttemptsRemaining??(round.risk?.maximumAttempts-round.risk?.attempts))?' '+(round.gambleAttemptsRemaining??(round.risk.maximumAttempts-round.risk.attempts))+' attempts left.':''):'Take your confirmed win.';
 nativeDialogs.sync({state:currentState,canGamble:canActVisible('gamble'),canCollect:canActVisible(collectAction)});
}
async function collectWin(){const action=getRoundActions(currentState?.round,game).includes('collect')?'collect':'cashout';if(!canActVisible(action))return;const confirmed=await session.act(action);if(confirmed){void referenceScene.playSound('collect');ui.gambleDialog.close();}}
async function gambleWin(color){if(!canActVisible('gamble'))return;const confirmed=await session.act('gamble',{color});if(confirmed)void referenceScene.playSound((currentState?.round?.gambleHistory??currentState?.round?.risk?.history)?.at(-1)?.won?'gamble-win':'gamble-loss');}
function positionNativeControls(result){
 if(!usesReference()||result?.status!=='painted')return;
 const geometry=referenceScene.getControlsGeometry(scene.width,scene.height);
 if(!geometry||!Object.keys(geometry).length){ui.nativeControls.hidden=true;document.body.classList.remove('integrated-reference');return;}
 document.body.classList.add('integrated-reference');ui.nativeControls.hidden=false;
 const actions={play:()=>ui.play.click(),step:()=>ui.step.click(),cashout:()=>ui.cashout.click(),gamble:()=>ui.gamble.click(),collect:()=>ui.collect.click(),autoplay:()=>ui.autoplay.click(),bet:()=>openGameDialog('betDialog'),mines:()=>openGameDialog('betDialog'),random:()=>void pickRandomCoinTile(),menu:()=>openGameDialog('menuDialog'),sound:()=>ui.sound.click(),help:()=>ui.help.click(),turbo:()=>ui.turbo.click(),buyBonus:()=>openGameDialog('betDialog'),startNext:()=>void startPairNeighbor('startNext'),startPrevious:()=>void startPairNeighbor('startPrevious'),increase:()=>{if(isRemainingLegacy(game.id)&&!ui.plus.disabled)ui.plus.click();},decrease:()=>{if(isRemainingLegacy(game.id)&&!ui.minus.disabled)ui.minus.click();}};
 const labels={play:'Spin',step:'Build the next floor',cashout:'Collect confirmed win',gamble:'Double your confirmed win',collect:'Take confirmed win',autoplay:'Autoplay',bet:'Choose bet',mines:'Choose number of mines',random:'Reveal a random unrevealed tile',menu:'Game menu',sound:'Toggle sound',help:'Rules and paytable',turbo:'Turbo mode',buyBonus:'Choose bonus',increase:'Increase bet',decrease:'Decrease bet'};
 for(const[name,button]of nativeButtons)button.hidden=name!=='menu'&&!Object.hasOwn(geometry,name);
 for(const[name,box]of Object.entries(geometry)){
  if(!actions[name])continue;
  let button=nativeButtons.get(name);
  if(!button){button=element('button');button.type='button';button.className='native-hit';button.dataset.control=name;button.setAttribute('aria-label',labels[name]??'Spin at adjacent bet');button.title=labels[name]??'Spin at adjacent bet';button.addEventListener('click',actions[name]);ui.nativeControls.append(button);nativeButtons.set(name,button);if(name==='play'){hold?.stop();hold=new SpinHold(button,{canLaunch:()=>!!currentState&&(canStartVisible()||canActVisible('collect'))&&!animation&&!autoplay.snapshot().active,launch:()=>startRound({holding:true})});}}
  button.hidden=false;Object.assign(button.style,{left:box.x+'px',top:box.y+'px',width:box.width+'px',height:box.height+'px'});
  if(name==='random')button.style.clipPath='circle(50%)';
 }
 // A small persistent menu also makes collection/recovery accessible if source
 // artwork does not contain a separately mapped menu button.
 if(!geometry.menu){let button=nativeButtons.get('menu');if(!button){button=element('button','☰');button.type='button';button.className='native-menu';button.setAttribute('aria-label','Game menu');button.addEventListener('click',actions.menu);ui.nativeControls.append(button);nativeButtons.set('menu',button);}}
 syncNativeControls();
}
function pairWagerOptions(){return {canStart:canStartVisible()&&!animation&&!autoplay.snapshot().active};}
async function startPairNeighbor(action){
 const intent=createBurningIcePairIntent(pairWagerView,action);
 const resolved=resolveBurningIcePairIntent(intent,game,currentState,ui.stake.value,pairWagerOptions());
 if(!resolved)return false;
 ui.stake.value=resolved.stake;renderCost();
 return startRound({stake:resolved.stake});
}
function syncNativeControls(){
 pairWagerView=burningIcePairWagerView(game,currentState,ui.stake.value,pairWagerOptions());
 for(const[name,button]of nativeButtons){
  if(name==='startNext'||name==='startPrevious'){
   const control=pairWagerView?.controls[name];button.disabled=control?.enabled!==true;
   const caption=control?.stake?'Spin at '+formatMoney(control.stake)+' '+displayCurrency:(name==='startNext'?'No higher bet':'No lower bet');
   button.setAttribute('aria-label',caption);button.title=caption;
  }
  if(['play','step','cashout','gamble','collect','autoplay','help','turbo','sound'].includes(name)&&ui[name])button.disabled=ui[name].disabled||ui[name].hidden;
  if(name==='bet'||name==='buyBonus')button.disabled=ui.stake.disabled;
  if(name==='increase'||name==='decrease')button.disabled=!isRemainingLegacy(game.id)||(name==='increase'?ui.plus.disabled:ui.minus.disabled);
  if(name==='mines')button.disabled=ui.mines.disabled;
  if(name==='random')button.disabled=!canActVisible('pick')||!availableCoinTiles(currentState,coinRandomOptions()).length;
  if(name==='play')button.setAttribute('aria-label',animation?.reference?'Stop animation':ui.playLabel.textContent);
  if(name==='turbo')button.setAttribute('aria-pressed',String(turboEnabled));
  if(name==='sound')button.setAttribute('aria-pressed',String(soundEnabled));
 }
 ui.gameMode.disabled=ui.lineCount.disabled=ui.riskEnabled.disabled=ui.stake.disabled;
}
async function showHistory(){
 openGameDialog('historyDialog');const epoch=++historyEpoch,owner=currentState?.sessionId;
 ui.historyContent.replaceChildren(element('p','Loading your settled rounds…'));
 try{
  const response=await gameFetch('/api/remaining20/history?game_id='+encodeURIComponent(gameId)+'&sort=recent',{credentials:'same-origin',cache:'no-store'}),data=await response.json();
  if(epoch!==historyEpoch||currentState?.sessionId!==owner)return;
  if(!response.ok||!owner||data.sessionId!==owner||data.game_id!==gameId||!session.matchesMode(data)||!Array.isArray(data.rows))throw Error('History is unavailable. Refresh your session and try again.');
  if(!data.rows.length){ui.historyContent.replaceChildren(element('p','No settled rounds yet.'));return;}
  const table=element('table'),head=element('tr');['Time','Stake ('+displayCurrency+')','Win ('+displayCurrency+')'].forEach(text=>head.append(element('th',text)));table.append(head);
  for(const entry of data.rows){const round=entry.round;if(round?.game_id!==gameId||round.status!=='settled')continue;const row=element('tr');row.append(element('td',new Date(entry.createdAt).toLocaleString()),element('td',fromMinor(round.stakeMinor)),element('td',fromMinor(round.payoutMinor)));table.append(row);}ui.historyContent.replaceChildren(table);
 }catch(error){if(epoch===historyEpoch&&currentState?.sessionId===owner)ui.historyContent.replaceChildren(element('p',error.message));}
}
ui.collect.addEventListener('click',()=>void collectWin());ui.gamble.addEventListener('click',()=>openGameDialog('gambleDialog'));
ui.red.addEventListener('click',()=>void gambleWin('red'));ui.black.addEventListener('click',()=>void gambleWin('black'));ui.gambleCollect.addEventListener('click',()=>void collectWin());
for(const[name,dialog]of [['closeBet','betDialog'],['closeMenu','menuDialog'],['closeGamble','gambleDialog'],['closeHistory','historyDialog']])ui[name].addEventListener('click',()=>ui[dialog].close());
ui.betDialog.addEventListener('close',()=>{if(!ui.betDialog.open)disposeCoinBet();});
ui.gameOptions.addEventListener('click',()=>openGameDialog('betDialog'));
ui.menuBet.addEventListener('click',()=>openGameDialog('betDialog'));ui.menuRules.addEventListener('click',()=>{closeGameDialogs();showRules();});
ui.history.addEventListener('click',()=>void showHistory());ui.menuHistory.addEventListener('click',()=>void showHistory());
ui.menuSound.addEventListener('click',()=>ui.sound.click());ui.menuRefresh.addEventListener('click',()=>{closeGameDialogs();ui.refresh.click();});ui.menuFullscreen.addEventListener('click',()=>ui.fullScreen.click());
ui.menuMusic.addEventListener('click',()=>{musicEnabled=!musicEnabled;referenceScene.setAudio({sound:soundEnabled,music:musicEnabled});ui.menuMusic.textContent=musicEnabled?'Music on':'Music off';});
ui.turbo.addEventListener('click',()=>{turboEnabled=!turboEnabled;ui.turbo.setAttribute('aria-pressed',String(turboEnabled));ui.turbo.textContent=ui.menuTurbo.textContent=turboEnabled?'Turbo on':'Turbo off';syncNativeControls();});ui.menuTurbo.addEventListener('click',()=>ui.turbo.click());
ui.gameMode.addEventListener('change',()=>{configSignature='';if(currentState)drawState(currentState);});ui.lineCount.addEventListener('change',renderCost);ui.riskEnabled.addEventListener('change',renderCost);

ui.play.addEventListener('click',()=>{if(hold?.consumesClick())return;void startRound();});
ui.step.addEventListener('click',async()=>{if(canActVisible('step')){const accepted=await session.act('step');if(accepted)void referenceScene.playSound(currentState?.round?.status==='settled'&&BigInt(currentState.round.payoutMinor||'0')===0n?'loss':'step');}});
ui.cashout.addEventListener('click',async()=>{if(canActVisible('cashout')){const accepted=await session.act('cashout');if(accepted)void referenceScene.playSound('collect');}});
function coinRandomOptions(){return{autoplayActive:autoplay.snapshot().active,instantWin:game?.isInstantWin===true||game?.controls?.instantWin?.enabled===true};}
async function pickRandomCoinTile(){
 if(!canActVisible('pick'))return false;
 let selection;try{selection=selectCoinRandomTile(currentState,coinRandomOptions());}catch{return false;}
 if(!isCoinRandomSelectionCurrent(selection,currentState,coinRandomOptions()))return false;
 void referenceScene.playSound('button');return pickTile(selection.index,selection);
}
async function pickTile(index,selection=null){
 if(!canActVisible('pick')||!Number.isInteger(index)||index<0||index>=25||currentState?.round?.picks?.some(pick=>pick.index===index)||
   selection&&!isCoinRandomSelectionCurrent(selection,currentState,coinRandomOptions()))return false;
 const owner=currentState.sessionId,roundId=currentState.round.round_id;tone('pick');
 const visualPick={sessionId:owner,roundId,modelVersion:currentState.round.model_version,version:currentState.round.version,index,startedAt:clock()};
 pendingCoinPick=visualPick;
 try{
  const accepted=await session.act('pick',{index});
  if(accepted&&currentState?.sessionId===owner&&currentState.round?.round_id===roundId){
   const revealed=currentState.round.picks?.find(pick=>pick.index===index);
   if(revealed)void referenceScene.playSound(revealed.safe?(currentState.round.status==='settled'&&currentState.round.reason==='all-safe'?'win':'prize-reveal'):'loss');
  }
  return accepted;
 }finally{
  if(pendingCoinPick===visualPick){pendingCoinPick=null;if(currentState)drawState(currentState);}
 }
}
for(let i=0;i<25;i++){const button=document.createElement('button');button.type='button';button.disabled=true;button.textContent=String(i+1);button.setAttribute('aria-label','Tile '+(i+1)+', unrevealed');button.addEventListener('click',()=>void pickTile(i));ui.mineGrid.append(button);}
ui.minus.addEventListener('click',()=>{if(game?.id==='coinminer_native')return;if(!ui.stake.disabled&&ui.stake.selectedIndex>0){ui.stake.selectedIndex--;drawState(currentState);}});
ui.plus.addEventListener('click',()=>{if(game?.id==='coinminer_native')return;if(!ui.stake.disabled&&ui.stake.selectedIndex<ui.stake.options.length-1){ui.stake.selectedIndex++;drawState(currentState);}});
ui.stake.addEventListener('change',()=>{if(currentState)drawState(currentState);});
ui.mines.addEventListener('change',()=>{if(currentState)drawState(currentState);});
ui.refresh.addEventListener('click',()=>{
 if(!session||explicitRefreshPending)return;
 startup.retry();presentationFailed=false;explicitRefreshPending=true;hold?.stop();animation=null;referenceScene.cancelMotion();referenceScene.invalidate('retry');presentationSequence++;presentationKey='';presentationReady=!usesReference();if(currentState)drawState(currentState);
 void(session.pending?session.retry():session.refresh()).finally(()=>{explicitRefreshPending=false;if(currentState)drawState(currentState);});
});
ui.skip.addEventListener('click',()=>{if(animation?.reference){referenceScene.speedUp();return;}animation=null;if(currentState)drawState(currentState);});
ui.help.addEventListener('click',showRules);ui.closeRules.addEventListener('click',()=>ui.rulesDialog.close());
ui.rulesDialog.addEventListener('close',()=>{nativeHelpView?.dispose();nativeHelpView=null;});
ui.rulesDialog.addEventListener('click',event=>{if(event.target===ui.rulesDialog){const r=ui.rulesDialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)ui.rulesDialog.close();}});
function applySoundChoice(value,{prime=false,feedback=false}={}){
 soundEnabled=value;ui.sound.setAttribute('aria-pressed',String(!soundEnabled));ui.sound.setAttribute('aria-label',soundEnabled?'Mute sound':'Enable sound');ui.sound.lastChild.textContent=soundEnabled?' Sound':' Muted';
 referenceScene.setAudio({sound:soundEnabled,music:musicEnabled});ui.menuSound.textContent=soundEnabled?'Sound on':'Sound off';coinMenuView?.sync({soundEnabled});
 if(soundEnabled){void referenceScene.unlockAudio({prime});if(feedback)tone('pick');}
 if(currentState)drawState(currentState);
}
ui.sound.addEventListener('click',()=>{startup.rememberManualChoice(!soundEnabled);applySoundChoice(!soundEnabled,{prime:true,feedback:true});});
ui.fullScreen.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{ui.fullScreen.hidden=true;}});
if(!document.documentElement.requestFullscreen)ui.fullScreen.hidden=true;
window.addEventListener('resize',resize);if(typeof ResizeObserver==='function')new ResizeObserver(resize).observe(ui.stage);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){hold?.stop();autoplay.stop('page-hidden');referenceScene.cancelWinPresentation();referenceScene.audio.stop();}else {if(soundEnabled)void referenceScene.audio.music();if(session&&!explicitRefreshPending)void session.refresh({quiet:true});}});
window.addEventListener('online',()=>{if(session&&!explicitRefreshPending)void session.refresh({quiet:true});});
window.addEventListener('offline',()=>{pendingCoinPick=null;hold?.stop();animation=null;autoplay.stop('disconnected');referenceScene.invalidate('offline');presentationSequence++;presentationKey='';presentationReady=!usesReference();if(currentState)drawState({...currentState,connected:false});});
window.addEventListener('pagehide',event=>{disposeCoinMenu();disposeCoinBet();pendingCoinPick=null;pageSuspended=true;dialogEpoch++;hold?.stop();animation=null;autoplay.stop('page-left');referenceScene.invalidate('page-left');presentationSequence++;presentationKey='';presentationReady=!usesReference();if(event.persisted===false)nativeDialogs.dispose();if(currentState)drawState(currentState);});
window.addEventListener('pageshow',()=>{if(pageSuspended&&session)void session.refresh({quiet:true}).finally(()=>{pageSuspended=false;if(currentState)drawState(currentState);});});
async function boot(){
 try{
  if(!/^[a-z0-9_]{1,64}$/.test(gameId))throw Error('Game not found');
  const response=await gameFetch('/native-library/remaining20/20261109-r5-seven/games.json',{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw Error('Game list unavailable');
  const games=await response.json();if(!Array.isArray(games))throw Error('Game list unavailable');
  const found=games.find(item=>item.id===gameId);if(!found)throw Error('This game is still being prepared');
  if(demoMode.active&&(found.demo!==true||found.demoCreditsOnly!==true||found.currency!=='CREDITS'))throw Error('Demo settings unavailable');
  session=new ExpansionSession({gameId,demo:demoMode.active,fetchImpl:gameFetch,storage:storage(),onChange:drawState});bindPlayerEvents(window,session);session.setGame(found);await session.refresh();
  hold??=new SpinHold(ui.play,{canLaunch:()=>canStartVisible()&&!animation&&!autoplay.snapshot().active,launch:()=>startRound({holding:true})});
  requestAnimationFrame(animate);
  setInterval(()=>{if(!session.state.busy&&!explicitRefreshPending&&document.visibilityState==='visible'&&Date.now()-lastRefresh>(session.state.round?.status==='active'?1800:6000)){lastRefresh=Date.now();void session.refresh({quiet:true});}},1000);
 }catch(error){startup.fail();referenceScene.invalidate('boot-error');presentationSequence++;presentationReady=false;ui.gameTitle.textContent='Game unavailable';ui.notice.textContent=error.message+'. Return to the lobby and try again.';ui.notice.classList.add('error');ui.accountLink.hidden=false;ui.playLabel.textContent='UNAVAILABLE';ui.connection.lastElementChild.textContent='Offline';}
}
void boot();
