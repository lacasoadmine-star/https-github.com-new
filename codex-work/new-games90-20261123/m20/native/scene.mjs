// Multi Hot 20 presentation only. The authenticated server owns every result.
// Fresh 2026-11-21 demo inspection confirmed five columns and three rows.
export const PRESENTATION_GAME_ID = 'fresh_multihot20';
export const SCENE_LAYOUT = Object.freeze({
 width:600,height:600,reels:5,rows:3,x:45,y:252,reelWidth:102,tileHeight:102
});
// Explicit presentation timings, not a claim of measured official timing parity.
export const MULTIHOT20_MOTION = Object.freeze({
 accelerationMs:150,reelStartDelayMs:12,speedPixelsPerMs:1.35,
 settleDurationMs:690,reelDelayMs:95,fastSettleDurationMs:200,fastReelDelayMs:35,
 minimumRunInTiles:4,wheelRadiansPerMs:.009,wheelMinimumRunRadians:Math.PI/2
});
// Independent ZPLAY result pacing. Fresh official captures establish that
// the same winning result keeps cycling beyond eighteen seconds; they do not
// establish its cycle period. This visible-result sequence stops on user or
// page lifecycle interruption. It never blocks settlement or chooses a win.
export const MULTIHOT20_LINE_PRESENTATION = Object.freeze({
 summaryMs:600,lineMs:1200,maxLines:20
});
// Retained official twenty-line chart, also shown by the app's rules screen.
// A path continues across all five columns; only the matching receipt prefix
// gets winning-cell emphasis. This is geometry, not an outcome evaluator.
export const MULTIHOT20_PAYLINE_ROWS=Object.freeze([
 [0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],
 [0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],
 [2,1,1,1,2],[0,0,0,0,1],[2,2,2,2,1],[0,1,0,1,0],[2,1,2,1,2],
 [1,1,0,1,1],[1,1,2,1,1],[0,0,1,0,0],[2,2,1,2,2],[1,2,1,2,1]
].map(rows=>Object.freeze(rows)));
// Independent ZPLAY visual routing, NOT provider trigger rules or payout math.
// A fresh original NICE WIN was observed at 12.5x. The tier boundaries and
// bounded display duration below are explicit choices for this implementation.
export const MULTIHOT20_WIN_PRESENTATION = Object.freeze({
 durationMs:2600,turboDurationMs:700,exitFadeMs:180,
 tiers:Object.freeze([
  Object.freeze({name:'FANTASTIC',minimumMultiple:100,asset:'__winFantastic'}),
  Object.freeze({name:'SUPER',minimumMultiple:50,asset:'__winSuper'}),
  Object.freeze({name:'BIG',minimumMultiple:25,asset:'__winBig'}),
  Object.freeze({name:'NICE',minimumMultiple:10,asset:'__winNice'})
 ])
});
const WIN_ART=Object.freeze(['__winNice','__winText','__winCrownSmall','__winMoneyFrame','__winCoin',
 '__winFrame','__winBacklight','__winShine','__winBig','__winSuper','__winFantastic']);
const cents=value=>typeof value==='string'&&/^(0|[1-9]\d{0,12})\.\d{2}$/.test(value)?BigInt(value.replace('.','')):null;
const presentationTier=receipt=>{
 const win=cents(receipt?.finalWin),bet=cents(receipt?.bet);
 if(win===null||bet===null||bet<=0n)return null;
 return MULTIHOT20_WIN_PRESENTATION.tiers.find(tier=>win>=bet*BigInt(tier.minimumMultiple))??null;
};
// Entrance keys transcribed from approved original wins.json / Nice Win.
// Times are seconds; missing Spine scale/translate values are 1/0. These
// tracks describe presentation only. No provider client code is executed.
const EASE=Object.freeze([.25,0,.75,1]),RISE=Object.freeze([.25,0,.312,1]);
const WIN_KEYS=Object.freeze({
 frame:[[0,0,[.25,0,.454,1]],[.3333,1.1,[.505,-.01,.75,1]],[.5667,.95,[.449,0,.75,1]],[.7667,1]],
 crownScale:[[0,0,'stepped'],[.1,0,EASE],[.3,1.05,EASE],[.5667,1]],
 crownY:[[0,-226,RISE],[.3,4,EASE],[.5667,-1,EASE],[.7667,0]],
 tierScale:[[0,0,'stepped'],[.1333,0,EASE],[.4333,1.05,EASE],[.7,1]],
 tierY:[[0,-226,'stepped'],[.0333,-226,RISE],[.4333,4,EASE],[.7,-1,EASE],[.9,0]],
 winScale:[[0,0,'stepped'],[.2333,0,EASE],[.5333,1.05,EASE],[.8,1]],
 winY:[[0,-226,'stepped'],[.1333,-226,RISE],[.5333,4,EASE],[.8,-1,EASE],[1,0]],
 moneyScale:[[0,0,'stepped'],[.3,0,EASE],[.6,1.1,EASE],[.8333,.98],[1.0667,1]],
 moneyY:[[0,-39.25,'stepped'],[.3,-39.25,EASE],[.6,-2,EASE],[.9333,0]],
 light:[[0,0,'stepped'],[.0667,0],[.3333,1]],
 tierFlash:[[0,0,'stepped'],[.2333,0,EASE],[.4333,1,EASE],[.6333,0]],
 winFlash:[[0,0,'stepped'],[.3667,0,EASE],[.5667,1,EASE],[.7667,0]]
});
const cubic=(t,a,b)=>3*(1-t)*(1-t)*t*a+3*(1-t)*t*t*b+t*t*t;
function tween(progress,curve){
 if(progress<=0||progress>=1)return progress;
 if(curve==='stepped')return 0;
 if(!Array.isArray(curve))return progress;
 let low=0,high=1;
 for(let i=0;i<16;i++){const mid=(low+high)/2;if(cubic(mid,curve[0],curve[2])<progress)low=mid;else high=mid}
 return cubic((low+high)/2,curve[1],curve[3]);
}
function keyValue(keys,time){
 if(time<=keys[0][0])return keys[0][1];
 for(let i=1;i<keys.length;i++)if(time<=keys[i][0]){
  const a=keys[i-1],b=keys[i],p=tween((time-a[0])/(b[0]-a[0]),a[2]);return a[1]+(b[1]-a[1])*p;
 }
 return keys.at(-1)[1];
}
// Original visual atlas, not a probability table. The 14 clockwise sectors
// begin with the top 2x in Images-3/Multiplier/Numbers. Fresh official captures
// show that sector 0 has neighbours 5/4 and sector 13 has neighbours 3/2.
// Later observed 4x and 1x states identify sectors 10 and 11, respectively.
export const MULTIHOT20_WHEEL_SECTORS = Object.freeze([2,4,2,5,1,3,5,2,5,2,4,1,3,5]);
const WHEEL_STOP_SECTORS=Object.freeze({1:11,2:0,3:5,4:10,5:13});
const TAU=2*Math.PI,WHEEL_STEP=TAU/MULTIHOT20_WHEEL_SECTORS.length;
const WHEEL_RING_FRAME=Object.freeze({x:1,y:1,w:1077,h:1095,offsetX:44,offsetY:35,sourceSize:1164});
const WHEEL_BACKGROUND_FRAME=Object.freeze({x:1,y:1715,w:978,h:267,offsetX:171,offsetY:5,sourceSize:1320});
const {width:WIDTH,height:HEIGHT,reels:REELS,rows:ROWS,x:X,y:Y,reelWidth:REEL_W,tileHeight:TILE_H}=SCENE_LAYOUT;
const GRID_W=REELS*REEL_W,GRID_H=ROWS*TILE_H;
const WHEEL_SCALE=GRID_W/WHEEL_BACKGROUND_FRAME.w,WHEEL_TOP=Y-WHEEL_BACKGROUND_FRAME.h*WHEEL_SCALE;
const WHEEL_CENTRE_X=WIDTH/2,WHEEL_CENTRE_Y=WHEEL_TOP+(660-WHEEL_BACKGROUND_FRAME.offsetY)*WHEEL_SCALE;
const WHEEL_RING_SCALE=WHEEL_SCALE*1320/WHEEL_RING_FRAME.sourceSize;
// The original Box/Background trim is 1119x696. Its inner top/bottom rules
// are at y26/y666; preserve its proportions and the five printed reel borders.
const BOX_SCALE=GRID_H/640,BOX_WIDTH=1119*BOX_SCALE,BOX_HEIGHT=696*BOX_SCALE;
const finite=n=>Number.isFinite(n)?n:0;
const modulo=(n,d)=>((n%d)+d)%d;
const drawable=a=>!!a&&((a.naturalWidth??a.width)>0)&&((a.naturalHeight??a.height)>0);
const wheelStopAngle=value=>modulo(-WHEEL_STOP_SECTORS[value]*WHEEL_STEP,TAU);

