// Deployed at the existing Worker's module root alongside its retained modules.
import previous from './jetx-entry-20261107.mjs';
import {installBalloon} from './balloon-worker-20261108.mjs';
export {LocalDemoWallet} from './jetx-entry-20261107.mjs';
export default installBalloon(previous);
