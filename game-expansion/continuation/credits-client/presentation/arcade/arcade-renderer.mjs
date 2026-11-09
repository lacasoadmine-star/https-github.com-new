import {minorMoney,paintScene,ReferenceAssetStore} from '../machine-renderer.mjs';
import {renderCoinMiner} from './coinminer-scene.mjs';

export {paintScene as paintArcadeScene,ReferenceAssetStore};
const box=(x,y,width,height)=>({x,y,width,height});
const MONEY=/^(0|[1-9]\d*)$/;
const DISPLAY_MONEY=/^(0|[1-9]\d*)(\.\d{1,2})?$/;
const IDS=new Set(['towerx_native','towerrush_native','coinminer_native']);
const receiptIdentity=round=>({gameId:round.game_id??round.gameId,version:round.model_version??round.modelVersion});
const selectedStake=(snapshot,round)=>DISPLAY_MONEY.test(snapshot.stake||'')?snapshot.stake:round?minorMoney(round.stakeMinor):'—';
const sessionBalance=snapshot=>snapshot.confirmed===true&&snapshot.authenticated===true&&DISPLAY_MONEY.test(snapshot.balance||'')?snapshot.balance:'—';

// A presentation boundary, not a receipt authenticator. The financial host must
// supply a server-confirmed public receipt; this module has no backend API.
export function confirmedReceipt(manifest,snapshot){
  if(snapshot?.confirmed!==true||!snapshot.round)return null;
  const round=snapshot.round,identity=receiptIdentity(round);
  if(typeof round.round_id!=='string'||!round.round_id||identity.gameId!==manifest.id||identity.version!==manifest.modelVersion)throw new Error('Receipt identity or model version mismatch');
  if(!['active','settled'].includes(round.status)||typeof round.stakeMinor!=='string'||!MONEY.test(round.stakeMinor))throw new Error('Invalid public receipt');
  if(round.status==='settled'&&(typeof round.payoutMinor!=='string'||!MONEY.test(round.payoutMinor)))throw new Error('Settled receipt requires exact integer payout');
  if(round.status==='active'&&round.payoutMinor!=null)throw new Error('Active receipt must not expose a settled payout');
  for(const key of ['currentCashoutMinor','lockedPayoutMinor'])if(round[key]!==undefined&&(typeof round[key]!=='string'||!MONEY.test(round[key])))throw new Error('Invalid public money field');
  return round;
}

export function coinCellAt(x,y,manifest){
  const tile=manifest?.layout?.tiles;
  if(manifest?.id!=='coinminer_native'||!tile||![x,y].every(Number.isFinite))return null;
  const c=Math.floor((x-tile.x)/(tile.tile_width+tile.space_between_horizontal)),r=Math.floor((y-tile.y)/(tile.tile_height+tile.space_between_vertical));
  if(c<0||c>=5||r<0||r>=5)return null;
  const localX=x-tile.x-c*(tile.tile_width+tile.space_between_horizontal),localY=y-tile.y-r*(tile.tile_height+tile.space_between_vertical);
  return localX>=0&&localX<tile.tile_width&&localY>=0&&localY<tile.tile_height?r*5+c:null;
}

function helpers(manifest,commands){
  const sprite=(frame,target,extra={})=>{
    if(!manifest.frames[frame])throw new Error('Required reference artwork missing: '+frame);
    commands.push({type:'sprite',frame,box:target,...extra});
  };
  const optional=(frame,target,extra={})=>{if(manifest.frames[frame])sprite(frame,target,extra);};
  const text=(text,x,y,size=14,color='#ffffff',extra={})=>commands.push({type:'text',text:String(text),x,y,size,color,align:'center',...extra});
  const rect=(target,color)=>commands.push({type:'rect',box:target,color});
  const circle=(x,y,r,color)=>commands.push({type:'rect',box:box(x-r,y-r,r*2,r*2),color,clipPolygon:Array.from({length:64},(_,i)=>({x:x+r*Math.cos(i*2*Math.PI/64),y:y+r*Math.sin(i*2*Math.PI/64)}))});
  return{sprite,optional,text,rect,circle};
}

function validFloors(round){
  if(!round)return[];
  if(!Array.isArray(round.floors)||round.floors.length>10000)throw new Error('Invalid public floor list');
  return round.floors.map((floor,index)=>{
    if(!floor||floor.level!==index+1||!Number.isFinite(floor.multiplier)||floor.multiplier<=0)throw new Error('Invalid confirmed floor');
    return floor;
  });
}

