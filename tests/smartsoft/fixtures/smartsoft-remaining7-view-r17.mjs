// Draw-only R5 refinements from the current official DMO observations.
// Completed titles and the two immutable R4 demo titles never opt in here.
export const SMARTSOFT_REMAINING7_IDS=Object.freeze([
 'multihotwildways_native','multihot5wild_native','multihot5superwilds_native',
 'multihotdeluxe_native','burningice_native','burningice10_native','burningice40_native',
]);
const LEGACY_AUTO=new Set(['burningice_native','burningice10_native','burningice40_native']);
const DELUXE='multihotdeluxe_native',TERMINAL_ICE=new Set(['burningice10_native','burningice40_native']);
const box=(x,y,width,height)=>({x,y,width,height});

export const smartSoftAutoStartLabel=id=>LEGACY_AUTO.has(id)?'START':'START PLAY';

// The evaluator retains the frozen columns as historical receipt data. The
// official Ice10 and Ice40 screens remove ice after the terminal continuation.
// A copied presentation feature must never replace that accepted receipt.
export function smartSoftCompletedIceFeature(id,feature,terminal){
 return TERMINAL_ICE.has(id)&&terminal===true&&feature?{...feature,frozenReels:[]}:feature;
}

export function smartSoftFinalFrame(round,index){
 const frames=Array.isArray(round?.frames)?round.frames:Array.isArray(round?.bonusFrames)?round.bonusFrames:[];
 return !!round&&(index===null||Number.isInteger(index)&&index>=0&&index===frames.length-1);
}

const sameBox=(a,b)=>a&&b&&['x','y','width','height'].every(key=>a[key]===b[key]);

export function bindRemainingSmartSoftScene(scene,manifest,snapshot){
 if(manifest?.id!==DELUXE||scene.gameId!==DELUXE)return scene;
 const spin=manifest.controls?.spin,button=scene.controlsGeometry?.play;
 if(!spin||!button)return scene;
 const pending=snapshot.pending===true,ready=snapshot.canStart===true;
 const frame=pending?spin.stop:ready?spin.idle:spin.disabled||spin.idle;
 const frames=new Set(Object.values(spin));
 // These source atlases already contain their triangle/square. Only remove
 // the extra generic text in the ready or moving states. TAKE WIN, PAUSED
 // and SIGN IN retain their host meaning and existing hit region.
 const commands=scene.commands.flatMap(command=>{
  if(command.type==='sprite'&&frames.has(command.frame)&&sameBox(command.box,button))return[{...command,frame}];
  if(command.type==='text'&&(ready&&command.text==='SPIN'||pending&&command.text==='STOP')&&
     command.x>=button.x&&command.x<=button.x+button.width&&command.y>=button.y&&command.y<=button.y+button.height)return[];
  return[command];
 });
 return{...scene,commands,remainingSevenLayout:'deluxe-source-icons'};
}

export function remainingSmartSoftScene(scene,manifest){
 if(manifest?.id!==DELUXE||scene.gameId!==DELUXE||scene.remainingSevenLayout!=='deluxe-source-icons'||!scene.boardGeometry)return scene;
 const board=scene.boardGeometry;
 // Authored projection of the observed desktop title immediately above its
 // own board, rather than centered above the combined board/multiplier area.
 // Ratios come from smartsoft-deluxe-live-final.jpg; no portrait parity claim.
 const target=box(board.x+board.width*.20,board.y-board.height*.195,board.width*.73,board.height*.195);
 const logos=scene.commands.filter(command=>command.role==='game-logo'&&command.box);
 if(!logos.length)return scene;
 const left=Math.min(...logos.map(command=>command.box.x)),top=Math.min(...logos.map(command=>command.box.y));
 const width=Math.max(...logos.map(command=>command.box.x+command.box.width))-left;
 const height=Math.max(...logos.map(command=>command.box.y+command.box.height))-top;
 const scale=Math.min(target.width/width,target.height/height),x=target.x+(target.width-width*scale)/2,y=target.y+(target.height-height*scale)/2;
 const commands=scene.commands.map(command=>{
  if(command.role!=='game-logo'||!command.box)return command;
  if(command.type==='native-animation')return{...command,box:target};
  const b=command.box;return{...command,box:box(x+(b.x-left)*scale,y+(b.y-top)*scale,b.width*scale,b.height*scale)};
 });
 return{...scene,commands,remainingSevenLayoutApplied:true};
}
