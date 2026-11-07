// Pure, memory-only autoplay coordination. This module has no network, timer,
// storage or wallet access. A new instance always starts stopped.
//
// Host contract:
//   const auto = new AutoplayController();
//   auto.begin({gameId, modelVersion, sessionId, stakeMinor, count, startingBalanceMinor,
//     previousRoundId, winLimitMinor, lossLimitMinor, gainLimitMinor,
//     stopOnBonus, stopOnFreeSpins, stopOnBigWin}); // explicit user action only
//   const host = {...session.state, canStart:session.canStart(),
//     animationRunning:!!animation};
//   auto.observe(host); // every confirmed session/connection change
//   if (auto.canLaunch(host) && auto.markSubmitted(host.round?.round_id)) {
//     // Host may now submit exactly one ordinary start with snapshot().stakeMinor.
//   }
//   auto.stop('user'); // prevents the next wager; never cancels an accepted one
//
// observe/canLaunch accept the ExpansionSession state, including game.id,
// sessionId, connected/authenticated/accepting, busy/pending/confirming,
// recoveryBlocked, otherActiveGame, and balance as an exact decimal string.
// An exact balanceMinor string/BigInt is also accepted. Confirmed round receipts
// contain round_id, game_id, model_version, stakeMinor, status, version and
// (when settled) payoutMinor. Never pass animation frames as receipts. Optional trigger stops
// consume only explicit confirmed booleans: bonusTriggered, freeSpinsTriggered,
// bigWin (on round or round.feature). No payout threshold is invented for bigWin.

const MODERN_IDS = Object.freeze([
  'multihot40_native', 'multihot100_native', 'multihotwildways_native',
  'multihot5wild_native', 'multihot5superwilds_native', 'multihotdeluxe_native',
  'safarisimba_native', 'habeshafortune5_native'
]);
const LEGACY_IDS = Object.freeze([
  'burningice_native', 'burningice10_native', 'burningice40_native'
]);
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const MODERN = freeze({
  kind:'modern', counts:[25, 50, 100, 500, 1000], defaultCount:100,
  winLimitMeaning:'round-payout', netBasis:'confirmed-balance',
  stopFlagsAvailable:false, referenceStopFlags:[], gambleImplemented:false,
  reference:'../references/first11-optional-controls.json',
  source:'https://static.ssg-public.com/cache/b1/SlotsDemo/Content/Scripts/New/Components/autoPlay.js',
  scope:'Ordinary DMO demo profile; jurisdiction/VR variants are not silently substituted.'
});
const LEGACY = freeze({
  kind:'legacy', counts:[10, 25, 50, 75, 'continuous'], defaultCount:'continuous',
  sourceContinuousValue:'infinite', winLimitMeaning:'session-net-gain',
  netBasis:'settled-rounds', stopFlagsAvailable:false,
  referenceStopFlags:['bonus', 'freeSpins', 'bigWin'], gambleImplemented:false,
  reference:'../references/first11-optional-controls.json',
  source:'https://static.ssg-public.com/cache/b1/SlotsDemo/Content/Scripts/Slots/canvas.js',
  scope:'Legacy Burning controller; popup counts observed in Burning Ice40. Feature-stop UI stays unavailable until real receipt flags exist.'
});

export function autoplayProfile(gameId) {
  const profile = MODERN_IDS.includes(gameId) ? MODERN : LEGACY_IDS.includes(gameId) ? LEGACY : null;
  return profile ? freeze({...profile, gameId}) : null;
}

const unsigned = /^(0|[1-9]\d{0,30})$/;
const decimal = /^(0|[1-9]\d{0,28})\.\d{2}$/;
const identifier = value => typeof value === 'string' && value.length > 0 && value.length <= 256;
const minor = value => typeof value === 'bigint' && value >= 0n ? value :
  typeof value === 'string' && unsigned.test(value) ? BigInt(value) : null;
const threshold = value => value === undefined || value === null || value === '' ? 0n : minor(value);
const balanceOf = state => state?.balanceMinor !== undefined ? minor(state.balanceMinor) :
  typeof state?.balance === 'string' && decimal.test(state.balance) ? BigInt(state.balance.replace('.', '')) : null;
