import {MultiHot20Controls as RetainedControls, validatePresentation} from '../../new-games90-20261123/m20/controls.mjs';

/** Local display recovery never recreates a financial request or changes a win. */
export class MultiHot20Controls extends RetainedControls {
  #accepted = null;
  acceptedRoundForPresentation() { return this.state.round; }
  markPresentationUncertain(view) {
    const accepted = validatePresentation(view), state = this.state;
    if (state.pending || !['ANIMATING','RECOVERY_REQUIRED'].includes(state.phase) ||
        JSON.stringify(state.round) !== JSON.stringify(accepted)) throw Error('M20_LOCAL_RECOVERY_RECEIPT_MISMATCH');
    if (this.#accepted && JSON.stringify(this.#accepted) !== JSON.stringify(accepted)) throw Error('M20_LOCAL_RECOVERY_RECEIPT_CHANGED');
    this.#accepted = accepted;
    if (state.auto) { state.auto.active = false; state.auto.reason = 'PRESENTATION_FAILURE'; }
    state.phase = 'RECOVERY_REQUIRED'; this.change(); return accepted;
  }
  acceptedPresentationRecovery() { return this.#accepted; }
  finishPresentationRecovery(view) {
    if (!this.#accepted || this.state.pending || this.state.phase !== 'RECOVERY_REQUIRED' ||
        JSON.stringify(view) !== JSON.stringify(this.#accepted) ||
        JSON.stringify(this.state.round) !== JSON.stringify(this.#accepted)) throw Error('M20_LOCAL_RECOVERY_RECEIPT_MISMATCH');
    this.state.phase = 'ANIMATING'; this.#accepted = null;
    return this.finishPresentation(view.roundId);
  }
}
