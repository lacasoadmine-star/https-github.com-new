import {minorMoney} from '../machine-renderer.mjs';
import {COIN_NATIVE_LAYOUTS} from './coinminer-layouts.mjs';

const MONEY=/^(0|[1-9]\d*)$/;
const DISPLAY_MONEY=/^(0|[1-9]\d*)(\.\d{1,2})?$/;
const box=(x,y,width,height)=>({x,y,width,height});
const circle=(cx,cy,radius)=>Array.from({length:96},(_,i)=>({x:cx+radius*Math.cos(i*2*Math.PI/96),y:cy+radius*Math.sin(i*2*Math.PI/96)}));
const roundedBox=(target,radii)=>{
 const {x,y,width:w,height:h}=target,[tl,tr,br,bl]=radii;
 return [[x+tl,y+tl,tl,Math.PI],[x+w-tr,y+tr,tr,Math.PI*1.5],[x+w-br,y+h-br,br,0],[x+bl,y+h-bl,bl,Math.PI*.5]].flatMap(([cx,cy,r,start])=>Array.from({length:13},(_,i)=>({x:cx+r*Math.cos(start+i*Math.PI/24),y:cy+r*Math.sin(start+i*Math.PI/24)})));
};

// The surrounding host authenticates receipts and controls actions. This view
// only paints the captured ordinary94 layout and exact public receipt values.
export function renderCoinMiner(manifest,snapshot,round,options,commands){
 if(manifest?.id!=='coinminer_native')throw Error('COIN_PRESENTATION_ID_REQUIRED');
 const sprite=(frame,target,extra={})=>{if(!manifest.frames?.[frame])throw Error('Required reference artwork missing: '+frame);commands.push({type:'sprite',frame,box:target,...extra});};
 const optional=(frame,target,extra={})=>{if(manifest.frames?.[frame])sprite(frame,target,extra);};
 const text=(value,x,y,size=14,color='#ffffff',extra={})=>commands.push({type:'text',text:String(value),x,y,size,color,align:'center',fontWeight:500,fontFamily:'sans-serif',...extra});
 const rect=(target,color,extra={})=>commands.push({type:'rect',box:target,color,...extra});
 const color=(name,fallback)=>manifest.colors?.[name]||fallback;
 const active=round?.status==='active',pending=snapshot.pending===true;
 const authorized=snapshot.confirmed===true&&snapshot.authenticated===true;
 const landscape=Number.isFinite(options.viewportWidth)&&Number.isFinite(options.viewportHeight)&&options.viewportWidth>0&&options.viewportHeight>0&&options.viewportWidth>options.viewportHeight;
 const layout=COIN_NATIVE_LAYOUTS[landscape?'landscape':'portrait'],{width,height}=layout,headerRight=layout.headerRight.x;
 const sourceBox=value=>box(value.x,value.y,value.width,value.height);
 const enabled=options.interactive===true&&authorized&&!pending&&(active?Array.isArray(round.actions)&&round.actions.includes('cashout'):snapshot.canStart===true);
 const stake=DISPLAY_MONEY.test(snapshot.stake||'')?snapshot.stake:round?minorMoney(round.stakeMinor):'—';
 const balance=options.interactive?(authorized&&DISPLAY_MONEY.test(snapshot.balance||'')?snapshot.balance:'—'):MONEY.test(snapshot.balanceMinor||'')?minorMoney(snapshot.balanceMinor):'—';

 rect(box(0,0,width,height),color('--bg','#212a39'));
 const board=sourceBox(layout.board);
 rect(board,color('--block','#0e1017'),{role:'coin-board-background',clipPolygon:roundedBox(board,layout.board.corner_radius)});
 sprite(layout.logo.asset,sourceBox(layout.logo));
 const tiles=layout.tiles,picks=new Map();
 if(round){
  if(!manifest.controls.mineChoices.includes(round.mines)||!Array.isArray(round.picks)||round.picks.length>24)throw Error('Invalid public mine receipt');
  for(const pick of round.picks){
   if(!Number.isInteger(pick.index)||pick.index<0||pick.index>=25||typeof pick.safe!=='boolean'||picks.has(pick.index)||(!pick.safe&&pick.treasureBoost))throw Error('Invalid or duplicate confirmed tile');
   picks.set(pick.index,pick);
  }
  if(round.nextPayoutMinor!=null&&(typeof round.nextPayoutMinor!=='string'||!MONEY.test(round.nextPayoutMinor)))throw Error('Invalid next tile return');
 }
 for(let index=0;index<25;index++){
  const c=index%5,r=Math.floor(index/5),target=box(tiles.x+c*(tiles.tile_width+tiles.space_between_horizontal),tiles.y+r*(tiles.tile_height+tiles.space_between_vertical),tiles.tile_width,tiles.tile_height),pick=picks.get(index);
  if(!pick){sprite('tile1',target,{role:'coin-closed-half',tileIndex:index,half:0});sprite('tile2',target,{role:'coin-closed-half',tileIndex:index,half:1});}
  else sprite(pick.safe?'prize1':'tile_explosion',target,{role:pick.safe?'coin-confirmed-prize':'coin-confirmed-mine',tileIndex:index});
  if(pick?.treasureBoost===true)sprite('bonus_label',target,{role:'coin-confirmed-bonus',tileIndex:index});
 }
 text('BALANCE',10,16,12,color('--ui-balance-c-label','#909095'),{align:'left'});
 text(balance,10,33,15,color('--ui-balance-c-value','#fff'),{align:'left',role:'coin-balance'});
 const selectedMines=manifest.controls.mineChoices.includes(snapshot.mines)?snapshot.mines:null;
 text('MINES',headerRight-103,16,12,color('--ui-mine-c-label','#909095'));
 text(active?String(round.mines):selectedMines!==null?String(selectedMines):round?String(round.mines):'—',headerRight-103,33,15);
 text('BET',headerRight,16,12,color('--ui-bet-c-label','#909095'),{align:'right'});
 text(options.interactive?stake:round?minorMoney(round.stakeMinor):'—',headerRight,33,15,color('--ui-bet-c-value','#fff'),{align:'right',role:'coin-stake'});
 optional(round?.treasureBoost?.active===true?'bonus_active':'bonus_inactive',box(headerRight-158,9,30,30));
 const safe=[...picks.values()].filter(pick=>pick.safe).length;
 const nextReturn=active&&MONEY.test(round.nextPayoutMinor||'')?minorMoney(round.nextPayoutMinor):'—';
 if(landscape){
  text('FOUND',layout.found.x,layout.found.y+6,12,color('--found-c-label','#fff'));
  text(safe,layout.found.x,layout.found.y+20,12,color('--found-c-text','#fff'),{role:'coin-found'});
  text('NEXT TILE',layout.next.x,layout.next.y+6,12,color('--next-win-c-label','#fff'));
  text(nextReturn,layout.next.x,layout.next.y+20,12,color('--next-win-c-text','#fff'),{role:'coin-next-return'});
 }else{
  text('FOUND '+safe,layout.found.x,layout.found.y+6,12,color('--found-c-text','#fff'),{align:'left',role:'coin-found'});
  text('NEXT TILE '+nextReturn,layout.next.x,layout.next.y+6,12,color('--next-win-c-text','#fff'),{align:'right',role:'coin-next-return'});
 }

 const instantWin=snapshot.isInstantWin===true||String(manifest.controls.referenceVariant??'').endsWith('_cz');
 sprite('ui_menu',sourceBox(layout.menu));
 if(!instantWin)sprite(active&&!snapshot.autoplayActive?'ui_random_active':'ui_random_disabled',sourceBox(layout.random));
 sprite('ui_bet',sourceBox(layout.bet));
 // The official runtime starts the tournament icon hidden and displays it
 // only when its tournament repository contains items. This host has none.
 const buttonColor=color(active?(enabled?'--cashout-bg':'--cashout-bg-disabled'):(enabled?'--play-bg':'--play-bg-disabled'),enabled?(active?'#ffe310':'#028235'):'#a0a0a0');
 const cx=layout.play.x+layout.play.play.x,cy=layout.play.y+layout.play.play.y;
 const primaryBox=box(cx-44,cy-44,88,88),outer=circle(cx,cy,44),inner=circle(cx,cy,42);
 rect(primaryBox,buttonColor,{role:'coin-primary-background',clipPolygon:outer});
 // The source og() circle uses a 2px inside stroke. Opposite winding leaves
 // the centre open, so translucent source borders blend over the same fill.
 const borderColor=color(active?(enabled?'--cashout-b':'--cashout-b-disabled'):(enabled?'--play-b':'--play-b-disabled'),'rgba(120,120,120)');
 rect(primaryBox,borderColor,{role:'coin-primary-border',clipPolygon:[...outer,outer[0],inner[0],...inner.slice(1).reverse(),inner[0],outer[0]]});
 const foreground=color(active?'--cashout-c-label':'--play-c-label',active?'#000':'#fff');
 text(pending?'…':active?'CASH OUT':'PLAY',cx,active?cy-7:cy,active?14:17,foreground,{role:'coin-primary-label'});
 if(active)text(minorMoney(round.currentCashoutMinor),cx,cy+9,12,color('--cashout-c-text','#000'),{fontWeight:700,role:'coin-current-return'});
 if(!options.interactive)text('coin_miner_94 · confirmed reveals only',width/2,height-3,9,'#c4c7cf');
 return{width,height,orientation:landscape?'landscape':'portrait',coinTiles:tiles,revealedTileCount:picks.size,safeTileCount:safe,boostedTileIndices:[...picks.values()].filter(pick=>pick.treasureBoost===true).map(pick=>pick.index),nextPayoutMinor:active?round.nextPayoutMinor??null:null,primaryEnabled:enabled,tournamentsVisible:false,
  controls:[{label:active?'CASH OUT':'PLAY',action:active?'cashout':'start',enabled:false},{label:'Tiles',action:'pick',enabled:false},...(!instantWin?[{label:'Random tile',action:'pick',enabled:false}]:[])],
  ...(options.interactive?{controlsGeometry:{[active?'cashout':'play']:sourceBox(layout.play),menu:sourceBox(layout.menu),bet:sourceBox(layout.bet),mines:box(headerRight-125,0,49,43),...(!instantWin?{random:sourceBox(layout.random)}:{})}}:{}),
 };
}
