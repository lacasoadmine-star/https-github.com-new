import {MOTION,cruising,landing,sample} from './reel-motion.mjs?v=197';
export const referenceArt={hot_foxy_20:{orange:'/assets/foxy-orange.webp',cherry:'/zplay-symbols-v210.png?cell=0',watermelon:'/zplay-symbols-v210.png?cell=1',lemon:'/assets/foxy-lemon.webp',winged_bell:'/assets/foxy-bell.webp','777':'/assets/foxy-seven.webp',fox:'/assets/foxy-fox.webp',scatter:'/assets/foxy-scatter.webp'},multi_hot_5_video:{plum:'/zplay-symbols-v210.png?cell=2'},wild_multi_stars:{plum:'/zplay-symbols-v210.png?cell=3'}};
const referenceCache=new Map();
function loadReferenceImage(src){if(!referenceCache.has(src))referenceCache.set(src,new Promise((resolve,reject)=>{const img=new Image();let done=false;const end=error=>{if(done)return;done=true;clearTimeout(timer);img.onload=img.onerror=null;if(error){referenceCache.delete(src);reject(error)}else resolve(img)};const timer=setTimeout(()=>end(Error('Reference artwork timed out. Using atlas fallback.')),5500);img.onload=async()=>{try{await img.decode();if(!img.naturalWidth)throw Error('Invalid artwork');end()}catch(e){end(e)}};img.onerror=()=>end(Error('Reference artwork unavailable. Retry loading.'));img.fetchPriority='high';img.src=src}));return referenceCache.get(src)}
async function loadReferenceArt(id){const entries=await Promise.all(Object.entries(referenceArt[id]||{}).map(async([symbol,src])=>{try{return [symbol,await loadReferenceImage(src)]}catch{return null}}));return Object.fromEntries(entries.filter(Boolean))}
const atlasCells={cherry:0,orange:1,lemon:2,plum:3,grapes:4,watermelon:5,golden_bell:6,'777':7,clover:8,dollar:9,pot_of_gold:10,big_star:12,wild:12,super_wild:12,scatter:13,winged_bell:14,fox:15};
let sharedAtlas;
export function loadAtlas(){
 if(!sharedAtlas)sharedAtlas=new Promise((resolve,reject)=>{
  const image=new Image();let settled=false;
  const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);image.onload=image.onerror=null;if(error){sharedAtlas=null;reject(error);}else resolve(image);};
  const timer=setTimeout(()=>finish(Error('Artwork connection timed out. Please retry.')),12000);
  image.onload=async()=>{try{if(image.naturalWidth<4||image.naturalHeight<4)throw Error('Artwork unavailable');if(image.decode)await image.decode();finish();}catch(e){finish(e);}};
  image.onerror=()=>finish(Error('Artwork could not load. Please retry.'));
  image.fetchPriority='high';image.src='/slots/art/symbol-atlas-v2302.png';
 });
 return sharedAtlas;
}
function paintAtlas(tile,image,symbol,gameId){
 let index=atlasCells[symbol];if(index===undefined)return;
 if(symbol==='777'&&gameId==='hot_foxy_20')index=11;
 const c=tile.getContext('2d'),cellWidth=image.naturalWidth/4,cellHeight=image.naturalHeight/4,inset=index===12||index===15?0:.055;
 c.clearRect(0,0,384,384);c.drawImage(image,((index%4)+inset)*cellWidth,(Math.floor(index/4)+inset)*cellHeight,cellWidth*(1-inset*2),cellHeight*(1-inset*2),0,0,384,384);
 const label=symbol==='super_wild'?'SUPER WILD':symbol==='wild'?'WILD':symbol==='scatter'?'SCATTER':null;
 if(label){c.save();c.textAlign='center';c.textBaseline='middle';c.font=`900 ${label.length>7?35:44}px Arial,sans-serif`;c.lineWidth=8;c.lineJoin='round';c.strokeStyle='#392445';c.fillStyle='#fff4a6';c.shadowColor='#000a';c.shadowBlur=5;c.strokeText(label,192,290,292);c.fillText(label,192,290,292);c.restore();}
}
function paintReference(tile,image){if(image.src.includes('/zplay-symbols-v210.png')){const cell=Number(new URL(image.src).searchParams.get('cell')),c=tile.getContext('2d'),cw=image.naturalWidth/2,ch=image.naturalHeight/2;c.clearRect(0,0,384,384);c.drawImage(image,(cell%2)*cw,Math.floor(cell/2)*ch,cw,ch,0,0,384,384);return;}const c=tile.getContext('2d'),scale=Math.min(384/image.naturalWidth,384/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;c.clearRect(0,0,384,384);c.drawImage(image,(384-w)/2,(384-h)/2,w,h)}
export class ReelRenderer {
 constructor(canvas,game,onStop=()=>{}){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:true});if(!this.ctx)throw Error('CANVAS_NOT_SUPPORTED');this.game=game;this.cols=game.reels;this.rows=game.rows;this.onStop=onStop;this.symbols=new Set(game.reelStrips.flat());this.grid=Array.from({length:this.rows},(_,r)=>game.reelStrips.map((s,c)=>s[(r*3+c*2)%s.length]));this.sprites=new Map();this.stopped=new Set();this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.resize();this.ready=Promise.all([loadAtlas(),loadReferenceArt(game.id)]).then(([image,reference])=>{if(this.disposed)return;this.atlas=image;this.reference=reference;this.canvas.dataset.artPack=Object.keys(reference).length?'reference-3500':'atlas-2302';for(const symbol of this.symbols){if(atlasCells[symbol]===undefined)throw Error('Artwork missing for '+symbol);this.sprite(symbol);}this.render(performance.now());});}
 resize(){const r=this.canvas.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);this.dpr=Math.min(devicePixelRatio||1,2,Math.sqrt(2097152/(this.width*this.height)));this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.render(performance.now());}
 sprite(symbol){if(!this.sprites.has(symbol)){const tile=document.createElement('canvas');tile.width=tile.height=384;if(!this.atlas)throw Error('Artwork is not ready');if(this.reference?.[symbol])paintReference(tile,this.reference[symbol]);else paintAtlas(tile,this.atlas,symbol,this.game.id);this.sprites.set(symbol,tile);}return this.sprites.get(symbol);}
 flushArt(){if(this.spinning||!this.pendingAtlas)return;this.atlas=this.pendingAtlas;this.pendingAtlas=null;for(const [symbol,tile]of this.sprites){if(this.reference?.[symbol])paintReference(tile,this.reference[symbol]);else paintAtlas(tile,this.atlas,symbol,this.game.id);}}
 begin(){
  if(this.disposed||this.spinning)return;
  this.stopRequested=false;this.spinning=true;this.started=performance.now();this.target=null;this.staggerStart=65;
  this.stopped.clear();this.wins=new Set();this.plans=null;
  this.profile=MOTION[this.game.id]||{speed:12,ramp:200,stop:800,stagger:140};
 }
 motion(col,now){return this.plans?sample(this.plans[col],now):cruising(Math.max(0,now-this.started-col*(this.staggerStart||0)),this.profile.speed,this.profile.ramp);}
 async finish(outcome){
  const grid=outcome.grid;
  if(!Array.isArray(grid)||grid.length!==this.rows||grid.some(row=>!Array.isArray(row)||row.length!==this.cols||row.some(s=>!this.symbols.has(s))))throw Error('BAD_REEL_RESULT');
  if(this.disposed)throw Error('RENDERER_DISPOSED');
  const now=performance.now(),fast=this.reduced||this.stopRequested||document.body.dataset.turbo==='true';
  this.target=grid.map(row=>row.slice());
  this.plans=Array.from({length:this.cols},(_,col)=>{const m=this.motion(col,now);return landing(m.position,m.velocity,now,fast?180+col*45:this.profile.stop+col*this.profile.stagger);});
  this.wins=new Set((outcome.winLines||[]).flatMap(l=>(l.positions||[]).map(([r,c])=>r+':'+c)));
  return new Promise(resolve=>{this.resolve=resolve;});
 }
 requestStop(){
  if(!this.spinning||this.stopRequested)return;this.stopRequested=true;
  if(this.plans){const now=performance.now();this.plans=this.plans.map((p,col)=>{const m=sample(p,now);return m.done?p:landing(m.position,m.velocity,now,Math.min(180+col*30,Math.max(1,p.start+p.duration-now)),p.to);});}
 }
 cancel(){this.wins=new Set();this.stopped.clear();this.spinning=false;this.target=null;this.plans=null;this.resolve?.();this.resolve=null;this.render(performance.now());}
 render(now=performance.now()){
  if(this.disposed||!this.atlas)return;
  const c=this.ctx,w=this.width/this.cols,h=this.height/this.rows;
  c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);
  for(let col=0;col<this.cols;col++){
   c.save();c.beginPath();c.rect(col*w,0,w,this.height);c.clip();
   const m=this.spinning?this.motion(col,now):{position:0,done:true};
   const landed=!this.spinning||!!this.target&&m.done;
   if(landed){
    if(this.spinning&&!this.stopped.has(col)){this.stopped.add(col);this.onStop(col);}
    const grid=this.target||this.grid;
    for(let row=0;row<this.rows;row++){
     if(this.wins?.has(row+':'+col)){
      const pulse=this.reduced?1:.75+.25*Math.sin(now/150);
      c.fillStyle=`rgba(255,215,78,${.08+pulse*.07})`;c.fillRect(col*w,row*h,w,h);
      c.save();c.strokeStyle=`rgba(255,223,104,${.65+pulse*.35})`;c.lineWidth=Math.max(1.5,w*.023);c.shadowColor='#ffb936';c.shadowBlur=this.reduced?0:8+pulse*6;c.strokeRect(col*w+2,row*h+2,w-4,h-4);c.restore();
     }
     const size=Math.min(w,h)*.99;c.drawImage(this.sprite(grid[row][col]),col*w+(w-size)/2,row*h+(h-size)/2,size,size);
    }
   }else{
    const whole=Math.floor(m.position),offset=(m.position-whole)*h,strip=this.game.reelStrips[col];
    for(let row=-1;row<=this.rows;row++){
     const logical=row-whole,finalRow=this.target?logical+this.plans[col].to:-1;
     const symbol=this.target&&finalRow>=0&&finalRow<this.rows?this.target[finalRow][col]:logical>=0&&logical<this.rows?this.grid[logical][col]:strip[((logical%strip.length)+strip.length)%strip.length];
     const size=Math.min(w,h)*.99;
     const tile=this.sprite(symbol),x=col*w+(w-size)/2,y=row*h+offset+(h-size)/2;
     // Short vertical trails follow actual strip speed, fading out at each stop.
     const trail=this.reduced?0:Math.min(h*.42,Math.max(0,m.velocity-1.5)*h*.026);
     // A directional shutter, not three displaced copies. Speed controls exposure;
     // a stopped reel always draws one crisp, authoritative symbol.
     if(trail>1){
      const weights=[.055,.095,.15,.4,.15,.095,.055];c.globalCompositeOperation='lighter';
      for(let tap=0;tap<weights.length;tap++){c.globalAlpha=weights[tap];c.drawImage(tile,x,y+(tap-3)*trail/3,size,size);}
     c.globalCompositeOperation='source-over';
     }else c.drawImage(tile,x,y,size,size);
     c.globalAlpha=1;
    }
   }
   c.restore();
  }
  if(this.spinning&&this.target&&this.stopped.size===this.cols){this.grid=this.target;this.target=null;this.plans=null;this.spinning=false;this.resolve?.();this.resolve=null;}
 }
 dispose(){this.disposed=true;this.resolve?.();this.resolve=null;this.sprites.clear();this.pendingAtlas=null;this.atlas=null;}
}
