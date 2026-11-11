// Explicit opt-in for the latest requested list. The existing service default,
// protected games, infrastructure and production financial gate are unchanged.
import * as requestedMath from '../math/requested72.mjs';
import {createGameService} from './service.mjs';
export function createRequestedGameService(options) {
  return createGameService({...options, math:requestedMath});
}
