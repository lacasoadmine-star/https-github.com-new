import {bindMobileScene,projectMobileScene as previous} from '/native-library/remaining20/20261110-reference-mobile-r14/smartsoft-mobile.mjs';
import {MOBILE_DISPLAY} from './mobile-display-data.mjs';
export {bindMobileScene};

// Only the six observed portrait projections use a canvas CSS background.
// The browser draws the title's actual vertical image with its captured sizing.
export function projectMobileScene(scene,manifest){
 const projected=previous(scene,manifest),profile=MOBILE_DISPLAY[manifest.id];
 if(!profile||!projected.modernMobileLayout)return projected;
 return {...projected,commands:projected.commands.filter(command=>
  command.role!=='game-background'&&command.file!==manifest.background?.file&&
  !(command.type==='rect'&&command.box?.x===0&&command.box?.y===0&&command.box?.width===projected.width&&command.box?.height===projected.height)
 ).map(command=>command.role==='mobile-spin-label'?{...command,color:profile.spinLabelColor}:command)};
}
