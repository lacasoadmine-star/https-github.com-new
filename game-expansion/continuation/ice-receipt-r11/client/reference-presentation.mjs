import {iceReceiptView} from './presentation/ice-receipt-view.mjs';
import {BURNING_ICE40_ID,createBurningIce40WagerIntent,resolveBurningIce40WagerIntent} from './presentation/smartsoft/burningice40-controls.mjs';
import {BURNING_ICE40_SOURCE_PRESENTATION,BurningIce40SourceAssetStore,burningIce40HostWagerView,createBurningIce40HostScene} from './burningice40-source-host.mjs';
import {NativeReelMotion,movingScene} from './reel-motion.mjs';
import {ReferenceAudio} from './reference-audio.mjs';
import {IceReelAudioClock} from './presentation/ice-reel-audio.mjs';
import {supportsSmartSoftMotion,SmartSoftMotion} from './presentation/smartsoft-motion.mjs';
import {smartSoftInitialPreview,decorateSmartSoftInitialScene} from './presentation/smartsoft-initial-grid.mjs';
import {SmartSoftAssetStore,smartSoftMovingScene,smartSoftWinTier} from './presentation/smartsoft-native-presentation.mjs';
import {RemainingSmartSoftWinClock,usesRemainingModernWinClock} from './presentation/smartsoft-remaining7-win.mjs';
import {IceLegacyWinClock,usesIceLegacyWinClock} from './presentation/ice-legacy-win-clock.mjs';
import {bindSmartSoftWideScene,smartSoftWideScene} from './presentation/smartsoft-wide-layout.mjs';
import {isRemainingLegacy,isRemaining7Wide} from './presentation/smartsoft-remaining7-wide.mjs';
import {bindRemainingSmartSoftScene,remainingSmartSoftScene,smartSoftCompletedIceFeature,smartSoftFinalFrame} from './presentation/smartsoft-remaining7-view.mjs';
import {ReferenceAssetStore,createPresentationScene,fitViewport,paintScene} from './presentation/machine-renderer.mjs';
import {RemainingAssetStore,createRemainingScene} from './presentation/remaining-slots/renderer.mjs';
import {decorateVegasReceiptScene} from './presentation/remaining-slots/vegas-features.mjs';
import {createArcadeScene} from './presentation/arcade/arcade-renderer.mjs';
import {animateArcadeScene,prepareArcadeTransition,arcadeTransitionFrames} from './presentation/arcade/event-media.mjs';
import {supportsTowerXNativeArt,TowerXAssetStore} from './presentation/arcade/towerx-native-presentation.mjs';
import {LegendsAssetStore,createLegendsScene} from './presentation/legends/renderer.mjs';

// Draw-only integration of the checked-in reference renderers. This boundary
// never submits actions, calculates outcomes, or changes balances. Audio and
// reel movement are presentation events after checked host snapshots.
// A successful paint is presentation availability, not a production release.
const FAMILIES=Object.freeze({
 multihot40_native:'smartsoft',multihot100_native:'smartsoft',multihotwildways_native:'smartsoft',
 multihot5wild_native:'smartsoft',multihot5superwilds_native:'smartsoft',multihotdeluxe_native:'smartsoft',
 burningice_native:'smartsoft',burningice10_native:'smartsoft',burningice40_native:'smartsoft',
 safarisimba_native:'smartsoft',habeshafortune5_native:'smartsoft',
 bookofmagic_native:'remaining-slots',vegasnights_native:'remaining-slots',
 towerx_native:'arcade',towerrush_native:'arcade',coinminer_native:'arcade',
 egyptianlegends_native:'legends',olympianlegends_native:'legends',
});
export const REFERENCE_PRESENTATION_IDS=Object.freeze(Object.keys(FAMILIES));
const usesNewAssetLoading=id=>Object.hasOwn(FAMILIES,id)&&!['multihot40_native','safarisimba_native'].includes(id);
const HASH=/^[a-f0-9]{64}$/;
const FILE=/^[a-f0-9]{64}\.(?:png|jpg|jpeg|webp|gif|svg|mp3|ogg|wav|otf|ttf|woff|woff2|json|txt|atlas)$/;
const MONEY=/^(0|[1-9]\d{0,18})\.\d{2}$/;
const MINOR=/^(0|[1-9]\d{0,18})$/;
const MAX_MANIFEST_BYTES=4*1024*1024;
const fault=code=>Object.assign(new Error(code),{presentationCode:code});
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const validSize=(width,height)=>[width,height].every(value=>Number.isFinite(value)&&value>0&&value<=32768);
const isVersion=value=>typeof value==='string'&&value.length>0&&value.length<=160;
const sha256=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),value=>value.toString(16).padStart(2,'0')).join('');

