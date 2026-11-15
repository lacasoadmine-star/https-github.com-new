import previous from './new74-entry-r1.mjs';
export * from './new74-entry-r1.mjs';
import {patchNativeTouchCss} from './native-touch-hotfix-r2.mjs';
export default {...previous,async fetch(request,env,ctx){const result=await previous.fetch(request,env,ctx);return patchNativeTouchCss(request,result)}};
