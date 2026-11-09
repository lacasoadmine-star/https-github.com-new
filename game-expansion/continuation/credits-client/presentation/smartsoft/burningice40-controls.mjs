import {drawAtlasFrame} from '../atlas.mjs';

// NEW Burning Ice40 only. The captured legacy configuration declares an
// embedded vertical wager group, not a modal. No outcome or wallet API lives
// here: the host must resolve the pinned intent against its current session.
export const BURNING_ICE40_ID='burningice40_native';
export const BURNING_ICE40_MODEL='superwin-burningice40-2-etb1-40000-v1';
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const BURNING_ICE40_CONTROL_SOURCE=freeze({
 base:'Slots_blazinghot.js',baseSha256:'a250e41a8a196a53f8f919d37a158d7a2e295f07de7ffa93caa0dba9a32dfa34',
 override:'Slots_blazinghot40.js',overrideSha256:'2430578885f95dcc1f4df546866953669d7118588b019c5d1ae38964f237c85b',
 atlasSha256:'9c874aaed8fe4caebffa125948ddb584fcc5434d9da8e9c7e13e26b9f1e54693',
 crop:{x:1808,y:222,width:284,height:626},
 plus:{x:1869,y:222,width:161,height:162},minus:{x:1871,y:700,width:159,height:148},
 spin:{x:1808,y:409,width:284,height:260},
 bets:{x:1881,y:349,width:133,rowHeight:79,spinHeight:220,maskHeight:378,verticalY:299},
 spinText:{x:142,y:55,size:45,color:'#fdff5b'},currencyText:{x:142,y:100,size:30,color:'#fdff5b'},
 neighborText:{x:67,y:8,size:30,color:'#fdff5b',fontAlias:'style1'},neighborCurrency:{x:67,y:40,size:24,color:'#fdff5b',fontAlias:'style2'},
 neighborShadow:{color:'#000000',alpha:.34,blur:3,distance:0,angle:Math.PI/3},
 declaredBetRowStatus:'Start',
 notes:[
  'Plus and Minus select the adjacent configured wager. Source Bet rows have Start status; they emit an explicit-stake start intent, never submit it here.',
  'Upper next/lower previous ordering agrees with the recorded official0.40DMO current/0.80DMO upper preview. Neighbor placement derives from the declared79/220/79 vertical mask.',
  'Adjacent Bet1/Bet2 text styles are source-defined. Font alias-to-file mapping and the shared carousel tween were not captured; no scrolling animation is invented.',
  'Source Spin and SpinStop atlas entries are identical; the native stop overlay is not reconstructed by this wager-only adapter.',
 ],
});
const ACTIONS=freeze({increase:{kind:'select',target:'next',cue:'plus'},decrease:{kind:'select',target:'previous',cue:'minus'},startNext:{kind:'start',target:'next',cue:'bet'},startPrevious:{kind:'start',target:'previous',cue:'bet'},play:{kind:'start',target:'selected',cue:'spin'}});
const validAmount=value=>typeof value==='string'&&/^[1-9]\d{0,4}\.00$/.test(value)&&BigInt(value.slice(0,-3))<=40000n;
const canonicalValues=values=>Array.isArray(values)&&values.length>1&&values.length<=100&&values.every((v,i)=>validAmount(v)&&(!i||BigInt(v.slice(0,-3))>BigInt(values[i-1].slice(0,-3))));
const roundPin=round=>round?{id:round.round_id,version:round.version,modelVersion:round.model_version,status:round.status}:null;
const samePin=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function burningIce40WagerView(game,snapshot,{stake,canStart=false,canChangeStake=false}={}){
 if(game?.id!==BURNING_ICE40_ID||game.version!==BURNING_ICE40_MODEL||game.operatorWagerProfile?.id!=='remaining20-etb1-40000-v1'||
  !canonicalValues(game.stakeValues)||!game.stakeValues.includes(stake)||snapshot?.game?.id!==game.id||snapshot.game.version!==game.version)return null;
 const values=[...game.stakeValues],index=values.indexOf(stake),round=snapshot.round??null;
 const validRound=round===null||(round.game_id===game.id&&round.model_version===game.version&&typeof round.round_id==='string'&&!!round.round_id&&Number.isSafeInteger(round.version)&&round.version>=0&&['active','settled'].includes(round.status));
 const available=snapshot.authenticated===true&&snapshot.connected!==false&&typeof snapshot.sessionId==='string'&&!!snapshot.sessionId&&validRound&&
  !snapshot.pending&&!snapshot.confirming&&!snapshot.recoveryBlocked&&!snapshot.error&&!snapshot.otherActiveGame&&round?.status!=='active';
 const selected=stake,next=values[index+1]??null,previous=values[index-1]??null;
 const pin={gameId:game.id,modelVersion:game.version,sessionId:snapshot.sessionId??null,round:roundPin(round),selected,values:values.join(',')};
 const controls={};
 for(const[name,action]of Object.entries(ACTIONS)){
  const amount={selected,next,previous}[action.target];
  controls[name]={enabled:available&&!!amount&&(action.kind==='start'?canStart===true:canChangeStake===true),stake:amount,kind:action.kind,cue:action.cue};
 }
 return freeze({gameId:game.id,modelVersion:game.version,selected,next,previous,controls,pin,currency:'ETB'});
}

