import {createBurnWildsExistingServer} from './lifecycle.mjs';
import {createBurnWildsExistingHttpBinding} from './http.mjs';
const required=['authenticate','sessionGuard','transaction','hash','getApprovedModel',
 'releaseEnabled','uuid','existingFetch','assertWriteOrigin'];
/**
 * Pure composition into the EXISTING backend request dispatcher.
 * Does not initialize Postgres, replace old handlers, migrate schema,
 * select an RTP model, enable wagers, create wallets or deploy itself.
 * Those dependencies must be supplied by the already-running service.
 */
export function createBurnWildsExistingHostBinding(options={}){
 if(!required.every(name=>typeof options[name]==='function'))
   throw new TypeError('BURN_WILDS_EXISTING_RUNTIME_CALLBACKS_REQUIRED');
 const service=createBurnWildsExistingServer({
   authenticate:options.authenticate,sessionGuard:options.sessionGuard,
   transaction:options.transaction,hash:options.hash,
   getApprovedModel:options.getApprovedModel,
   releaseEnabled:options.releaseEnabled,uuid:options.uuid
 });
 const fetch=createBurnWildsExistingHttpBinding({
   lifecycle:service,existingFetch:options.existingFetch,
   assertWriteOrigin:options.assertWriteOrigin
 });
 return Object.freeze({fetch,lifecycle:service,handles:service.handles,
   addsDatabase:false,createsSession:false,createsWallet:false,
   releaseEnabledByDefault:false});
}
