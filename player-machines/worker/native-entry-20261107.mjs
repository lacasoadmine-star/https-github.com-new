import previous from './restore-20261102.mjs';
import {installNativeMachines} from './native-machine-entry.mjs';
import {installNativeCatalog} from './native-catalog.mjs';
import {assets} from './native-catalog-assets.mjs';
export {LocalDemoWallet} from './restore-20261102.mjs';
export default installNativeMachines(installNativeCatalog(previous,assets));