const roundId = round => identifier(round?.round_id) ? round.round_id : null;
const gameIdOf = state => state?.gameId ?? state?.game?.id;
const flag = (round, name) => round?.[name] === true || round?.feature?.[name] === true;

export class AutoplayController {
  #profile = null;
  #gameId = null;
  #modelVersion = null;
  #sessionId = null;
  #stake = 0n;
  #count = 0;
  #accepted = 0;
  #completed = 0;
  #active = false;
  #reason = 'idle';
  #inFlight = false;
  #awaitingReceipt = false;
  #sawBusy = false;
  #current = null;
  #known = new Set();
  #lastRoundId = null;
  #host = null;
  #startBalance = 0n;
  #balance = 0n;
  #totalStake = 0n;
  #settledStake = 0n;
  #totalPayout = 0n;
  #lastWin = 0n;
  #limits = {win:0n, loss:0n, gain:0n};
  #stops = {bonus:false, freeSpins:false, bigWin:false};

  begin(options = {}) {
    if (this.#inFlight) throw Error('AUTOPLAY_ROUND_UNRESOLVED');
    if (this.#active) throw Error('AUTOPLAY_ALREADY_ACTIVE');
    const profile = autoplayProfile(options.gameId);
    if (!profile) throw Error('AUTOPLAY_GAME_UNSUPPORTED');
    if (!identifier(options.sessionId)) throw Error('AUTOPLAY_SESSION_REQUIRED');
    if (!identifier(options.modelVersion)) throw Error('AUTOPLAY_MODEL_VERSION_REQUIRED');
    const stake = minor(options.stakeMinor), balance = minor(options.startingBalanceMinor);
    const limits = {win:threshold(options.winLimitMinor), loss:threshold(options.lossLimitMinor), gain:threshold(options.gainLimitMinor)};
    if (stake === null || stake <= 0n || balance === null || Object.values(limits).some(value => value === null)) throw Error('INVALID_AUTOPLAY_MONEY');
    if (balance < stake) throw Error('AUTOPLAY_INSUFFICIENT_BALANCE');
    let count = options.count ?? profile.defaultCount;
    if (count === 'infinite') count = 'continuous';
    if (typeof count === 'string' && /^\d{1,4}$/.test(count)) count = Number(count);
    if (!profile.counts.includes(count)) throw Error('INVALID_AUTOPLAY_COUNT');
    for (const key of ['stopOnBonus', 'stopOnFreeSpins', 'stopOnBigWin']) {
      if (options[key] !== undefined && typeof options[key] !== 'boolean') throw Error('INVALID_AUTOPLAY_STOP');
      if (profile.kind === 'modern' && options[key] === true) throw Error('AUTOPLAY_STOP_NOT_IN_REFERENCE');
    }
    if (options.previousRoundId !== undefined && options.previousRoundId !== null && !identifier(options.previousRoundId)) throw Error('INVALID_PREVIOUS_ROUND');
    this.#profile = profile;
    this.#gameId = options.gameId;
    this.#modelVersion = options.modelVersion;
    this.#sessionId = options.sessionId;
    this.#stake = stake;
    this.#count = count;
    this.#startBalance = balance;
    this.#balance = balance;
    this.#accepted = this.#completed = 0;
    this.#totalStake = this.#settledStake = this.#totalPayout = this.#lastWin = 0n;
    this.#limits = limits;
    this.#stops = {bonus:options.stopOnBonus === true, freeSpins:options.stopOnFreeSpins === true, bigWin:options.stopOnBigWin === true};
    this.#active = true;
    this.#reason = null;
    this.#inFlight = this.#awaitingReceipt = this.#sawBusy = false;
    this.#current = null;
    if (options.previousRoundId) {
      this.#known.add(options.previousRoundId);
      this.#lastRoundId = options.previousRoundId;
    }
    return this.snapshot();
  }

  stop(reason = 'user') {
    if (this.#active || this.#reason === null || this.#reason === 'idle') this.#reason = String(reason || 'user');
    this.#active = false;
    return this.snapshot();
  }

  #net() {
    return this.#profile?.netBasis === 'settled-rounds' ? this.#totalPayout - this.#settledStake : this.#balance - this.#startBalance;
  }

  #receiptStops(round) {
    if (this.#stops.bonus && flag(round, 'bonusTriggered')) this.stop('bonus');
    if (this.#stops.freeSpins && flag(round, 'freeSpinsTriggered')) this.stop('free_spins');
    if (this.#stops.bigWin && flag(round, 'bigWin')) this.stop('big_win');
  }

  observe(state = {}) {
    this.#host = state;
    const id = roundId(state.round);
    if (!this.#active && !this.#inFlight) {
      if (id) { this.#known.add(id); this.#lastRoundId = id; }
      return this.snapshot();
    }
    if (state.connected !== true || state.authenticated !== true) this.stop('disconnected');
    else if (state.sessionId !== this.#sessionId) {
      this.stop('session_changed');
      // Drop only this account's autoplay bookkeeping. The host retains its own
      // original-account request intent and is solely responsible for recovery.
      this.#inFlight = this.#awaitingReceipt = false;
      this.#current = null;
      return this.snapshot();
    }
    if (gameIdOf(state) !== this.#gameId) this.stop('game_changed');
    if (state.accepting !== true) this.stop('not_accepting');
    if (state.game?.launchable === false) this.stop('game_unavailable');
    if (state.game?.version !== this.#modelVersion) this.stop('model_changed');
    if (state.otherActiveGame) this.stop('other_active_game');
    if (state.recoveryBlocked) this.stop('recovery_blocked');
    if (state.confirming) this.stop('confirmation_required');
    if (this.#inFlight && state.busy === true) this.#sawBusy = true;
    if (state.pending && state.busy !== true) {
      // ExpansionSession.savePending emits once before run sets busy=true.
      // This phase is only allowed for our own already-latched submission.
      // canLaunch still rejects EVERY pending state, including this one.
      const ownPersistence = this.#awaitingReceipt && !this.#sawBusy && state.error !== true && !state.confirming && !state.recoveryBlocked;
      if (!ownPersistence) this.stop('pending_retry');
    }
    if (state.error === true && !state.pending && state.busy !== true) this.stop('host_error');

    const sameIdentity = state.connected === true && state.authenticated === true &&
      state.sessionId === this.#sessionId && gameIdOf(state) === this.#gameId;
    if (!sameIdentity) return this.snapshot();
    const balance = balanceOf(state);
    if (balance !== null) this.#balance = balance;
    let acceptedHere = false;
    if (id && !this.#known.has(id)) {
      const round = state.round, stake = minor(round.stakeMinor);
      // A separate zero-stake animation/free receipt is never a paid round.
      if (stake !== 0n) {
        if (!this.#awaitingReceipt) {
          this.#known.add(id);
          this.stop('unexpected_round');
        } else if ((round.game_id ?? round.gameId) !== this.#gameId || round.model_version !== this.#modelVersion || stake === null || stake !== this.#stake ||
          !['active', 'settled'].includes(round.status) || !Number.isSafeInteger(round.version) || round.version < 0 ||
          round.status === 'settled' && minor(round.payoutMinor) === null) {
          this.stop('invalid_receipt');
        } else {
          this.#known.add(id);
          this.#lastRoundId = id;
          this.#current = {id, version:round.version, stake};
          this.#awaitingReceipt = false;
          this.#accepted++;
          this.#totalStake += stake;
          acceptedHere = true;
        }
      }
    }
    if (this.#current && id === this.#current.id && Number.isSafeInteger(state.round.version) && state.round.version >= this.#current.version) {
      const round = state.round;
      if ((round.game_id ?? round.gameId) !== this.#gameId || round.model_version !== this.#modelVersion || minor(round.stakeMinor) !== this.#current.stake) this.stop('invalid_receipt');
      else {
        this.#current.version = round.version;
        this.#receiptStops(round);
        if (round.status === 'settled') {
          const payout = minor(round.payoutMinor);
          if (payout === null || balance === null) this.stop('invalid_receipt');
          else {
            this.#lastWin = payout;
            this.#totalPayout += payout;
            this.#settledStake += this.#current.stake;
            this.#completed++;
            this.#current = null;
            this.#inFlight = false;
            const net = this.#net();
            const winValue = this.#profile.kind === 'legacy' ? net : payout;
            if (this.#limits.win > 0n && winValue >= this.#limits.win) this.stop('win_limit');
            if (this.#limits.loss > 0n && -net >= this.#limits.loss) this.stop('loss_limit');
            if (this.#limits.gain > 0n && net >= this.#limits.gain) this.stop('gain_limit');
            if (this.#count !== 'continuous' && this.#accepted >= this.#count) this.stop('count_complete');
          }
        }
      }
    }
    // A completed host request with no new accepted paid receipt must never
    // silently turn into another wager. An uncertain saved intent stays latched.
    if (this.#awaitingReceipt && !acceptedHere && state.busy !== true && !state.pending &&
      (this.#sawBusy || state.error === true)) {
      this.stop('submission_unconfirmed');
      this.#awaitingReceipt = this.#inFlight = false;
    }
    return this.snapshot();
  }

  canLaunch(state = this.#host ?? {}) {
    this.observe(state);
    if (!this.#active || this.#inFlight || this.#awaitingReceipt || this.#current) return false;
    if (state.canStart !== true || state.busy || state.pending || state.confirming || state.recoveryBlocked ||
      state.inFlight || state.requestInFlight || state.animationRunning || state.round?.status === 'active') return false;
    const balance = balanceOf(state);
    if (balance === null) { this.stop('balance_unconfirmed'); return false; }
    if (balance < this.#stake) { this.stop('insufficient_balance'); return false; }
    // A confirmed balance refresh can cross a modern net threshold while the
    // result animation is still playing. Recheck at the final launch boundary,
    // rather than waiting for another paid receipt to notice the change.
    const net = this.#net();
    if (this.#limits.loss > 0n && -net >= this.#limits.loss) { this.stop('loss_limit'); return false; }
    if (this.#limits.gain > 0n && net >= this.#limits.gain) { this.stop('gain_limit'); return false; }
    if (this.#profile.kind === 'legacy' && this.#limits.win > 0n && net >= this.#limits.win) { this.stop('win_limit'); return false; }
    if (this.#count !== 'continuous' && this.#accepted >= this.#count) { this.stop('count_complete'); return false; }
    return true;
  }

  markSubmitted(previousRoundId = null) {
    if (!this.canLaunch(this.#host ?? {})) return false;
    if (previousRoundId !== null && previousRoundId !== undefined && !identifier(previousRoundId)) throw Error('INVALID_PREVIOUS_ROUND');
    if (previousRoundId) { this.#known.add(previousRoundId); this.#lastRoundId = previousRoundId; }
    const currentId = roundId(this.#host?.round);
    if (currentId) { this.#known.add(currentId); this.#lastRoundId = currentId; }
    this.#inFlight = this.#awaitingReceipt = true;
    this.#sawBusy = false;
    return true;
  }

  snapshot() {
    return freeze({
      active:this.#active, reason:this.#reason, gameId:this.#gameId, modelVersion:this.#modelVersion, sessionId:this.#sessionId,
      count:this.#count, remaining:this.#count === 'continuous' ? null : Math.max(0, this.#count - this.#accepted),
      completed:this.#completed, accepted:this.#accepted, stakeMinor:String(this.#stake),
      inFlight:this.#inFlight, awaitingReceipt:this.#awaitingReceipt, activeRoundId:this.#current?.id ?? null,
      lastRoundId:this.#lastRoundId, startingBalanceMinor:String(this.#startBalance), balanceMinor:String(this.#balance),
      totalStakeMinor:String(this.#totalStake), totalPayoutMinor:String(this.#totalPayout),
      lastWinMinor:String(this.#lastWin), netMinor:String(this.#net()),
      limits:{winMinor:String(this.#limits.win), lossMinor:String(this.#limits.loss), gainMinor:String(this.#limits.gain)},
      stopOnBonus:this.#stops.bonus, stopOnFreeSpins:this.#stops.freeSpins, stopOnBigWin:this.#stops.bigWin
    });
  }
}
