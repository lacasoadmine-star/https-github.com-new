import{ReferenceAssetStore,paintScene,minorMoney}from'../machine-renderer.mjs';
export{paintScene};
const box=(x,y,width,height)=>({x,y,width,height});
const money=value=>typeof value==='string'&&/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(value)?value:'—';
const integer=value=>Number.isSafeInteger(value)&&value>=0;
export function confirmedView(manifest,state={}){
 const round=state.round,confirmed=state.confirmed===true&&state.authenticated===true&&round&&(round.gameId||round.game_id)===manifest.id;
 if(!confirmed)return{confirmed:false,round:null,grid:null,wins:[],progress:null,feature:null};
 const frames=Array.isArray(round.frames)?round.frames:[];
 const requestedFrame=state.frameIndex!==undefined&&state.frameIndex!==null;
 const hasFrame=Number.isInteger(state.frameIndex)&&state.frameIndex>=0&&state.frameIndex<frames.length;
 const visible=requestedFrame?(hasFrame?frames[state.frameIndex]:null):round;
 const grid=Array.isArray(visible?.grid)&&visible.grid.length===6&&visible.grid.every(column=>Array.isArray(column)&&column.length===5)?visible.grid:null;
 return{confirmed:true,round,grid,wins:grid&&Array.isArray(visible?.wins)?visible.wins:[],progress:integer(visible?.progress)?visible.progress:null,feature:typeof visible?.god==='string'?visible.god:typeof visible?.feature==='string'?visible.feature:null};
}
export function legendsGridLayout(manifest){
 const outer=manifest.images.board,inner=manifest.images.boardBackground,available=box(12,285,350,268);
 if(!outer||!inner||![outer.width,outer.height,inner.width,inner.height].every(value=>Number.isFinite(value)&&value>0))throw new Error('Missing original board dimensions');
 const scale=Math.min(available.width/outer.width,available.height/outer.height),cx=available.x+available.width/2,cy=available.y+available.height/2;
 return{board:box(cx-outer.width*scale/2,cy-outer.height*scale/2,outer.width*scale,outer.height*scale),grid:box(cx-inner.width*scale/2,cy-inner.height*scale/2,inner.width*scale,inner.height*scale),bar:box(367,298,40,242)};
}
export function createLegendsScene(manifest,state={},options={}){
 const view=confirmedView(manifest,state),commands=[],egypt=manifest.id==='egyptianlegends_native',ink=egypt?'#ffdf91':'#e3d2ff';
 const text=(value,x,y,size=13,color=ink)=>commands.push({type:'text',text:String(value),x,y,size,color,align:'center'});
 const rect=(target,color)=>commands.push({type:'rect',box:target,color});
 const image=(role,target,fit='contain',extra={})=>{const asset=manifest.images[role];if(asset)commands.push({type:'image',file:asset.file,box:target,fit,...extra});};
 const sprite=(frame,target,extra={})=>{if(manifest.frames[frame])commands.push({type:'sprite',frame,box:target,...extra});};
 rect(box(0,0,420,900),egypt?'#151825':'#191031');image(options.bonus?'bonusBackground':'background',box(0,0,420,900),'cover');
 rect(box(0,0,420,43),'#070a18c8');text('ORIGINAL ARTWORK REVIEW',210,25,11,'#e2eaf1');
 image('logo',box(75,59,270,106));
 // Progress artwork is vertical in both actual mobile asset sets.
 const{board,grid,bar}=legendsGridLayout(manifest);
 image('boardBackground',grid,'stretch');image('board',board,'contain');image('progress',bar);
 const thresholdY=[.88,.69,.50,.28,.06];
 manifest.progress.thresholds.forEach((value,index)=>text(value,387,bar.y+bar.height*thresholdY[index],9,ink));
 if(view.progress!==null){
  const within=view.progress===0?0:(view.progress-1)%110+1;
  image('progressBlue',bar,'contain',{clip:box(bar.x,bar.y+bar.height*(1-within/110),bar.width,bar.height*within/110)});
 }
 rect(box(132,233,156,29),'#080d1dbd');text(view.progress===null?'PROGRESS —':'PROGRESS '+view.progress,210,250,11);
 const completeIds=Object.keys(manifest.symbols),previewGrid=options.review?Array.from({length:6},(_,c)=>Array.from({length:5},(_,r)=>completeIds[(c*3+r)%completeIds.length])):null;
 const shown=view.confirmed?view.grid:previewGrid,cw=grid.width/6,ch=grid.height/5;
 for(let c=0;c<6;c++)for(let r=0;r<5;r++){
  const cell=box(grid.x+c*cw,grid.y+r*ch,cw,ch),id=shown?.[c]?.[r],symbol=manifest.symbols[id];
  if(symbol)sprite(symbol.frame,box(cell.x+1,cell.y+1,cw-2,ch-2),{clip:cell});else text('—',cell.x+cw/2,cell.y+ch/2,14,'#e7dfd580');
 }
 for(const win of view.wins)for(const cell of Array.isArray(win?.cells)?win.cells:[]){if(!Array.isArray(cell))continue;const[c,r]=cell;if(!Number.isInteger(c)||!Number.isInteger(r)||c<0||c>=6||r<0||r>=5)continue;commands.push({type:'outline',box:box(grid.x+c*cw+1,grid.y+r*ch+1,cw-2,ch-2),color:'#ffeb8d',lineWidth:2});}
 const feature=manifest.progress.features.find(item=>item.god.toLowerCase()===String(view.feature||'').toLowerCase()||(item.god==='Atlas'&&view.feature==='titan'));
 if(feature)text(feature.god+' · '+feature.name,210,593,13);else text('6 × 5 · CASCADING SYMBOLS',210,593,12);
 rect(box(72,621,276,65),'#080d1dc7');text('CONFIRMED ROUND TOTAL',210,640,10,'#bccbd8');text(view.confirmed?minorMoney(view.round.payoutMinor)+' '+(state.currency||'ETB'):'—',210,667,20,'#ffffff');
 image('spin',box(160,713,100,108));text('PREVIEW',210,769,13,'#ffffff');image('autoPlay',box(83,747,34,34));image('buyBonus',box(303,743,67,43));
 text('Static artwork only · no wallet connection',210,837,10,'#e7e6f0');rect(box(18,858,384,1),'#d5d4f03d');
 text('BALANCE',91,872,9);text(view.confirmed&&state.authenticated===true?money(state.balance):'—',91,891,12,'#ffffff');
 text('BET',327,872,9);text(view.confirmed?minorMoney(view.round.stakeMinor):'—',327,891,12,'#ffffff');
 return{schemaVersion:1,gameId:manifest.id,width:420,height:900,financialActions:false,productionLaunchEnabled:false,controls:{spin:false,buyBonus:false,autoplay:false},commands};
}
export class LegendsAssetStore extends ReferenceAssetStore{
 async prepare(scene){const images=await super.prepare(scene),font=this.manifest.fonts.find(item=>/RubikBold/i.test(item.name));if(font&&typeof FontFace!=='undefined'&&!this.fonts.length){const face=new FontFace('ZplayReference',await this.loadBytes(font.file),{weight:'700'});await face.load();document.fonts.add(face);this.fonts.push(face);}return images;}
}
