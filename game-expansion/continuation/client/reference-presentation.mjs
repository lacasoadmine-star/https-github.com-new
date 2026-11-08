import {ReferenceAssetStore,createPresentationScene,fitViewport,paintScene} from '../presentation/machine-renderer.mjs';
import {RemainingAssetStore,createRemainingScene} from '../presentation/remaining-slots/renderer.mjs';
import {createArcadeScene,coinCellAt as referenceCoinCellAt} from '../presentation/arcade/arcade-renderer.mjs';
import {LegendsAssetStore,createLegendsScene} from '../presentation/legends/renderer.mjs';

// Draw-only integration of the checked-in reference renderers. This boundary
// never submits actions, calculates outcomes, plays audio, or changes balances.
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
 if(state.currency!=='ETB'||typeof state.balance!=='string'||!MONEY.test(state.balance))throw fault('invalid_confirmed_balance');
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
 return {sessionId:state.sessionId,round,frameIndex,balance:state.balance,balanceMinor:String(BigInt(state.balance.replace('.',''))),stake:options.selectedStake,currency:'ETB',authenticated:true,confirmed:true,pending:state.busy===true||state.pending===true||state.confirming===true,canStart:false};
}
function sceneFor(manifest,snapshot,family){
 const round=snapshot.round;
 const visible=round?(snapshot.frameIndex===null?{...round,wins:finalWins(round)}:framesFor(round)[snapshot.frameIndex]):null;
 // Do not inherit final-round features/grid/wins into an earlier visible frame.
 const displayRound=round?{round_id:round.round_id,game_id:round.game_id,gameId:round.gameId,model_version:round.model_version,modelVersion:round.modelVersion,status:round.status,stakeMinor:round.stakeMinor,payoutMinor:round.payoutMinor,grid:visible?.grid??null,wins:Array.isArray(visible?.wins)?visible.wins:[],feature:visible?.feature??null}:null;
 const view={...snapshot,round:displayRound,grid:visible?.grid??null,wins:Array.isArray(visible?.wins)?visible.wins:[],feature:visible?.feature??null,multiplier:visible?.multiplier??visible?.feature?.multiplier,phase:visible?.kind==='free-spin'?'free-spins':undefined};
 let scene;
 if(family==='smartsoft')scene=createPresentationScene(manifest,view);
 else if(family==='remaining-slots')scene=createRemainingScene(manifest,view);
 else if(family==='arcade')scene=createArcadeScene(manifest,snapshot,snapshot.frameIndex===null?{}:{frameIndex:snapshot.frameIndex});
 else scene=createLegendsScene(manifest,snapshot,{bonus:visible?.kind==='free-spin'});
 if(scene.financialActions!==false||scene.productionLaunchEnabled!==false||scene.gameId!==manifest.id||!validSize(scene.width,scene.height))throw fault('invalid_display_scene');
 return scene;
}
function defaultStoreFactory(manifest,options){
 const Store=options.family==='remaining-slots'?RemainingAssetStore:options.family==='legends'?LegendsAssetStore:ReferenceAssetStore;
 return new Store(manifest,options);
}