export function createBurningIce40WagerIntent(view,action){
 if(view?.gameId!==BURNING_ICE40_ID||view.modelVersion!==BURNING_ICE40_MODEL||!Object.hasOwn(ACTIONS,action)||view.controls?.[action]?.enabled!==true)return null;
 return freeze({kind:'burningice40-wager-intent',action,pin:structuredClone(view.pin)});
}
export function resolveBurningIce40WagerIntent(intent,game,snapshot,options){
 if(intent?.kind!=='burningice40-wager-intent'||!Object.hasOwn(ACTIONS,intent.action))return null;
 const current=burningIce40WagerView(game,snapshot,options),control=current?.controls[intent.action];
 if(!current||!samePin(intent.pin,current.pin)||!control?.enabled)return null;
 // Re-derive amount from the current canonical ladder, never from event data.
 return freeze({kind:control.kind,stake:control.stake,cue:control.cue,modelVersion:current.modelVersion,sessionId:current.pin.sessionId});
}

const REQUIRED={'Buttons/Plus':[161,162],'Buttons/PlusDisabled':[161,162],'Buttons/Minus':[159,148],'Buttons/MinusDisabled':[159,148],'Buttons/Spin':[284,260],'Buttons/Bet':[133,79],'Buttons/BetDisabled':[133,79]};
export function supportsBurningIce40Controls(manifest){
 const file=BURNING_ICE40_CONTROL_SOURCE.atlasSha256+'.png';
 return manifest?.id===BURNING_ICE40_ID&&manifest.grid?.columns===5&&manifest.grid?.rows===4&&
  manifest.files?.[file]?.sha256===BURNING_ICE40_CONTROL_SOURCE.atlasSha256&&
  Object.entries(REQUIRED).every(([key,[width,height]])=>manifest.frames?.[key]?.file===file&&manifest.frames[key].original?.width===width&&manifest.frames[key].original?.height===height);
}