function towerX(manifest,snapshot,round,options,commands){
  const{sprite,optional,text,rect}=helpers(manifest,commands);
  optional('body_background',box(0,0,420,900),{fit:'cover'});
  rect(box(0,0,420,900),'#201c3470');
  sprite('logo',box(63,39,294,74));
  const sceneBox=box(18,145,384,503);
  sprite('background',sceneBox,{fit:'cover',clip:sceneBox});
  optional('border',box(10,135,400,523),{fit:'stretch'});
  const allFloors=validFloors(round);
  const end=options.frameIndex===undefined?allFloors.length:Math.max(0,Math.min(allFloors.length,options.frameIndex+1));
  if(options.frameIndex!==undefined&&!Number.isInteger(options.frameIndex))throw new Error('Frame index must be an integer');
  const visible=allFloors.slice(0,end).slice(-5);
  if(!visible.length)optional('StartDefault',box(60,390,300,245),{clip:sceneBox});
  for(const[floorIndex,floor]of visible.entries()){
    const frame=manifest.controls.buildingMap[floor.type];if(!frame)throw new Error('Unknown Tower X building type');
    const y=574-floorIndex*76;
    sprite(frame,box(92,y-82,236,125),{clip:sceneBox});
    rect(box(308,y-24,68,26),'#171428db');text(floor.multiplier+'×',342,y-11,16,'#fff6c2');
  }
  const finished=round?.status==='settled'&&end===allFloors.length;
  const sum=finished&&Number.isSafeInteger(round.totalBuildingMultiplier)?String(round.totalBuildingMultiplier):'—';
  text(sum==='—'?'BUILDING RESULT':sum+'× BASE UNITS',210,679,22,'#f9dc80');
  text('100 base units per total stake',210,708,12,'#d8d4ef');
  sprite(snapshot.pending&&manifest.frames.bet_active?'bet_active':'bet_idle',box(96,741,228,75));text(snapshot.pending?'BUILDING…':'BUY BONUS',210,766,17);text(options.interactive?selectedStake(snapshot,round)+' ETB':'REVIEW ONLY',210,791,10,'#e6dcec');
  optional(snapshot.autoplayActive?'auto_active':'auto_idle',box(31,763,44,40));optional('menu',box(350,760,38,38));
  if(options.interactive)optional(snapshot.soundEnabled===false?'sound_off':'sound_on',box(354,111,32,32));
  text(options.interactive?'BALANCE':'TOTAL BET',85,848,10,'#c7bddd');text(options.interactive?sessionBalance(snapshot):round?minorMoney(round.stakeMinor):'—',85,870,17);
  text(options.interactive?'WIN':'CONFIRMED WIN',319,848,10,'#c7bddd');text(finished?minorMoney(round.payoutMinor):'—',319,870,17);
  return{visibleFloorCount:end,totalFloorCount:allFloors.length,settledResultShown:finished,controls:[{label:'BUY BONUS',action:'start',enabled:false}],...(options.interactive?{controlsGeometry:{play:box(96,741,228,75),autoplay:box(24,754,58,55),menu:box(344,754,50,50),sound:box(348,105,44,44)}}:{})};
}

