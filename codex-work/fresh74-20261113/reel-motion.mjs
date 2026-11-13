// Fresh presentation code. Inputs are supplied symbol strips and server results.
// This module has no RNG, wallet, network, payout, or balance implementation.
export function validateGrid(grid, columns, rows, symbols) {
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1 || columns > 12 || rows > 12)
    throw new TypeError('Invalid reel dimensions');
  if (!Array.isArray(grid) || grid.length !== columns || grid.some(column => !Array.isArray(column) || column.length !== rows))
    throw new TypeError('Grid must be column-major and match the game dimensions');
  if (grid.some(column => column.some(symbol => typeof symbol !== 'string' || !symbols.has(symbol))))
    throw new TypeError('Unverified symbol in result');
  return Object.freeze(grid.map(column => Object.freeze([...column])));
}

export class ReelMotion {
  constructor({columns, rows, strips, timing, requestFrame, cancelFrame, now, render}) {
    if (!Array.isArray(strips) || strips.length !== columns || strips.some(strip => !Array.isArray(strip) || strip.length < rows + 1 || strip.some(s => typeof s !== 'string')))
      throw new TypeError('A verified presentation strip is required for every reel');
    if (!timing || !['durationMs', 'staggerMs', 'stopMs', 'turns'].every(key => Number.isFinite(timing[key]) && timing[key] >= 0) || timing.durationMs === 0 || timing.stopMs === 0 || !Number.isInteger(timing.turns) || timing.turns < 1)
      throw new TypeError('Explicit positive animation timing is required');
    if (![requestFrame, cancelFrame, now, render].every(value => typeof value === 'function'))
      throw new TypeError('Frame scheduler, clock, and renderer are required');
    this.columns = columns; this.rows = rows;
    this.strips = Object.freeze(strips.map(strip => Object.freeze([...strip])));
    this.symbols = new Set(strips.flat());
    this.timing = Object.freeze({...timing});
    this.requestFrame = requestFrame; this.cancelFrame = cancelFrame;
    this.now = now; this.render = render;
    this.running = null; this.disposed = false; this.previousGrid = null;
  }

  seed(grid) {
    if (this.running || this.disposed) throw new Error('Initial reel state cannot change during presentation');
    this.previousGrid = validateGrid(grid, this.columns, this.rows, this.symbols);
  }

  play(grid) {
    if (this.disposed) throw new Error('Reel view has been disposed');
    if (this.running) throw new Error('A presentation is already running');
    const result = validateGrid(grid, this.columns, this.rows, this.symbols);
    const started = this.now();
    const run = {result, initial: this.previousGrid, started, stopAt: null, handle: null, resolve: null, reject: null};
    const finished = new Promise((resolve, reject) => {run.resolve = resolve; run.reject = reject;});
    this.running = run;
    const tick = timestamp => {
      if (this.running !== run) return;
      try {
        const elapsed = Math.max(0, timestamp - started);
        const originalEnd = this.timing.durationMs + (this.columns - 1) * this.timing.staggerMs;
        // A continuous time remap accelerates only the remaining presentation.
        const virtualTime = run.stopAt === null ? elapsed : run.stopAt +
          Math.max(0, elapsed - run.stopAt) * Math.max(1, (originalEnd - run.stopAt) / this.timing.stopMs);
        const reels = this.strips.map((strip, column) => {
          const duration = this.timing.durationMs + column * this.timing.staggerMs;
          const progress = Math.min(1, virtualTime / duration);
          const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
          const travel = strip.length * this.timing.turns + this.rows;
          return {column, strip, initial: run.initial?.[column], result: result[column], offset: eased * travel,
            travel, progress, settled: progress === 1};
        });
        const settled = reels.every(reel => reel.settled);
        this.render({reels, result, settled});
        if (settled) {this.running = null; this.previousGrid = result; run.resolve({cancelled: false, result});}
        else run.handle = this.requestFrame(tick);
      } catch (error) {this.running = null; run.reject(error);}
    };
    run.handle = this.requestFrame(tick);
    return {finished, stop: () => this.stop(), cancel: () => this.cancel()};
  }

  stop() {
    const run = this.running;
    if (!run || run.stopAt !== null) return false;
    run.stopAt = Math.max(0, this.now() - run.started);
    return true;
  }

  cancel() {
    const run = this.running;
    if (!run) return;
    this.running = null;
    this.cancelFrame(run.handle);
    run.resolve({cancelled: true});
  }

  dispose() {this.cancel(); this.disposed = true;}
}
