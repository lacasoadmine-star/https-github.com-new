import previous from './remaining20-accepted-controls-player-entry-r12.mjs';
export * from './remaining20-accepted-controls-player-entry-r12.mjs';
import {installRemainingGames} from './remaining20-worker-20261109.mjs';
import {installAccountEntry} from './account-entry-r13.mjs';
import {LOBBY_SOURCE} from './account-lobby-source-r13.mjs';
export default installAccountEntry(previous, {createTransport: installRemainingGames, lobbySource: LOBBY_SOURCE});
