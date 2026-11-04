export function installWalletCompatibility(source) {
  const anchor = 'export default createWorker();';
  if (source.includes("from './player-compat.mjs'")) throw new Error('Compatibility module already installed');
  if (source.split(anchor).length !== 2 || !source.includes('export async function legacy(') || !source.includes('function sessionHeaders(')) {
    throw new Error('Unexpected player source; deployment stopped');
  }
  return "import {wrapPlayer} from './player-compat.mjs';\nimport GATEWAY_SCRIPT from './gateway-player.txt';\n" + source.replace(
    anchor,
    'export default wrapPlayer(createWorker(), {legacy, GAMES, sessionHeaders, gatewayScript: GATEWAY_SCRIPT});',
  );
}

export function upgradeWalletCompatibility(source) {
  const anchor = 'export default wrapPlayer(createWorker(), {legacy, GAMES, sessionHeaders});';
  if (!source.includes("from './player-compat.mjs'") || source.includes('gateway-player.txt') || source.split(anchor).length !== 2) {
    throw new Error('Unexpected existing compatibility source; deployment stopped');
  }
  return "import GATEWAY_SCRIPT from './gateway-player.txt';\n" + source.replace(
    anchor,
    'export default wrapPlayer(createWorker(), {legacy, GAMES, sessionHeaders, gatewayScript: GATEWAY_SCRIPT});',
  );
}
