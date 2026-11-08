// Native presentation timing. This module never chooses an outcome or changes money.
// Observed reference: official MultiHot40 free demo, 2026-11-08 (Africa/Addis_Ababa).
const TAU = Math.PI * 2;
const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const copyGrid = grid => grid.map(column => column.map(Number));
const rect = (x, y, width, height) => ({ x, y, width, height });

export const MULTIHOT40_INITIAL_GRID = Object.freeze([
  Object.freeze([3, 2, 3, 3]), Object.freeze([2, 4, 4, 4]),
  Object.freeze([6, 5, 7, 7]), Object.freeze([4, 1, 2, 2]),
  Object.freeze([4, 1, 4, 4]),
]);

export function isMultiHot40Grid(grid) {
  return Array.isArray(grid) && grid.length === 5 && grid.every(column =>
    Array.isArray(column) && column.length === 4 && column.every(value =>
      (typeof value === 'number' || typeof value === 'string') && /^\d$/.test(String(value)) && Number(value) <= 7));
}

export function wheelAngle(multiplier) {
  const numerators = [0, 3, 5, 2, 4, 1];
  return Number.isInteger(multiplier) && multiplier >= 1 && multiplier <= 5
    ? Math.PI * numerators[multiplier] / 7 : null;
}

function validMinor(value) {
  return typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value) && value.length <= 32;
}

export function winTier(winMinor, betMinor) {
  if (!validMinor(winMinor) || !validMinor(betMinor)) return null;
  const win = BigInt(winMinor), bet = BigInt(betMinor);
  if (!win || !bet) return null;
  // Public presentation configuration uses 9.99/19.99/29.99/39.99 thresholds.
  // The comparison is exact integer arithmetic; it has no influence on awards.
  if (win * 100n > bet * 3999n) return { name: 'Fantastic Win', duration: 7000 };
  if (win * 100n > bet * 2999n) return { name: 'Super Win', duration: 5000 };
  if (win * 100n > bet * 1999n) return { name: 'Big Win', duration: 4000 };
  if (win * 100n > bet * 999n) return { name: 'Nice Win', duration: 3000 };
  return { name: 'Win', duration: 1000 };
}

/** CSS-pixel geometry shared by canvas and accessible HTML hit targets. */
export function multiHot40Layout(width, height) {
  if (![width, height].every(value => Number.isFinite(value) && value > 0)) throw new TypeError('Invalid presentation viewport');
  const portrait = height > width * 1.08;
  // Positions are measured from the official desktop and Android portrait
  // free-demo captures. The portrait scene uses the source's 626×1314 canvas.
  const designWidth = portrait ? 626 : 1363;
  const designHeight = portrait ? 1314 : 768;
  const scale = Math.min(width / designWidth, height / designHeight);
  const offsetX = (width - designWidth * scale) / 2;
  const offsetY = portrait ? Math.max(0, height - designHeight * scale) : (height - designHeight * scale) / 2;
  const map = value => rect(offsetX + value.x * scale, offsetY + value.y * scale, value.width * scale, value.height * scale);
  const board = portrait ? rect(-8, 346, 642, 526) : rect(385, 184, 573, 469);
  const controls = portrait ? {
    spin: rect(214, 1015, 198, 198), auto: rect(109, 1069, 96, 96),
    bet: rect(424, 1069, 96, 96), menu: rect(21, 1240, 38, 29),
    sound: rect(568, 1240, 38, 29), turbo: rect(395, 1006, 46, 55),
    collect: rect(532, 1069, 76, 76), gamble: rect(18, 1069, 76, 76),
  } : {
    spin: rect(1137, 295, 158, 158), auto: rect(1176, 204, 83, 83),
    bet: rect(1174, 469, 82, 83), menu: rect(42, 680, 33, 27),
    sound: rect(1292, 681, 33, 27), turbo: rect(1274, 270, 43, 51),
    collect: rect(1184, 569, 69, 69), gamble: rect(1184, 127, 69, 69),
  };
  const hud = portrait ? {
    balance: rect(85, 1225, 220, 66), bet: rect(322, 1225, 220, 66),
    win: rect(216, 900, 194, 61),
  } : {
    balance: rect(384, 670, 165, 52), bet: rect(794, 670, 165, 52),
    win: rect(584, 668, 175, 55),
  };
  return {
    width, height, portrait, scale,
    viewport: rect(offsetX, offsetY, designWidth * scale, designHeight * scale),
    board: map(board),
    grid: map(portrait
      ? rect(board.x + board.width * .026, board.y + board.height * .037, board.width * .95, board.height * .922)
      : rect(board.x + board.width * .018, board.y + board.height * .022, board.width * .964, board.height * .957)),
    logo: map(portrait ? rect(88, 95, 440, 109) : rect(49, 105, 324, 78)),
    controls: Object.fromEntries(Object.entries(controls).map(([key, value]) => [key, map(value)])),
    hud: Object.fromEntries(Object.entries(hud).map(([key, value]) => [key, map(value)])),
  };
}

