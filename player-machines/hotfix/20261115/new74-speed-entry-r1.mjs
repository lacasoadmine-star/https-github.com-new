import previous from './new74-touch-entry-r2.mjs';
export * from './new74-touch-entry-r2.mjs';
import {patchSpinResponse} from './speed-hotfix-r1.mjs';
export default {...previous,async fetch(request,env,ctx){return patchSpinResponse(request,await previous.fetch(request,env,ctx))}};