function originOf(value){
 try{
  const url=new URL(value);
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error();
  return url.origin;
 }catch{throw fault('invalid_origin');}
}
function sameOriginURL(value,origin,{directory=false,json=false}={}){
 if(typeof value!=='string'||!value||value.length>2048||value.includes('\\'))throw fault('invalid_reference_url');
 let url;try{url=new URL(value,origin);}catch{throw fault('invalid_reference_url');}
 if(url.origin!==origin||url.username||url.password||url.search||url.hash)throw fault('reference_url_must_be_same_origin');
 if(directory&&!url.pathname.endsWith('/')||json&&!url.pathname.endsWith('.json'))throw fault('invalid_reference_url');
 return url.href;
}
function bindingFor(game,origin){
 if(!plain(game)||!Object.hasOwn(FAMILIES,game.id))throw fault('unsupported_game');
 const descriptor=game.referencePresentation;
 if(!plain(descriptor))throw fault('missing_reference_descriptor');
 if(!isVersion(game.version)||descriptor.modelVersion!==game.version)throw fault('descriptor_model_version_mismatch');
 if(typeof descriptor.manifestSha256!=='string'||!HASH.test(descriptor.manifestSha256))throw fault('invalid_manifest_hash');
 const manifestURL=sameOriginURL(descriptor.manifestURL,origin,{json:true});
 const assetBaseURL=sameOriginURL(descriptor.assetBaseURL,origin,{directory:true});
 const symbols=Array.isArray(game.symbols)?game.symbols.map(symbol=>({id:String(symbol.id),providerSymbolId:symbol.providerSymbolId})):[];
 const binding={id:game.id,family:FAMILIES[game.id],modelVersion:game.version,manifestURL,assetBaseURL,manifestSha256:descriptor.manifestSha256,columns:game.columns,rows:game.rows,symbols};
 binding.key=JSON.stringify(binding);
 return Object.freeze(binding);
}
function validateManifest(value,binding){
 if(!plain(value)||value.schemaVersion!==1||value.id!==binding.id||value.productionLaunchEnabled!==false)throw fault('manifest_identity_or_gate_mismatch');
 if(value.financialActions!==undefined&&value.financialActions!==false)throw fault('manifest_financial_actions_not_disabled');
 if(value.modelVersion!==undefined&&value.modelVersion!==binding.modelVersion)throw fault('manifest_model_version_mismatch');
 if(['help-art-only','unavailable'].includes(value.presentationStatus))throw fault('unsupported_gameplay_presentation');
 if(!plain(value.files)||!plain(value.frames)||!Array.isArray(value.fonts))throw fault('invalid_manifest_shape');
 const entries=Object.entries(value.files);
 if(!entries.length||entries.length>4096)throw fault('invalid_manifest_files');
 for(const [file,record]of entries){
  if(!FILE.test(file)||!plain(record)||record.sha256!==file.slice(0,64)||!Number.isSafeInteger(record.bytes)||record.bytes<=0||record.bytes>64*1024*1024)throw fault('invalid_manifest_file');
 }
 for(const frame of Object.values(value.frames))if(!plain(frame)||!Object.hasOwn(value.files,frame.file))throw fault('unlocked_manifest_frame');
 for(const font of value.fonts)if(!plain(font)||!Object.hasOwn(value.files,font.file))throw fault('unlocked_manifest_font');
 if(binding.family!=='arcade'){
  if(!plain(value.grid)||!Number.isInteger(value.grid.columns)||!Number.isInteger(value.grid.rows)||value.grid.columns<1||value.grid.rows<1||value.grid.columns>12||value.grid.rows>12||!plain(value.symbols))throw fault('invalid_manifest_grid');
  if(binding.columns!==undefined&&binding.columns!==value.grid.columns||binding.rows!==undefined&&binding.rows!==value.grid.rows)throw fault('manifest_model_grid_mismatch');
 }
 if(binding.id==='bookofmagic_native'){
  const symbol=binding.symbols.find(item=>item.id==='princess');
  if(symbol?.providerSymbolId!==9||value.symbols.sorceress?.providerId!==9)throw fault('book_symbol_alias_not_verified');
 }
 // Older art manifests do not contain a model version. Their exact byte hash
 // and this separately checked catalog descriptor bind them to one version.
 return {...value,modelVersion:binding.modelVersion};
}
function canonicalIdentity(round,binding){
 const ids=[round.game_id,round.gameId].filter(value=>value!==undefined);
 const versions=[round.model_version,round.modelVersion].filter(value=>value!==undefined);
 if(!ids.length||ids.some(value=>value!==binding.id)||!versions.length||versions.some(value=>value!==binding.modelVersion))throw fault('receipt_identity_or_model_version_mismatch');
 if(typeof round.round_id!=='string'||!round.round_id||round.round_id.length>160||!Number.isSafeInteger(round.version)||round.version<0)throw fault('invalid_receipt_version');
 if(!['active','settled'].includes(round.status)||typeof round.stakeMinor!=='string'||!MINOR.test(round.stakeMinor))throw fault('invalid_receipt_money');
 if(round.status==='settled'&&(typeof round.payoutMinor!=='string'||!MINOR.test(round.payoutMinor)))throw fault('invalid_receipt_money');
 if(round.status==='active'&&round.payoutMinor!=null)throw fault('active_receipt_has_settled_payout');
 for(const field of ['currentCashoutMinor','lockedPayoutMinor'])if(round[field]!==undefined&&(typeof round[field]!=='string'||!MINOR.test(round[field])))throw fault('invalid_receipt_money');
 return {...round,game_id:binding.id,gameId:binding.id,model_version:binding.modelVersion,modelVersion:binding.modelVersion};
}
function framesFor(round){
 const frames=Array.isArray(round?.frames)?round.frames:Array.isArray(round?.bonusFrames)?round.bonusFrames:[];
 if(frames.length>4096||frames.some(frame=>!plain(frame)))throw fault('invalid_receipt_frames');
 return frames;
}
function finalWins(round){
 const last=framesFor(round).at(-1),grid=round.grid;
 const matches=Array.isArray(grid)&&Array.isArray(last?.grid)&&grid.length===last.grid.length&&grid.every((column,c)=>Array.isArray(column)&&Array.isArray(last.grid[c])&&column.length===last.grid[c].length&&column.every((symbol,r)=>symbol===last.grid[c][r]));
 if(matches)return Array.isArray(last.wins)?last.wins:[];
 if(round.omittedFrames>0)return [];
 return (Array.isArray(round.wins)?round.wins:[]).filter(win=>plain(win)&&(win.frame===undefined||win.frame===framesFor(round).length-1));
}
function aliasBookRound(round){
 // Map only the one independently verified provider identity. Names elsewhere
 // (rule text, amounts, feature labels, or other games) are never rewritten.
 const grid=value=>Array.isArray(value)?value.map(column=>Array.isArray(column)?column.map(id=>id==='princess'?'sorceress':id):column):value;
 const wins=value=>Array.isArray(value)?value.map(win=>plain(win)?{...win,symbol:win.symbol==='princess'?'sorceress':win.symbol}:win):value;
 const frame=value=>plain(value)?{...value,...(Object.hasOwn(value,'grid')?{grid:grid(value.grid)}:{}),...(Object.hasOwn(value,'wins')?{wins:wins(value.wins)}:{})}:value;
 return {...frame(round),...(Array.isArray(round.frames)?{frames:round.frames.map(frame)}:{}),...(Array.isArray(round.bonusFrames)?{bonusFrames:round.bonusFrames.map(frame)}:{}),...(round.finalFrame?{finalFrame:frame(round.finalFrame)}:{})};
}
function snapshotFor(state,binding,options){
 if(state?.connected!==true||state.authenticated!==true||state.error===true||typeof state.sessionId!=='string'||!state.sessionId)throw fault('unconfirmed');
 if(state.game?.id!==binding.id||state.game.version!==binding.modelVersion)throw fault('state_model_version_mismatch');
 if(!(state.currency==='ETB'&&state.demo!==true&&state.demoCreditsOnly!==true||state.currency==='CREDITS'&&state.demo===true&&state.demoCreditsOnly===true&&["multihot100_native","habeshafortune5_native","multihotwildways_native","multihot5wild_native","multihot5superwilds_native","multihotdeluxe_native","burningice_native","burningice10_native","burningice40_native"].includes(binding.id))||typeof state.balance!=='string'||!MONEY.test(state.balance))throw fault('invalid_confirmed_balance');
 if(typeof options.selectedStake!=='string'||!MONEY.test(options.selectedStake))throw fault('invalid_display_stake');
 const frameIndex=options.frameIndex??null;
 if(frameIndex!==null&&(!Number.isInteger(frameIndex)||frameIndex<0))throw fault('invalid_frame_index');
 // Copy before the first await. Mutating a live host object while an image is
 // decoding cannot change the receipt that will eventually be painted.
 let round=null;
 if(state.round!==null&&state.round!==undefined){
  if(!plain(state.round))throw fault('invalid_receipt');
  const source=JSON.stringify(state.round);
  if(source.length>1024*1024)throw fault('receipt_too_large');
  round=canonicalIdentity(JSON.parse(source),binding);
  const frames=framesFor(round);
  if(frameIndex!==null&&frameIndex>=frames.length)throw fault('invalid_frame_index');
  if(binding.id==='bookofmagic_native')round=aliasBookRound(round);
 }else if(frameIndex!==null)throw fault('invalid_frame_index');
 const burningIce40Wager=options.burningIce40Source&&binding.id===BURNING_ICE40_ID?burningIce40HostWagerView(state,options):null;
 if(options.burningIce40Source&&binding.id===BURNING_ICE40_ID&&!burningIce40Wager)throw fault('burningice40_source_model_or_stake_mismatch');
 const mines=Number(options.mines??state.game?.controls?.mines?.default??3);
 if(!Number.isInteger(mines)||mines<1||mines>24)throw fault('invalid_display_mines');
 const noRoundConfirmed=Object.hasOwn(state,'round')&&state.round===null&&state.connected===true&&state.authenticated===true&&state.busy===false&&state.pending===false&&state.confirming===false&&state.recoveryBlocked===false&&state.error===false&&!options.animating;
 const visualPick=binding.id==='coinminer_native'&&plain(options.pendingCoinPick)?options.pendingCoinPick:null;
 const pendingCoinPick=visualPick?{sessionId:visualPick.sessionId,roundId:visualPick.roundId,modelVersion:visualPick.modelVersion,version:visualPick.version,index:visualPick.index,startedAt:visualPick.startedAt}:null;
 const canChangeLegacy=isRemainingLegacy(binding.id)&&state.accepting===true&&state.game?.launchable===true&&!state.busy&&!state.pending&&!state.confirming&&!state.recoveryBlocked&&!options.animating&&!options.autoplayActive&&round?.status!=='active';
 const adjacent=isRemainingLegacy(binding.id)&&plain(options.remainingLegacyWager)?options.remainingLegacyWager:{};
 const remainingLegacyWager={previousStake:typeof adjacent.previousStake==='string'&&MONEY.test(adjacent.previousStake)?adjacent.previousStake:null,nextStake:typeof adjacent.nextStake==='string'&&MONEY.test(adjacent.nextStake)?adjacent.nextStake:null,increaseEnabled:canChangeLegacy&&typeof adjacent.nextStake==='string'&&MONEY.test(adjacent.nextStake),decreaseEnabled:canChangeLegacy&&typeof adjacent.previousStake==='string'&&MONEY.test(adjacent.previousStake)};
 return {burningIce40Wager,remainingLegacyWager,sessionId:state.sessionId,round,frameIndex,noRoundConfirmed,balance:state.balance,balanceMinor:String(BigInt(state.balance.replace('.',''))),stake:options.selectedStake,currency:state.currency,authenticated:true,confirmed:true,mines,soundEnabled:options.soundEnabled!==false,autoplayActive:options.autoplayActive===true,pending:state.busy===true||state.pending===true||state.confirming===true||options.animating===true,pendingCoinPick,canStart:state.accepting===true&&state.game?.launchable===true&&!state.busy&&!state.pending&&state.round?.status!=='active'};
}
function sceneFor(manifest,snapshot,family,viewport={}){
 const round=snapshot.round;
 const visible=iceReceiptView(manifest.id,round,snapshot.frameIndex)??(round?(snapshot.frameIndex===null?{...round,wins:finalWins(round)}:framesFor(round)[snapshot.frameIndex]):null);
 // Do not inherit final-round features/grid/wins into an earlier visible frame.
 const displayRound=round?{round_id:round.round_id,game_id:round.game_id,gameId:round.gameId,model_version:round.model_version,modelVersion:round.modelVersion,status:round.status,stakeMinor:round.stakeMinor,payoutMinor:round.payoutMinor,currentCashoutMinor:round.currentCashoutMinor,grid:visible?.grid??null,wins:Array.isArray(visible?.wins)?visible.wins:[],feature:visible?.feature??null}:null;
 const view={...snapshot,round:displayRound,grid:visible?.grid??null,wins:Array.isArray(visible?.wins)?visible.wins:[],feature:visible?.feature??null,multiplier:visible?.multiplier??visible?.feature?.multiplier,phase:visible?.kind==='free-spin'?'free-spins':undefined};
 if(family==='smartsoft'&&supportsSmartSoftMotion(manifest.id)){
  for(const value of [round?.baseWinMinor,visible?.payoutMinor])if(value!==undefined&&value!==null&&(typeof value!=='string'||!MINOR.test(value)))throw fault('invalid_receipt_money');
  view.frameWinMinor=visible?.payoutMinor;
  view.finalFrame=snapshot.frameIndex===null||snapshot.frameIndex===framesFor(round).length-1;
  if(displayRound&&round.baseWinMinor!==undefined)displayRound.baseWinMinor=round.baseWinMinor;
 }
 const initialPreview=family==='smartsoft'?smartSoftInitialPreview(manifest,view):null;
 if(initialPreview)view.grid=initialPreview.grid;
 let scene;
 if(snapshot.burningIce40Wager)scene=createBurningIce40HostScene(manifest,snapshot,{grid:view.grid,preview:initialPreview});
 else if(family==='smartsoft')scene=createPresentationScene(manifest,view,{interactive:true});
 else if(family==='remaining-slots')scene=createRemainingScene(manifest,view,{interactive:true});
 else if(family==='arcade')scene=createArcadeScene(manifest,snapshot,{interactive:true,viewportWidth:viewport.width,viewportHeight:viewport.height,...(snapshot.frameIndex===null?{}:{frameIndex:snapshot.frameIndex})});
 else scene=createLegendsScene(manifest,snapshot,{interactive:true,bonus:visible?.kind==='free-spin'});
 if(initialPreview){scene.initialPreview=initialPreview;scene=decorateSmartSoftInitialScene(scene,manifest);}
 if(family==='smartsoft')scene=bindRemainingSmartSoftScene(scene,manifest,snapshot);
 if(family==='smartsoft')scene=bindSmartSoftWideScene(scene,manifest,{...snapshot,roundActions:round?.actions},viewport);
 if(scene.financialActions!==false||scene.productionLaunchEnabled!==false||scene.gameId!==manifest.id||!validSize(scene.width,scene.height))throw fault('invalid_display_scene');
 return scene;
}
function defaultStoreFactory(manifest,options){
 const Store=options.sourcePresentation===BURNING_ICE40_SOURCE_PRESENTATION?BurningIce40SourceAssetStore:supportsSmartSoftMotion(manifest.id)?SmartSoftAssetStore:supportsTowerXNativeArt(manifest)?TowerXAssetStore:options.family==='remaining-slots'?RemainingAssetStore:options.family==='legends'?LegendsAssetStore:ReferenceAssetStore;
 return new Store(manifest,options);
}

