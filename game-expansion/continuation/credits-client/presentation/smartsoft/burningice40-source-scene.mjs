import {drawAtlasFrame} from '../atlas.mjs';
import {BURNING_ICE40_ID,BURNING_ICE40_CONTROL_SOURCE,burningIce40ControlScene,supportsBurningIce40Controls} from './burningice40-controls.mjs';

// Source-space scene. Used by the opt-in local host; not in the frozen R3 build.
// No RNG, state restoration, action, wallet, asset fetch or font substitution.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const BURNING_ICE40_SOURCE_LAYOUT=freeze({
 width:2170,height:1130,
 sources:{base:BURNING_ICE40_CONTROL_SOURCE.baseSha256,variant:BURNING_ICE40_CONTROL_SOURCE.overrideSha256,canvas:'caf82f42562dd275d11eaec37dcb58939277598b0f0bfaf09218c8e219e59b77'},
 mask:{x:535,y:104,width:1104,height:829},
 column:{x:532,y:104,width:216,height:829,stride:223,count:5},
 symbols:{firstCenterX:642,bottomCenterY:828,strideX:223,strideY:205,rows:4,sourceWidth:400,sourceHeight:400,scale:1},
 logo:{x:784,y:-17,width:614,height:260},lineIcons:{x:413,y:89,width:1346,height:858},footer:{x:622,y:931,width:929,height:84},
 auto:{x:137,y:178,width:173,height:191},gamble:{x:137,y:426,width:173,height:191},
 collect:{x:137,y:671,frame:'Buttons/DoubleTake',dimensionsKnown:false},
 textSlots:{balance:{x:810,y:958,size:24,fontAlias:'style1'},win:{x:1109,y:958,size:24,fontAlias:'style1'},lastWin:{x:1417,y:958,size:24,fontAlias:'style1'}},
});
const L=BURNING_ICE40_SOURCE_LAYOUT;
const required={'@Image/Start/Column-40':[216,829],'@Image/Start/Logo-40':[614,260],'@Image/Start/LineIcons-40':[1346,858],'Start/Footer':[929,84],'Buttons/AutoPlay':[173,191],'Buttons/Double':[173,191]};
export function supportsBurningIce40SourceScene(manifest){
 return supportsBurningIce40Controls(manifest)&&Object.entries(required).every(([name,[w,h]])=>manifest.frames[name]?.original?.width===w&&manifest.frames[name]?.original?.height===h);
}
export function burningIce40SourceTransform(width,height){
 if(![width,height].every(n=>Number.isFinite(n)&&n>0))throw Error('BURNING_ICE40_VIEWPORT_INVALID');
 const scale=Math.min(width/L.width,height/L.height);
 return freeze({scale,x:(width-L.width*scale)/2,y:(height-L.height*scale)/2,width:L.width*scale,height:L.height*scale,sourceWidth:L.width,sourceHeight:L.height});
}
export function projectBurningIce40Rect(rect,transform){
 if(!rect||![rect.x,rect.y,rect.width,rect.height,transform?.scale,transform?.x,transform?.y].every(Number.isFinite)||rect.width<=0||rect.height<=0||transform.scale<=0)throw Error('BURNING_ICE40_RECT_INVALID');
 return{x:transform.x+rect.x*transform.scale,y:transform.y+rect.y*transform.scale,width:rect.width*transform.scale,height:rect.height*transform.scale};
}
export function burningIce40SourceCell(column,row){
 if(!Number.isInteger(column)||column<0||column>=5||!Number.isInteger(row)||row<0||row>=4)throw Error('BURNING_ICE40_CELL_INVALID');
 // Receipts and preview grids are top-first; the captured provider layout is
 // bottom-first. Only display coordinates are reversed, never receipt cells.
 const s=L.symbols,x=s.firstCenterX+column*s.strideX,y=s.bottomCenterY-(s.rows-1-row)*s.strideY;
 return {x:x-s.sourceWidth/2,y:y-s.sourceHeight/2,width:s.sourceWidth,height:s.sourceHeight};
}
export function createBurningIce40SourceScene(manifest,{grid=null,preview=null,wagerView=null}={}){
 if(!supportsBurningIce40SourceScene(manifest))throw Error('BURNING_ICE40_SOURCE_MANIFEST_INVALID');
 if(grid!==null&&(!Array.isArray(grid)||grid.length!==5||grid.some(column=>!Array.isArray(column)||column.length!==4||column.some(symbol=>!Object.hasOwn(manifest.symbols,String(symbol))))))throw Error('BURNING_ICE40_SOURCE_GRID_INVALID');
 const commands=[],textSlots=[],controls={};
 const sprite=(frame,box,role,extra={})=>{if(!manifest.frames[frame])throw Error('BURNING_ICE40_SOURCE_FRAME_MISSING');commands.push({type:'sprite',frame,box:{x:box.x,y:box.y,width:box.width,height:box.height},padding:true,role,...extra});};
 for(let c=0;c<5;c++)sprite('@Image/Start/Column-40',{...L.column,x:L.column.x+c*L.column.stride},'reel-column',{column:c});
 // No synthetic or fitted background: the source page/CSS placement is not
 // captured. The preview canvas remains transparent outside original art.
 sprite('Start/Footer',L.footer,'source-footer');
 if(grid)for(let c=0;c<5;c++)for(let r=0;r<4;r++){
  const key=String(grid[c][r]),frame=manifest.symbols[key].frame;
  if(manifest.frames[frame]?.original?.width!==400||manifest.frames[frame]?.original?.height!==400)throw Error('BURNING_ICE40_SOURCE_SYMBOL_SIZE_MISMATCH');
  sprite(frame,burningIce40SourceCell(c,r),'symbol',{column:c,row:r,symbol:key,clip:L.mask});
 }
 sprite('@Image/Start/LineIcons-40',L.lineIcons,'source-line-icons');sprite('@Image/Start/Logo-40',L.logo,'game-logo');
 sprite('Buttons/AutoPlay',L.auto,'source-autoplay');sprite('Buttons/Double',L.gamble,'source-gamble');
 controls.autoplay={...L.auto,sourceFrame:'Buttons/AutoPlay',enabled:false};controls.gamble={...L.gamble,sourceFrame:'Buttons/Double',enabled:false};
 if(wagerView){
  const crop=BURNING_ICE40_CONTROL_SOURCE.crop,scene=burningIce40ControlScene(manifest,wagerView,{x:crop.x,y:crop.y});
  if(!scene)throw Error('BURNING_ICE40_WAGER_VIEW_INVALID');
  commands.push(...scene.commands.filter(command=>command.type==='sprite'));
  textSlots.push(...scene.commands.filter(command=>command.type==='text'));
  for(const[name,rect]of Object.entries(scene.controls))controls[name]={...rect};
 }else{
  for(const[frame,box,name]of [['Buttons/PlusDisabled',BURNING_ICE40_CONTROL_SOURCE.plus,'increase'],['Buttons/MinusDisabled',BURNING_ICE40_CONTROL_SOURCE.minus,'decrease'],['Buttons/Spin',BURNING_ICE40_CONTROL_SOURCE.spin,'play']]){sprite(frame,box,'source-'+name);controls[name]={...box,enabled:false};}
 }
 return {schemaVersion:1,gameId:BURNING_ICE40_ID,width:L.width,height:L.height,commands,controlsGeometry:controls,gridGeometry:{x:530.5,y:110.5,width:1115,height:820},reelMask:L.mask,textSlots,footerTextSlots:L.textSlots,
  sourcePreview:preview?.kind==='source-initial-preview'&&preview.gameId===manifest.id&&preview.sourceSha256===L.sources.variant,
  financialActions:false,productionLaunchEnabled:false,hostIntegrated:false,completeNativePresentation:false,
  provenance:{sources:L.sources,coordinates:'Slots_blazinghot40.js:8-18,143-175; Slots_blazinghot.js:262-425,789-830,1017-1045; Slots_canvas.js:528-554,2130-2155',projection:'One uniform contain transform; no portrait rearrangement. This is not the unrecovered page/CSS responsive behavior.'},
  gaps:['Original collect button art is unavailable; no replacement is drawn.','Text is omitted until style1/style2 font aliases are verified; exact source text slots are retained.','Background placement, page chrome and responsive CSS are not reproduced.','Dynamic symbol-win, popup, collect and carousel timelines are outside this static module.','Native STOP overlay is not supplied by the identical SpinStop atlas pixels.']};
}
export function paintBurningIce40SourceScene(context,scene,manifest,images,{width=scene.width,height=scene.height}={}){
 if(scene?.gameId!==BURNING_ICE40_ID||!supportsBurningIce40SourceScene(manifest))throw Error('BURNING_ICE40_SOURCE_SCENE_INVALID');
 const transform=burningIce40SourceTransform(width,height);
 context.save();context.clearRect(0,0,width,height);context.translate(transform.x,transform.y);context.scale(transform.scale,transform.scale);
 try{for(const command of scene.commands){
  const frame=manifest.frames[command.frame],image=images.get(frame.file);if(!image)throw Error('BURNING_ICE40_SOURCE_IMAGE_MISSING');
  context.save();try{if(command.clip){context.beginPath();context.rect(command.clip.x,command.clip.y,command.clip.width,command.clip.height);context.clip();}
  drawAtlasFrame(context,image,frame,command.box,{padding:true});}finally{context.restore();}
 }}finally{context.restore();}
 return {transform,controlsGeometry:Object.fromEntries(Object.entries(scene.controlsGeometry).map(([name,rect])=>[name,{...rect,...projectBurningIce40Rect(rect,transform)}]))};
}
