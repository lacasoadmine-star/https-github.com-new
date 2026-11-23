// Scoped source projection for the existing NEW game controllers. The owner
// applies it only to the nine retained native entries, never legacy games.
// A running native AUTO button delegates to the existing stop listener, which
// already owns stop sounds and revokes later submissions without cancelling
// the accepted in-flight round.
const CLICK="autoplay:()=>ui.autoplay.click()";
const STATE="  if(name==='bet'||name==='buyBonus')button.disabled=ui.stake.disabled;";
const TARGET="autoplay:()=>{if(autoplay.snapshot().active)ui.stopAutoplay.click();else ui.autoplay.click();}";
const ENABLE="  if(name==='autoplay'){const running=autoplay.snapshot().active;button.disabled=running?false:ui.autoplay.disabled||ui.autoplay.hidden;button.setAttribute('aria-label',running?'Stop autoplay':'Autoplay');}\n";
export function patchAutoplayApp(source){
 if(typeof source!=='string'||source.split(CLICK).length!==2||source.split(STATE).length!==2||
  !source.includes("ui.stopAutoplay.addEventListener('click',")||!source.includes("autoplay.stop('user-stop')"))throw Error('NATIVE_AUTOPLAY_CONTROL_CONTRACT_CHANGED');
 return source.replace(CLICK,TARGET).replace(STATE,ENABLE+STATE);
}
