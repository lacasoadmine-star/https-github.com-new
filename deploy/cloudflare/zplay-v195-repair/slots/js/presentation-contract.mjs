// Presentation contract only. No RNG, payouts, or wallet writes.
export const layouts = Object.freeze({
  multi_hot_5_video: { reels: 3, rows: 3, paylines: 5, position: 'side' },
  hot_foxy_20: { reels: 5, rows: 3, paylines: 20, position: 'top' },
  burning_ice: { reels: 5, rows: 3, paylines: 5, position: 'top' },
  wild_multi_stars: { reels: 5, rows: 3, paylines: 20, position: 'top' },
  multi_hot_40: { reels: 5, rows: 3, paylines: 40, position: 'top' },
});
export function validatePresentation(model, requestedId) {
  const expected = layouts[requestedId];
  if (!expected || model?.id !== requestedId) throw Error('GAME_ID_MISMATCH');
  for (const key of ['reels', 'rows', 'paylines']) {
    if (model[key] !== expected[key]) throw Error('GAME_LAYOUT_MISMATCH');
  }
  if (!Array.isArray(model.linePaths) || model.linePaths.length !== model.paylines ||
      model.linePaths.some(line => !Array.isArray(line) || line.length !== model.reels ||
        line.some(row => !Number.isInteger(row) || row < 0 || row >= model.rows))) {
    throw Error('INVALID_SERVER_PAYLINES');
  }
  if (!Array.isArray(model.previewReels) || model.previewReels.length !== model.reels ||
      model.previewReels.some(reel => !Array.isArray(reel) || !reel.length ||
        reel.some(symbol => typeof symbol !== 'string' || !symbol))) throw Error('INVALID_SERVER_SYMBOLS');
  if (!Array.isArray(model.betLevels) || !model.betLevels.length ||
      model.betLevels.some(bet => typeof bet !== 'string' || !/^\d+\.\d{2}$/.test(bet) || Number(bet) <= 0)) {
    throw Error('INVALID_SERVER_BETS');
  }
  if (!Array.isArray(model.wheel?.values) || !model.wheel.values.length ||
      model.wheel.values.some(n => !Number.isInteger(n) || n < 1 || n > 5)) throw Error('INVALID_SERVER_MULTIPLIERS');
  return expected;
}
export function linePoints(positions, reels, rows, width, height) {
  if (!Array.isArray(positions) || positions.length === 0) return [];
  if (positions.some(p => !Array.isArray(p) || p.length !== 2 ||
      !Number.isInteger(p[0]) || !Number.isInteger(p[1]) ||
      p[0] < 0 || p[0] >= rows || p[1] < 0 || p[1] >= reels)) {
    throw Error('INVALID_WIN_LINE_POSITION');
  }
  return positions.map(([r,c]) => [(c + .5) * width / reels, (r + .5) * height / rows]);
}
