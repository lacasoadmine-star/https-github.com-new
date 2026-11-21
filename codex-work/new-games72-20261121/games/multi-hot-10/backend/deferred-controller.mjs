import { MultiHot10DeferredClient } from './deferred-client.mjs';
import { BACKEND_CONFIGURATION, GAME_ID, copy, fail, freeze } from './contract.mjs';

export function createMultiHot10DeferredController(options) { return new MultiHot10DeferredController(options); }

/** Renderer bridge for the new deferred receipt; all visible money is server-supplied. */
export class MultiHot10DeferredController {
  constructor({ controls, uuid = () => globalThis.crypto.randomUUID(), onState = () => {},
    allowNewRounds = BACKEND_CONFIGURATION.enabled, ...clientOptions } = {}) {
    if (controls?.snapshot?.gameId !== GAME_ID || controls.snapshot.currency !== 'ETB' ||
      !['requestSpin', 'requestTakeWin', 'applyRoundView', 'applyTakeAcknowledgement', 'markRequestUncertain',
        'restorePendingSpin', 'restoreAuthoritativeRound', 'restorePendingTake', 'cancelUnsentSpin',
        'cancelUnsentTake', 'applyCollectionObservation', 'applyPendingWinObservation'].every(name => typeof controls[name] === 'function') ||
      typeof uuid !== 'function' || typeof onState !== 'function') fail('M10_DEFERRED_CONTROLLER_DEPENDENCIES_REQUIRED');
    Object.assign(this, { controls, uuid, onState }); this._busy = false; this._disposed = false; this._generation = 0;
    this._client = new MultiHot10DeferredClient({ ...clientOptions, allowNewRounds,
      onState: () => this._notify() });
  }
  get snapshot() {
    const server = this._client.snapshot;
    return freeze({ ...server, controls: this.controls.snapshot,
      cashEnabled: !this._busy && server.canSpin && this.controls.snapshot.canRequestSpin,
      canTake: !this._busy && server.canTake && this.controls.snapshot.canRequestTake,
      canGamble: !this._busy && server.canGamble && this.controls.snapshot.canRequestTake,
      busy: this._busy || server.busy, collectionTransportInstalled: true });
  }
  _notify() { if (!this._disposed) { try { this.onState(this.snapshot); } catch { /* Rendering never owns settlement. */ } } }
  _begin() { if (this._disposed) fail('M10_CONTROLLER_DISPOSED'); if (this._busy) fail('ROUND_BUSY', 409); this._busy = true; return this._generation; }
  _assert(generation) { if (this._disposed || generation !== this._generation) fail('STALE_OPERATION'); }
  _end(generation) { if (!this._disposed && generation === this._generation) { this._busy = false; this._notify(); } }
  _restoreRound(view, collected) {
    const current = this.controls.snapshot;
    if (!current.round) {
      if (!this.controls.restoreAuthoritativeRound(view, { collected }).accepted) fail('M10_CONTROL_STATE_RESTORE_REJECTED');
    } else if (current.round.roundId === view.roundId && !current.pending) {
      if (current.round.winAmount !== view.winAmount && !this.controls.applyPendingWinObservation({ gameId: GAME_ID,
        roundId: view.roundId, winAmount: view.winAmount }).accepted) fail('M10_CONTROL_PENDING_WIN_RESTORE_REJECTED');
      if (collected && !this.controls.applyCollectionObservation({ gameId: GAME_ID, roundId: view.roundId,
        collected: true }).accepted) fail('M10_CONTROL_COLLECTION_RESTORE_REJECTED');
    }
  }
  _sync() {
    const server = this._client.snapshot, pending = server.pending;
    if (pending?.kind === 'SPIN') {
      const current = this.controls.snapshot.pending;
      if (current) {
        if (current.kind !== 'SPIN' || current.requestKey !== pending.roundToken || current.bet !== pending.bet ||
          current.collectRoundId !== pending.collectRoundId) fail('M10_CONTROL_PENDING_IDENTITY_CONFLICT');
        this.controls.markRequestUncertain(current.requestKey);
      } else if (!this.controls.restorePendingSpin({ gameId: GAME_ID, requestKey: pending.roundToken,
        bet: pending.bet, collectRoundId: pending.collectRoundId }).accepted) fail('M10_CONTROL_PENDING_RESTORE_REJECTED');
      return;
    }
    if (pending?.kind === 'TAKE_WIN') {
      if (server.roundView?.roundId === pending.roundId) this._restoreRound(server.roundView, server.roundCollected);
      const current = this.controls.snapshot.pending;
      if (current) {
        if (current.kind !== 'TAKE_WIN' || current.requestKey !== pending.roundToken || current.roundId !== pending.roundId) fail('M10_CONTROL_PENDING_IDENTITY_CONFLICT');
        this.controls.markRequestUncertain(current.requestKey);
      } else if (this.controls.snapshot.round?.roundId === pending.roundId &&
        !this.controls.restorePendingTake({ gameId: GAME_ID, requestKey: pending.roundToken, roundId: pending.roundId }).accepted) {
        fail('M10_CONTROL_PENDING_RESTORE_REJECTED');
      }
      return;
    }
    if (pending?.kind === 'GAMBLE') {
      if (server.roundView?.roundId === pending.roundId) this._restoreRound(server.roundView, server.roundCollected);
      return; // The client owns this action; unknown errors do not invent a card outcome.
    }
    if (server.roundView) this._restoreRound(server.roundView, server.roundCollected);
  }
  _present(receipt) {
    const presentation = this._client.snapshot.presentation;
    if (!presentation?.view || presentation.view.roundId !== receipt.roundId) fail('M10_VALIDATED_PRESENTATION_MISSING');
    if (receipt.kind === 'SPIN') {
      if (!this.controls.snapshot.pending && !this.controls.restorePendingSpin({ gameId: GAME_ID,
        requestKey: receipt.requestKey, bet: receipt.bet, collectRoundId: receipt.previousCollection?.roundId ?? null }).accepted) {
        fail('M10_CONTROL_PENDING_RESTORE_REJECTED');
      }
      if (!this.controls.applyRoundView(presentation.view).accepted) fail('M10_CONTROL_RECEIPT_REJECTED');
    } else if (receipt.kind === 'GAMBLE') {
      this._restoreRound(presentation.view, false);
      if (!this.controls.applyPendingWinObservation({ gameId: GAME_ID, roundId: receipt.roundId,
        winAmount: presentation.view.winAmount }).accepted) fail('M10_CONTROL_GAMBLE_RECEIPT_REJECTED');
    } else {
      this._restoreRound(presentation.view, false);
      if (!this.controls.snapshot.pending && !this.controls.restorePendingTake({ gameId: GAME_ID,
        requestKey: receipt.requestKey, roundId: receipt.roundId }).accepted) fail('M10_CONTROL_PENDING_RESTORE_REJECTED');
      if (!this.controls.applyTakeAcknowledgement(presentation.acknowledgement).accepted) fail('M10_CONTROL_TAKE_RECEIPT_REJECTED');
    }
  }
  async connect() {
    const generation = this._begin();
    try { const state = await this._client.connect(); this._assert(generation); this._sync(); return state; }
    finally { this._end(generation); }
  }
  async spin() {
    if (!this._client.canSpin || !this.controls.snapshot.canRequestSpin) fail('M10_NEW_ROUNDS_NOT_ENABLED');
    const generation = this._begin(), key = this.uuid(), command = this.controls.requestSpin(key);
    if (!command.accepted) { this._end(generation); fail('M10_CONTROL_SPIN_REJECTED'); }
    try {
      const intent = command.intents[0], receipt = await this._client.spin({ requestKey: key, bet: intent.bet, collectRoundId: intent.collectRoundId });
      this._assert(generation); this._present(receipt); return receipt;
    } catch (error) {
      if (generation === this._generation && !this._disposed) {
        if (!this._client.snapshot.pending) this.controls.cancelUnsentSpin(key); else this.controls.markRequestUncertain(key);
      }
      throw error;
    } finally { this._end(generation); }
  }
  async takeWin() {
    if (!this._client.canTake || !this.controls.snapshot.canRequestTake) fail('M10_NO_PENDING_WIN', 409);
    const generation = this._begin(), key = this.uuid(), command = this.controls.requestTakeWin(key);
    if (!command.accepted) { this._end(generation); fail('M10_CONTROL_TAKE_REJECTED'); }
    try {
      const receipt = await this._client.takeWin({ requestKey: key, roundId: command.intents[0].roundId });
      this._assert(generation); this._present(receipt); return receipt;
    } catch (error) {
      if (generation === this._generation && !this._disposed) {
        if (!this._client.snapshot.pending) this.controls.cancelUnsentTake(key); else this.controls.markRequestUncertain(key);
      }
      throw error;
    } finally { this._end(generation); }
  }
  async recover() {
    const generation = this._begin();
    try { const receipt = await this._client.recover(); this._assert(generation); this._present(receipt); return receipt; }
    finally { this._end(generation); }
  }
  async gamble(choice) {
    if (!this._client.canGamble || !this.controls.snapshot.canRequestTake) fail('M10_GAMBLE_NOT_ENABLED');
    const generation = this._begin(), key = this.uuid(), roundId = this.controls.snapshot.round.roundId;
    try {
      const receipt = await this._client.gamble({ requestKey: key, roundId, choice });
      this._assert(generation); this._present(receipt); return receipt;
    } finally { this._end(generation); }
  }
  async refresh() {
    const generation = this._begin();
    try { const state = await this._client.refresh(); this._assert(generation); this._sync(); return state; }
    finally { this._end(generation); }
  }
  disconnect() { if (!this._disposed) { this._generation++; this._busy = false; this._client.disconnect(); this._notify(); } }
  dispose() { if (!this._disposed) { this._generation++; this._disposed = true; this._busy = false; this._client.dispose(); this.controls.dispose(); } }
}
