import previous from './construction-library-entry-r15.mjs';
export * from './construction-library-entry-r15.mjs';
import {installOperationalLibrary} from './operator-status-r16.mjs';
import {UI_SOURCE} from './operator-ui-source-r16.mjs';
import {CONTROL_RESOURCES} from './operator-control-sources-r16.mjs';
export default installOperationalLibrary(previous,{uiSource:UI_SOURCE,controlResources:CONTROL_RESOURCES});
