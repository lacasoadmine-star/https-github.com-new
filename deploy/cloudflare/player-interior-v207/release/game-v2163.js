import {isBurning40,drawBurning40} from '/zplay-burning40-renderer-v207.js';
import {playGameCue} from '/assets/internal-games/presentation-v2170.js';
import {renderDimensions,appendIllustratedRules} from '/assets/internal-games/cabinet-details-v2169.js';
import {preloadArtwork} from '/assets/internal-games/artwork-v2163.js';
import {frameState,playbackDuration,frameCaption} from '/assets/internal-games/playback-v2163.js';
import {readAudioPreferences,saveAudioPreferences} from '/assets/internal-games/audio-preferences-v2161.js';
import {drawSlotEffects} from '/assets/internal-games/slot-effects-v2159.js';
import {createSpriteBank} from '/assets/internal-games/sprites-v2159.js';
import {FeatureSession} from '/assets/internal-games/feature-session-v2159.js';
let spriteBank=null,featureSession=null,lastReceipt=null,currentQuote=null,quoteGeneration=0,featureAvailable={gamble:false,respin:false},avatarChoice='Brazil',respinMode=false,spinMode='base';const reelLocks=new Set();
import {drawIcon,drawScene,palette} from '/assets/internal-games/vector-art-v2159.js';
import {mountLivePlayer} from '/assets/internal-games/live-player-v2160.js';
import {drawLiveStage,liveObjectLayout,referenceBoardColors,drawReferenceSymbol} from '/assets/internal-games/reference-art-v2165.js';
import {playSound,playCue,createFlightAudio} from '/assets/internal-games/sound-v2160.js';
let flightAudio=null;let previewLine=null;let audioVolume=.65;const audioCues=new Set();let livePlayer=null,liveStates=[],liveRaf=0,autoLeft=0;
import {neutralizeAtlasBacking} from '/assets/internal-games/sprite-colors-v2155.js';
import {createVisualCache} from '/assets/internal-games/visual-cache-v2154.js';
import {RoundSession} from '/assets/internal-games/round-session-v2159.js';
import {tumbleState,tumbleCell,plinkoPosition,flightPosition} from '/assets/internal-games/motion-v2146.js';
import {themeFor,reelMotion,symbolSources,symbolRect} from '/assets/internal-games/theme-v2159.js';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d'),message=$('message');
const gameId=new URLSearchParams(location.search).get('game')||location.pathname.split('/').at(-1);
const money=cents=>(Number(cents)/100).toLocaleString('en-ET',{minimumFractionDigits:2,maximumFractionDigits:2})+' ETB';
let renderQuality='4k',turbo=false,roundSession=null,connected=false,booting=false,walletRefreshing=false;
const roundStorage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value),removeItem:key=>localStorage.removeItem(key)};
let game=null,result=null,user=null,pending=null,busy=false,animating=false,animation=0,start=0,duration=1800,raf=0,w=800,h=500,sound=false,audio=null;
const picks=new Set(),path=[0],images=[],symbolFiles=['cherry','lemon','grape','melon','orange','bell','seven','dollar'];
let theme=themeFor({}),scene=new Image(),displayProgress=1;scene.onload=()=>drawFrame(displayProgress);
const visuals=createVisualCache();let renderedFrames=0,renderTotal=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
for(const file of symbolFiles){const img=new Image();img.src='/assets/player-v2137/symbols/'+file+(file==='dollar'?'.svg':'.webp');img.addEventListener('load',()=>drawFrame(displayProgress));images.push(img)}
function status(text){message.textContent=text}
async function api(url,body){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 try{const response=await fetch(url,{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:{accept:'application/json'},body:body?JSON.stringify(body):undefined,credentials:'same-origin',cache:'no-store',signal:controller.signal});let data;try{data=await response.json()}catch{throw Object.assign(Error('The server response was interrupted. Retry the same round.'),{status:response.status>=400?response.status:0})}if(!response.ok)throw Object.assign(Error(data.error||'The game service is unavailable.'),{status:response.status,code:data.code});return data}catch(error){if(error.name==='AbortError')throw Error('Connection timed out. Your round key is saved; retry the same round.');throw error}finally{clearTimeout(timeout)}
}
function tone(win=false){if(!sound||!game)return;try{audio??=new AudioContext();audio.resume().catch(()=>{});playGameCue(audio,game,win?'win':'spin',audioVolume);}catch{sound=false;updateAudioButton();}}
const audioPreferences=readAudioPreferences(localStorage);sound=audioPreferences.enabled;audioVolume=audioPreferences.volume;
function updateAudioButton(){$('sound').textContent=sound?'SOUND ON':'SOUND OFF';$('sound').setAttribute('aria-pressed',String(sound));$('sound').setAttribute('aria-label',sound?'Disable game sound':'Enable game sound');$('volume').value=String(Math.round(audioVolume*100))}
function primeAudio(event){if(!sound||!event.target.closest?.('#controls button,#live-controls button,#buy-bonus,#respin,#gamble-red,#gamble-black,#retry-feature'))return;try{audio??=new AudioContext();audio.resume().catch(()=>{})}catch{}}
// Unlock audio during the initial gesture, before seed and wallet requests.
document.addEventListener('pointerdown',primeAudio,{capture:true});
document.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key))primeAudio(event)},{capture:true});
updateAudioButton();
$('sound').onclick=()=>{sound=!sound;saveAudioPreferences(localStorage,sound,audioVolume);updateAudioButton();if(sound)tone();else{flightAudio?.stop();flightAudio=null}};
$('rules-button').onclick=()=>$('rules').showModal();$('rules-close').onclick=()=>$('rules').close();
function resize(){const rect=canvas.getBoundingClientRect();if(rect.width<8||rect.height<8)return;w=rect.width;h=rect.height;const pixels=renderDimensions(w,h,devicePixelRatio||1,renderQuality);canvas.width=pixels.width;canvas.height=pixels.height;canvas.dataset.renderResolution=canvas.width+'×'+canvas.height;ctx.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);drawFrame(displayProgress)}
new ResizeObserver(resize).observe(canvas);
$('quality').onclick=()=>{renderQuality=renderQuality==='4k'?'auto':'4k';$('quality').textContent=renderQuality==='4k'?'4K':'AUTO';$('quality').setAttribute('aria-pressed',String(renderQuality==='4k'));resize()};
function rounded(x,y,width,height,fill,stroke=theme.accent+'66'){if(![x,y,width,height].every(Number.isFinite)||width<=0||height<=0)return;ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,width,height,Math.min(10,width/8,height/8));ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}
function formatMultiplier(value){return Number(value.toFixed(2)).toString()+'×'}
function label(text,x,y,size=18,color='#e8ffda',maxWidth){ctx.fillStyle=color;ctx.font=`700 ${size}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';if(maxWidth)ctx.fillText(String(text),x,y,maxWidth);else ctx.fillText(String(text),x,y)}
function symbol(s,x,y,size){if(drawReferenceSymbol(ctx,game,s,x,y,size,()=>drawFrame(displayProgress)))return;if(game?.edition>=3){const pixels=Math.max(1,Math.ceil(size*canvas.width/w)),key=game.symbols[s]||'star',sprite=visuals.sprite(game.id+':raster:'+s+':'+pixels,pixels,pixels,paint=>{if(!spriteBank?.draw(paint,key,pixels/2,pixels/2,pixels))drawIcon(paint,key,pixels/2,pixels/2,pixels,game.scene,0);if(game.scene.startsWith('ice')&&!['clover','snow'].includes(key)){paint.save();paint.globalCompositeOperation='source-atop';paint.fillStyle='#88cfff1c';paint.fillRect(0,0,pixels,pixels);paint.restore()}});ctx.drawImage(sprite,x-size/2,y-size/2,size,size);const wild=s===game.wild_index,scatter=game.scatter_indices?.includes(s);if(wild||scatter){const bw=size*.76,bh=Math.max(8,size*.10);rounded(x-bw/2,y+size*.34,bw,bh,wild?'#153521e0':'#3b2353e0',theme.accent);label(wild&&scatter?'WILD · SCATTER':wild?'WILD':'SCATTER',x,y+size*.34+bh/2,Math.max(6,bh*.64),'#f9e6b1',bw*.94)}return}if(game?.edition){const pixels=Math.max(1,Math.ceil(size*canvas.width/w)),sprite=visuals.sprite(game.id+':vector:'+s+':'+pixels,pixels,pixels,paint=>drawIcon(paint,game.symbols[s]||'star',pixels/2,pixels/2,pixels,game.scene,0));ctx.drawImage(sprite,x-size/2,y-size/2,size,size);return}
 ctx.save();ctx.shadowBlur=0;ctx.shadowColor='transparent';ctx.globalCompositeOperation='screen';const img=images[s];
 if(img?.complete&&img.naturalWidth){
  const pixels=Math.max(1,Math.ceil(size*canvas.width/w)),key=theme.key+':'+s+':'+pixels+':'+img.src;
  const sprite=visuals.sprite(key,pixels,pixels,paint=>{const crop=theme.atlas?symbolRect(theme,s,img.naturalWidth,img.naturalHeight):[0,0,img.naturalWidth,img.naturalHeight],z=Math.min(pixels/crop[2],pixels/crop[3]);paint.drawImage(img,...crop,(pixels-crop[2]*z)/2,(pixels-crop[3]*z)/2,crop[2]*z,crop[3]*z);if(theme.atlas)neutralizeAtlasBacking(paint,pixels,pixels)});
  ctx.drawImage(sprite,x-size/2,y-size/2,size,size);
 }else{const labels=['CHERRY','LEMON','GRAPE','MELON','ORANGE','BELL','WILD','SCATTER'];label(labels[s]||'SUPERWIN',x,y,Math.max(8,size*.15),s===6?'#fff08b':'#e6f7d7')}
 ctx.restore();
}
canvas.onpointermove=e=>{if(!game?.paylines||animating)return;const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*w/rect.width,y=(e.clientY-rect.top)*h/rect.height,pad=Math.min(Math.max(12,w*.035),h*.1,w*.1),lanes=game.lines>40?2:1,per=Math.ceil(game.lines/lanes),side=x<pad||x>w-pad;const column=Math.min(lanes-1,Math.floor((x<pad?x:w-x)/pad*lanes)),index=side&&y>=pad&&y<h-pad?Math.min(game.lines-1,column*per+Math.floor((y-pad)/(h-2*pad)*per)):null;if(previewLine!==index){previewLine=index;drawFrame(1)}};canvas.onpointerleave=()=>{previewLine=null;if(!animating)drawFrame(1)};
function backdrop(){const referenceColors=referenceBoardColors(game?.id);if(referenceColors){ctx.fillStyle=referenceColors[0];ctx.fillRect(0,0,w,h);return}if(game?.edition){const key=game.id+':vector-scene:'+canvas.width+':'+canvas.height+':'+w+':'+h,background=visuals.background(key,canvas.width,canvas.height,paint=>{paint.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);drawScene(paint,game.scene,w,h,0)});ctx.drawImage(background,0,0,w,h);return}
 const key=[theme.key,canvas.width,canvas.height,scene.src,scene.naturalWidth,scene.naturalHeight].join('|');
 const cached=visuals.background(key,canvas.width,canvas.height,c=>{
  c.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);const bg=c.createRadialGradient(w*.5,h*.4,0,w*.5,h*.4,w*.75);bg.addColorStop(0,theme.glow);bg.addColorStop(1,'#050913');c.fillStyle=bg;c.fillRect(0,0,w,h);
  if(scene.complete&&scene.naturalWidth){const sh=theme.atlas?scene.naturalHeight*theme.layout.scene[3]:scene.naturalHeight,z=Math.max(w/scene.naturalWidth,h/sh);c.globalAlpha=.84;c.drawImage(scene,0,0,scene.naturalWidth,sh,(w-scene.naturalWidth*z)/2,(h-sh*z)/2,scene.naturalWidth*z,sh*z);c.globalAlpha=1}c.fillStyle='#04091588';c.fillRect(0,0,w,h);
 });ctx.drawImage(cached,0,0,cached.width,cached.height,0,0,w,h);
}
function renderMetric(start){renderedFrames++;renderTotal+=performance.now()-start;if(renderedFrames%20===0||!animating){canvas.dataset.frames=String(renderedFrames);canvas.dataset.averageRenderMs=(renderTotal/renderedFrames).toFixed(3);canvas.dataset.spriteCache=String(visuals.counts().sprites)}}
function drawFrame(progress){
 const renderStarted=performance.now();displayProgress=progress;paintPlayback(progress);if(!ctx||w<80||h<80)return;ctx.clearRect(0,0,w,h);backdrop();
 if(!game){label('SUPERWIN',w/2,h/2,26);return}
 const pad=Math.min(Math.max(12,w*.035),h*.1,w*.1),cols=game.cols||5,rows=game.rows||5,cellW=(w-2*pad)/cols,cellH=(h-2*pad)/rows;
 if(isBurning40(game)){drawBurning40({ctx,game,result,progress,animating,w,h,frameState,reelMotion,symbol,reduced});renderMetric(renderStarted);return;}
 if(game.engine.startsWith('live')){drawLiveStage(ctx,game,liveStates,w,h,label,rounded,Date.now(),game.edition===3?(...args)=>spriteBank?.draw(...args):null,avatarChoice);updateFloatingCashouts();}
 else if(['anywhere','cluster','scatter'].includes(game.engine)){
  const areaW=game.scene==='arabian'?(w-2*pad)*.78:cols===rows?Math.min(w-2*pad,h-2*pad):w-2*pad,areaX=game.scene==='arabian'?pad+(w-2*pad)*.22:(w-areaW)/2,cellW=areaW/cols,cellH=(h-2*pad)/rows;
  const state=tumbleState(result,progress),falling=game.edition===3&&['cluster','scatter'].includes(game.engine)&&animating&&state.frame?.next_grid&&state.progress>.30,grid=falling?state.frame.next_grid:state.grid;
  ctx.save();ctx.beginPath();ctx.rect(areaX,pad,areaW,h-pad*2);ctx.clip();
  for(let c=0;c<cols;c++)for(let r=0;r<rows;r++){
   const x=areaX+c*cellW,y=pad+r*cellH;
   rounded(x+3,y+3,cellW-6,cellH-6,'#0c1423cc',theme.accent+'44');
   let motion=tumbleCell(animating?state.progress:1,c,r,cols,rows);if(game.edition===3&&['cluster','scatter'].includes(game.engine)&&animating&&state.frame?.next_grid){if(falling){const fall=state.frame.falls.find(f=>f.cell[0]===c&&f.cell[1]===r),t=Math.min(1,(state.progress-.30)/.65);motion={offset:fall?(fall.from-r)*(1-t)**3:0,opacity:1}}else{const removed=state.frame.removed.some(cell=>cell[0]===c&&cell[1]===r);motion={offset:0,opacity:removed?Math.max(.1,1-state.progress/.3):1}}}const value=grid?.[c]?.[r]??((r*3+c*5)%(game.symbol_count||8));
   ctx.globalAlpha=motion.opacity;symbol(value,x+cellW/2,y+cellH/2+motion.offset*cellH,Math.min(cellW,cellH)*.88);ctx.globalAlpha=1;
  }
  const wins=[...(state.frame?.wins||[]),...(state.frame?.scatters||[])];
  if(!animating||state.progress>.72)for(const win of wins)for(const [c,r]of(win.cells||[])){
   ctx.strokeStyle=theme.accent;ctx.lineWidth=2;ctx.strokeRect(areaX+c*cellW+4,pad+r*cellH+4,cellW-8,cellH-8);
  }
  for(const win of wins)if(win.multiplier>1){const [c,r]=win.cells[0];label(win.multiplier+'×',areaX+(c+.5)*cellW,pad+(r+.5)*cellH,Math.min(24,cellW*.36),'#fff9ad')}ctx.restore();
 }else if(['lines','ways'].includes(game.engine)){
  const sequence=frameState(result,progress),frame=sequence.frame;const localProgress=animating?sequence.local:1;const grid=animating&&localProgress<.65&&frame?.initial_grid?frame.initial_grid:frame?.grid||result?.grid;
  for(let c=0;c<cols;c++){
   const x=pad+c*cellW,motion=reelMotion(animating?localProgress:1,c,cols,rows);
   const offset=motion.position-Math.floor(motion.position);
   const reel=ctx.createLinearGradient(x,0,x+cellW,0);const referenceColors=referenceBoardColors(game.id);reel.addColorStop(0,referenceColors?.[1]||'#050813ee');reel.addColorStop(.45,referenceColors?.[2]||'#172438e8');reel.addColorStop(1,referenceColors?.[1]||'#050813ee');
   rounded(x+2,pad,cellW-4,h-2*pad,reel,theme.accent+'88');
   ctx.save();ctx.beginPath();ctx.rect(x+3,pad+2,cellW-6,h-2*pad-4);ctx.clip();
   for(let r=-1;r<=rows;r++){
    // Once a column settles only its authoritative result grid is drawn.
    const count=game.symbol_count||8,index=((r+Math.floor(motion.position))*3+c*5+count*10)%count;
    const targetRow=r+motion.travel-Math.floor(motion.position);
    const value=grid&&targetRow>=0&&targetRow<rows?grid[c][targetRow]:index;
    const y=pad+(r+.5+(motion.settled?0:offset))*cellH;
    ctx.shadowColor=theme.accent;ctx.shadowBlur=motion.settled?8:0;
    symbol(value,x+cellW/2,y,Math.min(cellW,cellH)*.86);ctx.shadowBlur=0;
   }
   const shade=ctx.createLinearGradient(0,pad,0,h-pad);shade.addColorStop(0,'#000b');shade.addColorStop(.16,'#0000');shade.addColorStop(.84,'#0000');shade.addColorStop(1,'#000b');ctx.fillStyle=shade;ctx.fillRect(x+3,pad,cellW-6,h-2*pad);ctx.restore();
  }
  if(result&&(!animating||localProgress>.84)){
   const wins=[...(frame?.wins||[]),...(frame?.scatters||[])];
   for(const win of wins){
    const cells=win.cells||[];
    if(Number.isInteger(win.line)&&game.paylines?.[win.line]){ctx.save();ctx.strokeStyle='#ffe5a3';ctx.lineWidth=3;ctx.shadowColor=theme.accent;ctx.shadowBlur=12;ctx.beginPath();game.paylines[win.line].slice(0,win.count||game.cols).forEach((r,c)=>{const x=pad+(c+.5)*cellW,y=pad+(r+.5)*cellH;c?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();ctx.restore()}
    for(const [c,r]of cells){ctx.strokeStyle='#f5e07b';ctx.lineWidth=3;ctx.strokeRect(pad+c*cellW+5,pad+r*cellH+5,cellW-10,cellH-10)}
   }
  }
 }else if(game.engine==='hold'){
  const frame=result?.frames?.[Math.min(result.frames.length-1,Math.floor(progress*result.frames.length))],coins=frame?.coins||result?.coins||[],coinIndex=Math.max(0,theme.motifs.findIndex(m=>/coin/.test(m))>=0?theme.motifs.findIndex(m=>/coin/.test(m)):theme.motifs.findIndex(m=>/pearl|gem/.test(m)));
  for(let i=0;i<cols*rows;i++){const c=i%cols,r=Math.floor(i/cols),x=pad+(c+.5)*cellW,y=pad+(r+.5)*cellH;rounded(pad+c*cellW+3,pad+r*cellH+3,cellW-6,cellH-6,'#091321c9',theme.accent+'55');if(!result)symbol((i*3)%8,x,y,Math.min(cellW,cellH)*.65);if(coins[i]){symbol(coinIndex,x,y-5,Math.min(cellW,cellH)*.8);const bw=Math.min(cellW*.6,66),bh=Math.min(cellH*.25,25);rounded(x-bw/2,y+cellH*.17,bw,bh,'#09121aee',theme.accent);label(coins[i]+'×',x,y+cellH*.17+bh/2,Math.max(9,bh*.58),'#fff2c8')}}
  if(frame)label('RESPINS '+frame.remaining+' · LOCKED '+coins.filter(Boolean).length+'/'+coins.length,w/2,h-9,Math.max(9,Math.min(13,w*.018)),theme.accent);
 }else if(game.engine==='plinko'){
  const pegs=result?.pegs||Number($('plinko-rows')?.value)||game.pegs;const top=pad*1.35,bucketH=Math.min(36,Math.max(22,h*.07)),bottom=h-pad-bucketH,gap=w/(pegs+4),spacing=(bottom-top)/pegs;
  for(let row=0;row<pegs;row++)for(let col=0;col<=row;col++){const x=w/2+(col-row/2)*gap,y=top+row*spacing;ctx.beginPath();ctx.arc(x,y,Math.max(2,w*.004),0,7);ctx.fillStyle='#dbebff';ctx.fill();ctx.beginPath();ctx.arc(x,y,Math.max(4,w*.008),0,7);ctx.strokeStyle=theme.accent+'44';ctx.stroke()}
  const rules=game.edition?(game.plinko_rules?.[($('plinko-risk')?.value||'medium')+':'+pegs]||game.rules):game.rules;const scale=Number(rules?.payout_scale?.numerator||1)/Number(rules?.payout_scale?.denominator||1),pays=rules?.plinko_raw_pays||[];
  for(let bucket=0;bucket<=pegs;bucket++){const x=w/2+(bucket-pegs/2)*gap-gap*.46,active=result&&(!animating||progress>.97)&&result.bucket===bucket;rounded(x,bottom,gap*.92,bucketH,active?'#fff1b0':Math.abs(bucket-pegs/2)>=4?'#8d354c':'#57408a',active?'#fff2a3':theme.accent+'66');const mult=Number(pays[bucket]||0)*scale;label(formatMultiplier(mult),x+gap*.46,bottom+bucketH/2,Math.max(8,Math.min(11,gap*.30)),active?'#201226':'#f6e9ff',gap*.86)}
  const ballColors=['#ff80b7','#f5d66b','#ff806c'],ballColor=ballColors[($('plinko-risk')?.value==='high'?2:$('plinko-risk')?.value==='low'?0:1)];const ballPath=result?.path||Array(pegs).fill(0),position=plinkoPosition(ballPath,animating?progress:result?1:0,pegs),x=w/2+position.direction*gap/2,y=top+position.y*(bottom-top);ctx.beginPath();ctx.arc(x,y,Math.max(5,w*.011),0,7);ctx.fillStyle=ballColor;ctx.shadowColor=theme.accent;ctx.shadowBlur=15;ctx.fill();ctx.shadowBlur=0;
 }else if(game.engine==='crash'){
  const t=animating?progress:result?1:0,point=flightPosition(theme.key,t),x=w*point.x,y=h*point.y;
  ctx.strokeStyle=result&&!result.won&&!animating?'#e97c68':theme.accent;ctx.lineWidth=4;ctx.beginPath();for(let i=0;i<=t*100;i++){const q=i/100,p=flightPosition(theme.key,q),px=w*p.x,py=h*p.y;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke();symbol(0,x,y,Math.max(32,Math.min(w*.14,h*.16)));
  rounded(w*.24,h*.24,w*.52,h*.32,'#07101bd9',theme.accent+'88');label(result&&!animating?(result.won?'TARGET REACHED':'TARGET MISSED'):'AUTO-CASHOUT',w/2,h*.34,Math.min(26,w*.055));label(((result?.target||Number($('target')?.value)||200)/100).toFixed(2)+'×',w/2,h*.48,Math.min(48,w*.1));
 }else if(game.engine==='mines'){
  const gem=Math.max(0,theme.motifs.findIndex(m=>/gem|crystal|coin|pearl/.test(m)));
  for(let i=0;i<25;i++){const c=i%5,r=Math.floor(i/5),x=pad+c*cellW,y=pad+r*cellH,revealed=result&&(!animating||progress>(i+1)/25),mine=revealed&&result.mines.includes(i);rounded(x+3,y+3,cellW-6,cellH-6,mine?'#6f2336':picks.has(i)?theme.glow:'#142438',mine?'#f48e9e':picks.has(i)?theme.accent:'#34506b');
   if(mine){ctx.beginPath();ctx.arc(x+cellW/2,y+cellH/2,Math.min(cellW,cellH)*.22,0,7);ctx.fillStyle='#1b1019';ctx.fill();label('×',x+cellW/2,y+cellH/2,Math.min(cellW,cellH)*.42,'#ff9ba6')}
   else if(revealed||picks.has(i))symbol(gem,x+cellW/2,y+cellH/2,Math.min(cellW,cellH)*.72);
   else{label(i+1,x+cellW/2,y+cellH/2,Math.min(cellW,cellH)*.23,'#8194aa');ctx.fillStyle='#ffffff09';ctx.fillRect(x+8,y+8,cellW-16,2)}
  }
 }else if(game.engine==='tower'){
  const count=path.length,floors=Math.max(4,count),stepH=(h-pad*2)/floors;
  for(let r=0;r<floors;r++)for(let c=0;c<3;c++){const cw=(w-pad*2)/3,x=pad+c*cw,y=h-pad-(r+1)*stepH,active=r<count,revealed=active&&result&&(!animating||r<Math.floor(progress*count)),hazard=revealed&&result.hazards[r]===c,selected=active&&path[r]===c;ctx.globalAlpha=active?1:.30;rounded(x+3,y+3,cw-6,stepH-6,hazard?'#662334':selected?theme.glow+'d9':'#101b2cdd',hazard?'#f58ba2':selected?theme.accent:'#637187');if(selected&&!hazard)symbol(0,x+cw/2,y+stepH/2,Math.min(cw,stepH)*.73);else label(hazard?'×':r+1,x+cw/2,y+stepH/2,Math.min(22,stepH*.35),hazard?'#ffadb5':'#b9c4d1');ctx.globalAlpha=1}
 }else if(game.engine==='keno'){
  const cw=(w-pad*2)/8,ch=(h-pad*2)/5;for(let i=1;i<=40;i++){const c=(i-1)%8,r=Math.floor((i-1)/8),hit=result&&result.drawn.slice(0,animating?Math.floor(progress*game.drawn):game.drawn).includes(i);rounded(pad+c*cw+2,pad+r*ch+2,cw-4,ch-4,hit?theme.glow:picks.has(i)?theme.glow+'88':'#101b2c');label(i,pad+(c+.5)*cw,pad+(r+.5)*ch,Math.min(20,cw*.37),hit?'#fff4ae':'#d8edce')}
 }
 if(game.edition&&game.lines){label(game.lines+' LINES',w*.1,12,Math.max(8,Math.min(11,w*.016)),theme.accent);for(let i=0;i<game.lines;i++){const lanes=game.lines>40?2:1,per=Math.ceil(game.lines/lanes),y=pad+(i%per+.5)*(h-2*pad)/per,x=pad*(.22+.52*Math.floor(i/per));label(i+1,x,y,Math.max(4,Math.min(9,(h-2*pad)/per*.65)),theme.accent);label(i+1,w-x,y,Math.max(4,Math.min(9,(h-2*pad)/per*.65)),theme.accent)}}
 if(previewLine!==null&&game.paylines?.[previewLine]){ctx.strokeStyle='#fff2ad';ctx.lineWidth=3;ctx.beginPath();game.paylines[previewLine].forEach((r,c)=>{const x=pad+(c+.5)*cellW,y=pad+(r+.5)*cellH;c?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();label('LINE '+(previewLine+1),w/2,12,11,'#fff4cd')}if(game.edition===3&&result)drawSlotEffects(ctx,game,result,animating?progress:1,w,h,(...args)=>spriteBank?.draw(...args));renderMetric(renderStarted);
}
function animate(){audioCues.clear();document.body.dataset.phase='spinning';cancelAnimationFrame(raf);start=performance.now();animation=0;animating=true;$('stop').hidden=false;function tick(now){animation=Math.min(1,(now-start)/(reduced?1:duration));drawFrame(animation);if(game.wheel_bonus)paintWheel();syncAnimationCue(animation);if(animation<1)raf=requestAnimationFrame(tick);else finish()}raf=requestAnimationFrame(tick)}
function finish(){document.body.dataset.phase=result?.payout?'win':'idle';cancelAnimationFrame(raf);animating=false;$('stop').hidden=true;drawFrame(1);if(result){$('win').textContent=money(result.payout);status(result.payout?'WIN '+money(result.payout):'LOST · Round settled');tone(result.payout>0)}setLocked(false);updateFeatureControls();paintWheel();if(featureAvailable.respin)refreshQuote();scheduleAuto()}
$('stop').onclick=()=>{autoLeft=0;finish()};
function setLocked(locked){if(!autoLeft&&$('autoplay'))$('autoplay').textContent='AUTOPLAY 10';
 busy=locked;const frozen=locked||animating||!!pending||!!featureSession?.pending;
 $('stake').disabled=frozen;for(const id of ['stake-down','stake-up'])$(id).disabled=frozen;
 for(const b of $('choices').querySelectorAll('button,select'))b.disabled=frozen;
 $('play').disabled=locked||animating||booting||walletRefreshing;
 $('play').textContent=featureSession?.pending?'RESOLVE SAVED FEATURE':booting?'CONNECTING…':walletRefreshing?'SYNCING WALLET…':!connected?'RECONNECT':!user?'LOG IN & PLAY':pending?'RETRY SAME ROUND':(['lines','ways','hold','anywhere','cluster','scatter'].includes(game?.engine)?(game?.scene==='royal'?'START ↻':'SPIN ↻'):game?.engine==='plinko'?'DROP BALL':'PLAY');
 $('signin-button').hidden=true;updateFeatureControls();paintPlayback(displayProgress);
}
function choice(){if(game.edition===3&&game.engine==='cluster')return {mode:spinMode};if(game.edition&&game.engine==='plinko')return {risk:$('plinko-risk').value,rows:Number($('plinko-rows').value)};if(game.engine==='crash')return {target:Number($('target').value)};if(game.engine==='mines'||game.engine==='keno')return {picks:[...picks].sort((a,b)=>a-b)};if(game.engine==='tower')return {path:[...path]};return null}
function makeChoices(){
 const container=$('choices');container.replaceChildren();
 if(game.edition&&game.engine==='plinko'){for(const [id,title,values,selected]of [['plinko-risk','RISK',game.risk_options,'medium'],['plinko-rows','ROWS',game.row_options,12]]){const label=document.createElement('label');label.textContent=title;const select=document.createElement('select');select.id=id;for(const v of values){const o=document.createElement('option');o.value=v;o.textContent=String(v).toUpperCase();select.append(o)}select.value=selected;select.onchange=()=>{result=null;drawFrame(1)};label.append(select);container.append(label)}}
 if(game.engine==='crash'){const label=document.createElement('label');label.textContent='AUTO-CASHOUT TARGET';const select=document.createElement('select');select.id='target';for(const t of game.targets){const option=document.createElement('option');option.value=t;option.textContent=(t/100).toFixed(2)+'×';select.append(option)}select.value=200;select.onchange=()=>drawFrame(1);label.append(select);container.append(label)}
 if(['mines','keno'].includes(game.engine)){
  const description=document.createElement('p');description.className='note';description.textContent=game.engine==='mines'?'Select 1–10 cells. Three mines are hidden.':'Select 1–5 numbers. Ten of forty numbers are drawn.';container.append(description);
  const grid=document.createElement('div');grid.className='pick-grid';const offset=game.engine==='keno'?1:0,count=game.engine==='keno'?40:25,limit=game.engine==='keno'?5:10;
  for(let i=offset;i<count+offset;i++){const b=document.createElement('button');b.type='button';b.textContent=i+(offset?0:1);b.setAttribute('aria-label',(offset?'Number ':'Cell ')+(i+(offset?0:1)));b.setAttribute('aria-pressed',String(picks.has(i)));b.onclick=()=>{if(busy||pending)return;if(picks.has(i))picks.delete(i);else if(picks.size<limit)picks.add(i);b.setAttribute('aria-pressed',String(picks.has(i)));result=null;drawFrame(1)};grid.append(b)}container.append(grid)
 }
 if(game.engine==='tower'){
  const countLabel=document.createElement('label');countLabel.textContent='FLOORS';const select=document.createElement('select');for(let i=1;i<=8;i++){const o=document.createElement('option');o.value=i;o.textContent=i;select.append(o)}select.value=path.length;select.onchange=()=>{path.length=Number(select.value);for(let i=0;i<path.length;i++)path[i]??=0;makeChoices();result=null;drawFrame(1)};countLabel.append(select);container.append(countLabel);
  for(let floor=0;floor<path.length;floor++){const row=document.createElement('div');row.className='tower-row';const name=document.createElement('span');name.textContent='Floor '+(floor+1);row.append(name);for(let lane=0;lane<3;lane++){const b=document.createElement('button');b.type='button';b.textContent=lane+1;b.setAttribute('aria-label',`Floor ${floor+1}, lane ${lane+1}`);b.setAttribute('aria-pressed',String(path[floor]===lane));b.onclick=()=>{path[floor]=lane;result=null;makeChoices();drawFrame(1)};row.append(b)}container.append(row)}
 }
}
function restoreRoundControls(){
 pending=roundSession?.pending||null;
 if(pending){$('stake').value=pending.bet;picks.clear();for(const value of pending.choice?.picks||[])picks.add(value);if(pending.choice?.path)path.splice(0,path.length,...pending.choice.path);makeChoices();if($('target')&&pending.choice?.target)$('target').value=pending.choice.target;if($('plinko-risk')&&pending.choice){$('plinko-risk').value=pending.choice.risk;$('plinko-rows').value=pending.choice.rows}}
 setLocked(false);drawFrame(1);
}
$('controls').onsubmit=async event=>{
 event.preventDefault();if(busy||animating||booting||walletRefreshing)return;if(featureSession?.pending){await settleFeature();return}
 if(!connected){await boot();return}if(!user){$('signin').showModal();return}
 try{
  if(autoLeft>0)autoLeft--;pending=roundSession.prepare({bet:$('stake').value,choice:choice()});spinMode='base';restoreRoundControls();setLocked(true);document.body.dataset.phase='request';status('Settling your round…');tone();
  const {outcome,response}=await roundSession.settle();result=outcome;lastReceipt=response;pending=null;reelLocks.clear();currentQuote=null;featureAvailable={gamble:!!game.gamble&&outcome.payout>0,respin:!!game.respin};
  const settledAccount=user.id;walletRefreshing=true;$('balance').textContent='REFRESHING…';
  $('verify-fair').hidden=!result.fair;duration=playbackDuration(game,result,{turbo,motion:theme.motion});
  animate();loadHistory();
  api('/api/me').then(current=>{if(current.id!==settledAccount)throw Error('Player account changed');user=current;$('balance').textContent=money(current.balance)}).catch(()=>{user=null;$('balance').textContent='SIGN IN TO REFRESH'}).finally(()=>{walletRefreshing=false;if(!animating){setLocked(false);updateFeatureControls();paintWheel();if(featureAvailable.respin)refreshQuote();scheduleAuto()}});
 }catch(error){
  autoLeft=0;pending=roundSession?.pending||null;if([401,403].includes(error.status)){user=null;$('balance').textContent='SIGN IN TO REFRESH'}
  document.body.dataset.phase='idle';setLocked(false);status(error.message+(pending?' Your saved round will use the same key.':''));
 }
};
async function loadHistory(){
 try{const data=await api('/api/internal-games/history'),rounds=data.rounds.filter(r=>r.game===game.id);$('history').replaceChildren();$('recent-rounds').replaceChildren();
  for(const r of rounds.slice(0,10)){const li=document.createElement('li');li.textContent=`${new Date(r.created_at).toLocaleString()} · Bet ${money(r.bet)} · Win ${money(r.payout)}`;$('history').append(li)}if(game.edition===3&&!lastReceipt&&!pending&&!featureSession?.pending&&rounds.length){lastReceipt=rounds[0];api('/api/internal-games/features/status?game='+encodeURIComponent(game.id)+'&parent='+encodeURIComponent(lastReceipt.id)).then(value=>{if(value.parent!==lastReceipt?.id)return;featureAvailable=value;updateFeatureControls();if(value.respin)refreshQuote()}).catch(()=>{})}
  if(rounds.length){const title=document.createElement('small');title.textContent='YOUR ROUNDS';$('recent-rounds').append(title);for(const r of rounds.slice(0,8)){const chip=document.createElement('span');chip.className=Number(r.payout)>0?'round-win':'round-loss';chip.textContent=(Number(r.payout)/Number(r.bet)).toFixed(2)+'×';$('recent-rounds').append(chip)}}
 }catch{}
}

function setupOwnerControls(){
 for(const id of ['buy-bonus','respin','gamble','retry-feature','avatar-bar','reel-locks','floating-cashouts','wheel-bonus'])$(id).hidden=true;
 $('feature-price').textContent='';$('avatar-bar').replaceChildren();$('reel-locks').replaceChildren();$('floating-cashouts').replaceChildren();
 if(game.buy_bonus)$('buy-bonus').hidden=false;const maxGames=['book-of-futuria','burning-ice-deluxe','mad-slot','magic-garden','kingdom-of-the-elves'];$('max-bet').hidden=!maxGames.some(slug=>game.id.replace(/-r4$/,'-r3')==='sw-'+slug+'-r3');$('max-bet').textContent=game.scene==='lab'?'MAX DOSE':'MAX BET';$('quick-spin').hidden=!['ice','garden-deep','dragon','fruit-fire','arabian'].includes(game.scene);$('volume-label').hidden=game.id!=='sw-burning-ice-100-r3';if(game.id==='sw-burning-ice-r3')document.querySelector('.stage').after($('reel-locks'));if(game.scene==='space')$('autoplay').textContent='AUTO 10';if(game.scene==='lab')$('autoplay').textContent='AUTO EXPERIMENT 10';
 if(game.gamble)$('gamble').hidden=false;
 if(game.respin){$('respin').hidden=false;$('reel-locks').hidden=false;for(let i=0;i<game.cols;i++){const b=document.createElement('button');b.type='button';b.textContent='LOCK '+(i+1);b.setAttribute('aria-pressed','false');b.onclick=()=>{if(busy||animating||pending||featureSession?.pending||!lastReceipt)return;reelLocks.has(i)?reelLocks.delete(i):reelLocks.add(i);b.setAttribute('aria-pressed',String(reelLocks.has(i)));b.textContent=(reelLocks.has(i)?'LOCKED ':'LOCK ')+(i+1);refreshQuote()};$('reel-locks').append(b)}if(game.scene==='ice'){const b=document.createElement('button');b.type='button';b.textContent='RESPIN MODE OFF';b.setAttribute('aria-pressed','false');b.onclick=()=>{respinMode=!respinMode;b.textContent='RESPIN MODE '+(respinMode?'ON':'OFF');b.setAttribute('aria-pressed',String(respinMode));$('reel-locks').hidden=!respinMode;updateFeatureControls()};$('feature-controls').append(b);$('reel-locks').hidden=!respinMode}}
 if(game.avatars){$('avatar-bar').hidden=false;for(const country of game.avatars){const b=document.createElement('button');b.type='button';b.textContent=country;b.setAttribute('aria-pressed',String(country===avatarChoice));b.onclick=()=>{if(liveStates.some(s=>s?.phase==='running'&&!s.closed))return;avatarChoice=country;for(const el of $('avatar-bar').children)el.setAttribute('aria-pressed',String(el===b));drawFrame(1)};$('avatar-bar').append(b)}}
 if(game.scene==='cappadocia'){$('floating-cashouts').hidden=false;for(let lane=0;lane<5;lane++){const b=document.createElement('button');b.type='button';b.textContent='CASHOUT';b.hidden=true;b.onclick=()=>livePlayer?.cashout(lane);$('floating-cashouts').append(b)}}
 if(game.wheel_bonus){$('wheel-bonus').hidden=false;document.querySelector('.stage').before($('wheel-bonus'));paintWheel()}
 if(game.engine==='plinko')document.querySelector('.stage').before($('choices'));
 if(game.id==='sw-magic-garden-40-r3'){const b=document.createElement('button');b.type='button';b.textContent='FAST SPIN OFF';b.onclick=()=>{$('turbo').onclick();b.textContent='FAST SPIN '+(turbo?'ON':'OFF')};$('special-actions').append(b)}
 updateFeatureControls();
}
function cue(name){if(!sound)return;try{audio??=new AudioContext();audio.resume();playCue(audio,game.scene,name,audioVolume)}catch{}}
function syncAnimationCue(progress){if(game?.edition!==3)return;const sequence=frameState(result,progress),f=sequence.index;const signal=(key,name)=>{if(!audioCues.has(key)){audioCues.add(key);cue(name)}};if(['lines','ways'].includes(game.engine)){for(let c=0;c<game.cols;c++)if(reelMotion(result?.frames?.length?Math.min(1,(progress*(result.frames.length)-f)*1.9):progress,c,game.cols,game.rows).settled)signal('stop:'+f+':'+c,'stop');const frame=result?.frames?.[f];if((frame?.expanded_reels?.length||frame?.transformed_cells?.length)&&sequence.local>.75)signal('wild:'+f,'wild')}else if(['cluster','scatter'].includes(game.engine)&&result?.frames?.[f]?.wins?.length)signal('tumble:'+f,'tumble');if(result?.frames?.[f]?.free_spin&&sequence.local>.08)signal('bonus:'+result.frames[f].free_spin,'bonus');if(sequence.local>.84&&sequence.frame?.wins?.length)signal('frame-win:'+f,'win')}
$('max-bet').onclick=()=>{if(busy||animating||pending||featureSession?.pending)return;$('stake').value=(game.max_bet/100).toFixed(2);updateFeatureControls()};$('quick-spin').onclick=()=>{$('turbo').onclick();$('quick-spin').textContent='⚡ TURBO '+(turbo?'ON':'OFF')};$('volume').oninput=()=>{audioVolume=Math.max(0,Math.min(1,Number($('volume').value)/100));saveAudioPreferences(localStorage,sound,audioVolume)};
function updateFeatureControls(){
 if(game?.edition!==3)return;const blocked=busy||animating||booting||walletRefreshing||!!pending||!!featureSession?.pending,owned=!!user&&!!lastReceipt;
 $('gamble').disabled=blocked||!owned||!featureAvailable.gamble;$('respin').disabled=blocked||!owned||!featureAvailable.respin||!currentQuote;
 $('max-bet').disabled=blocked;$('buy-bonus').disabled=blocked;$('stake').setAttribute('aria-label',game.lines?'Total bet in ETB; line bet equals total divided by '+game.lines:'Bet in ETB');$('buy-bonus').textContent='BUY 10 FREE SPINS · '+money(Math.round(Number($('stake').value)*100)*100);
 $('retry-feature').hidden=!featureSession?.pending;$('retry-feature').disabled=busy||animating||walletRefreshing;
 for(const b of $('reel-locks').children)b.disabled=blocked||!owned||!featureAvailable.respin;
 for(const id of ['gamble-red','gamble-black'])$(id).disabled=blocked||!owned||!featureAvailable.gamble;
 $('respin').textContent=currentQuote?'RESPIN · '+money(currentQuote.cost):'RESPIN · SELECT LOCKS';
}
async function refreshQuote(){
 const generation=++quoteGeneration;currentQuote=null;updateFeatureControls();if(!user||!lastReceipt||!featureAvailable.respin)return;
 $('feature-price').textContent='Calculating respin price…';try{const q=await api('/api/internal-games/respin/quote',{game:game.id,parent:lastReceipt.id,locks:[...reelLocks].sort((a,b)=>a-b),account_id:user.id});if(generation!==quoteGeneration||q.parent!==lastReceipt?.id)return;currentQuote=q;$('feature-price').textContent='Paid respin · '+money(q.cost)+' · '+reelLocks.size+' reels locked';updateFeatureControls()}catch(e){if(generation!==quoteGeneration)return;$('feature-price').textContent=e.message;updateFeatureControls()}
}
async function settleFeature(){
 if(!featureSession?.pending||busy||animating)return;autoLeft=0;const purpose=featureSession.pending.purpose;setLocked(true);updateFeatureControls();status('Settling saved '+purpose+'…');
 try{const {response,outcome}=await featureSession.settle();lastReceipt=response;result=outcome;currentQuote=null;reelLocks.clear();for(const b of $('reel-locks').children){b.setAttribute('aria-pressed','false');b.textContent='LOCK '+(Array.from(b.parentElement.children).indexOf(b)+1)}featureAvailable={gamble:!!game.gamble&&outcome.payout>0,respin:!!game.respin};$('verify-fair').hidden=!outcome.fair;$('win').textContent=money(outcome.payout);
  if(purpose==='gamble'){$('gamble-stake').textContent=outcome.payout?'NEXT STAKE '+money(outcome.payout)+' · double or lose this credited win':'This gamble is closed. No remaining win to stake.';$('gamble-outcome').textContent=(outcome.color||outcome.result_color||'').toUpperCase()+' · '+(outcome.payout?'WIN '+money(outcome.payout):'LOST');$('gamble-dialog').dataset.result=outcome.color||outcome.result_color||'';tone(outcome.payout>0);status(outcome.payout?'GAMBLE WIN '+money(outcome.payout):'GAMBLE LOST');drawFrame(1)}else{duration=playbackDuration(game,result,{turbo,motion:theme.motion});animate()}
  const account=user.id;walletRefreshing=true;try{const current=await api('/api/me');if(current.id!==account)throw Error('Player account changed');user=current;$('balance').textContent=money(current.balance)}catch{user=null;$('balance').textContent='SIGN IN TO REFRESH'}finally{walletRefreshing=false}loadHistory();
 }catch(e){if([401,403].includes(e.status)){user=null;$('balance').textContent='SIGN IN TO REFRESH'}status(e.message+(featureSession?.pending?' Retry the saved action with the same key.':''));$('gamble-outcome').textContent=e.message}
 finally{setLocked(false);updateFeatureControls();if(featureAvailable.respin&&!featureSession?.pending)refreshQuote()}
}
function paintWheel(){
 if(!game?.wheel_bonus)return;const c=$('wheel').getContext('2d');if(!c)return;const values=[2,4,8,10,25,50],cx=180,cy=130,r=112,selected=result?.wheel?.index,spin=selected!==undefined&&animating?1-(1-animation)**3:1,offset=selected===undefined?0:-Math.PI/2-(selected+.5)*Math.PI/3+(1-spin)*Math.PI*8;c.clearRect(0,0,360,260);for(let i=0;i<6;i++){const a=offset+i*Math.PI/3,b=a+Math.PI/3;c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,r,a,b);c.closePath();c.fillStyle=i===selected&&spin===1?'#ffe9a0':i%2?'#8f2b27':'#b78031';c.fill();c.strokeStyle='#f0d28a';c.stroke();const t=(a+b)/2;c.fillStyle='#fff4cc';c.font='bold 16px Arial';c.textAlign='center';c.fillText(values[i]+'×',cx+Math.cos(t)*r*.73,cy+Math.sin(t)*r*.73+5)}c.fillStyle='#fff0bd';c.beginPath();c.moveTo(168,7);c.lineTo(192,7);c.lineTo(180,32);c.fill();$('wheel-state').textContent=result?.wheel?'WHEEL BONUS · '+result.wheel.value+'× line bet':game.wheel_full_grid?'FULL GRID MATCH → BONUS WHEEL':'3 × 777 on the middle line triggers the wheel';
}
function updateFloatingCashouts(){
 if(game?.scene!=='cappadocia')return;for(const [i,b]of Array.from($('floating-cashouts').children).entries()){const state=liveStates[i],active=state?.phase==='running'&&!state.closed;b.hidden=!active;const pos=liveObjectLayout(game,state,i,w,h);b.style.left=(pos.x/w*100)+'%';b.style.top=((canvas.offsetTop||0)+pos.y-pos.size*.95)+'px';b.textContent='CASHOUT '+Number(state?.multiplier||1).toFixed(2)+'×'}
}
function appendEditionRules(content){
 const rules=game.rules||game.math||game.mathematics||{},p=document.createElement('p');p.textContent=game.lines?'Line bet = total bet ÷ '+game.lines+'. The displayed paytable belongs to this Superwin edition.':'This Superwin edition uses the symbols and mechanics shown below.';content.append(p);
 const table=document.createElement('table'),head=document.createElement('tr');for(const value of ['Symbol','Role']){const th=document.createElement('th');th.textContent=value;head.append(th)}table.append(head);game.symbols.forEach((symbol,i)=>{const tr=document.createElement('tr');for(const value of [symbol,[i===game.wild_index?'WILD':'',game.scatter_indices?.includes(i)?'SCATTER':''].filter(Boolean).join(' / ')||'Regular']){const td=document.createElement('td');td.textContent=value;tr.append(td)}table.append(tr)});content.append(table);
 for(const text of [game.adjacent_wild?'A natural Wild transforms its four orthogonal neighbors once. Transformed symbols do not propagate again.':null,game.gamble?'Red / Black: stake the entire credited win. A fair 50/50 result pays 2× or zero. A parent win can be used once. KEEP WIN leaves the credited balance available.':null,game.respin?'Lock selected reels, then pay the quoted respin price. The server prices the selected locks from conditional expected payout; the reference bet remains unchanged. No free lock-and-respin wager is implied.':null,game.buy_bonus?'BUY 10 FREE SPINS costs 100× the selected reference bet. All ten spins settle together. The base and bonus RTP scales are estimated from offline simulations, not independently certified.':null,game.free_spins&&game.scatter_indices?.length?'Three or more '+game.symbols[game.scatter_indices[0]]+' symbols award '+game.free_spins+' free spins. These do not retrigger.':null,game.wheel_bonus?(game.wheel_full_grid?'Nine matching symbols fill the 3×3 grid and trigger the wheel. All nine symbols can qualify. Trigger probability is 1 in 43,046,721 under these published uniform strips. Wheel awards 2, 4, 8, 10, 25 or 50× line bet.':'Three 777 symbols on the middle line trigger one server-drawn wheel: 2, 4, 8, 10, 25 or 50× line bet.'):null])if(text){const note=document.createElement('p');note.textContent=text;content.append(note)}
 if(game.rules?.symbols){const r=game.rules;if(!r.symbols)return;const t=document.createElement('table');for(const row of [['Symbol',...(['cluster','scatter'].includes(game.engine)?(game.engine==='cluster'?['5–9','10–14','15+']:['8–9','10–11','12+']):['3','4','5'])],...r.symbols.map(s=>[s.name,...(s.groups?s.groups.map(g=>g.multiplier):['three','four','five'].map(k=>s[k])).map(f=>f?(Number(f.numerator)/Number(f.denominator)).toFixed(4)+'×':'—')])]){const tr=document.createElement('tr');for(const v of row){const td=document.createElement('td');td.textContent=v;tr.append(td)}t.append(tr)}content.append(t)}
}
$('stake').addEventListener('input',updateFeatureControls);
$('buy-bonus').onclick=()=>{if(busy||animating||pending||featureSession?.pending)return;if(!user){$('signin').showModal();return}autoLeft=0;spinMode='bonus';$('controls').requestSubmit()};
$('gamble').onclick=()=>{if($('gamble').disabled)return;autoLeft=0;$('gamble-stake').textContent='STAKE '+money(lastReceipt.payout)+' · double or lose this credited win';$('gamble-outcome').textContent='Select RED or BLACK';$('gamble-dialog').showModal()};
for(const color of ['red','black'])$('gamble-'+color).onclick=async()=>{if(!user||!lastReceipt||busy||animating||!featureAvailable.gamble)return;try{featureSession.prepare('gamble',{parent:lastReceipt.id,color});await settleFeature()}catch(e){status(e.message)}};
$('gamble-keep').onclick=()=>$('gamble-dialog').close();$('retry-feature').onclick=()=>settleFeature();
$('respin').onclick=async()=>{if(busy||animating||$('respin').disabled||!currentQuote)return;try{featureSession.prepare('respin',{parent:lastReceipt.id,locks:[...reelLocks].sort((a,b)=>a-b),expected_cost:currentQuote.cost});await settleFeature()}catch(e){status(e.message)}};

async function boot(){
 if(booting||animating||busy||walletRefreshing)return;flightAudio?.stop();flightAudio=null;booting=true;connected=false;user=null;setLocked(true);status('Connecting to your existing Superwin account…');livePlayer?.dispose();cancelAnimationFrame(liveRaf);liveStates=[];lastReceipt=null;currentQuote=null;featureAvailable={gamble:false,respin:false};featureSession=null;
 try{
  const config=await api('/api/internal-games/config');game=config.games.find(g=>g.id===gameId);if(!game)throw Error('This Superwin game is unavailable.');
  spriteBank=game.edition>=3?createSpriteBank(game,()=>{visuals.clear();drawFrame(displayProgress);paintWheel()}):null;$('game').setAttribute('aria-label',game.name+' · '+(game.cols?game.cols+'×'+game.rows+' grid':'live game')+(game.lines?' · '+game.lines+' paylines':''));$('title').textContent='SUPERWIN';$('machine-title').textContent=game.title||game.name;document.body.dataset.engine=game.engine;document.title=game.name+' · Superwin';theme=themeFor(game);duration=Math.round((turbo?950:1800)*theme.motion);const art=symbolSources(theme.key);if(art)art.forEach((src,i)=>{images[i].src=src});scene.src=theme.scene;document.body.dataset.button=game.button||'gold';document.body.dataset.scene=game.scene||'';document.body.dataset.edition=String(game.edition||1);document.body.dataset.game=game.id;document.body.dataset.theme=theme.key;document.documentElement.style.setProperty('--accent',theme.accent);document.documentElement.style.setProperty('--glow',theme.glow);$('subtitle').textContent='SUPERWIN EDITION · '+(game.lines?game.lines+' LINES':game.engine==='crash'?'FLIGHT':game.engine.toUpperCase());
  $('variant').textContent=game.engine.startsWith('live')?'Server-timed round · cashout uses server receipt time · reconnect recovers your active round.':game.engine==='crash'?'Choose an auto-cashout target before each single round.':game.engine==='tower'?'Choose your path before the round. One hazard is drawn per floor.':'Every settled round uses your existing ETB wallet.';
  makeChoices();editionControls();showRules();drawFrame(1);status('Preparing game visuals…');const artworkReady=preloadArtwork(spriteBank?.sources()||[]).catch(()=>{});void artworkReady.then(()=>{if(!document.hidden&&game?.id===gameId){visuals.clear();drawFrame(displayProgress);paintWheel()}});showRules();if(game.engine.startsWith('live'))startLiveView();
  if(config.ready===false||config.wallet_verified===false||game.available===false)throw Error('This game is temporarily unavailable. Reconnect to check again.');connected=true;
  const current=await api('/api/me');if(current.role!=='player'||current.status&&current.status!=='active')throw Object.assign(Error('Sign in with an active player account.'),{status:403});user=current;
  const account=current.id;if(roundSession&&roundSession.user.id!==account){result=null;picks.clear();path.splice(0,path.length,0);$('history').replaceChildren();$('recent-rounds').replaceChildren();$('win').textContent='— ETB'}roundSession=new RoundSession({storage:roundStorage,user:current,game,commit:request=>api('/api/internal-games/commit',{...request,account_id:account}),send:request=>api('/api/internal-games/play',{...request,account_id:account})});if(game.edition===3&&(game.gamble||game.respin))featureSession=new FeatureSession({storage:roundStorage,user:current,game,commit:request=>api('/api/internal-games/commit',{...request,account_id:account}),send:(purpose,request)=>api('/api/internal-games/'+purpose,request)});restoreRoundControls();updateFeatureControls();if(game.engine.startsWith('live'))startLiveView();$('balance').textContent=money(current.balance);
  status(pending?'Saved round recovered. Select RETRY SAME ROUND to get its result.':'Ready · your existing ETB wallet');loadHistory();
 }catch(error){user=null;result=null;$('history').replaceChildren();$('recent-rounds').replaceChildren();$('win').textContent='— ETB';drawFrame(1);$('balance').textContent='— ETB';status([401,403].includes(error.status)?'Select LOG IN & PLAY to use your existing player account.':error.message)}
 finally{booting=false;setLocked(false);updateFeatureControls()}
}
boot();

$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('main').requestFullscreen()}catch{status('Fullscreen is unavailable in this browser.')}};
document.addEventListener('visibilitychange',()=>{if(document.hidden){autoLeft=0;if(animating)finish();}else if(!document.hidden&&!busy&&!animating&&!booting)boot()});
window.addEventListener('pageshow',event=>{if(event.persisted&&!busy&&!animating)boot()});

function showRules(){
 const content=$('rules-content');content.replaceChildren();$('rules-title').textContent=(game.title||game.name)+' · Rules';
 const descriptions={
 lines:'Matching symbols pay from the left on the active paylines. Wild symbols substitute for ordinary symbols.',
 ways:'Matching symbols pay from the left across adjacent reels. Wild symbols can complete a matching way.',
 anywhere:'Groups of matching symbols pay anywhere on the board. A qualifying bonus awards three independent free spins; those free spins do not retrigger.',
 hold:'Coin symbols lock in place during up to three respins. A full board adds the full-board bonus to the result.',
 crash:'Choose an auto-cashout target before starting. One server-settled round determines whether that target is reached. This is a single-round game.',
 plinko:'The server draws all twelve left-or-right steps. The ball lands in the bucket determined by that path.',
 mines:'Select one to ten cells before starting. Three mines are drawn among twenty-five cells. Your selection wins only if it avoids every mine.',
 tower:'Choose a lane on each selected floor before starting. One hazard is drawn per floor. Your full path must avoid every hazard.',
 keno:'Pick one to five numbers from forty. The server draws ten numbers; the payout depends on your matches.'};
 const edition=document.createElement('p');edition.textContent='Superwin edition with published rules and owner-selected themes. Supplier software is not connected.';content.append(edition);const intro=document.createElement('p');intro.textContent=game.engine==='cluster'?(game.edition===3?'Five or more orthogonally touching matching symbols win. Winning symbols are removed, survivors fall and new symbols enter. Base multipliers are 2×; purchased free spins add 2×/4×, capped at 256×. A 100× purchase price awards ten free spins. At most twenty cascades per spin. RTP calibration is an estimate, not certification.':'Connected groups of eight or more symbols win. This earlier edition uses its own finite weighted layouts.'):game.engine==='scatter'?(game.edition===3?'Eight or more matching symbols anywhere pay, then disappear. Survivors fall and new symbols tumble in, up to twenty cascades. Genie spheres range from 2× to 100×. Initial lamp scatters pay separately. RTP is estimated by offline calibration.':'Eight or more matching symbols anywhere pay. Three scatters award ten independent free spins.'):game.engine.startsWith('live')?'Start a bet, then cash out while the server round is active. Server receipt time decides every cashout. Maximum multiplier 100×. Reconnect restores your round; replaying a request does not create a second bet.':descriptions[game.engine];content.append(intro);
 const facts=document.createElement('dl');facts.className='rule-facts';for(const [key,value]of [['Studio','Superwin'],['Wallet','ETB · existing player account'],['Bet range',money(game.min_bet||100)+' – '+money(game.max_bet||10000)],['Format',game.cols?game.cols+' reels × '+game.rows+' rows'+(game.lines?' · '+game.lines+' paylines':''):game.engine==='crash'?'Preselected auto-cashout':game.engine==='tower'?'Preselected path':game.engine==='mines'?'25 cells · 3 mines':game.engine==='keno'?'10 of 40 numbers':game.engine.startsWith('live')?'Server-timed live cashout':game.engine==='plinko'?'8–16 peg rows':'Server game'],['Mathematical RTP target','96% · not independently certified']]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;facts.append(dt,dd)}content.append(facts);if(game.edition===3)appendEditionRules(content);appendIllustratedRules(content,game,{reference:drawReferenceSymbol,sprite:spriteBank,icon:drawIcon});
 const note=document.createElement('p');note.className='note';note.textContent='Results and payouts are calculated on the server. Rounds can lose. The RTP target describes long-run mathematics and does not guarantee a return in any session. The visual animation displays the settled result.';content.append(note);
}
$('signin-button').onclick=()=>$('signin').showModal();$('signin-close').onclick=()=>$('signin').close();
$('signin-form').onsubmit=async event=>{
 event.preventDefault();const form=event.currentTarget,button=$('signin-submit');if(button.disabled)return;button.disabled=true;$('signin-error').textContent='Signing in…';
 try{const values=new FormData(form);await api('/api/login',{username:String(values.get('username')||'').trim(),password:String(values.get('password')||'')});form.reset();$('signin').close();$('signin-error').textContent='';await boot()}catch(error){$('signin-error').textContent=error.message}finally{button.disabled=false}
};

$('turbo').onclick=()=>{turbo=!turbo;$('turbo').textContent=turbo?'TURBO ON':'TURBO OFF';$('turbo').setAttribute('aria-pressed',String(turbo));if(!animating)duration=Math.round((turbo?950:1800)*theme.motion)};
for(const [id,delta]of [['stake-down',-1],['stake-up',1]])$(id).onclick=()=>{if(busy||pending||animating)return;const current=Number($('stake').value);if(Number.isFinite(current))$('stake').value=Math.min(100,Math.max(1,current+delta)).toFixed(2);updateFeatureControls()};

function editionControls(){
 const live=game.engine.startsWith('live');$('controls').hidden=live;$('autoplay').hidden=live||game.engine==='plinko';$('live-controls').hidden=!live;$('quick-bets').replaceChildren();$('feature-controls').replaceChildren();$('verify-fair').hidden=!result?.fair;
 if(game.edition===3)setupOwnerControls();if(!game.edition)return;
 if(!live){for(const value of [1,10,20,50,100]){const b=document.createElement('button');b.type='button';b.textContent=value+' ETB';b.onclick=()=>{if(!busy&&!animating&&!pending){$('stake').value=value.toFixed(2);updateFeatureControls()}};$('quick-bets').append(b)}}
 if(game.expanding_symbol||game.engine==='cluster'||(game.engine==='scatter'&&game.edition!==3)){const note=document.createElement('span');note.textContent=(game.engine==='cluster'?(game.edition===3?'5+ CONNECTED CLUSTERS · ':'CONNECTED CLUSTERS · '):game.engine==='scatter'?'8+ PAY ANYWHERE · ':'EXPANDING BOOK · ')+'10 FREE SPINS';$('feature-controls').append(note)}
 if(game.engine==='hold'){const note=document.createElement('span');note.textContent='LOCK & RESPIN · COINS LOCK AUTOMATICALLY · 3 RESPINS';$('feature-controls').append(note)}
 if(game.engine==='ways'){const note=document.createElement('span');note.textContent=(game.rows**game.cols)+' WAYS'+(game.scene==='lab'?' · TRANSFORMER 1–3×':'');$('feature-controls').append(note)}
 if(['20-super-hot','40-super-hot','burning-hot','flaming-hot'].some(slug=>game.id==='sw-'+slug+'-r2')){const note=document.createElement('span');note.textContent='JACKPOTS · No jackpot pools configured';$('feature-controls').append(note)}
}
function startLiveView(){
 livePlayer?.dispose();cancelAnimationFrame(liveRaf);livePlayer=mountLivePlayer({game,container:$('live-controls'),api,getUser:()=>user,login:()=>$('signin').showModal(),status,onPlay:()=>tone(),onState:states=>{liveStates=states;updateFloatingCashouts()},onSettled:async round=>{result=round.outcome;$('win').textContent=money(round.payout);$('verify-fair').hidden=!result?.fair;tone(Number(round.payout)>0);try{const current=await api('/api/me');if(current.id===user?.id){user=current;$('balance').textContent=money(current.balance)}}catch{}loadHistory()}});
 function tick(){if(!game?.engine.startsWith('live'))return;if(sound&&audio){flightAudio??=createFlightAudio(audio,game.scene);flightAudio.update(liveStates,audioVolume,performance.now())}drawFrame(1);liveRaf=requestAnimationFrame(tick)}liveRaf=requestAnimationFrame(tick);
}
$('verify-fair').onclick=async()=>{if(!result?.fair)return;try{status('Verifying seed commitment and every RNG draw…');const {verifyFairRound}=await import('/assets/internal-games/fair-verifier-v2159.js');await verifyFairRound(game,result);status('VERIFIED · seed hash and all '+result.fair.draw_count+' RNG draws match.')}catch(e){status('Verification failed: '+e.message)}};

function scheduleAuto(){if(featureSession?.pending)return;if(!autoLeft||busy||animating||walletRefreshing||!user||pending||document.hidden)return;setTimeout(()=>{if(autoLeft&&!busy&&!animating&&!walletRefreshing&&user&&!pending&&!document.hidden)$('controls').requestSubmit()},250)}
$('autoplay').onclick=()=>{if(autoLeft){autoLeft=0;$('autoplay').textContent='AUTOPLAY 10';return}if(busy||pending||featureSession?.pending||animating)return;if(!user){$('signin').showModal();return}autoLeft=10;$('autoplay').textContent='STOP AUTOPLAY';$('controls').requestSubmit()};

addEventListener('pagehide',()=>{flightAudio?.stop();flightAudio=null});

function paintPlayback(progress){
 const panel=$('round-playback');if(!panel)return;
 panel.hidden=!result||game?.engine.startsWith('live');if(panel.hidden)return;
 const sequence=frameState(result,progress);canvas.dataset.frameIndex=String(sequence.index);canvas.dataset.frameCount=String(sequence.count);
 $('round-step').textContent=frameCaption(sequence,game);
 $('round-progress').max=sequence.count;$('round-progress').value=animating?sequence.index+sequence.local:sequence.count;
 $('replay-result').hidden=animating||busy||!!pending||!!featureSession?.pending;
}
$('replay-result').onclick=()=>{if(!result||busy||animating||pending||featureSession?.pending||walletRefreshing)return;autoLeft=0;duration=playbackDuration(game,result,{turbo:false,motion:theme.motion});animate()};