export class MultiHot40Motion {
  constructor({ onEvent = () => {}, clock = () => performance.now() } = {}) {
    this.onEvent = onEvent; this.clock = clock; this.grid = copyGrid(MULTIHOT40_INITIAL_GRID);
    this.multiplier = 2; this.angle = wheelAngle(2); this.phase = 'idle';
    this.elapsed = 0; this.rawTime = null; this.speed = 1; this.generation = 0;
    this.receipt = null; this.previousGrid = this.grid; this.lines = [];
  }

  emit(type, detail = {}) { this.onEvent({ type, generation: this.generation, roundId: this.receipt?.roundId ?? null, ...detail }); }
  advance(time = this.clock()) {
    if (!Number.isFinite(time)) return;
    if (this.rawTime !== null && this.busy) this.elapsed += Math.max(0, time - this.rawTime) * this.speed;
    this.rawTime = time;
  }
  get busy() { return ['spinning', 'settling', 'celebrating'].includes(this.phase); }

  begin({ turbo = false } = {}, time = this.clock()) {
    if (this.busy) return false;
    this.generation++; this.previousGrid = copyGrid(this.grid); this.receipt = null;
    this.phase = 'spinning'; this.elapsed = 0; this.rawTime = time; this.speed = 1;
    this.turbo = turbo === true; this.wheelStart = this.angle;
    this.reelStopped = Array(5).fill(false); this.wheelStopped = false; this.lines = [];
    this.emit('spin-start', { turbo: this.turbo }); return true;
  }

  accept(receipt, time = this.clock()) {
    if (!isMultiHot40Grid(receipt?.grid) || wheelAngle(receipt?.multiplier) === null) throw new TypeError('Invalid authoritative presentation result');
    if (this.phase !== 'spinning') return false;
    this.advance(time);
    const grid = copyGrid(receipt.grid);
    this.receipt = { ...receipt, grid, lines: Array.isArray(receipt.lines) ? receipt.lines : [] };
    this.phase = 'settling';
    const earliest = this.turbo ? 220 : 560;
    this.stopBegin = Math.max(this.elapsed, earliest);
    const stagger = this.turbo ? 35 : 90, slowdown = this.turbo ? 190 : 360, rebound = this.turbo ? 65 : 115;
    this.reels = Array.from({ length: 5 }, (_, column) => {
      const start = this.stopBegin + column * stagger;
      const from = this.spinDistance(start, column);
      return { start, end: start + slowdown, finish: start + slowdown + rebound, from, to: Math.ceil(from) + (this.turbo ? 3 : 5) };
    });
    const fromAngle = this.spinAngle(this.stopBegin);
    const baseAngle = wheelAngle(receipt.multiplier);
    let endAngle = Math.ceil((fromAngle - baseAngle) / TAU) * TAU + baseAngle;
    if (endAngle - fromAngle < .4 * TAU) endAngle += TAU;
    this.wheel = { start: this.stopBegin, end: this.stopBegin + (this.turbo ? 360 : 920), from: fromAngle, to: endAngle };
    this.revealAt = Math.max(this.wheel.end, this.reels.at(-1).finish);
    this.tier = winTier(receipt.winMinor ?? '0', receipt.betMinor ?? '0');
    this.finishAt = this.revealAt + (this.tier?.duration ?? 0);
    return true;
  }