export class ReferencePresentationHost {
 constructor(context,{origin=globalThis.location?.origin,fetchImpl=globalThis.fetch,storeFactory=defaultStoreFactory,painter=paintScene}={}){
  this.context=context;this.fetchImpl=fetchImpl;this.storeFactory=storeFactory;this.painter=painter;
  try{this.origin=originOf(origin);}catch{this.origin=null;}
  this.binding=null;this.manifest=null;this.store=null;this.loadPromise=null;this.controller=null;
  this.bindingEpoch=0;this.viewEpoch=0;this.pendingDraw=null;this.lastPaint=null;this.disposed=false;this.width=420;this.height=900;
 }
 status(status,extra={}){return {status,gameId:this.binding?.id??null,financialActions:false,productionLaunchEnabled:false,...extra};}
 clear(){
  const ctx=this.context;if(!ctx)return;
  try{ctx.save();ctx.setTransform?.(1,0,0,1,0,0);ctx.clearRect(0,0,ctx.canvas?.width??this.width,ctx.canvas?.height??this.height);ctx.restore();}catch{/* Clearing cannot change the host's financial state. */}
 }
 clearView(){this.viewEpoch++;this.pendingDraw=null;this.lastPaint=null;this.clear();}
 releaseResources(){
  this.bindingEpoch++;this.controller?.abort();this.controller=null;
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
  this.clearView();this.releaseResources();this.disposed=true;return this.status('disposed');
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
   const store=this.storeFactory(manifest,{family:binding.family,baseURL:binding.assetBaseURL,fetchImpl:lockedFetch});
   if(!store||typeof store.prepare!=='function'||typeof store.dispose!=='function')throw fault('invalid_asset_store');
   if(!current()){try{store.dispose();}catch{}throw fault('stale');}
   this.manifest=manifest;this.store=store;return {manifest,store};
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
   const binding=this.binding,snapshot=snapshotFor(state,binding,{...options,selectedStake:options.selectedStake??'0.00'});
   const key=JSON.stringify([binding.key,snapshot,width,height]);
   if(this.pendingDraw?.key===key)return this.pendingDraw.promise;
   if(this.lastPaint?.key===key){
    const {scene,manifest,images}=this.lastPaint;
    this.painter(this.context,scene,manifest,images,{width,height});
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
     const scene=sceneFor(resource.manifest,snapshot,binding.family);
     const images=await resource.store.prepare(scene);
     if(!current()){
      if(this.store!==resource.store)try{resource.store.dispose();}catch{}
      return this.status('stale');
     }
     this.painter(this.context,scene,resource.manifest,images,{width,height});
     const viewport=fitViewport(width,height,{referenceWidth:scene.width,referenceHeight:scene.height});
     this.lastPaint={key,scene,manifest:resource.manifest,images};
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
 getCoinGeometry(width=this.width,height=this.height){
  if(this.disposed||this.binding?.id!=='coinminer_native'||!this.manifest||!validSize(width,height))return null;
  const tiles=this.manifest.layout?.tiles;
  if(!tiles||tiles.count_cols!==5||tiles.count_rows!==5||![tiles.x,tiles.y,tiles.tile_width,tiles.tile_height,tiles.space_between_horizontal,tiles.space_between_vertical].every(Number.isFinite)||tiles.tile_width<=0||tiles.tile_height<=0)return null;
  const viewport=fitViewport(width,height,{referenceWidth:this.manifest.width,referenceHeight:this.manifest.height});
  const cellWidth=tiles.tile_width*viewport.scale,cellHeight=tiles.tile_height*viewport.scale,columnGap=tiles.space_between_horizontal*viewport.scale,rowGap=tiles.space_between_vertical*viewport.scale;
  const x=viewport.x+tiles.x*viewport.scale,y=viewport.y+tiles.y*viewport.scale;
  return {x,y,width:cellWidth*5+columnGap*4,height:cellHeight*5+rowGap*4,cellWidth,cellHeight,columnGap,rowGap,columns:5,rows:5,cells:Array.from({length:25},(_,index)=>({index,x:x+(index%5)*(cellWidth+columnGap),y:y+Math.floor(index/5)*(cellHeight+rowGap),width:cellWidth,height:cellHeight}))};
 }
 coinCellAt(x,y,width=this.width,height=this.height){
  if(!this.getCoinGeometry(width,height)||![x,y].every(Number.isFinite))return null;
  const viewport=fitViewport(width,height,{referenceWidth:this.manifest.width,referenceHeight:this.manifest.height});
  return referenceCoinCellAt((x-viewport.x)/viewport.scale,(y-viewport.y)/viewport.scale,this.manifest);
 }
}
