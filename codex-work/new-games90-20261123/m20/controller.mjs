import { GAME_ID } from './presentation-quote.mjs';

/** Existing-host transport composition. It never creates a grid, multiplier, payout or balance. */
export class MultiHot20Controller {
  constructor({ controls, renderer, transport, now = () => performance.now(), schedule = callback => queueMicrotask(callback),
    keyFactory = () => crypto.randomUUID(), onChange = () => {}, onError = () => {} } = {}) {
    if (!controls || !renderer || typeof transport?.submit !== 'function' || typeof transport?.recover !== 'function') throw new TypeError('M20_HOST_CONTRACT');
    this.controls = controls; this.renderer = renderer; this.transport = transport; this.now = now;
    this.schedule = schedule; this.keyFactory = keyFactory; this.onChange = onChange; this.onError = onError;
    this.inflight = null; this.disposed = false; this.hidden = false; this.generation = 0; this.nextScheduled = false; this.scheduledJob = null;
  }
  snapshot() { return Object.freeze({ ...this.controls.snapshot(), inFlight: !!this.inflight, hidden: this.hidden, disposed: this.disposed }); }
  change() { this.onChange(this.snapshot()); }
  invalidateScheduled() { this.generation++; this.nextScheduled = false; this.scheduledJob = null; }
  stopAuto() { this.invalidateScheduled(); this.controls.stopAuto(); this.change(); }
  async spin({ automatic = false } = {}) {
    if (this.disposed || this.hidden) return false;
    const s = this.controls.snapshot();
    if (!automatic && s.auto?.active) { this.stopAuto(); return false; }
    if (!automatic && ['WAITING_RECEIPT','ANIMATING','RECOVERY_REQUIRED'].includes(s.phase) && this.renderer.snapshot().phase !== 'IDLE') {
      const stopped = this.controls.requestStop(); if (stopped) this.renderer.requestStop(this.now()); this.change(); return stopped;
    }
    if (this.inflight || s.pending || !this.controls.idle() || s.modal || (automatic && !s.auto?.active)) return false;
    const intent = this.controls.requestSpin(this.keyFactory(), { auto: automatic });
    this.renderer.begin(intent, this.now()); this.change(); return this.send(intent);
  }
  async send(intent, { recover = false } = {}) {
    if (this.inflight || this.disposed) return false;
    let job;
    // Capture identity before invoking transport, including synchronously throwing host callbacks.
    job = Promise.resolve().then(() => recover ? this.transport.recover(intent) : this.transport.submit(intent));
    this.inflight = job;
    try {
      const reply = await job;
      if (this.disposed) return false;
      if (intent.action === 'SPIN') {
        const accepted = this.controls.acceptReceipt(reply);
        if (accepted) this.renderer.accept(reply, this.now());
      } else if (intent.action === 'TAKE') {
        this.controls.acceptTake(reply); this.renderer.collect(intent.roundId);
      }
      return true;
    } catch (error) {
      if (!this.disposed) {
        if (this.controls.snapshot().pending?.requestKey === intent.requestKey) this.controls.uncertain(intent.requestKey);
        else this.controls.disconnect();
        this.invalidateScheduled(); this.onError(error);
      }
      return false;
    } finally { if (this.inflight === job) this.inflight = null; if (!this.disposed) this.change(); }
  }
  async recover() {
    const s = this.controls.snapshot();
    if (this.disposed || this.hidden || this.inflight || s.phase !== 'RECOVERY_REQUIRED' || !s.pending) return false;
    const { auto, ...intent } = s.pending;
    return this.send(Object.freeze(intent), { recover: true });
  }
  async take() {
    const s = this.controls.snapshot();
    if (this.disposed || this.hidden || this.inflight || s.phase !== 'WIN_PENDING' || s.modal) return false;
    // A manual TAKE cannot leave an already queued AUTO request waiting behind it.
    if (s.auto?.active) this.stopAuto();
    const intent = this.controls.requestTake(this.keyFactory()); this.change(); return this.send(intent);
  }
  configureAuto(options) { this.controls.configureAuto(options); this.change(); }
  startAuto() {
    if (this.disposed || this.hidden || this.inflight || this.controls.snapshot().auto?.active) return false;
    this.controls.startAuto(); this.invalidateScheduled(); this.change(); this.queueNext(); return true;
  }
  queueNext() {
    if (this.nextScheduled || this.disposed || this.hidden || !this.controls.snapshot().auto?.active) return;
    this.nextScheduled = true; const generation = this.generation, scheduledJob = {};
    this.scheduledJob = scheduledJob;
    this.schedule(async () => {
      if (this.scheduledJob !== scheduledJob) return;
      this.nextScheduled = false; this.scheduledJob = null;
      if (this.disposed || this.hidden || generation !== this.generation || !this.controls.snapshot().auto?.active) return;
      await this.spin({ automatic: true });
    });
  }
  frame(now = this.now()) {
    if (this.disposed) return;
    this.renderer.render(now);
    const s = this.controls.snapshot(), view = this.renderer.snapshot();
    if (s.phase === 'ANIMATING' && view.phase === 'IDLE' && view.round?.roundId === s.round.roundId) {
      this.controls.finishPresentation(s.round.roundId); this.change(); this.queueNext();
    }
  }
  setHidden(hidden) {
    this.hidden = !!hidden;
    if (hidden) { this.invalidateScheduled(); this.controls.disconnect(); }
    this.change();
  }
  dispose() { if (!this.disposed) { this.setHidden(true); this.disposed = true; this.generation++; } }
}