  restore({ grid, multiplier, lines = [] } = {}) {
    this.phase = 'idle'; this.speed = 1; this.elapsed = 0; this.rawTime = null; this.receipt = null;
    if (isMultiHot40Grid(grid)) this.grid = copyGrid(grid);
    if (wheelAngle(multiplier) !== null) { this.multiplier = multiplier; this.angle = wheelAngle(multiplier); }
    this.lines = Array.isArray(lines) ? lines : [];
    return this;
  }
  cancel(reason = 'unconfirmed') {
    const wasBusy = this.busy;
    this.phase = 'idle'; this.receipt = null; this.lines = []; this.speed = 1;
    this.grid = copyGrid(this.previousGrid ?? this.grid); this.angle = wheelAngle(this.multiplier);
    if (wasBusy) this.emit('animation-complete', { cancelled: true, reason });
  }
  speedUp(time = this.clock()) {
    this.advance(time); if (!this.busy) return false;
    this.speed = 4; this.emit('animation-speed-up'); return true;
  }
  spinDistance(milliseconds, column) {
    const t = Math.max(0, milliseconds - column * 22), acceleration = this.turbo ? 85 : 125;
    const velocity = this.turbo ? .018 : .012;
    return t < acceleration ? velocity * t * t / (2 * acceleration) : velocity * (t - acceleration / 2);
  }
  spinAngle(milliseconds) {
    return this.wheelStart + this.spinDistance(milliseconds, 0) * (this.turbo ? .64 : .53);
  }

  sample(time = this.clock()) {
    this.advance(time);
    if (!this.busy) return { phase: 'idle', grid: this.grid, multiplier: this.multiplier, wheelAngle: this.angle, columns: [], lines: this.lines, celebration: null };
    const t = this.elapsed;
    if (this.phase === 'spinning') return {
      phase: 'spinning', grid: this.previousGrid, wheelAngle: this.spinAngle(t), lines: [], celebration: null,
      columns: Array.from({ length: 5 }, (_, column) => ({ stopped: false, distance: this.spinDistance(t, column), target: null, blur: t > 80 })),
    };
    const columns = this.reels.map((reel, column) => {
      if (t < reel.start) return { stopped: false, distance: this.spinDistance(t, column), target: null, blur: true };
      const q = clamp((t - reel.start) / (reel.end - reel.start));
      let distance = reel.from + (reel.to - reel.from) * (1 - (1 - q) ** 3);
      if (t >= reel.end && t < reel.finish) {
        const b = (t - reel.end) / (reel.finish - reel.end);
        distance = reel.to + Math.sin(b * Math.PI) * .065 * (1 - b);
      }
      if (t >= reel.finish && !this.reelStopped[column]) { this.reelStopped[column] = true; this.emit('reel-stop', { column }); }
      return { stopped: t >= reel.finish, distance: t >= reel.finish ? reel.to : distance, target: reel.to, blur: q < .67 };
    });
    const wq = clamp((t - this.wheel.start) / (this.wheel.end - this.wheel.start));
    const smooth = 1 - (1 - wq) ** 3;
    let angle = t < this.wheel.start ? this.spinAngle(t) : this.wheel.from + (this.wheel.to - this.wheel.from) * smooth;
    if (wq >= 1 && !this.wheelStopped) { this.wheelStopped = true; this.emit('wheel-stop', { multiplier: this.receipt.multiplier }); }
    if (t >= this.revealAt && this.phase === 'settling') {
      this.phase = 'celebrating'; this.grid = copyGrid(this.receipt.grid); this.multiplier = this.receipt.multiplier;
      this.angle = wheelAngle(this.multiplier); this.lines = this.receipt.lines;
      this.emit('reels-complete'); if (this.tier) this.emit('win-tier', { name: this.tier.name, winMinor: this.receipt.winMinor });
    }
    const celebration = t >= this.revealAt && this.tier ? { ...this.tier, age: t - this.revealAt, progress: clamp((t - this.revealAt) / this.tier.duration), winMinor: this.receipt.winMinor } : null;
    const result = { phase: this.phase, grid: this.receipt.grid, previousGrid: this.previousGrid, multiplier: this.receipt.multiplier, wheelAngle: angle, columns, lines: t >= this.revealAt ? this.lines : [], celebration };
    if (t >= this.finishAt) {
      this.phase = 'idle'; this.angle = wheelAngle(this.multiplier); this.speed = 1;
      result.phase = 'idle'; result.celebration = null; result.wheelAngle = this.angle;
      this.emit('animation-complete', { cancelled: false });
    }
    return result;
  }
}
