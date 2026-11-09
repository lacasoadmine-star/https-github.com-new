import previous from './remaining20-new-controls-player-entry-r6.mjs';
import {installExistingNewWagerClient} from './existing-new-wager-client-worker-r1.mjs';
import {installOlderNewZoomWorker} from './older-new-zoom-worker-r1.mjs';
import {installOfficialNewCoversWorker} from './official-new-covers-worker-r1.mjs';
export * from './remaining20-new-controls-player-entry-r6.mjs';
export default installOfficialNewCoversWorker(installOlderNewZoomWorker(installExistingNewWagerClient(previous)));
