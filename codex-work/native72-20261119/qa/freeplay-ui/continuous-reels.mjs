// Graphics only. Targets are supplied by the local preview; this module has no
// outcome selection, accounts, currency, network calls or persistent state.
const clamp = value => Math.max(0, Math.min(1, value));
const mod = (value, length) => ((value % length) + length) % length;

export class ContinuousReel {
  constructor(palette, initialWindow) {
    if (!Array.isArray(palette) || !palette.length || !Array.isArray(initialWindow) || !initialWindow.length)
      throw Error('REEL_WINDOW_REQUIRED');
    if (initialWindow.some(symbol => !palette.includes(symbol))) throw Error('UNKNOWN_REEL_SYMBOL');
    this.palette = palette.slice();
    this.rows = initialWindow.length;
    this.symbols = new Map(initialWindow.map((symbol, row) => [row, symbol]));
    this.phase = 0; this.velocity = 0; this.mode = 'stopped'; this.fast = false;
  }

  begin(now, {speed = .018, ramp = 120} = {}) {
    if (!Number.isFinite(now) || !(speed > 0) || !(ramp > 0)) throw Error('INVALID_REEL_MOTION');
    this.started = now; this.startPhase = this.phase; this.speed = speed;
    this.ramp = ramp; this.mode = 'pending'; this.fast = false; this.fastDuration = null;
    return this;
  }

  sample(now) {
    if (!Number.isFinite(now)) throw Error('INVALID_REEL_TIME');
    if (this.mode === 'pending') {
      const elapsed = Math.max(0, now - this.started);
      this.phase = this.startPhase + this.speed * (elapsed < this.ramp
        ? elapsed * elapsed / (2 * this.ramp) : elapsed - this.ramp / 2);
      this.velocity = this.speed * Math.min(1, elapsed / this.ramp);
    } else if (this.mode === 'landing') {
      const segment = this.segment, p = clamp((now - segment.started) / segment.duration);
      const distance = segment.end - segment.from, tangent = segment.velocity * segment.duration;
      this.phase = segment.from + tangent * p + (3 * distance - 2 * tangent) * p * p
        + (tangent - 2 * distance) * p * p * p;
      this.velocity = Math.max(0, (tangent + 2 * (3 * distance - 2 * tangent) * p
        + 3 * (tangent - 2 * distance) * p * p) / segment.duration);
      if (p === 1) { this.phase = segment.end; this.velocity = 0; this.mode = 'stopped'; }
    }
    return {phase:this.phase, velocity:this.velocity, mode:this.mode, end:this.segment?.end ?? null};
  }

  settle(targetWindow, now, {duration = 600, minTravel = this.rows + 2} = {}) {
    if (!Array.isArray(targetWindow) || targetWindow.length !== this.rows
      || targetWindow.some(symbol => !this.palette.includes(symbol))) throw Error('INVALID_REEL_TARGET');
    if (!(duration > 0) || !Number.isFinite(duration)) throw Error('INVALID_REEL_DURATION');
    const current = this.sample(now);
    if (this.fast) duration = Math.min(duration, this.fastDuration);
    // At least two guard rows remain between anything visible and the target.
    // The target is installed once, while offscreen, then enters with the strip.
    const end = Math.ceil(current.phase + Math.max(this.rows + 2, minTravel,
      current.velocity * duration / 2));
    targetWindow.forEach((symbol, row) => this.symbols.set(row - end, symbol));
    this.segment = {from:current.phase, velocity:current.velocity, end, started:now, duration};
    this.travelFrom = current.phase; this.travelEnd = end;
    this.mode = 'landing'; this.target = targetWindow.slice();
    return this.segment;
  }

  requestStop(now, duration = 240) {
    if (!(duration > 0) || !Number.isFinite(duration)) throw Error('INVALID_STOP_DURATION');
    const current = this.sample(now);
    this.fast = true; this.fastDuration = Math.min(this.fastDuration ?? Infinity, duration);
    duration = this.fastDuration;
    if (this.mode !== 'landing') return current;
    const remaining = this.segment.started + this.segment.duration - now;
    // Rebase from today's phase/velocity; never reinterpret elapsed history.
    // The endpoint and symbol queue stay identical to the original landing.
    if (remaining > duration) this.segment = {
      from:current.phase, velocity:current.velocity, end:this.segment.end, started:now, duration
    };
    return current;
  }

  window(now, first = -1, last = this.rows) {
    const state = this.sample(now), whole = Math.floor(state.phase), fraction = state.phase - whole;
    return Array.from({length:last - first + 1}, (_, index) => {
      const row = first + index, stripIndex = row - whole;
      return {row:row + fraction, index:stripIndex,
        symbol:this.symbols.has(stripIndex) ? this.symbols.get(stripIndex)
          : this.palette[mod(stripIndex, this.palette.length)]};
    });
  }

  clarity() { return clamp(1 - this.velocity / .009); }
  progress() {
    if (!this.segment) return 0;
    return clamp((this.phase - this.travelFrom) / (this.travelEnd - this.travelFrom));
  }
}
