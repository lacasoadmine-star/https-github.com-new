import previous from './remaining20-new-controls-library-entry-r6.mjs';
import {installExistingNewWagerClientAssets} from './existing-new-wager-client-library-r1.mjs';
import {installOfficialNewCoverAssets} from './official-new-covers-library-r1.mjs';
export * from './remaining20-new-controls-library-entry-r6.mjs';
export default installOfficialNewCoverAssets(installExistingNewWagerClientAssets(previous));