export function burningIce40ControlScene(manifest,view,{x=0,y=0,scale=1}={}){
 if(!supportsBurningIce40Controls(manifest)||view?.gameId!==manifest.id||view.modelVersion!==BURNING_ICE40_MODEL||
  manifest.modelVersion!==undefined&&manifest.modelVersion!==view.modelVersion||![x,y,scale].every(Number.isFinite)||scale<=0)return null;
 const source=BURNING_ICE40_CONTROL_SOURCE,crop=source.crop,commands=[],controls={};
 const project=b=>({x:x+(b.x-crop.x)*scale,y:y+(b.y-crop.y)*scale,width:b.width*scale,height:b.height*scale});
 const sprite=(frame,b,role)=>commands.push({type:'sprite',frame,box:project(b),padding:true,role});
 const label=(text,px,py,size,color,role,{fontAlias='style1',shadow=null}={})=>commands.push({type:'text',text,x:x+(px-crop.x)*scale,y:y+(py-crop.y)*scale,size:size*scale,color,align:'center',textBaseline:'top',role,fontAlias,styleProvenance:'Slots_blazinghot.js:823-828',shadow:shadow?{...shadow,blur:shadow.blur*scale,distance:shadow.distance*scale}:null});
 const addControl=(name,b)=>{controls[name]={...project(b),...view.controls[name]};};
 sprite(view.controls.increase.enabled?'Buttons/Plus':'Buttons/PlusDisabled',source.plus,'wager-increase');addControl('increase',source.plus);
 sprite(view.controls.decrease.enabled?'Buttons/Minus':'Buttons/MinusDisabled',source.minus,'wager-decrease');addControl('decrease',source.minus);
 sprite('Buttons/Spin',source.spin,'wager-current-spin');addControl('play',source.spin);
 const upper={x:source.bets.x,y:source.bets.y,width:source.bets.width,height:source.bets.rowHeight};
 const lower={...upper,y:upper.y+source.bets.rowHeight+source.bets.spinHeight};
 for(const[name,amount,b]of [['startNext',view.next,upper],['startPrevious',view.previous,lower]]){
  sprite(view.controls[name].enabled?'Buttons/Bet':'Buttons/BetDisabled',b,'wager-neighbor');addControl(name,b);
  if(amount){
   const value=source.neighborText,currency=source.neighborCurrency;
   label(amount,b.x+value.x,b.y+value.y,value.size,value.color,'wager-neighbor-amount',{fontAlias:value.fontAlias,shadow:source.neighborShadow});
   label('ETB',b.x+currency.x,b.y+currency.y,currency.size,currency.color,'wager-neighbor-currency',{fontAlias:currency.fontAlias,shadow:source.neighborShadow});
  }
 }
 const value=source.spinText,currency=source.currencyText;
 label(view.selected,source.spin.x+value.x,source.spin.y+value.y,value.size,value.color,'wager-current-amount');
 label('ETB',source.spin.x+currency.x,source.spin.y+currency.y,currency.size,currency.color,'wager-current-currency');
 return {gameId:manifest.id,modelVersion:view.modelVersion,width:crop.width*scale,height:crop.height*scale,x,y,commands,controls,pin:view.pin,
  sourceCrop:crop,sourceConfigSha256:source.baseSha256,usesOriginalAtlas:true,financialActions:false,fullNativeFlowVerified:false};
}

// For a dedicated control canvas. This honors the source text's top-origin
// placement, while the generic machine renderer normally centers text.
export function drawBurningIce40Controls(context,scene,manifest,images,{fontFamily='ZplayReference,Arial,sans-serif',fontFamilies={}}={}){
 if(!scene||!supportsBurningIce40Controls(manifest)||scene.gameId!==manifest.id)return false;
 context.save();
 for(const command of scene.commands){
  if(command.type==='sprite'){
   const frame=manifest.frames[command.frame],image=images.get(frame.file);if(!image){context.restore();throw Error('BURNING_ICE40_CONTROL_IMAGE_MISSING');}
   drawAtlasFrame(context,image,frame,command.box,{padding:true});
  }else if(command.type==='text'){
   context.save();context.font=`${command.size}px ${fontFamilies[command.fontAlias]??fontFamily}`;context.textAlign=command.align;context.textBaseline='top';context.fillStyle=command.color;
   if(command.shadow){context.shadowColor=`rgba(0,0,0,${command.shadow.alpha})`;context.shadowBlur=command.shadow.blur;context.shadowOffsetX=Math.cos(command.shadow.angle)*command.shadow.distance;context.shadowOffsetY=Math.sin(command.shadow.angle)*command.shadow.distance;}
   context.fillText(command.text,command.x,command.y);context.restore();
  }
 }
 context.restore();return true;
}
