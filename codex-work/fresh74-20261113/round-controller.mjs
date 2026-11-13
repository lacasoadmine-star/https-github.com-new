// Presentation orchestration only. The existing server adapter owns settlement.
// No wager request is retried automatically and no balance is computed here.
export class RoundRejected extends Error {}

export class RoundController {
  constructor({gameId, startRound, recoverRound, validateResult, present, nextToken, onState = () => {}}) {
    if (!gameId || ![startRound, recoverRound, validateResult, present, nextToken, onState].every(f => typeof f === 'function'))
      throw new TypeError('An existing-server adapter and presentation callbacks are required');
    Object.assign(this, {gameId, startRound, recoverRound, validateResult, present, nextToken, onState});
    this.state = 'idle'; this.pending = null; this.result = null; this.animation = null;
    this.stopRequested = false; this.closed = false; this.tokens = new Set();
  }

  transition(state, error = null) {
    this.state = state;
    this.onState(Object.freeze({state, roundId: this.pending?.roundId ?? null, result: this.result, error}));
  }

  async spin(betMinor) {
    if (this.closed || this.state !== 'idle') throw new Error('Another round must be resolved first');
    if (!Number.isSafeInteger(betMinor) || betMinor <= 0) throw new TypeError('Bet must be positive integer minor units');
    const roundId = this.nextToken();
    if (typeof roundId !== 'string' || !roundId || this.tokens.has(roundId)) throw new Error('A fresh unique round token is required');
    this.tokens.add(roundId);
    this.pending = Object.freeze({gameId: this.gameId, roundId, betMinor});
    this.result = null; this.stopRequested = false;
    this.transition('requesting');
    let response;
    try {response = await this.startRound(this.pending);}
    catch (error) {
      if (this.closed) return;
      // Only an adapter-confirmed non-acceptance can safely release the round.
      if (error instanceof RoundRejected) {this.pending = null; this.transition('idle', error);}
      else this.transition('uncertain', error);
      return;
    }
    return this.accept(response);
  }

  async recover() {
    if (this.closed || this.state !== 'uncertain') throw new Error('No uncertain round to recover');
    this.transition('recovering');
    let response;
    try {response = await this.recoverRound(this.pending);}
    catch (error) {if (!this.closed) this.transition('uncertain', error); return;}
    // A missing round alone is not proof that a delayed request cannot settle.
    return this.accept(response);
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
      this.pending = null; this.animation = null; this.transition('idle');
      return this.result;
    } catch (error) {
      this.animation?.cancel?.(); this.animation = null;
      if (!this.closed) this.transition('presentation-error', error);
    }
  }

  replayPresentation() {
    if (this.closed || this.state !== 'presentation-error' || !this.result) throw new Error('No presentation to replay');
    return this.showResult();
  }

  stop() {
    if (this.closed || !['requesting', 'recovering', 'uncertain', 'presenting'].includes(this.state) || this.stopRequested) return false;
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
