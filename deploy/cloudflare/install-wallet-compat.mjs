export function installWalletCompatibility(source) {
  const anchor = 'export default createWorker();';
  if (source.includes("from './player-compat.mjs'")) throw new Error('Compatibility module already installed');
  if (source.split(anchor).length !== 2 || !source.includes('export async function legacy(') || !source.includes('function sessionHeaders(')) {
    throw new Error('Unexpected player source; deployment stopped');
  }
  return "import {wrapPlayer} from './player-compat.mjs';\n" + source.replace(
    anchor,
    'export default wrapPlayer(createWorker(), {legacy, GAMES, sessionHeaders});',
  );
}
