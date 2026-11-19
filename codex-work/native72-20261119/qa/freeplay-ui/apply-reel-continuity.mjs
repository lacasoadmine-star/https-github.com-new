// Build isolated graphics-only preview modules from a verified source snapshot.
// This does not modify the source snapshot and intentionally excludes app,
// session, transport, wallet and settlement modules.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const own=path.dirname(fileURLToPath(import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function replaceOnce(source,oldText,newText){
 if(source.split(oldText).length!==2)throw Error('SOURCE_PATCH_AMBIGUOUS: '+oldText.slice(0,100));
 return source.replace(oldText,newText);
}
function replaceSection(source,begin,end,patch){
 const start=source.indexOf(begin),finish=source.indexOf(end,start+begin.length);
 if(start<0||finish<0)throw Error('SOURCE_SECTION_MISSING: '+begin);
 return source.slice(0,start)+patch+source.slice(finish);
}

export async function stageReelContinuity({sourceRoot,stageRoot}){
 const next=sourceRoot?path.join(sourceRoot,'changes/next-pair-20261119'):path.join(own,'reel-baselines');
 const mh10=path.join(stageRoot,'mh10'),safari=path.join(stageRoot,'safari');
 await mkdir(mh10,{recursive:true});await mkdir(safari,{recursive:true});
 let presentation=await readFile(path.join(next,'mh10/presentation.mjs'),'utf8');
 let safariGraphics;
 if(sourceRoot){
  const safariSource=await readFile(path.join(next,'safari/game.mjs'),'utf8');
  if(sha(safariSource)!=='861efd197b471ac6a9ee27e152e50e6fd91a3153c5b5975da0f515f970af9171')throw Error('SOURCE_CHECKPOINT_CHANGED');
  const importLine=safariSource.match(/import\{a as ne,c as re,d as oe,h as le,j as F,k as he\}from"[^\"]+";/)?.[0];
  const start=safariSource.indexOf('var ue=class z{'),end=safariSource.indexOf(',b=t=>document.querySelector',start);
  if(!importLine||start<0||end<0)throw Error('SAFARI_GRAPHICS_BOUNDARIES_MISSING');
  safariGraphics=importLine+'\nimport {expansionColumns as fe} from "./expansion.mjs";\n'+safariSource.slice(start,end)+';\nexport {me as SafariRenderer,ue as SafariAtlas,pe as SafariAnimations};\n';
 }else safariGraphics=await readFile(path.join(next,'safari/renderer-original.mjs'),'utf8');
 const hashes={mh10:sha(presentation),safariGraphics:sha(safariGraphics)};
 if(hashes.mh10!=='4fa2b3757bbeb98763bf2a1bb7a8a3eba668a82cd033d75ecc578ec9b8d8dae5'
  ||hashes.safariGraphics!=='b6347efbedbca1896350b839cf142495c77b6045269e2e1a3666bd8ca8dbf091')throw Error('SOURCE_CHECKPOINT_CHANGED');
 const fixedInputs={
  'mh10/reels.mjs':'51b50a0b8af0fc7c1d57039b072f28c7b7a638f5ba7fd0e92ad773a5c889bcf2',
  'mh10/portrait.mjs':'0f6ee79f62237aa4c400bbb1e99ce62cb02544c0b9f47f76c36ced0535c48cc3',
  'mh10/atlas.mjs':'2f9edb82e9a79c4a72e71745b5b807f754b6f60ad51dff972059039c03c2d0b9',
  'safari/expansion.mjs':'37d868bf71793432ca1a13cf8f43786330ab12b1b59f5699174f5f000bc655aa'
 };
 for(const [name,expected]of Object.entries(fixedInputs))if(sha(await readFile(path.join(next,name)))!==expected)throw Error('SOURCE_CHECKPOINT_CHANGED: '+name);

 presentation="import {trimmedSpriteLayers} from './trimmed-sprite-layers.mjs';\n"+presentation;

 presentation=replaceSection(presentation,' for(let x=0;x<5;x++){',' if(this.model.winLines',`
 for(let col=0;col<5;col++){
  c.save();c.beginPath();c.rect(316+col*cellW,204,121,373);c.clip();
  const active=this.reels.phase!=='READY';
  const items=active?this.reels.window(col,time):this.reels.grid.map((row,index)=>({symbol:row[col],row:index}));
  const clarity=active?this.reels.clarity(col):1;
  for(const item of items){
   const sharpKey='Box/'+SYMBOLS[item.symbol],blurKey='Box/Blur/'+SYMBOLS[item.symbol];
   const sharp=a.atlas.frames[sharpKey],blur=a.atlas.frames[blurKey],ratio=sharp.frame.w/sharp.frame.h;
   const h=Math.min(134,131/ratio),w=h*ratio;
   const layers=trimmedSpriteLayers(sharp,blur,{x:316+col*cellW+(121-w)/2,
    y:204+item.row*cellH+(cellH-h)/2,width:w,height:h});
   const paint=(blur,alpha)=>{
    if(alpha<=0)return;
    c.globalAlpha=alpha;
    const box=blur?layers.blur:layers.sharp;
    s(blur?blurKey:sharpKey,box.x,box.y,box.width,box.height);
   };
   paint(true,1-clarity);paint(false,clarity);
  }
  c.restore();
 }
`);
 presentation=replaceOnce(presentation,
  'const progress=Math.min(1,Math.max(0,(time-this.reels.startTime)/this.reels.plan[0]));angle=start+(end-start)*(1-Math.pow(1-progress,3));',
  "const progress=this.reels.progress(0);angle=start+(end-start)*progress;");
 // The optional pending hook is for the no-money preview's delayed-response
 // fixture. Existing game application/session code is not copied or imported.
 presentation=replaceOnce(presentation,' animate(grid,plan){',
  " beginPending(){this.reels.beginPending(this.presentationClock);this.schedule();}\n animate(grid,plan){");
 await writeFile(path.join(mh10,'presentation.mjs'),presentation);
 await copyFile(path.join(own,'mh10-reels.mjs'),path.join(mh10,'reels.mjs'));
 for(const name of ['portrait.mjs','atlas.mjs'])await copyFile(path.join(next,'mh10',name),path.join(mh10,name));

 // The packaged baseline already excludes the account application/transport.
 let renderer=replaceOnce(safariGraphics,'var ue=class z{',
  'import {ContinuousReel} from "./continuous-reels.mjs";\nimport {trimmedSpriteLayers} from "./trimmed-sprite-layers.mjs";\nvar ue=class z{');

 renderer=replaceOnce(renderer,
  'this.animation.setExpansions([])}stop(){this.busy&&(this.stopRequested=!0)}abort(){this.roundEpoch++;this.busy=!1;this.stops=null}',
  `this.animation.setExpansions([]);
  this.targetResult=null;this.stopped=new Set;
  this.reelTracks=Array.from({length:3},(_,col)=>new ContinuousReel(H,this.grid.map(row=>row[col])).begin(this.presentationClock,{speed:(this.quick?1.5:.9)/88}));
 }stop(){
  if(!this.busy)return;this.stopRequested=true;
  this.reelTracks?.forEach((track,col)=>track.requestStop(this.presentationClock,200+col*60));
 }abort(){this.roundEpoch++;this.busy=false;this.stops=null;this.reelTracks=null}`);

 renderer=replaceOnce(renderer,
  'this.grid=result.grid;this.wheel=result.wheelMultiplier;\n this.stops=[0,1,2].map(col=>this.presentationClock+(this.stopRequested?0:col*(this.quick?70:160)));this.stopped=new Set;',
  `this.targetResult=result;this.wheel=result.wheelMultiplier;
 this.stops=this.reelTracks.map((track,col)=>{
  const segment=track.settle(result.grid.map(row=>row[col]),this.presentationClock,{duration:(this.quick?340:600)+col*(this.quick?70:160)});
  return segment.started+segment.duration;
 });this.stopped=new Set;`);

 renderer=replaceSection(renderer,'let n=0;for(let c=0;c<3;c++){','if(this.busy&&this.stops&&!n',`
 let n=0;
 for(let col=0;col<3;col++){
  const track=this.reelTracks?.[col],state=track?.sample(e),moving=this.busy&&state?.mode!=='stopped';
  if(moving)n++;
  else if(this.busy&&this.stops&&!this.stopped.has(col)){
   this.stopped.add(col);
   for(let row=0;row<3;row++)this.grid[row][col]=this.targetResult.grid[row][col];
   this.onReelStop(col+1);
  }
  s.save();s.beginPath();s.rect(325+col*113,100,111,265);s.clip();
  const items=this.busy&&track?track.window(e):this.grid.map((row,index)=>({symbol:row[col],row:index}));
  const clarity=this.busy&&track?track.clarity():1;
  for(const item of items){
   if(!this.busy&&this.animation.expansion.some(expansion=>expansion.col===col))continue;
   const symbol=H.indexOf(item.symbol),x=330+col*113,y=102+item.row*88;
   const sharpKey='Box/'+symbol,blurKey='Box/Blur/'+symbol;
   const sharp=this.bank.atlas.frames[sharpKey],blur=this.bank.atlas.frames[blurKey];
   const scale=Math.min(99/sharp.frame.w,84/sharp.frame.h),w=sharp.frame.w*scale,h=sharp.frame.h*scale;
   const layers=trimmedSpriteLayers(sharp,blur,{x:x+(99-w)/2,y:y+(84-h)/2,width:w,height:h});
   if(clarity<1){s.globalAlpha=1-clarity;const box=layers.blur;this.sprite(blurKey,box.x,box.y,box.width,box.height);}
   if(clarity>0){s.globalAlpha=clarity;const box=layers.sharp;this.sprite(sharpKey,box.x,box.y,box.width,box.height);}
  }
  s.restore();
 }
 `);
 // Prevent any accidental dependency on a live session module in these copies.
 if(/sessionTransport|fresh-state|\/api\/|localStorage|new ce\(/.test(renderer))throw Error('NON_GRAPHICS_CODE_IN_PREVIEW');
 await writeFile(path.join(safari,'renderer.mjs'),renderer);
 await copyFile(path.join(next,'safari/expansion.mjs'),path.join(safari,'expansion.mjs'));
 for(const directory of [mh10,safari])for(const name of ['continuous-reels.mjs','trimmed-sprite-layers.mjs'])await copyFile(path.join(own,name),path.join(directory,name));
 const manifest={scope:'Isolated graphics-only local preview; no account, wallet, network API, outcome or settlement code.',
  sourceHashes:hashes,files:[]};
 for(const [directory,names]of [[mh10,['presentation.mjs','reels.mjs','portrait.mjs','atlas.mjs','continuous-reels.mjs','trimmed-sprite-layers.mjs']],
  [safari,['renderer.mjs','expansion.mjs','continuous-reels.mjs','trimmed-sprite-layers.mjs']]]){
  for(const name of names)manifest.files.push({path:path.relative(stageRoot,path.join(directory,name)),sha256:sha(await readFile(path.join(directory,name)))});
 }
 await writeFile(path.join(own,'reel-continuity-stage.json'),JSON.stringify(manifest,null,2)+'\n');
 return manifest;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const sourceRoot=process.argv[3]?process.argv[2]:undefined,stageRoot=process.argv[3]||process.argv[2];
 if(!stageRoot)throw Error('Usage: node apply-reel-continuity.mjs [SOURCE_ROOT] ISOLATED_STAGE_ROOT');
 console.log(JSON.stringify(await stageReelContinuity({sourceRoot,stageRoot}),null,2));
}
