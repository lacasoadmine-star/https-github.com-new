import previous from '../native72habesha5/entry.mjs';
export * from '../native72habesha5/entry.mjs';
import {installPlayerPresentation} from './worker-wrapper.mjs';
import catalog from './bundled/catalog-data.mjs.txt';
import lobby from './bundled/lobby.mjs.txt';
import styles from './bundled/lobby.css.txt';
import player from './bundled/player-app.mjs.txt';

export default installPlayerPresentation(previous, {
  'catalog-data.mjs': catalog,
  'lobby.mjs': lobby,
  'lobby.css': styles,
  'player-app.mjs': player,
});
