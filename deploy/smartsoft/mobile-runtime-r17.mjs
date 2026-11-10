import {bindMobileScene,projectMobileScene as previous} from '/native-library/remaining20/20261110-construction-r15/mobile-controls-r16b.mjs';
import {autoplayVisual} from '/native-library/remaining20/20261110-construction-r15/runtime-r17/autoplay-visual-r17.mjs';
export {bindMobileScene};
export function projectMobileScene(scene,manifest){return autoplayVisual(previous(scene,manifest),manifest);}