export class MultiHot20Scene {
 constructor({canvas,backdropCanvas=null,symbols,assets={},audio={},strictAssets=true,
   onLinePresentation=null,showInternalTitle=()=>true,visibleSceneTop=()=>0,
   doc=globalThis.document,win=globalThis.window,clock=()=>performance.now(),
   requestFrame=fn=>requestAnimationFrame(fn),cancelFrame=id=>cancelAnimationFrame(id)}={}){
  if(!canvas?.getContext)throw Error('CANVAS_REQUIRED');
  if(!Array.isArray(symbols)||symbols.length<2||symbols.some(s=>typeof s!=='string'||!s))throw Error('VALIDATED_SYMBOL_SET_REQUIRED');
  this.canvas=canvas;this.ctx=canvas.getContext('2d');
  if(!this.ctx)throw Error('CANVAS_CONTEXT_UNAVAILABLE');
  if(backdropCanvas&&(backdropCanvas===canvas||typeof backdropCanvas.getContext!=='function'))throw Error('SEPARATE_BACKDROP_CANVAS_REQUIRED');
  this.backdropCanvas=backdropCanvas;this.backdropCtx=backdropCanvas?.getContext('2d')??null;this.backdropState=null;
  if(backdropCanvas&&!this.backdropCtx)throw Error('BACKDROP_CONTEXT_UNAVAILABLE');
  this.symbols=[...symbols];this.assets=assets;this.audio=audio;this.strictAssets=strictAssets;
  this.onLinePresentation=typeof onLinePresentation==='function'?onLinePresentation:null;
  this.showInternalTitle=typeof showInternalTitle==='function'?showInternalTitle:()=>true;
  this.visibleSceneTop=typeof visibleSceneTop==='function'?visibleSceneTop:()=>0;
  this.linePresentation=null;this.lineView=null;this.resultPresentationDismissed=false;
  this.doc=doc;this.win=win;this.clock=clock;this.requestFrame=requestFrame;this.cancelFrame=cancelFrame;
  this.width=WIDTH;this.height=HEIGHT;this.rolling=false;this.disposed=false;
  this.current=null;this.receipt=null;this.pending=null;this.reelPlans=null;this.finishAt=0;this.stopHint=false;this.celebration=null;
  this.wheelAngle=wheelStopAngle(2);this.wheelStartAngle=this.wheelAngle;this.wheelPlan=null;
  this.lastTime=null;this.frames=0;this.frameId=null;this.reelStopped=Array(REELS).fill(false);
  this.fpsSamples=[];this.resolveAnimation=null;this.motionPreference=win?.matchMedia?.('(prefers-reduced-motion: reduce)')??null;
  this.reducedMotion=!!this.motionPreference?.matches;this.pageHidden=false;
  this.focused=typeof doc?.hasFocus==='function'?doc.hasFocus():true;
  this.hidden=!!doc?.hidden||!this.focused;
  this.onVisibility=()=>this._visibility();
  this.onBlur=()=>{this.focused=false;this._visibility()};
  this.onFocus=()=>{this.focused=true;this._visibility()};
  this.onPageHide=()=>{this.pageHidden=true;this._visibility()};
  this.onPageShow=()=>{this.pageHidden=false;this.focused=typeof doc?.hasFocus==='function'?doc.hasFocus():this.focused;this._visibility()};
  this.onMotionPreference=event=>{
   this.reducedMotion=!!event.matches;
   if(this.disposed||!this.reducedMotion)return;
   if(this.pending)this._finish({immediate:true,silent:true});else if(this.celebration)this._completeCelebration({showLines:false});
   this.stopLinePresentation();
  };
  this._verifyArtwork();
  doc?.addEventListener?.('visibilitychange',this.onVisibility);
  win?.addEventListener?.('blur',this.onBlur);win?.addEventListener?.('focus',this.onFocus);
  win?.addEventListener?.('pagehide',this.onPageHide);win?.addEventListener?.('pageshow',this.onPageShow);
  this.motionPreference?.addEventListener?.('change',this.onMotionPreference);
  this.resize();
 }
 _asset(symbol){return this.assets instanceof Map?this.assets.get(symbol):this.assets[symbol]}
 _verifyArtwork(){
  if(!this.strictAssets)return;
  for(const name of ['__wheelNumbers','__wheelFrame','__wheelLight','__title','__boxFrame','__background',...WIN_ART])if(!drawable(this._asset(name)))throw Error('OFFICIAL_PRESENTATION_ART_REQUIRED_'+name);
  for(const [name,frame] of [['__wheelNumbers',WHEEL_RING_FRAME],['__wheelLight',WHEEL_RING_FRAME],['__wheelFrame',WHEEL_BACKGROUND_FRAME]]){
   const image=this._asset(name);
   if((image.naturalWidth??image.width)<frame.x+frame.w||(image.naturalHeight??image.height)<frame.y+frame.h)throw Error('OFFICIAL_ATLAS_BOUNDS_INVALID_'+name);
  }
 }
 _verifySymbols(){
  if(this.strictAssets&&this.symbols.some(s=>{const a=this._asset(s);return !drawable(a)||!(a.complete??true)}))throw Error('OFFICIAL_SPRITES_NOT_READY');
  this._verifyArtwork();
 }
 _sound(name){if(this.hidden||this.doc?.hidden||this.disposed)return;try{this.audio.play?.(name)}catch{/* Audio cannot change a receipt. */}}
 _stopSound(name){try{this.audio.stop?.(name)}catch{}}
 _cancelFrame(){if(this.frameId!==null){this.cancelFrame(this.frameId);this.frameId=null}}
 _visibility(){
  if(this.disposed)return;
  this.hidden=this.pageHidden||!!this.doc?.hidden||!this.focused;
  if(this.hidden){this._cancelFrame();this.pauseAudio();this.stopLinePresentation();if(this.pending)this._finish({immediate:true,silent:true});else if(this.celebration)this._completeCelebration({showLines:false});return}
  this.lastTime=null;this._paint(this.clock());this._loop();
 }
 resize(){
  if(this.disposed)return;
  const box=this.canvas.getBoundingClientRect(),w=box.width||WIDTH,h=box.height||HEIGHT;
  const dpr=Math.max(1,Math.min(2,this.win?.devicePixelRatio||1));
  this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);
  this.ctx.setTransform(this.canvas.width/WIDTH,0,0,this.canvas.height/HEIGHT,0,0);
  this._resizeBackdrop(dpr);
  this._paint(this.clock());
 }
 _drawBackground(ctx,width,height){
  const gradient=ctx.createLinearGradient(0,0,0,height);
  gradient.addColorStop(0,'#064b34');gradient.addColorStop(.55,'#003223');gradient.addColorStop(1,'#031c16');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
  const background=this._asset('__background');
  if(drawable(background)){
   const aw=background.naturalWidth??background.width,ah=background.naturalHeight??background.height;
   const scale=Math.max(width/aw,height/ah);
   ctx.drawImage(background,(width-aw*scale)/2,(height-ah*scale)/2,aw*scale,ah*scale);
  }
 }
 _resizeBackdrop(dpr){
  if(!this.backdropCanvas||this.disposed)return;
  const rect=this.backdropCanvas.getBoundingClientRect?.()||{};
  const width=rect.width>0?rect.width:this.win?.innerWidth>0?this.win.innerWidth:WIDTH;
  const height=rect.height>0?rect.height:this.win?.innerHeight>0?this.win.innerHeight:HEIGHT;
  const pixelWidth=Math.max(1,Math.round(width*dpr)),pixelHeight=Math.max(1,Math.round(height*dpr));
  const image=this._asset('__background'),previous=this.backdropState;
  if(previous&&previous.width===width&&previous.height===height&&previous.pixelWidth===pixelWidth&&
    previous.pixelHeight===pixelHeight&&previous.image===image)return;
  // The same verified bitmap covers the viewport behind scene and controls.
  // It is static: a spin, focus event or unchanged resize never redraws it.
  this.backdropCanvas.width=pixelWidth;this.backdropCanvas.height=pixelHeight;
  this.backdropCtx.setTransform(pixelWidth/width,0,0,pixelHeight/height,0,0);
  this.backdropCtx.clearRect(0,0,width,height);this._drawBackground(this.backdropCtx,width,height);
  this.backdropState={width,height,pixelWidth,pixelHeight,image};
 }
 start(){
  if(this.disposed||this.rolling||this.celebration)throw Error('REELS_NOT_READY');
  if(this.hidden||this.doc?.hidden)throw Error('GAME_NOT_VISIBLE');
  this._verifySymbols();this.resultPresentationDismissed=false;this.stopLinePresentation(false);this.rolling=true;this.stopHint=false;this.pending=null;this.reelPlans=null;this.finishAt=0;
  this.wheelStartAngle=this.wheelAngle;this.wheelPlan=null;
  this.reelStopped.fill(false);this.startedAt=this.clock();this.lastTime=null;this.frames=0;this.fpsSamples=[];
  this._stopSound('win');this._sound('spin');this._loop();
 }
 // Decorative strip travel has no RNG and cannot select a winning symbol.
 // Positions are continuous pixel offsets; only a verified receipt supplies
 // the terminal three symbols. No fixed-cell swapping or fake blur streaks.
 _motionAt(col,now){
  const plan=this.reelPlans?.[col];
  if(plan){
   const duration=plan.endTime-plan.startTime;
   const u=Math.max(0,Math.min(1,(now-plan.startTime)/duration));
   if(u===1)return{position:plan.endPosition,velocity:0};
   const u2=u*u,u3=u2*u,delta=plan.endPosition-plan.startPosition;
   return{
    position:plan.startPosition+(-2*u3+3*u2)*delta+(u3-2*u2+u)*plan.startVelocity*duration,
    velocity:(-6*u2+6*u)*delta/duration+(3*u2-4*u+1)*plan.startVelocity
   };
  }
  const cfg=MULTIHOT20_MOTION;
  const elapsed=Math.max(0,now-this.startedAt-col*cfg.reelStartDelayMs),ramp=cfg.accelerationMs,speed=cfg.speedPixelsPerMs;
  return elapsed<ramp?
   {position:speed*elapsed*elapsed/(2*ramp),velocity:speed*elapsed/ramp}:
   {position:speed*(elapsed-ramp/2),velocity:speed};
 }
 _plan(col,now,duration,endPosition){
  const {position,velocity}=this._motionAt(col,now);
  const targetSteps=endPosition===undefined?Math.ceil((position+Math.max(TILE_H*MULTIHOT20_MOTION.minimumRunInTiles,velocity*duration/2))/TILE_H):Math.round(endPosition/TILE_H);
  const target=targetSteps*TILE_H;
  return {startTime:now,endTime:now+duration,startPosition:position,endPosition:target,targetSteps,
   startVelocity:Math.max(0,Math.min(velocity,3*(target-position)/duration))};
 }
 _wheelMotionAt(now){
  const plan=this.wheelPlan;
  if(plan){
   const duration=plan.endTime-plan.startTime,u=Math.max(0,Math.min(1,(now-plan.startTime)/duration));
   if(u===1)return {angle:plan.endAngle,velocity:0};
   const u2=u*u,u3=u2*u,delta=plan.endAngle-plan.startAngle;
   return {angle:plan.startAngle+(-2*u3+3*u2)*delta+(u3-2*u2+u)*plan.startVelocity*duration,
    velocity:(-6*u2+6*u)*delta/duration+(3*u2-4*u+1)*plan.startVelocity};
  }
  if(!this.rolling)return {angle:this.wheelAngle,velocity:0};
  const elapsed=Math.max(0,now-this.startedAt),ramp=MULTIHOT20_MOTION.accelerationMs,speed=MULTIHOT20_MOTION.wheelRadiansPerMs;
  return elapsed<ramp?
   {angle:this.wheelStartAngle+speed*elapsed*elapsed/(2*ramp),velocity:speed*elapsed/ramp}:
   {angle:this.wheelStartAngle+speed*(elapsed-ramp/2),velocity:speed};
 }
 _planWheel(now,duration,multiplier,endAngle){
  const {angle,velocity}=this._wheelMotionAt(now),base=wheelStopAngle(multiplier);
  const minimum=angle+Math.max(MULTIHOT20_MOTION.wheelMinimumRunRadians,velocity*duration/2);
  const target=endAngle===undefined?base+Math.ceil((minimum-base)/TAU)*TAU:endAngle;
  return {startTime:now,endTime:now+duration,startAngle:angle,endAngle:target,
   startVelocity:Math.max(0,Math.min(velocity,3*(target-angle)/duration))};
 }
 speedUp(){
  if(this.celebration){this._completeCelebration({showLines:false});return true}
  if(this.linePresentation)return this.stopLinePresentation();
  if(!this.rolling)return false;
  if(this.stopHint)return true;
  this.stopHint=true;
  if(this.reelPlans){
   const now=this.clock(),cfg=MULTIHOT20_MOTION;
   // Preserve already inserted target tiles. STOP shortens presentation only;
   // neither the authoritative grid nor the destination offsets are changed.
   this.reelPlans=this.reelPlans.map((plan,col)=>plan.endTime<=now?plan:
    this._plan(col,now,Math.min(plan.endTime-now,cfg.fastSettleDurationMs+col*cfg.fastReelDelayMs),plan.endPosition));
   if(this.wheelPlan&&this.wheelPlan.endTime>now)this.wheelPlan=this._planWheel(now,
    Math.min(this.wheelPlan.endTime-now,cfg.fastSettleDurationMs+(REELS-1)*cfg.fastReelDelayMs),this.pending.wheelMultiplier,this.wheelPlan.endAngle);
   this.finishAt=this.reelPlans[0].endTime;
  }
  return true;
 }
 _receiptSnapshot(receipt){
  if(!receipt||receipt.gameId!==PRESENTATION_GAME_ID||!Array.isArray(receipt.grid)||receipt.grid.length!==ROWS||
     receipt.grid.some(row=>!Array.isArray(row)||row.length!==REELS||row.some(s=>!this.symbols.includes(s))))throw Error('SERVER_GRID_REQUIRED');
  if(!Number.isInteger(receipt.wheelMultiplier)||!Object.hasOwn(WHEEL_STOP_SECTORS,receipt.wheelMultiplier))throw Error('SERVER_MULTIPLIER_REQUIRED');
  return {...receipt,grid:receipt.grid.map(row=>[...row]),winLines:(receipt.winLines||[]).map(line=>({...line,
   positions:(line.positions||[]).map(p=>Array.isArray(p)?[...p]:{...p})}))};
 }
 // The app validates the authenticated historical receipt and its original bet
 // before calling this. Restoring cannot start animation, emit sound or settle
 // a wallet again; it only paints that already settled server result.
 restore(receipt){
  if(this.disposed)throw Error('SCENE_DISPOSED');
  if(this.rolling||this.pending||this.celebration)throw Error('REELS_NOT_READY');
  const snapshot=this._receiptSnapshot(receipt);
  this.stopLinePresentation(false);this._cancelFrame();this.current=snapshot.grid.map(row=>[...row]);this.receipt=snapshot;
  this.pending=null;this.reelPlans=null;this.wheelPlan=null;this.wheelAngle=wheelStopAngle(snapshot.wheelMultiplier);this.stopHint=false;this.reelStopped.fill(true);
  this._paint(this.clock());return true;
 }
 _presentationLines(){
  const receipt=this.receipt,lines=receipt?.winLines,cfg=MULTIHOT20_LINE_PRESENTATION,win=cents(receipt?.finalWin);
  if(receipt?.currency!=='ETB'||typeof receipt.roundId!=='string'||!receipt.roundId||
     !Array.isArray(lines)||!lines.length||lines.length>cfg.maxLines||win===null||win<=0n)return [];
  const seen=new Set(),views=[];
  for(const [index,line]of lines.entries()){
   const base=cents(line.baseWin);
   if(!Number.isInteger(line.line)||line.line<1||line.line>cfg.maxLines||seen.has(line.line)||
      !this.symbols.includes(line.symbol)||!Number.isInteger(line.count)||line.count<3||line.count>REELS||
      base===null||base<=0n||!Array.isArray(line.positions)||line.positions.length!==line.count)return [];
   const positions=line.positions.map(p=>Array.isArray(p)?[p[0],p[1]]:[p?.row,p?.col]);
   const rows=MULTIHOT20_PAYLINE_ROWS[line.line-1];
   if(positions.some(([row,col],i)=>!Number.isInteger(row)||row<0||row>=ROWS||col!==i||
      row!==rows[col]||receipt.grid[row][col]!==line.symbol))return [];
   seen.add(line.line);
   // The app can render the original miniature symbols and a presentation
   // equation from these exact fields. No per-line payout is invented here;
   // capped receipts explicitly carry their total cap into the view.
   views.push(Object.freeze({roundId:receipt.roundId,line:line.line,symbol:line.symbol,count:line.count,
    baseWin:line.baseWin,wheelMultiplier:receipt.wheelMultiplier,currency:'ETB',
    maxWinCapped:receipt.maxWinCapped===true,totalWin:receipt.finalWin,index,totalLines:lines.length,
    positions:Object.freeze(positions.map(p=>Object.freeze(p))),
    path:Object.freeze(rows.map((row,col)=>Object.freeze([row,col])))}));
  }
  return Object.freeze(views);
 }
 _setLineView(view,force=false){
  if(!force&&this.lineView===view)return;
  this.lineView=view;
  try{this.onLinePresentation?.(view)}catch{/* A caption cannot change a settled receipt. */}
 }
 _beginLinePresentation(){
  this.stopLinePresentation(false);
  if(this.disposed||this.hidden||this.doc?.hidden||this.reducedMotion||this.resultPresentationDismissed)return false;
  const lines=this._presentationLines();if(!lines.length)return false;
  const startedAt=this.clock();
  this.linePresentation={roundId:this.receipt.roundId,lines,startedAt};
  this._loop();return true;
 }
 stopLinePresentation(paint=true){
  const active=!!this.linePresentation||!!this.lineView;
  this.linePresentation=null;this._setLineView(null,true);
  if(!this.rolling&&!this.celebration)this._cancelFrame();
  if(active&&paint&&!this.disposed)this._paint(this.clock());
  return active;
 }
 // A dialog can interrupt before the receipt or celebration has finished.
 // Keep that dismissal until the next explicit start(), so completing the
 // accepted round cannot revive a win cue or result loop behind the modal.
 // This does not cancel reels, discard a receipt or resolve a wager again.
 dismissResultPresentation(){
  if(this.disposed)return false;
  const hadLine=!!this.linePresentation||!!this.lineView;
  const changed=!this.resultPresentationDismissed||hadLine||!!this.celebration;
  this.resultPresentationDismissed=true;this.stopLinePresentation(false);
  if(this.celebration)this._completeCelebration({showLines:false});
  else {this._stopSound('win');if(hadLine)this._paint(this.clock())}
  return changed;
 }
 async settle(receipt){
  if(this.disposed)throw Error('SCENE_DISPOSED');
  if(!this.rolling)throw Error('SPIN_NOT_STARTED');
  if(this.pending)throw Error('RECEIPT_ALREADY_PENDING');
  // Snapshot the server presentation data so a caller cannot alter a moving
  // strip by subsequently mutating its grid. Never compute or adjust payouts.
  this.pending=this._receiptSnapshot(receipt);
  const now=this.clock(),cfg=MULTIHOT20_MOTION;
  this.reelPlans=Array.from({length:REELS},(_,col)=>this._plan(col,now,
   (this.stopHint?cfg.fastSettleDurationMs:cfg.settleDurationMs)+col*(this.stopHint?cfg.fastReelDelayMs:cfg.reelDelayMs)));
  this.wheelPlan=this._planWheel(now,this.reelPlans.at(-1).endTime-now,this.pending.wheelMultiplier);
  this.finishAt=this.reelPlans[0].endTime;
  if(this.hidden||this.doc?.hidden||this.reducedMotion){this._finish({immediate:true,silent:true});return true}
  return new Promise(resolve=>{this.resolveAnimation=resolve;this._loop()});
 }
 _loop(){
  if(this.disposed||(!this.rolling&&!this.celebration&&!this.linePresentation)||this.hidden||this.doc?.hidden||this.frameId!==null)return;
  this.frameId=this.requestFrame(time=>{
   this.frameId=null;
   if(this.disposed||(!this.rolling&&!this.celebration&&!this.linePresentation)||this.hidden||this.doc?.hidden)return;
   const now=Number.isFinite(time)?time:this.clock();
   if(this.lastTime!==null){const dt=now-this.lastTime;if(dt>1&&dt<200)this.fpsSamples.push(1000/dt);if(this.fpsSamples.length>120)this.fpsSamples.shift()}
   this.lastTime=now;this.frames++;
   if(this.celebration){
    if(this.reducedMotion||now>=this.celebration.endsAt){this._completeCelebration({showLines:!this.reducedMotion});return}
    this._paint(now);this._loop();return;
   }
   if(this.linePresentation){
    const result=this.linePresentation,cfg=MULTIHOT20_LINE_PRESENTATION;
    if(this.reducedMotion||this.receipt?.roundId!==result.roundId){this.stopLinePresentation();return}
    const index=Math.floor((now-result.startedAt-cfg.summaryMs)/cfg.lineMs);
    this._setLineView(index<0?null:result.lines[index%result.lines.length]);
    this._paint(now);this._loop();return;
   }
   if(this.pending){
    if(this.reducedMotion){this._finish({immediate:true,silent:true});return}
    for(let col=0;col<REELS;col++)if(!this.reelStopped[col]&&now>=this.reelPlans[col].endTime){this.reelStopped[col]=true;this._sound('reel-stop')}
    if(this.reelStopped.every(Boolean)){this._finish();return}
   }
   this._paint(now);this._loop();
  });
 }
 _symbol(ctx,s,x,y,w,h){
  const a=this._asset(s);
  if(drawable(a)){
   const aw=a.naturalWidth??a.width,ah=a.naturalHeight??a.height,scale=Math.min(w/aw,h/ah);
   ctx.drawImage(a,x+(w-aw*scale)/2,y+(h-ah*scale)/2,aw*scale,ah*scale);
  }else{
   ctx.fillStyle='#052f23';ctx.fillRect(x,y,w,h);ctx.fillStyle='#e0c46b';ctx.textAlign='center';ctx.font='bold 15px sans-serif';
   ctx.fillText(this.strictAssets?'ASSET REQUIRED':s,x+w/2,y+h/2);
  }
 }
 _stripSymbol(index,col){
  const plan=this.reelPlans?.[col],row=plan?index+plan.targetSteps:-1;
  if(this.pending&&row>=0&&row<ROWS)return this.pending.grid[row][col];
  if(index>=0&&index<ROWS&&this.current)return this.current[index][col];
  return this.symbols[modulo(index*3+col*7,this.symbols.length)];
 }
 _title(ctx){
  // A wide desktop composition can draw this same verified title in its own
  // canvas beside the wheel. Mobile/standalone retain the original in-stage
  // position. A layout callback never changes scene outcome or animation.
  try{if(this.showInternalTitle()===false)return}catch{/* Keep the title if layout information is unavailable. */}
  const title=this._asset('__title');
  if(drawable(title)){this._symbol(ctx,'__title',60,16,480,76);return}
  if(this.strictAssets)return;
  // Text is allowed only for explicitly non-strict synthetic QA scenes.
  ctx.save();ctx.font='bold 43px Georgia,serif';ctx.textAlign='left';
  const prefix='MULTI HOT ',prefixWidth=finite(ctx.measureText?.(prefix)?.width)||270,numberWidth=finite(ctx.measureText?.('20')?.width)||54;
  const titleX=(WIDTH-prefixWidth-numberWidth)/2;
  ctx.fillStyle='#ffdb6d';ctx.fillText(prefix,titleX,64);ctx.fillStyle='#fa5791';ctx.fillText('20',titleX+prefixWidth,64);ctx.restore();
 }
 _wheel(ctx,now){
  const frame=this._asset('__wheelFrame'),numbers=this._asset('__wheelNumbers'),light=this._asset('__wheelLight');
  if(!drawable(frame)||!drawable(numbers)||!drawable(light))return;
  const source=WHEEL_BACKGROUND_FRAME;
  ctx.drawImage(frame,source.x,source.y,source.w,source.h,X,WHEEL_TOP,GRID_W,source.h*WHEEL_SCALE);
  ctx.save();ctx.beginPath();ctx.rect(X,WHEEL_TOP,GRID_W,Y-WHEEL_TOP);ctx.clip();
  const angle=this._wheelMotionAt(now).angle,ring=WHEEL_RING_FRAME;
  const drawRing=image=>{
   ctx.save();ctx.translate(WHEEL_CENTRE_X,WHEEL_CENTRE_Y);ctx.rotate(angle);
   ctx.drawImage(image,ring.x,ring.y,ring.w,ring.h,
    (ring.offsetX-ring.sourceSize/2)*WHEEL_RING_SCALE,(ring.offsetY-ring.sourceSize/2)*WHEEL_RING_SCALE,
    ring.w*WHEEL_RING_SCALE,ring.h*WHEEL_RING_SCALE);
   ctx.restore();
  };
  drawRing(numbers);
  // Brighten the actual moving numeral only inside the original selector.
  // The dim ring, neighbouring sectors and bright ring share one rotation;
  // no generated centre numeral replaces the recorded artwork.
  ctx.save();ctx.beginPath();
  for(const [i,[x,y]]of [[368,34],[611,34],[570,255],[411,255]].entries()){
   if(i===0)ctx.moveTo(X+x*WHEEL_SCALE,WHEEL_TOP+y*WHEEL_SCALE);else ctx.lineTo(X+x*WHEEL_SCALE,WHEEL_TOP+y*WHEEL_SCALE);
  }
  ctx.closePath();ctx.clip();
  if(this.linePresentation){
   this._selectedMultiplierEmphasis(ctx,now);
   ctx.globalAlpha*=.89+.11*Math.sin((now-this.linePresentation.startedAt)*Math.PI/450);
  }
  drawRing(light);ctx.restore();ctx.restore();
 }
 _selectedMultiplierEmphasis(ctx,now){
  // Fresh r7/official/spin-04-win-reference.jpg and win-line-later.jpg show
  // yellow-orange fire rising from the selected wedge's base. The approved
  // Spine JSON names its frames,
  // but no trusted loaded frame-to-PNG mapping is available. This cancellable
  // deterministic flame is original ZPLAY drawing, NOT copied provider
  // animation or an implied multiplier/outcome selector. The verified
  // original numeral is drawn above it, at the unchanged receipt angle.
  const phase=(now-this.linePresentation.startedAt)/1000;
  const sx=x=>X+x*WHEEL_SCALE,sy=y=>WHEEL_TOP+y*WHEEL_SCALE;
  // Source-over translucent gradients retain orange edges and a gold core.
  // Additive overlapping pale tongues saturated into flat white spikes in
  // the earlier rendering. Soft asymmetric curls avoid that visual defect.
  const glow=ctx.createLinearGradient(0,sy(151),0,sy(255));
  glow.addColorStop(0,'rgba(255,110,8,0)');glow.addColorStop(.48,'rgba(255,117,12,.18)');
  glow.addColorStop(.8,'rgba(255,176,20,.43)');glow.addColorStop(1,'rgba(255,218,50,.7)');
  ctx.save();ctx.globalCompositeOperation='source-over';ctx.fillStyle=glow;
  ctx.beginPath();ctx.moveTo(sx(407),sy(255));ctx.lineTo(sx(577),sy(255));
  ctx.lineTo(sx(577),sy(151));ctx.lineTo(sx(407),sy(151));ctx.closePath();ctx.fill();
  const drift=Math.sin(phase*3.7)*6,curl=Math.sin(phase*2.9+1.4)*7,lift=Math.sin(phase*5.1+.8)*6;
  const flame=ctx.createLinearGradient(0,sy(165),0,sy(255));
  flame.addColorStop(0,'rgba(255,113,6,0)');flame.addColorStop(.22,'rgba(255,128,8,.35)');
  flame.addColorStop(.62,'rgba(255,178,17,.76)');flame.addColorStop(1,'rgba(255,205,37,.83)');
  const core=ctx.createLinearGradient(0,sy(185),0,sy(255));
  core.addColorStop(0,'rgba(255,226,66,0)');core.addColorStop(.28,'rgba(255,225,62,.5)');
  core.addColorStop(.66,'rgba(255,239,112,.82)');core.addColorStop(1,'rgba(255,231,81,.86)');
  const move=(x,y)=>ctx.moveTo(sx(x),sy(y)),curve=(a,b,c,d,e,f)=>ctx.bezierCurveTo(sx(a),sy(b),sx(c),sy(d),sx(e),sy(f));
  // One uneven joined plume and three differently shaped curling ribbons.
  // There is no repeated row of identical pointed tongues.
  ctx.fillStyle=flame;ctx.beginPath();move(406,255);
  curve(426,239,414+drift,223,430+drift,203);
  curve(426+drift,225,451,224,447,211+lift);
  curve(438,199+lift,452+curl,181,464+curl,177);
  curve(452+curl,197,478,201,477,216);
  curve(489,212,484+drift,183,506+drift,165+lift);
  curve(495+drift,195,521,195,515,215);
  curve(533,212,531+curl,195,547+curl,183);
  curve(541+curl,214,566,207,559,229);
  curve(555,241,580,238,580,255);ctx.closePath();ctx.fill();
  ctx.fillStyle=core;ctx.beginPath();move(427,255);
  curve(443,241,428+drift,229,443+drift,214);
  curve(438+drift,231,460+curl,225,457,241);
  curve(454,247,467,251,472,255);
  curve(456,258,440,259,427,255);ctx.closePath();ctx.fill();
  ctx.beginPath();move(462,255);
  curve(481,246,461+curl,229,479+curl,215);
  curve(491+curl,206,478+drift,192,494+drift,183+lift);
  curve(484+drift,205,506,213,496,231);
  curve(490,241,509,245,513,255);ctx.closePath();ctx.fill();
  ctx.beginPath();move(508,255);
  curve(526,240,515+drift,224,531+drift,208+lift);
  curve(525+drift,225,546+curl,225,544,238);
  curve(541,245,562,247,569,255);
  curve(550,259,528,258,508,255);ctx.closePath();ctx.fill();
  ctx.restore();
 }
 _selectedCellFire(ctx,row,col,now){
  // Independent, deterministic curved ribbons follow only the winning
  // receipt cells. They use a fixed amount of vector work (four edge bands
  // with narrow moving cores), no particles, sampling, filters or outcome RNG.
  const x=X+col*REEL_W+3,y=Y+row*TILE_H+3,w=REEL_W-6,h=TILE_H-6;
  const phase=(now-this.linePresentation.startedAt)/1000+row*.53+col*.71;
  ctx.save();ctx.beginPath();ctx.rect(x-2,y-2,w+4,h+4);ctx.clip();
  ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;
  const edges=[{x,y,tx:1,ty:0,nx:0,ny:1,length:w},{x:x+w,y,tx:0,ty:1,nx:-1,ny:0,length:h},
   {x:x+w,y:y+h,tx:-1,ty:0,nx:0,ny:-1,length:w},{x,y:y+h,tx:0,ty:-1,nx:1,ny:0,length:h}];
  const curve=points=>{
   for(let i=0;i<points.length-1;i++){
    const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];
    ctx.bezierCurveTo(b[0]+(c[0]-a[0])/6,b[1]+(c[1]-a[1])/6,
     c[0]-(d[0]-b[0])/6,c[1]-(d[1]-b[1])/6,c[0],c[1]);
   }
  };
  for(const [side,edge]of edges.entries()){
   const point=(along,inset)=>[edge.x+edge.tx*along+edge.nx*inset,edge.y+edge.ty*along+edge.ny*inset];
   const outer=[],inner=[],coreOuter=[],coreInner=[];
   for(let i=0;i<=8;i++){
    const along=edge.length*i/8,wave=phase*4.2+side*1.8+i*1.7;
    const crest=(.5+.5*Math.sin(phase*3.3-side*.9+i*2.5))**3;
    const centre=1.9+2.1*Math.sin(wave)+1.2*Math.sin(phase*2.3+i*3.1-side);
    outer.push(point(along,centre-3.2));inner.push(point(along,centre+3.3+3.6*crest));
    coreOuter.push(point(along,centre-.75));coreInner.push(point(along,centre+1.05+1.7*crest));
   }
   const from=point(0,-2),to=point(0,11),gradient=ctx.createLinearGradient(...from,...to);
   gradient.addColorStop(0,'rgba(255,87,4,0)');gradient.addColorStop(.12,'rgba(255,108,7,.16)');
   gradient.addColorStop(.25,'rgba(255,150,12,.4)');gradient.addColorStop(.38,'rgba(255,226,83,.44)');
   gradient.addColorStop(.6,'rgba(255,164,19,.21)');gradient.addColorStop(1,'rgba(255,105,6,0)');
   ctx.fillStyle=gradient;ctx.beginPath();ctx.moveTo(...outer[0]);curve(outer);
   const reversed=inner.reverse();ctx.lineTo(...reversed[0]);curve(reversed);ctx.closePath();ctx.fill();
   const light=ctx.createLinearGradient(...from,...to);
   light.addColorStop(0,'rgba(255,150,12,.55)');light.addColorStop(.28,'rgba(255,226,83,.88)');
   light.addColorStop(.56,'rgba(255,226,83,.72)');light.addColorStop(1,'rgba(255,150,12,0)');
   ctx.fillStyle=light;ctx.beginPath();ctx.moveTo(...coreOuter[0]);curve(coreOuter);
   const coreReverse=coreInner.reverse();ctx.lineTo(...coreReverse[0]);curve(coreReverse);ctx.closePath();ctx.fill();
  }
  ctx.restore();
 }
 _winPart(ctx,name,x,y,width,height,scale,alpha=1,rotation=0,additive=false){
  if(scale<=0||alpha<=0)return;
  ctx.save();ctx.globalAlpha=alpha;ctx.globalCompositeOperation=additive?'lighter':'source-over';
  ctx.translate(x,y);ctx.rotate(rotation);
  this._symbol(ctx,name,-width*scale/2,-height*scale/2,width*scale,height*scale);ctx.restore();
 }
 _paintCelebration(ctx,now){
  const celebration=this.celebration;if(!celebration)return;
  const cfg=MULTIHOT20_WIN_PRESENTATION;
  let visibleTop=0;
  try{const value=this.visibleSceneTop();if(Number.isFinite(value)&&value>=0&&value<=HEIGHT/2)visibleTop=value}catch{}
  // Desktop exposes logical y110..600 after moving the title beside the
  // wheel. Centre only the premium composition in that visible region;
  // all wheel/reel/line coordinates and the accepted receipt stay fixed.
  ctx.save();ctx.translate(0,visibleTop/2);
  // Turbo compresses this presentation timeline only. Normal entrance keys
  // retain the original visual-data timestamps; dismissal is a ZPLAY choice.
  const age=Math.max(0,now-celebration.startedAt)*cfg.durationMs/celebration.durationMs;
  const time=age/1000,fade=Math.min(1,Math.max(0,(cfg.durationMs-age)/cfg.exitFadeMs));
  const light=keyValue(WIN_KEYS.light,time),frame=keyValue(WIN_KEYS.frame,time);
  this._winPart(ctx,'__winBacklight',300,300,555,542,light,fade*.46,time*Math.PI/8);
  this._winPart(ctx,'__winShine',300,300,480,480,light,fade*.32,-time*Math.PI/6,true);
  this._winPart(ctx,'__winFrame',300,300,399,379,frame,fade);
  // These are measured visible-pixel crops, not unavailable Spine trim
  // offsets. The common bounded composition is independent ZPLAY placement;
  // higher tiers reuse it without claiming an observed provider composition.
  const crownScale=keyValue(WIN_KEYS.crownScale,time),crownY=176-keyValue(WIN_KEYS.crownY,time);
  this._winPart(ctx,'__winCrownSmall',300,crownY,60,48,crownScale,fade);
  const tierScale=keyValue(WIN_KEYS.tierScale,time),tierY=248-keyValue(WIN_KEYS.tierY,time);
  const tierImage=this._asset(celebration.tier.asset),tierWidth=Math.min(420,tierImage?.width??264);
  const tierHeight=tierWidth*(tierImage?.height??105)/(tierImage?.width??264);
  this._winPart(ctx,celebration.tier.asset,300,tierY,tierWidth,tierHeight,tierScale,fade);
  this._winPart(ctx,celebration.tier.asset,300,tierY,tierWidth,tierHeight,tierScale,fade*keyValue(WIN_KEYS.tierFlash,time),0,true);
  const winScale=keyValue(WIN_KEYS.winScale,time),winY=327-keyValue(WIN_KEYS.winY,time);
  this._winPart(ctx,'__winText',300,winY,236,100,winScale,fade);
  this._winPart(ctx,'__winText',300,winY,236,100,winScale,fade*keyValue(WIN_KEYS.winFlash,time),0,true);
  const moneyScale=keyValue(WIN_KEYS.moneyScale,time),moneyY=450-keyValue(WIN_KEYS.moneyY,time);
  // The unrotated original coin is a deliberate bounded placement inside the
  // measured transparent money-frame aperture, not a guessed atlas rotation.
  this._winPart(ctx,'__winCoin',300,moneyY-31*moneyScale,82,76,moneyScale,fade);
  this._winPart(ctx,'__winMoneyFrame',300,moneyY,430,155,moneyScale,fade);
  if(moneyScale>0&&fade>0){
   ctx.save();ctx.globalAlpha=fade;ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.font=`900 ${31*moneyScale}px Arial, sans-serif`;ctx.fillStyle='#fff';ctx.shadowColor='#230f35';ctx.shadowBlur=3;
   // Exact accepted receipt string. Never count up, multiply, round or credit
   // a displayed amount here; the authenticated server has already settled it.
   ctx.fillText(celebration.amount+' ETB',300,moneyY+30*moneyScale,330*moneyScale);ctx.restore();
  }
  ctx.restore();
 }
 _setCelebration(value){
  this.celebration=value;
  if(value)this.canvas.setAttribute?.('data-win-presentation',value.tier.name);
  else this.canvas.removeAttribute?.('data-win-presentation');
 }
 _paint(time){
  if(this.disposed)return;
  const ctx=this.ctx,now=Number.isFinite(time)?time:this.clock();
  ctx.clearRect(0,0,WIDTH,HEIGHT);
  // Standalone embeds keep their original background. The full-page Player
  // paints it once on its separate backdrop, leaving this stage transparent.
  if(!this.backdropCanvas)this._drawBackground(ctx,WIDTH,HEIGHT);
  if(this.celebration&&!this.backdropCanvas){ctx.fillStyle='rgba(0,0,0,.68)';ctx.fillRect(0,0,WIDTH,HEIGHT)}
  ctx.save();if(this.celebration)ctx.globalAlpha=.35;
  this._title(ctx);this._wheel(ctx,now);
  const box=this._asset('__boxFrame'),originalBox=drawable(box);
  if(originalBox)ctx.drawImage(box,(WIDTH-BOX_WIDTH)/2,Y-26*BOX_SCALE,BOX_WIDTH,BOX_HEIGHT);
  else {ctx.fillStyle='#062b20';ctx.fillRect(X-5,Y-5,GRID_W+10,GRID_H+10)}
  for(let col=0;col<REELS;col++){
   const x=X+col*REEL_W,offset=this.rolling?this._motionAt(col,now).position:0;
   ctx.save();ctx.beginPath();ctx.rect(x,Y,REEL_W,GRID_H);ctx.clip();
   if(!originalBox){ctx.fillStyle=col%2?'rgba(0,35,25,.86)':'rgba(0,43,28,.86)';ctx.fillRect(x,Y,REEL_W,GRID_H)}
   const first=Math.floor(-offset/TILE_H)-1,last=Math.ceil((GRID_H-offset)/TILE_H);
   for(let index=first;index<=last;index++){
    const symbol=this.rolling?this._stripSymbol(index,col):(this.current?.[index]?.[col]??this.symbols[modulo(index*3+col*7,this.symbols.length)]);
    this._symbol(ctx,symbol,x+4,Y+index*TILE_H+offset+4,REEL_W-8,TILE_H-8);
   }
   ctx.restore();
   if(!originalBox){ctx.strokeStyle='#bca459';ctx.lineWidth=1;ctx.strokeRect(x,Y,REEL_W,GRID_H)}
  }
  if(!this.rolling&&this.receipt){
   const selected=this.lineView,pulse=selected?(.5+.5*Math.sin((now-this.linePresentation.startedAt)*Math.PI/500)):0;
   // Original Box/Line PNGs have opaque #ffee00 paths. The accepted line ID
   // selects its chart path; only its matching receipt positions get borders.
   ctx.lineWidth=selected?2.5+pulse:3;ctx.strokeStyle=selected?'#ffee00':'#f9db6c';
   ctx.shadowColor='#ffba36';ctx.shadowBlur=selected?0:12;
   if(selected){
    ctx.save();ctx.globalAlpha*=.72;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
    selected.path.forEach(([row,col],i)=>{
     const x=X+(col+.5)*REEL_W,y=Y+(row+.5)*TILE_H;
     if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    });
    ctx.stroke();ctx.restore();
   }
   if(selected){ctx.lineWidth=1;ctx.strokeStyle='#ff9c20'}
   for(const line of selected?[selected]:this.receipt.winLines||[])for(const p of line.positions||[]){
    const row=Array.isArray(p)?p[0]:p.row,col=Array.isArray(p)?p[1]:p.col;
    if(Number.isInteger(row)&&Number.isInteger(col)&&row>=0&&row<ROWS&&col>=0&&col<REELS){
     if(selected){ctx.save();ctx.globalAlpha*=.28}
     ctx.strokeRect(X+col*REEL_W+3,Y+row*TILE_H+3,REEL_W-6,TILE_H-6);
     if(selected)ctx.restore();
     if(selected)this._selectedCellFire(ctx,row,col,now);
    }
   }
  }
  ctx.shadowBlur=0;
  if(!originalBox){ctx.strokeStyle='#e1bf62';ctx.lineWidth=3;ctx.strokeRect(X-3,Y-3,GRID_W+6,GRID_H+6)}
  ctx.restore();if(this.celebration)this._paintCelebration(ctx,now);
 }
 _finish({immediate=false,silent=false}={}){
  if(!this.pending||this.disposed)return;
  this._stopSound('spin');
  for(let col=0;col<REELS;col++)if(!this.reelStopped[col]){this.reelStopped[col]=true;if(!silent)this._sound('reel-stop')}
  this.current=this.pending.grid.map(row=>[...row]);this.receipt=this.pending;this.pending=null;this.reelPlans=null;this.rolling=false;
  this.wheelAngle=wheelStopAngle(this.receipt.wheelMultiplier);this.wheelPlan=null;
  this._cancelFrame();
  const now=this.clock(),win=cents(this.receipt.finalWin),tier=presentationTier(this.receipt);
  if(!silent&&!this.resultPresentationDismissed&&win!==null&&win>0n)this._sound('win');
  if(tier&&!immediate&&!this.hidden&&!this.doc?.hidden&&!this.reducedMotion&&!this.resultPresentationDismissed){
   const durationMs=this.stopHint?MULTIHOT20_WIN_PRESENTATION.turboDurationMs:MULTIHOT20_WIN_PRESENTATION.durationMs;
   this._setCelebration({tier,amount:this.receipt.finalWin,roundId:this.receipt.roundId,startedAt:now,durationMs,endsAt:now+durationMs});
   this._paint(now);this._loop();return;
  }
  if(!immediate&&!silent)this._beginLinePresentation();
  this._paint(now);
  const resolve=this.resolveAnimation;this.resolveAnimation=null;resolve?.(true);
 }
 _completeCelebration({showLines=true}={}){
  if(!this.celebration)return false;
  this._setCelebration(null);this._cancelFrame();this._stopSound('win');
  if(showLines)this._beginLinePresentation();else this.stopLinePresentation(false);
  this._paint(this.clock());
  const resolve=this.resolveAnimation;this.resolveAnimation=null;resolve?.(true);return true;
 }
 pauseAudio(){try{this.audio.pauseAll?.()}catch{}}
 resumeOptedInMusic(){if(!this.hidden&&!this.doc?.hidden&&!this.disposed)try{this.audio.resumeOptedInMusic?.()}catch{}}
 reset(){
  this._cancelFrame();this._stopSound('spin');
  const resolve=this.resolveAnimation;this.resolveAnimation=null;resolve?.(false);
  this._setCelebration(null);this.stopLinePresentation(false);
  this.rolling=false;this.pending=null;this.reelPlans=null;this.wheelPlan=null;this.wheelAngle=wheelStopAngle(2);this.wheelStartAngle=this.wheelAngle;this.current=null;this.receipt=null;this.stopHint=false;this.reelStopped.fill(false);
  this._paint(this.clock());this.pauseAudio();
 }
 inspect(){const sample=this.fpsSamples;return{gameId:PRESENTATION_GAME_ID,rolling:this.rolling,receiptId:this.receipt?.roundId||null,frames:this.frames,fpsSampleCount:sample.length,
  celebration:this.celebration?{tier:this.celebration.tier.name,roundId:this.celebration.roundId,amount:this.celebration.amount,
   startedAt:this.celebration.startedAt,endsAt:this.celebration.endsAt,durationMs:this.celebration.durationMs}:null,
  averageSampledFps:sample.length?sample.reduce((s,v)=>s+v,0)/sample.length:null,originalArtworkProvided:this.symbols.every(s=>drawable(this._asset(s))),usesServerReceiptOnly:true}}
 dispose(){
  if(this.disposed)return;this.disposed=true;this.reset();
  // Release the viewport-sized buffer, but leave the caller-owned DOM node
  // available for an asset retry or a new scene. No event listener or RAF is
  // created for the backdrop; the existing app resize path owns resizing.
  if(this.backdropCanvas){this.backdropCanvas.width=1;this.backdropCanvas.height=1}
  this.backdropCanvas=null;this.backdropCtx=null;this.backdropState=null;
  this.doc?.removeEventListener?.('visibilitychange',this.onVisibility);
  this.win?.removeEventListener?.('blur',this.onBlur);this.win?.removeEventListener?.('focus',this.onFocus);
  this.win?.removeEventListener?.('pagehide',this.onPageHide);this.win?.removeEventListener?.('pageshow',this.onPageShow);
  this.motionPreference?.removeEventListener?.('change',this.onMotionPreference);
  this.onLinePresentation=null;
 }
}
