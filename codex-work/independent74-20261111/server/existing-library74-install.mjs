// Backend-only installation entry. The runtime supplies its existing initialized
// service and authentication functions; no financial implementation is bundled.
export { installExistingLibrary74Http } from './existing-library74-http.mjs';
export { installExistingLibrary74 } from './existing-library74-service.mjs';
export {
  BRIDGE_VERSION,
  LIBRARY74_MIN_STAKE_MINOR,
  LIBRARY74_MAX_STAKE_MINOR,
  createExistingLibrary74Adapter,
  composeExistingLibrary74Registry,
  publicLibrary74Definition,
  publicLibrary74Definitions,
} from './existing-library74-adapter.mjs';
