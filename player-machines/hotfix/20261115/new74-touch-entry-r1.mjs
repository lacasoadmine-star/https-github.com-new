// Additive Worker entrypoint: current 320 modules and bindings must be retained.
import previous from './new74-entry-r1.mjs';
export * from './new74-entry-r1.mjs';
import {patchNativeTouchCss} from './native-touch-hotfix-r1.mjs';

export default {
  ...previous,
  async fetch(request,env,ctx) {
    const response=await previous.fetch(request,env,ctx);
    return patchNativeTouchCss(request,response);
  },
};
