import previous from './operator-library-entry-r16.mjs';
export * from './operator-library-entry-r16.mjs';
import {installRuntimeLibrary} from './runtime-library-r17.mjs';
import sources from './runtime-sources-r17.mjs';
export default installRuntimeLibrary(previous,sources);
