// Presentation only: the original controller owns enabled inputs and money.
export function applyObservedControlState(scene,manifest,profiles){
 const profile=profiles?.[manifest?.id];
 if(!profile||!scene?.modernMobileLayout||!scene.mobileState||!Array.isArray(scene.commands))return scene;
 const state=scene.mobileState,locked=state.pending===true||state.busy===true||state.confirming===true||state.round?.status==='active';
 const frame=manifest.controls?.bet?.disabled;
 const disabled=frame&&(manifest.frames['@Mobile/'+frame]?'@Mobile/'+frame:manifest.frames[frame]?frame:null);
 let changed=false;
 const commands=scene.commands.map(command=>{
  if(locked&&disabled&&command.role==='mobile-control'&&command.control==='bet'){
   changed=true;return {...command,frame:disabled};
  }
  return command;
 });
 if(state.pending===true){
  const play=commands.find(command=>command.role==='mobile-control'&&command.control==='play');
  // Text is positioned in the observed mobile button's logical coordinates.
  // Atlas dimensions can be larger desktop textures and are not this space.
  if(play?.box&&profile.width>0&&profile.height>0){
   const sx=play.box.width/profile.width,sy=play.box.height/profile.height;
   commands.push({type:'text',text:'STOP',role:'mobile-spin-label',x:play.box.x+profile.x*sx,
    y:play.box.y+profile.y*sy,size:profile.size*Math.min(sx,sy),color:profile.color,align:'center'});
   changed=true;
  }
 }
 return changed?{...scene,commands}:scene;
}
