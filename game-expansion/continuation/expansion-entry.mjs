import previous,{jetx} from './jetx-railway-entry.mjs';
import {sharedWallet,engineSecret,verifyNative,readNativeBody,engineEnabled,engineReady} from './native-family-preserved.mjs';
import {resolveSessionUser} from './jetx-auth.mjs';
import {LibraryService,createRegistry} from './library-service.mjs';
import {installLibrary,installCrossActiveGuards} from './library-backend.mjs';
import * as balloon from './balloon-rules.mjs';
import * as smartsoftSlots from './smartsoft-slots.mjs';
import remainingGames from './remaining-games.mjs';
import {releasedAdapter} from './release-policy.mjs';

// Previous adapters remain byte-identical; accepted rounds always resolve their
// own persisted model version. This single service owns the shared library.
const registry=createRegistry([balloon,releasedAdapter(smartsoftSlots),releasedAdapter(remainingGames)]);
const service=sharedWallet?new LibraryService(sharedWallet,{registry,accepting:engineEnabled&&process.env.NATIVE_LIBRARY_ACCEPT_NEW_ROUNDS==='true',autoTimers:true}):{ready:false,accepting:false,registry};
if(engineReady&&engineEnabled){try{await service.migrate();installCrossActiveGuards(sharedWallet,service,{jetx});await service.recoverTimers();}catch(error){console.error(JSON.stringify({event:'library_initialization_failed',code:typeof error.code==='string'?error.code:'LIBRARY_INITIALIZATION_FAILED'}));}}
export default installLibrary(previous,{service,verifyNative,readNativeBody,engineSecret,resolveSessionUser});
