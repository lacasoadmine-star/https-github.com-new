import { createUnreleasedRollXSession } from './session.mjs';
import { mountRollX } from './app.mjs';

const root = document.getElementById('rollx-app');
try {
  const session = createUnreleasedRollXSession();
  const game = mountRollX({ root, session });
  void game.connect();
} catch {
  // Missing storage, session or browser capability must not create a fake game.
  const status = root.querySelector('#status');
  if (status) status.textContent = 'Game unavailable. Return to the lobby and check your session.';
}