function towerRush(manifest,snapshot,round,options,commands){
  const{sprite,optional,text,rect}=helpers(manifest,commands);
  sprite('background-back',box(0,80,420,640),{fit:'cover'});
  sprite('background-front',box(0,200,420,510),{fit:'cover'});
  optional('headerBg',box(0,0,420,95),{fit:'stretch'});sprite('logo',box(93,25,234,80));
  const allFloors=validFloors(round),floorHeight=59,visible=allFloors.slice(-6),floorBase=allFloors.length>6?allFloors.length-6:0;
  sprite('basis-tower',box(84,573,252,147));
  for(const[i,floor]of visible.entries()){
    let frame=manifest.controls.bonusMap[floor.type];
    if(floor.type==='normal')frame=/^tower-[1-5]$/.test(floor.visualVariant||'')?'atlas/'+floor.visualVariant:'atlas/tower-1';
    if(!frame)throw new Error('Unknown Tower Rush floor kind');
    const target=box(135,570-i*floorHeight,150,126);
    if(floor.type==='frozen'){
      // Public frozen_mob_idle attaches both the house and the final ice frame.
      // Its mob bone has x/y scales0.774/0.848. Preserve that visible ratio.
      const width=126*(.774/.848),frozenBox=box(target.x+(150-width)/2,target.y,width,126);
      sprite(frame,frozenBox,{padding:true,fit:'stretch'});
      sprite('spine/Frozen_web/Frozen_web_38',frozenBox,{padding:true,fit:'stretch',role:'frozen-overlay',level:floor.level,animate:floor.level===allFloors.at(-1)?.level});
    }else sprite(frame,target);
    text(String(floor.level),105,633-i*floorHeight,12,'#334b59');
    text(floor.multiplier+'×',314,633-i*floorHeight,12,'#334b59');
  }
  // A crane is decoration. No future building or unconfirmed bonus is shown.
  sprite('atlas/hook-cable',box(208,105,9,115));sprite('atlas/hook',box(192,206,39,52));
  const temple=allFloors.findLast(floor=>floor.type==='temple'&&floor.wheelSection!==undefined);
  if(temple&&options.showTemple===true){
    rect(box(14,155,392,316),'#122b3ef0');
    optional('bonus-temple',box(95,158,230,61));
    sprite('bonus-temple-wheel',box(105,213,210,210));
    optional('bonus-temple-wheel-centre',box(185,293,50,50));
    optional('bonus-temple-wheel-arrow',box(196,198,28,57));
    text('CONFIRMED: '+(temple.wheelSection==='freeze'?'FREEZE':temple.wheelSection+'×'),210,452,16,'#ffe5b0');
  }
  const collapsed=round?.reason==='collapsed';
  if(round?.frozen===true){optional('bonus-frozen',box(101,114,218,50));text('PROTECTED '+minorMoney(round.lockedPayoutMinor),210,184,15,'#e4fdff');}
  if(collapsed)optional('lose',box(117,277,186,94));
  text(round?'FLOORS '+allFloors.length:'BUILD YOUR TOWER',210,730,16,'#f2e4b5');
  sprite('buildBtn',box(221,757,184,94));text(snapshot.pending?'BUILDING…':'BUILD',310,803,18,'#ffffff');
  sprite(round?.frozen===true?'cashoutBtnFrozen':'cashoutBtn',box(15,757,190,94));text('CASH OUT',110,787,14,'#fff9d5');
  text(round?minorMoney(round.currentCashoutMinor):'—',110,813,18,'#fff9d5');
  if(options.interactive){text('BALANCE '+sessionBalance(snapshot)+' ETB',110,870,12,'#e5e6d6');text('BET '+selectedStake(snapshot,round)+' ETB',310,870,12,'#e5e6d6');}
  else text('Reference controls · disabled',210,867,11,'#e5e6d6');
  return{visibleFloorCount:visible.length,firstVisibleLevel:floorBase+1,totalFloorCount:allFloors.length,frozen:round?.frozen===true,templeSection:temple?.wheelSection??null,controls:[{label:'BUILD',action:'step',enabled:false},{label:'CASH OUT',action:'cashout',enabled:false}],...(options.interactive?{controlsGeometry:{[round?.status==='active'?'step':'play']:box(221,757,184,94),...(round?.status==='active'?{cashout:box(15,757,190,94)}:{}),bet:box(231,850,175,40)}}:{})};
}

