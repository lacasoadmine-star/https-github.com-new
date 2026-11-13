// Presentation orchestration only. The existing server adapter owns settlement.
// No wager request is retried automatically and no balance is computed here.
export class RoundRejected extends Error {}

export class RoundController {
  constructor({gameId, startRound, recoverRound, validateResult, present, nextToken, journal = null, requestTimeoutMs = 20000, onState = () => {}}) {
    if (!gameId || ![startRound, recoverRound, validateResult, present, nextToken, onState].every(f => typeof f === 'function'))
      throw new TypeError('An existing-server adapter and presentation callbacks are required');
    if (journal && !['load', 'claim', 'release'].every(key => typeof journal[key] === 'function'))
      throw new TypeError('Round journal must support load, claim and release');
    if (!Number.isFinite(requestTimeoutMs) || requestTimeoutMs <= 0) throw new TypeError('A positive network deadline is required');
    Object.assign(this, {gameId, startRound, recoverRound, validateResult, present, nextToken, journal, requestTimeoutMs, onState});
    this.state = journal ? 'uninitialized' : 'idle'; this.pending = null; this.result = null; this.animation = null;
    this.stopRequested = false; this.closed = false; this.tokens = new Set();
    this.releaseError = null; this.lastObserverError = null;
  }

  transition(state, error = null) {
    this.state = state;
    try {this.onState(Object.freeze({state, gameId: this.pending?.gameId ?? this.gameId,
      roundId: this.pending?.roundId ?? null, result: this.result, error}));}
    catch (observerError) {this.lastObserverError = observerError;}
  }

  async initialize() {
    if (this.closed || !['uninitialized', 'journal-error'].includes(this.state)) throw new Error('Journal cannot be initialized in this state');
    this.transition('loading');
    try {
      const pending = await this.journal.load();
      if (this.closed) return;
      if (pending) this.restorePending(pending);
      else {this.pending = null; this.transition('idle');}
    } catch (error) {if (!this.closed) this.transition('journal-error', error);}
  }

  restorePending(pending) {
    if (!pending || typeof pending.gameId !== 'string' || !pending.gameId ||
        typeof pending.roundId !== 'string' || !pending.roundId ||
        !Number.isSafeInteger(pending.betMinor) || pending.betMinor <= 0)
      throw new TypeError('Malformed pending round');
    this.pending = Object.freeze({gameId: pending.gameId, roundId: pending.roundId, betMinor: pending.betMinor});
    this.tokens.add(pending.roundId);
    this.transition(pending.gameId === this.gameId ? 'uncertain' : 'other-game');
  }

  async spin(betMinor) {
    if (this.closed || this.state !== 'idle') throw new Error('Another round must be resolved first');
    if (!Number.isSafeInteger(betMinor) || betMinor <= 0) throw new TypeError('Bet must be positive integer minor units');
    const roundId = this.nextToken();
    if (typeof roundId !== 'string' || !roundId || this.tokens.has(roundId)) throw new Error('A fresh unique round token is required');
    this.tokens.add(roundId);
    this.pending = Object.freeze({gameId: this.gameId, roundId, betMinor});
    this.result = null; this.stopRequested = false;
    if (this.journal) {
      this.transition('saving');
      try {await this.journal.claim(this.pending);}
      catch (error) {
        if (this.closed) return;
        if (error?.code === 'PENDING_ROUND') {
          try {this.restorePending(error.pending);} catch (invalid) {this.transition('journal-error', invalid);}
        } else this.transition('journal-error', error);
        return;
      }
      if (this.closed) {
        // We know no request was sent. Release only this unsent intent.
        try {await this.journal.release(roundId);} catch { /* Preserve it for recovery if storage failed. */ }
        return;
      }
    }
    this.transition('requesting');
    let response;
    try {response = await this.withDeadline(this.startRound(this.pending));}
    catch (error) {
      if (this.closed) return;
      // Only an adapter-confirmed non-acceptance can safely release the round.
      if (error instanceof RoundRejected) await this.finishRound(error);
      else this.transition('uncertain', error);
      return;
    }
    return this.accept(response);
  }

  async recover() {
    if (this.closed || this.state !== 'uncertain') throw new Error('No uncertain round to recover');
    this.transition('recovering');
    let response;
    try {response = await this.withDeadline(this.recoverRound(this.pending));}
    catch (error) {if (!this.closed) this.transition('uncertain', error); return;}
    // A missing round alone is not proof that a delayed request cannot settle.
    return this.accept(response);
  }

  async withDeadline(request) {
    let timer;
    try {
      return await Promise.race([request, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Round response timed out; recover the same round')), this.requestTimeoutMs);
      })]);
    } finally {clearTimeout(timer);}
  }

  async accept(response) {
    if (this.closed) return;
    try {
      if (!response || response.roundId !== this.pending.roundId || response.gameId !== this.gameId || response.betMinor !== this.pending.betMinor)
        throw new Error('Server result does not match the pending round');
      const validated = this.validateResult(response);
      if (!validated || validated.roundId !== this.pending.roundId || validated.gameId !== this.gameId || validated.betMinor !== this.pending.betMinor)
        throw new Error('Validated result lost its round identity');
      this.result = deepFreeze(structuredClone(validated));
    } catch (error) {this.transition('uncertain', error); return;}
    return this.showResult();
  }

  async showResult() {
    this.transition('presenting');
    try {
      this.animation = this.present(this.result);
      if (!this.animation || typeof this.animation.stop !== 'function' || typeof this.animation.cancel !== 'function' || !this.animation.finished?.then)
        throw new TypeError('A cancellable presentation is required');
      if (this.stopRequested) this.animation.stop();
      const outcome = await this.animation.finished;
      if (this.closed) return;
      if (outcome?.cancelled) throw new Error('Presentation interrupted; settled result remains available');
      this.animation = null;
    } catch (error) {
      this.animation?.cancel?.(); this.animation = null;
      if (!this.closed) this.transition('presentation-error', error);
      return;
    }
    if (await this.finishRound()) return this.result;
  }

  async finishRound(error = null) {
    if (this.journal) {
      this.releaseError = error;
      this.transition('releasing');
      try {await this.journal.release(this.pending.roundId);}
      catch (storageError) {if (!this.closed) this.transition('release-error', storageError); return false;}
    }
    if (this.closed) return false;
    this.pending = null; this.releaseError = null; this.transition('idle', error);
    return true;
  }

  retryRelease() {
    if (this.closed || this.state !== 'release-error') throw new Error('No journal release to retry');
    return this.finishRound(this.releaseError);
  }

  replayPresentation() {
    if (this.closed || this.state !== 'presentation-error' || !this.result) throw new Error('No presentation to replay');
    return this.showResult();
  }

  stop() {
    if (this.closed || !['saving', 'requesting', 'recovering', 'uncertain', 'presenting'].includes(this.state) || this.stopRequested) return false;
    this.stopRequested = true;
    this.animation?.stop();
    return true;
  }

  dispose() {
    if (this.closed) return;
    this.closed = true; this.animation?.cancel?.(); this.animation = null;
    // This does not cancel, refund, or forget a potentially accepted server round.
    this.transition('disposed');
  }
}

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze); Object.freeze(value);
  }
  return value;
}
