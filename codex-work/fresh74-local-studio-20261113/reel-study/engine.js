/* Local presentation state only. No probability, payout, account or provider API. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ReelStudyEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const copy = grid => grid.map(column => column.slice());

  class Study {
    constructor({ rows, grid, symbols, reducedMotion = false }) {
      if (![3, 4].includes(rows) || grid.length !== 5 || grid.some(c => c.length !== rows)) throw new TypeError('A five-reel reference grid is required');
      if (!symbols.length || grid.flat().some(s => !symbols.includes(s))) throw new TypeError('Unknown reference symbol');
      this.rows = rows;
      this.grid = copy(grid);
      this.symbols = symbols.slice();
      this.reducedMotion = reducedMotion;
      this.phase = 'idle';
      this.sequence = 0;
      this.completed = 0;
      this.autoRemaining = 0;
      this.plans = [];
      this.nextAt = null;
    }
    spin(now) {
      if (!Number.isFinite(now) || this.phase !== 'idle') return false;
      return this.begin(now);
    }
    begin(now) {
      this.sequence += 1;
      this.phase = 'running';
      this.nextAt = null;
      this.plans = this.grid.map((initial, column) => {
        // A repeatable visual sequence, explicitly unrelated to game odds.
        const target = Array.from({ length: this.rows }, (_, row) => this.symbols[(this.sequence * 3 + column * 5 + row * 2) % this.symbols.length]);
        const bridge = Array.from({ length: this.reducedMotion ? 1 : 20 + column * 2 }, (_, i) => this.symbols[(i + this.sequence + column * 3) % this.symbols.length]);
        const strip = [...target, ...bridge, ...initial];
        return { strip, target, start: now + (this.reducedMotion ? 0 : column * 60), duration: this.reducedMotion ? 140 + column * 35 : 1650 + column * 180, distance: strip.length - this.rows, stop: null };
      });
      return true;
    }
    startAuto(count, now) {
      if (this.phase !== 'idle' || !Number.isInteger(count) || count < 1 || count > 50 || !Number.isFinite(now)) return false;
      this.autoRemaining = count - 1;
      return this.begin(now);
    }
    position(plan, now) {
      if (plan.stop) return plan.stop.position * (1 - ease((now - plan.stop.at) / plan.stop.duration));
      return plan.distance * (1 - ease((now - plan.start) / plan.duration));
    }
    stop(now) {
      if (!Number.isFinite(now) || this.phase === 'disposed') return false;
      this.autoRemaining = 0;
      this.nextAt = null;
      if (this.phase === 'waiting') { this.phase = 'idle'; return true; }
      if (this.phase !== 'running') return false;
      this.plans.forEach((plan, column) => {
        if (!plan.stop) plan.stop = { at: now, position: this.position(plan, now), duration: this.reducedMotion ? 80 : 200 + column * 55 };
      });
      return true;
    }
    advance(now) {
      if (!Number.isFinite(now) || this.phase === 'disposed') return [];
      if (this.phase === 'waiting' && now >= this.nextAt) {
        this.autoRemaining -= 1;
        this.begin(now);
      }
      if (this.phase !== 'running') return this.grid.map(strip => ({ strip, position: 0, moving: false }));
      let allDone = true;
      const frames = this.plans.map(plan => {
        const end = plan.stop ? plan.stop.at + plan.stop.duration : plan.start + plan.duration;
        const moving = now < end;
        if (moving) allDone = false;
        return { strip: plan.strip, position: this.position(plan, now), moving };
      });
      if (allDone) {
        this.grid = this.plans.map(plan => plan.target.slice());
        this.completed += 1;
        this.phase = this.autoRemaining > 0 ? 'waiting' : 'idle';
        this.nextAt = this.autoRemaining > 0 ? now + (this.reducedMotion ? 150 : 420) : null;
        return this.grid.map(strip => ({ strip, position: 0, moving: false }));
      }
      return frames;
    }
    dispose() {
      this.phase = 'disposed';
      this.autoRemaining = 0;
      this.nextAt = null;
      this.plans = [];
    }
  }
  return { Study };
});
