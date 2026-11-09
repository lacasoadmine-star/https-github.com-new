import previous from './remaining20-ice-controls-player-entry-r5.mjs';
import {installNewControlsR6} from './remaining20-new-controls-worker-r6.mjs';
import {installNewGameZoomWorker} from './new-game-zoom-worker-r1.mjs';
export * from './remaining20-ice-controls-player-entry-r5.mjs';
export default installNewGameZoomWorker(installNewControlsR6(previous));
