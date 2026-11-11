import previous from './multihot10-controls-entry-r22.mjs';
export * from './multihot10-controls-entry-r22.mjs';
import {NativeGameResources,nativeResourceGame,nativeResourceInstance} from './native-game-resources-r23.mjs';
export {NativeGameResources};

// These aliases retain the existing live game and account-module URLs.
const aliases=new Map([
 ['/independent74/fresh74.html','/independent74/native/multi-hot-10-2/index.html'],
 ['/independent74/mh10/live.mjs','/independent74/native/multi-hot-10-2/live.mjs'],
 ['/independent74/mh10/style.css','/independent74/native/multi-hot-10-2/style.css'],
 ['/independent74/fresh74-account.mjs','/independent74/native/shared/account.mjs'],
 ["/native-library/remaining20/20261110-rounds-r21/b930310f3d5338cd/presentation/smartsoft-motion.mjs","/independent74/native/shared/multihotdeluxe-smartsoft-motion.mjs"],
 ["/native-library/remaining20/20261110-rounds-r21/3d420e4fe5830b46/presentation/smartsoft-motion.mjs","/independent74/native/shared/burningice-smartsoft-motion.mjs"],
 ["/native-library/remaining20/20261110-rounds-r21/5fddea498e1f0d39/presentation/smartsoft-motion.mjs","/independent74/native/shared/multihot100-smartsoft-motion.mjs"],
 ["/native-library/remaining20/20261110-rounds-r21/fe6fe5c2996189a2/presentation/smartsoft-motion.mjs","/independent74/native/shared/multihotdeluxe-smartsoft-motion.mjs"],
 ["/native-library/remaining20/20261110-rounds-r21/cc0f22635df0e9c7/presentation/smartsoft-motion.mjs","/independent74/native/shared/burningice40-smartsoft-motion.mjs"],
 ["/native-library/remaining20/20261110-rounds-r21/7161514f85b0565e/presentation/smartsoft-motion.mjs","/independent74/native/shared/habeshafortune5-smartsoft-motion.mjs"]
]);
export default {...previous,async fetch(request,env,ctx){
 const url=new URL(request.url),alias=aliases.get(url.pathname),path=alias||url.pathname;
 const game=nativeResourceGame(path);
 if(!game||!env.NATIVE_GAME_RESOURCES)return previous.fetch(request,env,ctx);
 if(alias)url.pathname=alias;
 const response=await env.NATIVE_GAME_RESOURCES.getByName(nativeResourceInstance(game)).fetch(new Request(url,request));
 // Keep the live game available while its first private resource upload finishes.
 if(alias&&response.status===404)return previous.fetch(request,env,ctx);
 return response;
}};