export class ReferencePresentationHost {
 constructor(context,{origin=globalThis.location?.origin,fetchImpl=globalThis.fetch?.bind(globalThis),storeFactory=defaultStoreFactory,painter=paintScene,burningIce40Source=false}={}){
  this.burningIce40Source=burningIce40Source===true;this.context=context;this.fetchImpl=fetchImpl;this.storeFactory=storeFactory;this.painter=painter;
  try{this.origin=originOf(origin);}catch{this.origin=null;}
  this.audio=new ReferenceAudio();this.iceReelAudio=new IceReelAudioClock();this.motion=null;this.remainingWinClock=new RemainingSmartSoftWinClock();this.iceWinClock=new IceLegacyWinClock();this.lastSnapshot=null;this.awaitingAfterRoundId=null;this.receiptKey='';this.receivedAt=0;this.arcadeTransition=null;
  this.binding=null;this.manifest=null;this.store=null;this.loadPromise=null;this.controller=null;
  this.bindingEpoch=0;this.viewEpoch=0;this.pendingDraw=null;this.lastPaint=null;this.disposed=false;this.width=420;this.height=900;this.cancelPreload=null;this.preloadScheduled=false;
 }
 status(status,extra={}){return {status,gameId:this.binding?.id??null,financialActions:false,productionLaunchEnabled:false,...extra};}
 clear(){
  const ctx=this.context;if(!ctx)return;
  try{ctx.save();ctx.setTransform?.(1,0,0,1,0,0);ctx.clearRect(0,0,ctx.canvas?.width??this.width,ctx.canvas?.height??this.height);ctx.restore();}catch{/* Clearing cannot change the host's financial state. */}
 }
 clearView(){this.viewEpoch++;this.pendingDraw=null;this.lastPaint=null;this.clear();}
 releaseResources(){
  this.cancelPreload?.();this.cancelPreload=null;this.preloadScheduled=false;
  this.iceReelAudio.cancel();this.audio.bind(null,null);this.motion?.cancel();this.remainingMotionAudio?.abort();this.remainingWinClock.cancel();this.iceWinClock.cancel();this.lastSnapshot=null;this.receiptKey='';this.receivedAt=0;this.arcadeTransition=null;this.bindingEpoch++;this.controller?.abort();this.controller=null;
  try{this.store?.dispose();}catch{/* Cleanup must remain independent from gameplay. */}
  this.store=null;this.manifest=null;this.loadPromise=null;
 }
 setGame(game){
  if(this.disposed)return this.status('disposed');
  try{
   if(!this.origin)throw fault('invalid_origin');
   const next=bindingFor(game,this.origin);
   if(this.binding?.key===next.key)return this.status(this.manifest?'ready':'configured',{family:next.family});
   this.clearView();this.releaseResources();this.binding=next;
   return this.status('configured',{family:next.family});
  }catch(error){
   this.clearView();this.releaseResources();this.binding=null;
   return this.status(error.presentationCode==='unsupported_game'?'unsupported':'error',{reason:error.presentationCode||'invalid_game_config'});
  }
 }
 invalidate(reason='invalidated'){
  if(this.disposed)return this.status('disposed');
  this.clearView();this.releaseResources();return this.status('invalidated',{reason});
 }
 resize(width,height){
  if(this.disposed)return this.status('disposed');
  if(!validSize(width,height)){this.clearView();return this.status('error',{reason:'invalid_viewport'});}
  if(this.width!==width||this.height!==height){this.width=width;this.height=height;this.clearView();}
  return this.status('resized',{width,height});
 }
 dispose(){
  if(this.disposed)return this.status('disposed');
  this.clearView();this.releaseResources();this.audio.dispose();this.disposed=true;return this.status('disposed');
 }
 async load(binding,epoch){
  if(this.manifest&&this.store)return {manifest:this.manifest,store:this.store};
  if(this.loadPromise)return this.loadPromise;
  const controller=new AbortController();this.controller=controller;
  const current=()=>!this.disposed&&this.binding===binding&&this.bindingEpoch===epoch;
  const task=(async()=>{
   if(typeof this.fetchImpl!=='function')throw fault('reference_fetch_unavailable');
   const response=await this.fetchImpl(binding.manifestURL,{method:'GET',credentials:'omit',redirect:'error',cache:'force-cache',signal:controller.signal});
   if(!current())throw fault('stale');
   if(!response?.ok)throw fault('manifest_request_failed');
   if(response.url&&sameOriginURL(response.url,this.origin)!==binding.manifestURL)throw fault('unexpected_manifest_url');
   const bytes=await response.arrayBuffer();
   if(!current())throw fault('stale');
   if(!bytes.byteLength||bytes.byteLength>MAX_MANIFEST_BYTES)throw fault('manifest_size_invalid');
   if(await sha256(bytes)!==binding.manifestSha256)throw fault('manifest_hash_mismatch');
   if(!current())throw fault('stale');
   let parsed;try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw fault('manifest_parse_failed');}
   const manifest=validateManifest(parsed,binding);
   const lockedFetch=(value,options={})=>{
    if(!current()||controller.signal.aborted)return Promise.reject(fault('stale'));
    let url;
    try{
     url=sameOriginURL(String(value),this.origin);
     if(!url.startsWith(binding.assetBaseURL))throw fault('asset_outside_reference_base');
     const name=url.slice(binding.assetBaseURL.length);
     if(!FILE.test(name)||!Object.hasOwn(manifest.files,name))throw fault('asset_not_locked');
     if(options.method&&options.method!=='GET')throw fault('asset_method_not_read_only');
    }catch(error){return Promise.reject(error);}
    return this.fetchImpl(url,{...options,method:'GET',credentials:'omit',redirect:'error',signal:controller.signal});
   };
   const store=this.storeFactory(manifest,{family:binding.family,baseURL:binding.assetBaseURL,fetchImpl:lockedFetch,...(this.burningIce40Source&&binding.id===BURNING_ICE40_ID?{sourcePresentation:BURNING_ICE40_SOURCE_PRESENTATION}:{}),...(usesNewAssetLoading(binding.id)?{loadLimits:{requests:4,decodes:2}}:{})});
   if(!store||typeof store.prepare!=='function'||typeof store.dispose!=='function')throw fault('invalid_asset_store');
   if(!current()){try{store.dispose();}catch{}throw fault('stale');}
   this.manifest=manifest;this.store=store;this.audio.bind(manifest,store);return {manifest,store};
  })();
  this.loadPromise=task;
  return task;
 }
 draw(state,options={}){
  if(this.disposed)return Promise.resolve(this.status('disposed'));
  if(!this.binding)return Promise.resolve(this.status('unsupported'));
  try{
   const width=options.width??this.width,height=options.height??this.height;
   if(!validSize(width,height))throw fault('invalid_viewport');
   const binding=this.binding,snapshot=snapshotFor(state,binding,{...options,burningIce40Source:this.burningIce40Source,selectedStake:options.selectedStake??'0.00'});
   if(usesRemainingModernWinClock(binding.id))this.remainingWinClock.observeReceipt(JSON.stringify([snapshot.round?.round_id,snapshot.round?.version]),snapshot.round?.status);
   if(usesIceLegacyWinClock(binding.id))this.iceWinClock.observeReceipt(JSON.stringify([snapshot.round?.round_id,snapshot.round?.version]),snapshot.round?.status);
   const key=JSON.stringify([binding.key,snapshot,width,height]);
   if(this.pendingDraw?.key===key)return this.pendingDraw.promise;
   if(this.lastPaint?.key===key){
    const {scene,manifest,images}=this.lastPaint;
    this.paint(scene,manifest,images,{width,height});
    return Promise.resolve(this.status('painted',{scene,viewport:fitViewport(width,height,{referenceWidth:scene.width,referenceHeight:scene.height}),coinGeometry:this.getCoinGeometry(width,height),reused:true}));
   }
   this.width=width;this.height=height;this.clearView();
   const viewEpoch=this.viewEpoch,bindingEpoch=this.bindingEpoch;
   const current=()=>!this.disposed&&this.binding===binding&&this.bindingEpoch===bindingEpoch&&this.viewEpoch===viewEpoch;
   const promise=(async()=>{
    let resource;
    try{
     resource=await this.load(binding,bindingEpoch);
     if(!current())return this.status('stale');
     let scene=sceneFor(resource.manifest,snapshot,binding.family,{width,height});
     if(binding.family==='arcade')scene=prepareArcadeTransition(scene,resource.manifest,this.lastSnapshot,snapshot,this.arcadeTransition);
     const symbolCommands=Object.values(resource.manifest.symbols||{}).flatMap(symbol=>[symbol.frame,symbol.blurFrame].filter(frame=>resource.manifest.frames[frame]).map(frame=>({type:'sprite',frame})));
     const dynamicCommands=binding.family==='arcade'?[...Object.keys(resource.manifest.frames).filter(key=>/^spine\/Frozen_web\/Frozen_web_\d+$/.test(key)),...arcadeTransitionFrames(resource.manifest)].map(frame=>({type:'sprite',frame})):[];
     const layoutCommands=(scene.additionalAssetFrames||[]).map(frame=>({type:'sprite',frame}));
     const images=await resource.store.prepare({...scene,commands:[...scene.commands,...symbolCommands,...dynamicCommands,...layoutCommands]});
     if(!current()){
      if(this.store!==resource.store)try{resource.store.dispose();}catch{}
      return this.status('stale');
     }
     const receiptKey=JSON.stringify([snapshot.round?.round_id,snapshot.round?.version,snapshot.frameIndex]);
     if(receiptKey!==this.receiptKey){this.receiptKey=receiptKey;this.receivedAt=globalThis.performance?.now()??0;}
     this.lastSnapshot=snapshot;
     if(this.motion?.running&&snapshot.round&&snapshot.round.round_id!==this.awaitingAfterRoundId&&this.motionReceiptKey!==receiptKey){
      const visible=snapshot.frameIndex===null?snapshot.round:framesFor(snapshot.round)[snapshot.frameIndex];
      const accepted=this.motion.accept(visible?.grid,globalThis.performance?.now()??0,{feature:visible?.feature,roundId:snapshot.round.round_id,kind:visible?.kind,wins:visible?.wins,finalFrame:smartSoftFinalFrame(snapshot.round,snapshot.frameIndex)});
      if(!accepted){this.motion.cancel();throw fault('animation_receipt_not_supported');}
      this.motionReceiptKey=receiptKey;
     }
     this.paint(scene,resource.manifest,images,{width,height});
     const viewport=fitViewport(width,height,{referenceWidth:scene.width,referenceHeight:scene.height});
     this.lastPaint={key,scene,manifest:resource.manifest,images};
     this.arcadeTransition=scene.arcadeTransition??null;
     this.preloadSelectedAudio();
     return this.status('painted',{scene,viewport,coinGeometry:this.getCoinGeometry(width,height),reused:false});
    }catch(error){
     if(resource&&this.store!==resource.store)try{resource.store.dispose();}catch{}
     if(!current())return this.status('stale');
     this.clear();this.lastPaint=null;
     return this.status('error',{reason:error.presentationCode||'reference_presentation_failed'});
    }finally{if(current())this.pendingDraw=null;}
   })();
   this.pendingDraw={key,promise};return promise;
  }catch(error){
   this.clearView();
   if(error.presentationCode==='unconfirmed'){this.releaseResources();return Promise.resolve(this.status('unconfirmed'));}
   return Promise.resolve(this.status('error',{reason:error.presentationCode||'invalid_host_snapshot'}));
  }
 }
 preloadSelectedAudio(){
  if(this.lastPaint?.scene.sourcePresentation===BURNING_ICE40_SOURCE_PRESENTATION||this.preloadScheduled||!usesNewAssetLoading(this.binding?.id)||globalThis.navigator?.connection?.saveData===true)return;
  this.preloadScheduled=true;const epoch=this.bindingEpoch;
  const run=()=>{this.cancelPreload=null;if(!this.disposed&&epoch===this.bindingEpoch)void this.audio.preload({includeMuted:true}).catch(()=>{});};
  if(typeof globalThis.requestIdleCallback==='function'&&typeof globalThis.cancelIdleCallback==='function'){
   const id=globalThis.requestIdleCallback(run,{timeout:1000});this.cancelPreload=()=>globalThis.cancelIdleCallback(id);
  }else{const id=globalThis.setTimeout(run,20);this.cancelPreload=()=>globalThis.clearTimeout(id);}
 }
 paint(scene,manifest,images,{width=this.width,height=this.height,time=globalThis.performance?.now()??0}={}){
  const sample=this.motion?.sample(time);
  const receiptElapsedMs=Math.max(0,time-this.receivedAt);
  const modernWinClock=usesRemainingModernWinClock(manifest.id),round=this.lastSnapshot?.round,native=scene.nativeVisual;
  if(modernWinClock&&sample?.complete&&sample.roundId===native?.roundId){
   this.remainingWinClock.sample({id:manifest.id,motion:this.motion,tier:smartSoftWinTier(manifest.id,native.baseWinMinor??native.winMinor,native.stakeMinor),elapsedMs:sample.elapsed-sample.completedAt,receiptKey:JSON.stringify([round?.round_id,round?.version]),roundStatus:round?.status,finalFrame:native.finalFrame,play:(event,options)=>this.audio.play(event,options),duckMusic:owner=>this.audio.duckMusic(owner),restoreMusic:owner=>this.audio.restoreMusic(owner)});
  }
  const iceClock=usesIceLegacyWinClock(manifest.id);
  let legacyWinFrame=null;
  if(iceClock&&sample?.complete&&sample.roundId===native?.roundId){
   legacyWinFrame=this.iceWinClock.sample({id:manifest.id,motion:this.motion,tier:smartSoftWinTier(manifest.id,native.baseWinMinor??native.winMinor,native.stakeMinor),winMinor:native.baseWinMinor??native.winMinor,elapsedMs:sample.elapsed-sample.completedAt,receiptKey:JSON.stringify([round?.round_id,round?.version]),roundStatus:round?.status,finalFrame:native.finalFrame,play:(event,options)=>this.audio.play(event,options)});
  }
  const winPresentationActive=iceClock?this.iceWinClock.active:!modernWinClock||this.remainingWinClock.active;
  const animated=scene.sourcePresentation===BURNING_ICE40_SOURCE_PRESENTATION?scene:supportsSmartSoftMotion(manifest.id)?smartSoftMovingScene(scene,manifest,sample,{time,images,receiptElapsedMs,winPresentationActive,legacyWinFrame}):this.binding?.family==='arcade'?animateArcadeScene(scene,manifest,receiptElapsedMs,{time}):movingScene(scene,manifest,sample);
  const displayed=manifest.id==='vegasnights_native'?decorateVegasReceiptScene(animated,manifest,this.lastSnapshot,{motion:sample}):animated;
  this.painter(this.context,smartSoftWideScene(remainingSmartSoftScene(displayed,manifest),manifest),manifest,images,{width,height});return sample;
 }
 beginSpin(time,{turbo=false,afterRoundId=null,frozenReels=[]}={}){
  if(!this.manifest?.grid||!this.lastPaint?.scene.gridGeometry||this.disposed||this.lastPaint.scene.sourcePresentation===BURNING_ICE40_SOURCE_PRESENTATION)return false;
  const m=this.manifest;
  const Motion=supportsSmartSoftMotion(m.id)?SmartSoftMotion:NativeReelMotion;
  this.iceReelAudio.cancel();this.remainingWinClock.reset();this.iceWinClock.reset();
  const remainingSeven=isRemaining7Wide(m.id);
  this.remainingMotionAudio?.abort();this.remainingMotionAudio=remainingSeven?new AbortController():null;
  const signal=this.remainingMotionAudio?.signal;
  const motion=new Motion({id:m.id,columns:m.grid.columns,rows:m.grid.rows,symbols:Object.keys(m.symbols),mobile:!(remainingSeven&&this.lastPaint.scene.wideLayout===true),mode:this.binding.family==='legends'?'cascade':'reels',onEvent:event=>{
   this.iceReelAudio.handle({id:m.id,event,play:(cue,options)=>this.audio.play(cue,options),isCurrent:()=>!this.disposed&&this.motion===motion&&motion.state?.sequence===event.sequence});
   if(['spin-start','freeze','unfreeze','freeze-logo','unfreeze-logo'].includes(event.type)||event.type==='reel-stop'&&!event.frozen||remainingSeven&&event.type==='multiplier-win'){
    void this.audio.play(event.type,{column:event.column,turbo:event.turbo,fast:event.fast,...(remainingSeven?{signal,isCurrent:()=>!this.disposed&&this.motion===motion&&motion.state?.sequence===event.sequence}:{})});
   }
  }});
  this.motion=motion;
  const previous=this.lastSnapshot,previousFrame=previous?.frameIndex===null?previous?.round:framesFor(previous?.round)[previous?.frameIndex];
  const previousFeature=smartSoftCompletedIceFeature(m.id,previousFrame?.feature,previous?.pending!==true&&smartSoftFinalFrame(previous?.round,previous?.frameIndex));
  this.awaitingAfterRoundId=afterRoundId;this.motionReceiptKey='';this.motion.begin(time,{turbo,frozenReels,previousGrid:previousFrame?.grid,previousFeature});return true;
 }
 render(time){if(!this.lastPaint)return null;const{scene,manifest,images}=this.lastPaint;return this.paint(scene,manifest,images,{time});}
 speedUp(){if(usesIceLegacyWinClock(this.manifest?.id)&&this.iceWinClock.active){this.iceWinClock.cancel();return true;}return this.motion?.speedUp()??false;}
 cancelMotion(){this.iceReelAudio.cancel();this.motion?.cancel();this.remainingMotionAudio?.abort();this.remainingWinClock.cancel();this.iceWinClock.cancel();}
 cancelWinPresentation(){if(usesRemainingModernWinClock(this.manifest?.id))this.remainingWinClock.cancel();if(usesIceLegacyWinClock(this.manifest?.id))this.iceWinClock.cancel();}
 isWinPresentationRunning(){return usesIceLegacyWinClock(this.manifest?.id)?this.iceWinClock.active:usesRemainingModernWinClock(this.manifest?.id)&&this.remainingWinClock.record!==null&&this.remainingWinClock.active;}
 startupProgress(){return {loaded:this.store?.loadedFiles?.size??0,requested:this.store?.buffers?.size??0};}
 unlockAudio(options){return this.audio.unlock(options);}
 setAudio(settings){this.audio.settings(settings);}
 playSound(event){return usesIceLegacyWinClock(this.manifest?.id)&&this.iceWinClock.handles(event)||usesRemainingModernWinClock(this.manifest?.id)&&this.remainingWinClock.handles(event)?Promise.resolve(false):this.audio.play(event);}
 createBurningIce40WagerIntent(action){
  if(this.disposed||this.lastPaint?.scene.sourcePresentation!==BURNING_ICE40_SOURCE_PRESENTATION)return null;
  const intent=createBurningIce40WagerIntent(this.lastPaint.scene.wagerView,action);
  return intent?Object.freeze({...intent,presentationEpoch:this.viewEpoch,bindingEpoch:this.bindingEpoch}):null;
 }
 resolveBurningIce40WagerIntent(intent,state,options={}){
  if(this.disposed||this.lastPaint?.scene.sourcePresentation!==BURNING_ICE40_SOURCE_PRESENTATION||
   intent?.presentationEpoch!==this.viewEpoch||intent?.bindingEpoch!==this.bindingEpoch||
   state?.game?.id!==this.binding?.id||state.game.version!==this.binding.modelVersion)return null;
  const view=burningIce40HostWagerView(state,options);
  if(!view)return null;
  // Also pin to the displayed snapshot. A caller must repaint a new wager,
  // session, round or ladder before it can resolve a new control intent.
  if(JSON.stringify(view.pin)!==JSON.stringify(this.lastPaint.scene.wagerView.pin))return null;
  return resolveBurningIce40WagerIntent(intent,state.game,{...state,pending:!!state.pending||state.busy===true||options.animating===true},
   {stake:options.selectedStake,canStart:view.controls.play.enabled,canChangeStake:options.canChangeStake===true});
 }
 getControlsGeometry(width=this.width,height=this.height){
  const original=this.lastPaint?.scene;if(!original)return null;
  const scene=smartSoftWideScene(original,this.lastPaint.manifest);
  const viewport=fitViewport(width,height,{referenceWidth:scene.width,referenceHeight:scene.height});
  return Object.fromEntries(Object.entries(scene.controlsGeometry||{}).map(([name,b])=>[name,{x:viewport.x+b.x*viewport.scale,y:viewport.y+b.y*viewport.scale,width:b.width*viewport.scale,height:b.height*viewport.scale}]));
 }
 getCoinGeometry(width=this.width,height=this.height){
  if(this.disposed||this.binding?.id!=='coinminer_native'||!this.manifest||!validSize(width,height))return null;
  const scene=this.lastPaint?.scene,tiles=scene?.coinTiles??this.manifest.layout?.tiles;
  if(!tiles||tiles.count_cols!==5||tiles.count_rows!==5||![tiles.x,tiles.y,tiles.tile_width,tiles.tile_height,tiles.space_between_horizontal,tiles.space_between_vertical].every(Number.isFinite)||tiles.tile_width<=0||tiles.tile_height<=0)return null;
  const viewport=fitViewport(width,height,{referenceWidth:scene?.width??this.manifest.width,referenceHeight:scene?.height??this.manifest.height});
  const cellWidth=tiles.tile_width*viewport.scale,cellHeight=tiles.tile_height*viewport.scale,columnGap=tiles.space_between_horizontal*viewport.scale,rowGap=tiles.space_between_vertical*viewport.scale;
  const x=viewport.x+tiles.x*viewport.scale,y=viewport.y+tiles.y*viewport.scale;
  return {x,y,width:cellWidth*5+columnGap*4,height:cellHeight*5+rowGap*4,cellWidth,cellHeight,columnGap,rowGap,columns:5,rows:5,cells:Array.from({length:25},(_,index)=>({index,x:x+(index%5)*(cellWidth+columnGap),y:y+Math.floor(index/5)*(cellHeight+rowGap),width:cellWidth,height:cellHeight}))};
 }
 coinCellAt(x,y,width=this.width,height=this.height){
  const geometry=this.getCoinGeometry(width,height);
  if(!geometry||![x,y].every(Number.isFinite))return null;
  return geometry.cells.find(cell=>x>=cell.x&&x<cell.x+cell.width&&y>=cell.y&&y<cell.y+cell.height)?.index??null;
 }
}
