import {MultiHot100Machine} from './multihot100-machine.mjs';
import {mountMultiHot100View} from './multihot100-view.mjs';
import {createReelPainter, validateAtlas} from './canvas-reels.mjs';
import {ReelMotion, validateGrid} from './reel-motion.mjs';

const mounted = new WeakMap();

// Supplies no default symbols, recorded-board backgrounds, wallet or spin results.
// Integrators must provide current verified assets and the existing server adapter.
export function mountMultiHot100({host, gameId, atlas, strips, timing, initialState,
  allowedBets, startRound, recoverRound, journal, nextToken, loadHistory, aboutText,
  onAudio, onSoundCue = () => {}, requestFullscreen}) {
  const browser = host?.ownerDocument?.defaultView;
  if (!browser || !initialState) throw new TypeError('A browser mount and existing-server initial state are required');
  validateAtlas(atlas);
  const symbols = new Set(Object.keys(atlas));
  const initialGrid = validateGrid(initialState.grid, 5, 4, symbols);
  if (initialState.currency === 'ETB' && !journal) throw new TypeError('A durable account-scoped journal is required for ETB integration');
  let view, painter, motion, lastFrame, stoppedReels = new Set(), disposed = false;
  const machine = new MultiHot100Machine({gameId, allowedBets, balanceMinor: initialState.balanceMinor,
    currency: initialState.currency, initialBetMinor: initialState.betMinor, symbols,
    startRound, recoverRound, journal, nextToken, onAudio,
    present: result => {
      stoppedReels = new Set(); view.showWinPaths([]);
      const run = motion.play(result.grid);
      if (machine.settings.effects) cue('spin', {});
      return {...run, finished: run.finished.then(outcome => {
        if (!outcome.cancelled && !disposed) {
          view.showWinPaths(result.winningPaths || []);
          if (machine.settings.effects && result.winMinor > 0) cue('win', {winMinor: result.winMinor});
        }
        return outcome;
      })};
    }});
  motion = new ReelMotion({columns:5, rows:4, strips, timing,
    requestFrame: browser.requestAnimationFrame.bind(browser), cancelFrame: browser.cancelAnimationFrame.bind(browser),
    now: () => browser.performance.now(),
    render: frame => {
      lastFrame = frame; painter.render(frame);
      for (const reel of frame.reels) if (reel.settled && !stoppedReels.has(reel.column)) {
        stoppedReels.add(reel.column);
        if (machine.settings.effects) cue('reel-stop', {column:reel.column});
      }
    }});
  function cue(name, detail) {try {onSoundCue(name, detail);} catch (error) {machine.lastAudioError=error;}}
  motion.seed(initialGrid);
  // Replacement tears down only the previous instance owned by this module.
  mounted.get(host)?.dispose();
  try {
    view = mountMultiHot100View({host, machine, loadHistory, aboutText, requestFullscreen});
    painter = createReelPainter({canvas:view.canvas, columns:5, rows:4, atlas});
  } catch (error) {machine.dispose(); motion.dispose(); view?.dispose(); throw error;}
  lastFrame = {reels:initialGrid.map((result,column)=>({column,result,settled:true})), result:initialGrid, settled:true};
  const resize = () => {
    if (disposed) return;
    const bounds=view.canvas.parentElement.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    painter.resize(bounds.width,bounds.height,browser.devicePixelRatio || 1); painter.render(lastFrame);
  };
  let observer;
  try {observer=new browser.ResizeObserver(resize);observer.observe(view.canvas.parentElement);resize();}
  catch(error){observer?.disconnect();machine.dispose();motion.dispose();painter.dispose();view.dispose();throw error;}
  const api = {machine, ready:machine.initialize(),
    dispose() {if(disposed)return;disposed=true;observer.disconnect();machine.dispose();motion.dispose();painter.dispose();view.dispose();if(mounted.get(host)===api)mounted.delete(host);}};
  mounted.set(host,api);return api;
}
