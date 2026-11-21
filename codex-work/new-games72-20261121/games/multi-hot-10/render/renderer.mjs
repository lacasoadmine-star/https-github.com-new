import { STAGE, GRID, CONTROL_RECTS, FOOTERS, clipReel } from './layout.mjs';
import { evaluateLineCandidates, GAME_ID } from '../evaluator.mjs';

// Identities visually checked against the original current-game atlases.
export const SYMBOL_FRAMES = Object.freeze({ seven: 'Box/0', bell: 'Box/1',
  grapes: 'Box/2', watermelon: 'Box/3', cherry: 'Box/4', orange: 'Box/5',
  plum: 'Box/6', lemon: 'Box/7' });
// A starting display transcribed from before-spin-01.jpg. This is never used
// to select an outcome, settle a bet, or constrain later incoming receipts.
export const INITIAL_DISPLAY = Object.freeze([
  Object.freeze(['watermelon', 'grapes', 'plum', 'cherry', 'cherry']),
  Object.freeze(['grapes', 'cherry', 'orange', 'bell', 'bell']),
  Object.freeze(['watermelon', 'cherry', 'lemon', 'grapes', 'cherry']),
]);
const WHEEL_SECTOR = Object.freeze({ 1: 11, 2: 0, 3: 12, 4: 10, 5: 13 });
// Responsive adaptation of this game's existing artwork and scene. The
// landscape reference remains unchanged; exact official mobile parity is not
// claimed. All portrait hitboxes share these same rectangles with the canvas.
export const PORTRAIT_LAYOUT = Object.freeze({
  width: 360, height: 660,
  scene: Object.freeze({ x: 8, y: 88, sourceX: 315, sourceY: 46, sourceWidth: 710, width: 344 }),
  title: Object.freeze({ x: 66, y: 8, width: 228, height: 72 }),
  controls: Object.freeze({
    spin: Object.freeze({ x: 134, y: 510, width: 92, height: 92 }),
    auto: Object.freeze({ x: 36, y: 526, width: 60, height: 60 }),
    bet: Object.freeze({ x: 264, y: 526, width: 60, height: 60 }),
    quick: Object.freeze({ x: 264, y: 603, width: 44, height: 44 }),
    take: Object.freeze({ x: 186, y: 603, width: 44, height: 44 }),
    gamble: Object.freeze({ x: 130, y: 603, width: 44, height: 44 }),
    menu: Object.freeze({ x: 10, y: 10, width: 44, height: 44 }),
    sound: Object.freeze({ x: 306, y: 10, width: 44, height: 44 }),
  }),
  footers: Object.freeze({
    balance: Object.freeze({ x: 10, y: 422, width: 108, height: 56 }),
    win: Object.freeze({ x: 126, y: 422, width: 108, height: 56 }),
    bet: Object.freeze({ x: 242, y: 422, width: 108, height: 56 }),
  }),
});
export const presentationLayout = (width, height) => width <= 600 && height > width
  ? PORTRAIT_LAYOUT : STAGE;
export const PRESENTATION_TIMING = Object.freeze({
  reelPixelsPerSecond: 1100, motionDelayMs: 360, settleMs: 380,
  firstReelStopMs: 740, reelStaggerMs: 255, controlsReadyMs: 2290, captionMs: 1800,
  stopSettleMs: 180, stopReelStaggerMs: 30,
  source: 'evidence/2026-11-22/normal-motion-current/timing.json',
  sampledStopOrderVerified: true,
  exactProviderTimingVerified: false,
});
const ease = t => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;
const gridCopy = grid => grid.map(row => [...row]);
const exactAmount = value => typeof value === 'string' && /^(0|[1-9]\d{0,12})\.\d{2}$/.test(value);
const formatted = value => exactAmount(value) ? value.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '—';

export function assertPresentation(view) {
  if (!view || !Array.isArray(view.grid) || view.grid.length !== 3 ||
    !Array.from(view.grid).every(row => Array.isArray(row) && row.length === 5 &&
      Array.from(row).every(value => Object.hasOwn(SYMBOL_FRAMES, value))) ||
    !Number.isInteger(view.multiplier) || view.multiplier < 1 || view.multiplier > 5 ||
    !exactAmount(view.bet) || !exactAmount(view.winAmount) ||
    typeof view.roundId !== 'string' || !view.roundId) {
    throw new TypeError('A validated complete Multi Hot 10 presentation is required.');
  }
}