function coinMiner(manifest,snapshot,round,options,commands){
  const{sprite,optional,text,rect,circle}=helpers(manifest,commands);
  // Colors and board coordinates are from the default public config. There is
  // no default bitmap background or board in that config, so none is invented.
  rect(box(0,0,360,640),'#212a39');rect(box(10,154,340,350),'#0e1017');
  sprite('game_logo_portrait',box(40,50,280,95.2));
  const tiles=manifest.layout.tiles,picks=new Map();
  if(round){
    if(!manifest.controls.mineChoices.includes(round.mines)||!Array.isArray(round.picks)||round.picks.length>24)throw new Error('Invalid public mine receipt');
    for(const pick of round.picks){
      if(!Number.isInteger(pick.index)||pick.index<0||pick.index>=25||typeof pick.safe!=='boolean'||picks.has(pick.index)||(!pick.safe&&pick.treasureBoost))throw new Error('Invalid or duplicate confirmed tile');
      picks.set(pick.index,pick);
    }
  }
  for(let index=0;index<25;index++){
    const c=index%5,r=Math.floor(index/5),target=box(tiles.x+c*62,tiles.y+r*62,60,60),pick=picks.get(index);
    // Public asset_closed_display:"mix" composites both transparent halves.
    // Alternating one half per tile would leave half of each tile missing.
    if(!pick){sprite('tile1',target,{role:'coin-closed-half',tileIndex:index,half:0});sprite('tile2',target,{role:'coin-closed-half',tileIndex:index,half:1});}
    else sprite(pick.safe?'prize1':'tile_explosion',target,{role:pick.safe?'coin-confirmed-prize':'coin-confirmed-mine',tileIndex:index});
    if(pick?.treasureBoost===true)sprite('bonus_label',target,{role:'coin-confirmed-bonus',tileIndex:index});
  }
  text('BALANCE',42,16,10,'#909095');text(options.interactive?sessionBalance(snapshot):MONEY.test(snapshot.balanceMinor||'')?minorMoney(snapshot.balanceMinor):'—',42,33,14);
  const selectedMines=manifest.controls.mineChoices.includes(snapshot.mines)?snapshot.mines:null;
  text('MINES',247,16,10,'#909095');text(round?.status==='active'?String(round.mines):selectedMines!==null?String(selectedMines):round?String(round.mines):'—',247,33,14);
  text('BET',324,16,10,'#909095');text(options.interactive?selectedStake(snapshot,round):round?minorMoney(round.stakeMinor):'—',324,33,14);
  optional(round?.treasureBoost?.active===true?'bonus_active':'bonus_inactive',box(192,9,30,30));
  const safe=[...picks.values()].filter(pick=>pick.safe).length;
  text('FOUND '+safe,62,519,12);text(round?'WIN '+minorMoney(round.currentCashoutMinor):'WIN —',274,519,12);
  const active=round?.status==='active',instantWin=snapshot.isInstantWin===true||String(manifest.controls.referenceVariant??'').endsWith('_cz');
  sprite('ui_menu',box(44,572,32,32));
  // Native artwork remains active during an in-flight request. The host's
  // disabled touch target prevents another action until it is confirmed.
  if(!instantWin)sprite(active&&!snapshot.autoplayActive?'ui_random_active':'ui_random_disabled',box(82,565,46,46));
  sprite('ui_bet',box(232,565,46,46));sprite('ui_tournaments',box(284,572,32,32));
  circle(180,588,44,active?'#ffe310':'#a0a0a0');
  text(snapshot.pending?'…':active?'CASH OUT':'PLAY',180,582,active?13:16,active?'#000000':'#ffffff');
  text(active?minorMoney(round.currentCashoutMinor):options.interactive?selectedStake(snapshot,round)+' ETB':'REVIEW',180,603,11,active?'#000000':'#ffffff');
  if(!options.interactive)text('coin_miner_94 · confirmed reveals only',180,637,9,'#c4c7cf');
  return{revealedTileCount:picks.size,safeTileCount:safe,boostedTileIndices:[...picks.values()].filter(pick=>pick.treasureBoost===true).map(pick=>pick.index),controls:[{label:active?'CASH OUT':'PLAY',action:active?'cashout':'start',enabled:false},{label:'Tiles',action:'pick',enabled:false},...(!instantWin?[{label:'Random tile',action:'pick',enabled:false}]:[])],...(options.interactive?{controlsGeometry:{[active?'cashout':'play']:box(136,544,88,88),menu:box(35,563,50,50),bet:box(226,559,58,58),mines:box(225,0,49,43),...(!instantWin?{random:box(82,565,46,46)}:{})}}:{})};
}

/**
 * Render only supplied public receipts. No RNG, timer, wager, wallet, persistence
 * or network operation is performed. options.frameIndex selects an already
 * confirmed TowerX prefix; it never generates another outcome. Every action is
 * disabled in the resulting display list, independent of snapshot.canStart.
 */
export function createArcadeScene(manifest,snapshot={},options={}){
  if(!IDS.has(manifest?.id))throw new Error('Unsupported arcade presentation');
  const round=confirmedReceipt(manifest,snapshot),commands=[];
  const{rect,text}=helpers(manifest,commands);rect(box(0,0,manifest.width,manifest.height),'#101d2f');
  const render=manifest.id==='towerx_native'?towerX:manifest.id==='towerrush_native'?towerRush:renderCoinMiner;
  const details=render(manifest,snapshot,round,options,commands);
  if(!options.interactive&&manifest.id!=='coinminer_native')text('ARTWORK REVIEW · NO WAGERS',manifest.width/2,16,10,'#ffffff');
  return{schemaVersion:1,gameId:manifest.id,modelVersion:manifest.modelVersion,width:manifest.width,height:manifest.height,productionLaunchEnabled:false,financialActions:false,confirmedReceiptId:round?.round_id??null,...details,commands};
}
