import previous from './reference-player-entry-r14.mjs';
export * from './reference-player-entry-r14.mjs';
import {installConstructionPlayer} from './construction-player-r15.mjs';
import {installMobileDisplay} from './mobile-display-player-r15.mjs';
export default installMobileDisplay(installConstructionPlayer(previous));
