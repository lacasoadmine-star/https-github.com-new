import {bindMobileScene,projectMobileScene as previous} from './mobile-display.mjs';
import {applyObservedControlState} from './control-state-r16.mjs';
import {CONTROL_PROFILES} from './control-data-r16.mjs';
export {bindMobileScene};
export function projectMobileScene(scene,manifest){
 return applyObservedControlState(previous(scene,manifest),manifest,CONTROL_PROFILES);
}