export function reelFrame({ oldGrid, nextGrid, reel, elapsedMs, settling = false }) {
  const clip = clipReel(reel);
  if (settling) {
    const progress = Math.max(0, Math.min(1, elapsedMs / PRESENTATION_TIMING.settleMs));
    const offset = -GRID.height * (1 - ease(progress));
    return { clip, settled: progress === 1,
      cells: [...nextGrid.map(row => row[reel]), ...oldGrid.map(row => row[reel])]
        .map((symbol, index) => ({ symbol, y: clip.y + index * GRID.cell + offset })) };
  }
  const offset = (Math.max(0, elapsedMs) * PRESENTATION_TIMING.reelPixelsPerSecond / 1000) % GRID.height;
  return { clip, settled: false, cells: Array.from({ length: 9 }, (_, index) => ({
    symbol: oldGrid[index % 3][reel], y: clip.y + (index - 3) * GRID.cell + offset,
  })) };
}

/** Canvas presentation only. It never fetches or determines game outcomes. */
export class MultiHot10Renderer {
  constructor(canvas, atlas, { background = null, logo = null, onEvent = () => {},
    requestFrame = callback => globalThis.requestAnimationFrame(callback),
    cancelFrame = id => globalThis.cancelAnimationFrame(id),
    now = () => performance.now() } = {}) {
    this.canvas = canvas; this.context = canvas.getContext('2d', { alpha: false });
    this.atlas = atlas; this.background = background; this.logo = logo;
    this.onEvent = onEvent; this.requestFrame = requestFrame; this.cancelFrame = cancelFrame; this.now = now;
    this.grid = gridCopy(INITIAL_DISPLAY); this.oldGrid = gridCopy(this.grid);
    this.multiplier = 2; this.phase = 'IDLE'; this.frameId = null; this.disposed = false;
    this.controls = null; this.round = null; this.pendingWinAmount = null; this.balance = null; this.currency = 'DMO';
    this.quick = false; this.pressed = null; this.stopped = new Set(); this.seen = new Set();
    this.framesDrawn = 0; this.logoStartedAt = this.now(); this.lastPresentedRoundId = null;
    this._tick = this._tick.bind(this); this.resize(); if (this.logo) this._schedule();
  }
  resize() {
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const rect = this.canvas.getBoundingClientRect();
    this.layout = presentationLayout(rect.width, rect.height);
    const stage = this.canvas.parentElement;
    if (stage?.style && stage?.dataset) {
      stage.dataset.layout = this.layout === PORTRAIT_LAYOUT ? 'portrait' : 'landscape';
      for (const [name, bounds] of Object.entries(this.layout.controls || CONTROL_RECTS)) {
        for (const [key, value] of Object.entries(bounds)) {
          const dimension = key === 'x' || key === 'width' ? this.layout.width : this.layout.height;
          stage.style.setProperty(`--m10-${name}-${key}`, `${value / dimension * 100}%`);
        }
      }
    }
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = 'high';
    this.draw(this.now());
  }
  update({ controls, balance, currency, quick, autoRemaining = null } = {}) {
    if (controls) {
      this.controls = controls;
      if (controls.round && this.round?.roundId === controls.round.roundId) {
        this.applyPendingWinProjection(controls.round, { collected: !controls.winVisible });
      }
    }
    if (balance !== undefined) this.balance = exactAmount(balance) ? balance : null;
    if (currency) this.currency = currency;
    if (quick !== undefined) this.quick = quick;
    this.autoRemaining = autoRemaining;
    this.draw(this.now());
  }
  beginSpin(requestKey) {
    if (this.disposed || this.phase !== 'IDLE' || !requestKey) return false;
    this.phase = 'SPINNING'; this.requestKey = requestKey; this.startedAt = this.now();
    this.oldGrid = gridCopy(this.grid); this.round = null; this.pendingWinAmount = null; this.stopRequested = false;
    this.onEvent({ type: 'spin-start', id: requestKey }); this._schedule(); return true;
  }
  present(view, { animate = true } = {}) {
    assertPresentation(view);
    if (this.disposed || this.seen.has(view.roundId)) return false;
    if (this.phase === 'SETTLING' || this.phase === 'SPINNING' && view.requestKey !== this.requestKey) return false;
    const wheelFrom = this._wheelAngle(this.now());
    this.seen.add(view.roundId); this.round = structuredClone(view); this.pendingWinAmount = view.winAmount;
    this.target = gridCopy(view.grid); this.targetMultiplier = view.multiplier; this.wheelSettleFrom = wheelFrom;
    this.candidates = evaluateLineCandidates({ grid: view.grid,
      totalBetMinor: Number(BigInt(view.bet.replace('.', ''))), multiplier: view.multiplier }).candidates;
    this.stopped.clear();
    const speed = this.quick ? 2 : 1;
    // A retained winning receipt can be the first presentation after reload.
    // It has no current spin clock and must not create NaN caption indices or
    // replay spin/reel/win events. Real in-flight rounds retain their own clock.
    const presentedAt = this.now();
    if (!Number.isFinite(this.startedAt) || this.phase !== 'SPINNING') this.startedAt = presentedAt;
    this.settleAt = Math.max(presentedAt, this.startedAt +
      (PRESENTATION_TIMING.firstReelStopMs - PRESENTATION_TIMING.settleMs) / speed);
    // Preserve both the sampled sequential stops and the later return of the
    // SPIN control. A late server receipt extends presentation; it is never
    // replaced by a locally selected result to meet a visual deadline.
    this.controlsReadyAt = Math.max(this.startedAt + PRESENTATION_TIMING.controlsReadyMs / speed,
      this.settleAt + (PRESENTATION_TIMING.controlsReadyMs -
        PRESENTATION_TIMING.firstReelStopMs + PRESENTATION_TIMING.settleMs) / speed);
    if (this.stopRequested) this._accelerateStop();
    if (animate && this.phase === 'SPINNING') this.phase = 'SETTLING';
    else { this.grid = gridCopy(this.target); this.multiplier = view.multiplier; this.phase = 'IDLE';
      this.settleAt = presentedAt; this.lastPresentedRoundId = view.roundId; }
    this._schedule(); this.draw(this.now()); return true;
  }
  applyPendingWinProjection(view, { collected = false } = {}) {
    // A later verified X2/collection history changes the amount awaiting
    // collection, never the immutable original outcome or its animation.
    if (this.disposed || this.phase !== 'IDLE' || !this.round || typeof collected !== 'boolean') return false;
    try { assertPresentation(view); } catch { return false; }
    if (view.gameId !== GAME_ID || this.round.gameId !== GAME_ID ||
      view.roundId !== this.round.roundId || view.requestKey !== this.round.requestKey ||
      view.bet !== this.round.bet || view.multiplier !== this.round.multiplier ||
      view.grid.some((row, y) => row.some((symbol, x) => symbol !== this.round.grid[y][x]))) return false;
    this.pendingWinAmount = collected ? '0.00' : view.winAmount;
    if (collected || view.winAmount === '0.00') this.candidates = [];
    return true;
  }
  collected() { this.round = null; this.pendingWinAmount = null; this.candidates = []; this.draw(this.now()); }
  requestStop() {
    if (this.disposed || this.phase === 'IDLE' || this.stopRequested) return false;
    const wheelFrom = this._wheelAngle(this.now());
    this.stopRequested = true;
    if (this.phase === 'SETTLING') this._accelerateStop(wheelFrom);
    this._schedule(); return true;
  }
  _accelerateStop(wheelFrom = this._wheelAngle(this.now())) {
    this.wheelSettleFrom = wheelFrom;
    this.settleAt = this.now();
    this.controlsReadyAt = this.settleAt + PRESENTATION_TIMING.stopSettleMs + 4 * PRESENTATION_TIMING.stopReelStaggerMs;
  }
  setPressed(name) { this.pressed = name; this.draw(this.now()); }
  _schedule() {
    if (!this.disposed && this.frameId === null) this.frameId = this.requestFrame(this._tick);
  }
  _tick(time) {
    this.frameId = null; if (this.disposed) return;
    this.draw(time);
    if (this.phase !== 'IDLE' || this.controls?.winVisible || this.logo && time - this.logoStartedAt < this.logo.durationMs) this._schedule();
  }
  _sprite(name, rect, alpha = 1, fitted = false) {
    if (!fitted) return this.atlas.draw(this.context, name, rect.x, rect.y, rect.width, rect.height, alpha);
    const f = this.atlas.frames.get(name); const s = f.sourceSize; const t = f.spriteSourceSize;
    this.atlas.draw(this.context, name, rect.x - t.x * rect.width / t.w,
      rect.y - t.y * rect.height / t.h, s.w * rect.width / t.w, s.h * rect.height / t.h, alpha);
  }
  _symbol(symbol, x, y, moving = false) {
    // Original symbols share a 500x500 logical box with large transparent
    // margins. A 318px logical draw yields the observed ~100-120px visible art.
    // Scaling a whole atlas frame to one 134px cell would produce tiny symbols.
    const frame = moving ? SYMBOL_FRAMES[symbol].replace('Box/', 'Box/Blur/') : SYMBOL_FRAMES[symbol];
    this.atlas.draw(this.context, frame, x + GRID.cell / 2 - 159,
      y + GRID.cell / 2 - 159, 318, 318);
  }
  _text(text, x, y, { size = 15, color = '#fff', bold = false, align = 'center' } = {}) {
    const c = this.context; c.fillStyle = color; c.textAlign = align;
    c.textBaseline = 'middle'; c.font = `${bold ? '700' : '400'} ${size}px Arial, sans-serif`;
    c.fillText(text, x, y);
  }
  draw(time) {
    if (this.disposed) return;
    const c = this.context, layout = this.layout || STAGE;
    c.setTransform(this.canvas.width / layout.width, 0, 0,
      this.canvas.height / layout.height, 0, 0); c.clearRect(0, 0, layout.width, layout.height);
    c.fillStyle = '#002a22'; c.fillRect(0, 0, layout.width, layout.height);
    if (this.background) {
      // Cover with this game's original art, preserving its aspect ratio.
      const width = this.background.width * layout.height / this.background.height;
      c.drawImage(this.background, (layout.width - width) / 2, 0, width, layout.height);
    }
    if (this.logo) {
      const title = layout.title;
      const base = this.logo.attachments?.['multi hot 10 logo']?.['multi hot 10 logo'];
      if (title && base?.width > 0 && base?.height > 0) {
        const scale = Math.min(title.width / base.width, title.height / base.height);
        this.logo.draw(c, time - this.logoStartedAt, {
          x: title.x + (title.width - base.width * scale) / 2 - (base.x - base.width / 2) * scale,
          y: title.y + (title.height - base.height * scale) / 2 - (-base.y - base.height / 2) * scale,
          scale,
        });
      } else if (!title) this.logo.draw(c, time - this.logoStartedAt);
    }
    c.save();
    if (layout.scene) {
      const r = layout.scene, scale = r.width / r.sourceWidth;
      c.translate(r.x, r.y); c.scale(scale, scale); c.translate(-r.sourceX, -r.sourceY);
    }
    this._drawWheel(time);
    this._sprite('Box/Background', { x: 319.5, y: 46, width: 702, height: 594 });
    let complete = this.phase === 'SETTLING';
    for (let reel = 0; reel < GRID.reels; reel++) {
      const clip = clipReel(reel); c.save(); c.beginPath();
      c.rect(clip.x, clip.y, clip.width, clip.height); c.clip();
      if (this.phase === 'IDLE' || this.phase === 'SETTLING' && this.stopped.has(reel) ||
        !this.stopRequested && time < this.startedAt + PRESENTATION_TIMING.motionDelayMs / (this.quick ? 2 : 1)) {
        const displayed = this.phase === 'SETTLING' && this.stopped.has(reel) ? this.target : this.grid;
        displayed.forEach((row, index) => this._symbol(row[reel], clip.x, clip.y + index * GRID.cell));
        if (this.phase !== 'IDLE' && !this.stopped.has(reel)) complete = false;
      }
      else {
        const speed = this.stopRequested ? 1 : this.quick ? 2 : 1;
        let elapsed = this.phase === 'SETTLING' ? (time - this.settleAt) * speed - reel *
          (this.stopRequested ? PRESENTATION_TIMING.stopReelStaggerMs : PRESENTATION_TIMING.reelStaggerMs) : (time - this.startedAt) * speed;
        if (this.stopRequested && this.phase === 'SETTLING' && elapsed >= 0) elapsed *= PRESENTATION_TIMING.settleMs / PRESENTATION_TIMING.stopSettleMs;
        const frame = reelFrame({ oldGrid: this.oldGrid, nextGrid: this.target, reel,
          elapsedMs: elapsed < 0 ? time - this.startedAt : elapsed,
          settling: this.phase === 'SETTLING' && elapsed >= 0 });
        frame.cells.forEach(cell => this._symbol(cell.symbol, clip.x, cell.y, !frame.settled));
        if (!frame.settled) complete = false;
        else if (!this.stopped.has(reel)) {
          this.stopped.add(reel); this.onEvent({ type: 'reel-stop', id: this.round.roundId + ':' + reel });
        }
      }
      c.restore();
    }
    c.restore();
    if (complete && time >= this.controlsReadyAt) {
      this.grid = gridCopy(this.target); this.multiplier = this.targetMultiplier;
      this.phase = 'IDLE'; this.settleAt = time;
      this.lastPresentedRoundId = this.round.roundId;
      this.onEvent({ type: 'round-presented', id: this.round.roundId, winAmount: this.round.winAmount });
    }
    this._drawControls(); this._drawFooter(); this._drawWinCaption(time); this.framesDrawn++;
  }
  _wheelAngle(time) {
    const base = -WHEEL_SECTOR[this.multiplier] * Math.PI * 2 / 14;
    const speed = this.quick ? 2 : 1;
    const movingTime = Math.max(0, (time - this.startedAt) * speed - PRESENTATION_TIMING.motionDelayMs);
    if (this.phase === 'SPINNING') return base + movingTime / 270;
    if (this.phase !== 'SETTLING') return base;
    const target = -WHEEL_SECTOR[this.targetMultiplier] * Math.PI * 2 / 14;
    const from = Number.isFinite(this.wheelSettleFrom) ? this.wheelSettleFrom : base;
    const duration = this.stopRequested ? PRESENTATION_TIMING.stopSettleMs + 4 * PRESENTATION_TIMING.stopReelStaggerMs
      : PRESENTATION_TIMING.settleMs + 4 * PRESENTATION_TIMING.reelStaggerMs;
    const progress = Math.max(0, Math.min(1, (time - this.settleAt) * (this.stopRequested ? 1 : speed) / duration));
    const turnSize = Math.PI * 2;
    const turn = ((target - from) % turnSize + turnSize) % turnSize + turnSize;
    return from + turn * ease(progress);
  }
  _drawWheel(time) {
    const c = this.context; const rect = { x: 270, y: 48, width: 803, height: 803 };
    c.save(); c.beginPath(); c.rect(0, 0, STAGE.width, GRID.y - 7); c.clip();
    this._sprite('Multiplier/Background', rect);
    const angle = this._wheelAngle(time);
    c.translate(rect.x + rect.width / 2, rect.y + rect.height / 2); c.rotate(angle);
    this.atlas.draw(c, 'Multiplier/Numbers', -rect.width / 2, -rect.height / 2, rect.width, rect.height);
    c.restore();
    // The selected value uses the native light atlas inside the selection wedge.
    c.save(); c.beginPath(); c.moveTo(671.5, 449.5); c.lineTo(581, 51); c.lineTo(757, 51); c.closePath(); c.clip();
    c.translate(rect.x + rect.width / 2, rect.y + rect.height / 2); c.rotate(angle);
    this.atlas.draw(c, 'Multiplier/Light', -rect.width / 2, -rect.height / 2, rect.width, rect.height);
    c.restore();
  }
  _drawControls() {
    const s = this.controls; const moving = this.phase !== 'IDLE';
    const rects = this.layout?.controls || CONTROL_RECTS, spin = rects.spin;
    const portrait = this.layout === PORTRAIT_LAYOUT;
    const drawButton = (id, frame, { disabled = false, visible = true } = {}) => {
      if (!visible) return;
      const pressed = this.pressed === id;
      const stateName = frame + (disabled ? 'Disabled' : pressed ? 'Active' : '');
      this._sprite(this.atlas.has(stateName) ? stateName : frame, rects[id], disabled ? .45 : 1, true);
    };
    drawButton('spin', this.autoRemaining !== null ? 'AutoPlay/Spin' : moving ? (this.quick ? 'Buttons/SpinTurboStop' : 'Buttons/SpinStop') :
      (this.quick ? 'Buttons/SpinTurbo' : 'Buttons/Spin'));
    if (this.autoRemaining !== null) {
      this._text(String(this.autoRemaining), spin.x + spin.width / 2, spin.y + spin.height * .49, { size: portrait ? 24 : 30, bold: true });
      this._text('STOP', spin.x + spin.width / 2, spin.y + spin.height * .66, { size: portrait ? 12 : 14, bold: true });
    } else if (!moving) {
      this._text('HOLD', spin.x + spin.width / 2, spin.y + spin.height * .39, { size: portrait ? 12 : 14, bold: true });
      this._text('&', spin.x + spin.width / 2, spin.y + spin.height * .50, { size: portrait ? 11 : 13, bold: true });
      this._text('SPIN', spin.x + spin.width / 2, spin.y + spin.height * .61, { size: portrait ? 12 : 14, bold: true });
    }
    drawButton('auto', this.autoRemaining !== null ? 'Buttons/AutoPlayStop' : 'Buttons/AutoPlay', { disabled: moving && this.autoRemaining === null });
    drawButton('bet', 'Buttons/Bet', { disabled: moving || s?.winVisible });
    drawButton('quick', this.quick ? 'Buttons/QuickPlayTurbo' : 'Buttons/QuickPlay');
    drawButton('take', 'Buttons/DoubleTake', { visible: !!s?.winVisible && !s?.pending });
    drawButton('gamble', 'Buttons/Double', { visible: !!s?.winVisible && !s?.pending });
    this._sprite('Buttons/Menu', portrait ? { x: rects.menu.x + 6, y: rects.menu.y + 11, width: 32, height: 22 } :
      { x: 41, y: 679, width: 32, height: 22 });
    this._sprite(s?.settings.effects || s?.settings.music ? 'Buttons/SoundOn' : 'Buttons/SoundOff',
      portrait ? { x: rects.sound.x + 8, y: rects.sound.y + 10.5, width: 28, height: 23 } :
        { x: 1294, y: 681, width: 28, height: 23 });
  }
  _drawFooter() {
    const bet = this.controls?.pending?.bet || this.controls?.selectedBet || '0.10';
    const values = [['balance', 'BALANCE', this.balance], ['bet', 'BET', bet]];
    if (this.controls?.winVisible && this.round && this.phase === 'IDLE') values.push(['win', 'WIN', this.pendingWinAmount]);
    for (const [key, title, value] of values) {
      const portrait = this.layout === PORTRAIT_LAYOUT;
      const r = (this.layout?.footers || FOOTERS)[key]; this._sprite('Start/Footer' + title[0] + title.slice(1).toLowerCase(), r);
      this._text(title, r.x + r.width / 2, r.y + 18, { size: portrait ? 13 : 15, color: '#ffff4d' });
      this._text(formatted(value) + (value ? ' ' + this.currency : ''), r.x + r.width / 2, r.y + 37, { size: portrait ? 12 : 14, bold: true });
    }
  }
  _drawWinCaption(time) {
    if (!this.controls?.winVisible || this.phase !== 'IDLE' || !this.candidates?.length) return;
    const index = Math.floor(Math.max(0, time - this.settleAt) / PRESENTATION_TIMING.captionMs) % this.candidates.length;
    const candidate = this.candidates[index];
    if (!candidate) return;
    const amount = candidate.quote.multiplied.exactMinor;
    if (amount === null) return;
    const portrait = this.layout === PORTRAIT_LAYOUT, y = portrait ? 402 : 642;
    this._text('Line ' + candidate.lineId, portrait ? 31 : 561, y, { size: 12, color: '#ffff4d' });
    for (let i = 0; i < candidate.matchCount; i++) {
      const frame = this.atlas.frames.get(SYMBOL_FRAMES[candidate.symbol]);
      const t = frame.spriteSourceSize;
      this._sprite(SYMBOL_FRAMES[candidate.symbol], { x: portrait ? 72 + i * 20 : 598 + i * 26, y: y - 8,
        width: 14 * t.w / t.h, height: 15 }, 1, true);
    }
    this._text(`${(candidate.quote.base.exactMinor / 100).toFixed(2)} x ${this.multiplier} = ${(amount / 100).toFixed(2)} ${this.currency}`,
      portrait ? 265 : 742, y, { size: 12, color: '#ffff4d' });
  }
  get snapshot() {
    return { phase: this.phase, framesDrawn: this.framesDrawn, roundId: this.round?.roundId || null,
      multiplier: this.multiplier, grid: gridCopy(this.grid), activeAnimation: this.frameId !== null,
      lastPresentedRoundId: this.lastPresentedRoundId, stopRequested: !!this.stopRequested,
      pendingWinAmount: this.pendingWinAmount, layout: this.layout === PORTRAIT_LAYOUT ? 'portrait' : 'landscape',
      settlementComputed: false, exactProviderTimingVerified: false };
  }
  dispose() { this.disposed = true; if (this.frameId !== null) this.cancelFrame(this.frameId); this.frameId = null; }
}
