// Account transport only. Outcomes and balances are supplied by the existing service.
export const GAME_ID = "fresh_safarisimba";
export const MODEL_VERSION = "fresh-safari-simba-etb1-100-v1";
const STORAGE_KEY = "zplay.safari-simba.pending.v1";
const ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/;
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export class FreshAccountError extends Error {
  constructor(code, { status = 0, ambiguous = false } = {}) {
    super(code);
    this.code = code;
    this.status = status;
    this.ambiguous = ambiguous;
  }
}

export function minor(value) {
  if (
    typeof value !== "string" ||
    !/^(?:0|[1-9][0-9]{0,12})\.[0-9]{2}$/.test(value)
  )
    throw new FreshAccountError("INVALID_WALLET_AMOUNT");
  const amount = Number(value.replace(".", ""));
  if (!Number.isSafeInteger(amount))
    throw new FreshAccountError("INVALID_WALLET_AMOUNT");
  return amount;
}

export function money(value) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new FreshAccountError("INVALID_WALLET_AMOUNT");
  return Math.floor(value / 100) + "." + String(value % 100).padStart(2, "0");
}

export function validateReceipt(result) {
  if (
    !object(result) ||
    result.gameId !== GAME_ID ||
    result.mathVersion !== MODEL_VERSION ||
    result.currency !== "ETB" ||
    !ID.test(result.roundId) ||
    !object(result.walletReceipt) ||
    result.walletReceipt.currency !== "ETB" ||
    !Array.isArray(result.grid) ||
    result.grid.length !== 3 ||
    result.grid.some(
      (row) =>
        !Array.isArray(row) ||
        row.length !== 3 ||
        row.some(
          (symbol) =>
            !["j","q","k","a","zebra","elephant","tiger","lion","smartsoft"].includes(symbol),
        ),
    ) ||
    ![1, 2, 3, 4, 5].includes(result.wheelMultiplier) ||
    !Array.isArray(result.winLines)
  )
    throw new FreshAccountError("INVALID_ACCOUNT_ROUND");
  const receipt = result.walletReceipt;
  if (
    minor(receipt.balanceBefore) -
      minor(receipt.chargedStake) +
      minor(receipt.finalWin) !==
      minor(receipt.balanceAfter) ||
    minor(result.bet) !== minor(receipt.chargedStake) ||
    minor(result.finalWin) !== minor(receipt.finalWin)
  )
    throw new FreshAccountError("INVALID_SETTLEMENT_RECEIPT");
  for (const line of result.winLines) {
    if (
      !object(line) ||
      !Array.isArray(line.positions) ||
      line.positions.some(
        (p) =>
          !object(p) ||
          !Number.isInteger(p.row) ||
          p.row < 0 ||
          p.row > 2 ||
          !Number.isInteger(p.col) ||
          p.col < 0 ||
          p.col > 2,
      )
    )
      throw new FreshAccountError("INVALID_ACCOUNT_ROUND");
  }
  return result;
}

export function validateState(state) {
  if (
    !object(state) ||
    state.authenticated !== true ||
    state.currency !== "ETB" ||
    !HASH.test(state.sessionGuard) ||
    !object(state.game) ||
    state.game.id !== GAME_ID ||
    state.game.mathVersion !== MODEL_VERSION ||
    !HASH.test(state.game.mathSha256) ||
    typeof state.game.engineVersion !== "string" ||
    !state.game.engineVersion ||
    typeof state.game.enabled !== "boolean" ||
    typeof state.game.freshReleaseReady !== "boolean" ||
    !Array.isArray(state.game.betLevels)
  )
    throw new FreshAccountError("INVALID_ACCOUNT_STATE");
  minor(state.balance);
  const levels = state.game.betLevels.map(minor);
  if (
    levels.some((amount) => amount <= 0) ||
    new Set(levels).size !== levels.length ||
    (state.game.enabled && state.game.freshReleaseReady && !levels.length && state.game.wagerAvailability !== "house_capacity")
  )
    throw new FreshAccountError("INVALID_BET_LEVELS");
  if (
    state.blockedByActiveGame !== null &&
    state.blockedByActiveGame !== undefined &&
    typeof state.blockedByActiveGame !== "string"
  )
    throw new FreshAccountError("INVALID_ACCOUNT_STATE");
  if (state.round !== null) {
    if (!object(state.round))
      throw new FreshAccountError("INVALID_ACCOUNT_STATE");
    validateReceipt(state.round.result);
    if(state.round.result.mathSha256!==state.game.mathSha256||state.round.result.engineVersion!==state.game.engineVersion)throw new FreshAccountError("ROUND_MODEL_MISMATCH");
    const gamble = state.round.gamble;
    if (
      !object(gamble) ||
      !Number.isInteger(gamble.attempt) ||
      gamble.attempt < 0 ||
      !Number.isInteger(gamble.maxAttempts) ||
      gamble.maxAttempts < gamble.attempt ||
      typeof gamble.available !== "boolean"
    )
      throw new FreshAccountError("INVALID_GAMBLE_STATE");
    minor(gamble.stake);
  }
  return state;
}

function validPending(value) {
  if (
    !object(value) ||
    !HASH.test(value.guard) ||
    !["spin", "gamble"].includes(value.kind) ||
    !object(value.body) ||
    value.body.sessionGuard !== value.guard ||
    !ID.test(value.body.roundToken)
  )
    return false;
  if (value.kind === "spin")
    return (
      value.body.gameId === GAME_ID &&
      value.body.mathVersion === MODEL_VERSION &&
      HASH.test(value.body.mathSha256) &&
      typeof value.body.engineVersion === "string" &&
      /^(?:0|[1-9][0-9]{0,7})\.[0-9]{2}$/.test(value.body.bet)
    );
  return (
    ID.test(value.body.roundId) &&
    ["RED", "BLACK"].includes(value.body.choice) &&
    Number.isInteger(value.body.expectedAttempt) &&
    value.body.expectedAttempt > 0 &&
    /^(?:0|[1-9][0-9]{0,7})\.[0-9]{2}$/.test(value.body.expectedStake)
  );
}

export class FreshAccountClient {
  constructor({
    fetchImpl = (...args) => globalThis.fetch(...args),
    storage = globalThis.sessionStorage,
    newId = () => crypto.randomUUID(),
    timeoutMs = 15000,
  } = {}) {
    this.fetchImpl = fetchImpl;
    this.storage = storage;
    this.newId = newId;
    this.timeoutMs = timeoutMs;
    this.snapshot = null;
    this.pending = null;
    this.busy = false;
    this.needsRefresh = true;
    this.sessionChanged = false;
    try {
      const value = JSON.parse(storage?.getItem(STORAGE_KEY) ?? "null");
      if (validPending(value)) this.pending = value;
    } catch {}
  }
  persist() {
    try {
      this.pending
        ? this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.pending))
        : this.storage?.removeItem(STORAGE_KEY);
    } catch {}
  }
  async request(path, body) {
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl("/api/slots/" + path, {
        method: body ? "POST" : "GET",
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal: controller.signal,
        headers: {
          accept: "application/json",
          ...(body ? { "content-type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const value = await response.json();
      if (!response.ok) {
        const code =
          typeof value.detail === "string"
            ? value.detail
            : (value.error?.code ?? "ACCOUNT_UNAVAILABLE");
        throw new FreshAccountError(code, {
          status: response.status,
          ambiguous:
            !!body &&
            ((response.status >= 500 && !(response.status === 503 && code === "HOUSE_RESERVE_INSUFFICIENT")) ||
              response.status === 408 ||
              code === "REQUEST_IN_PROGRESS"),
        });
      }
      return value;
    } catch (error) {
      if (error instanceof FreshAccountError) throw error;
      throw new FreshAccountError(
        body ? "ACTION_UNCONFIRMED" : "CONNECTION_UNAVAILABLE",
        { ambiguous: !!body },
      );
    } finally {
      clearTimeout(timer);
    }
  }
  async refresh() {
    const state = validateState(await this.request("fresh-state?gameId="+GAME_ID));
    this.sessionChanged =
      !!this.pending && this.pending.guard !== state.sessionGuard;
    if (this.sessionChanged) {
      this.pending = null;
      this.persist();
    }
    this.snapshot = state;
    this.needsRefresh = false;
    return state;
  }
  ready() {
    const state = this.snapshot;
    if (this.busy || this.pending)
      throw new FreshAccountError("ACTION_IN_PROGRESS");
    if (this.needsRefresh || !state)
      throw new FreshAccountError("REFRESH_REQUIRED");
    if (state.game.wagerAvailability === "house_capacity")
      throw new FreshAccountError("HOUSE_RESERVE_INSUFFICIENT");
    if (!state.game.enabled || !state.game.freshReleaseReady)
      throw new FreshAccountError("FRESH_RELEASE_NOT_ENABLED");
    if (state.blockedByActiveGame)
      throw new FreshAccountError("OTHER_GAME_ACTIVE");
    return state;
  }
  start(amount) {
    const state = this.ready(),
      bet = money(amount);
    if (!state.game.betLevels.includes(bet))
      throw new FreshAccountError("INVALID_BET");
    if (amount > minor(state.balance))
      throw new FreshAccountError("INSUFFICIENT_FUNDS");
    const game = state.game;
    return this.submit({
      kind: "spin",
      guard: state.sessionGuard,
      body: {
        gameId: GAME_ID,
        bet,
        roundToken: this.newId(),
        sessionGuard: state.sessionGuard,
        mathVersion: game.mathVersion,
        engineVersion: game.engineVersion,
        mathSha256: game.mathSha256,
      },
    });
  }
  gamble(color) {
    const state = this.ready(),
      round = state.round;
    if (!round?.gamble.available || !["RED", "BLACK"].includes(color))
      throw new FreshAccountError("GAMBLE_NOT_AVAILABLE");
    return this.submit({
      kind: "gamble",
      guard: state.sessionGuard,
      body: {
        roundId: round.result.roundId,
        roundToken: this.newId(),
        sessionGuard: state.sessionGuard,
        choice: color,
        expectedAttempt: round.gamble.attempt + 1,
        expectedStake: round.gamble.stake,
      },
    });
  }
  async submit(pending, { replayOnly = false } = {}) {
    if (this.busy) throw new FreshAccountError("ACTION_IN_PROGRESS");
    if (!validPending(pending) || pending.guard !== this.snapshot?.sessionGuard)
      throw new FreshAccountError("PENDING_SESSION_MISMATCH");
    this.busy = true;
    this.pending = structuredClone(pending);
    this.persist();
    let result;
    try {
      result = await this.request(
        pending.kind,
        replayOnly ? { ...pending.body, replayOnly: true } : pending.body,
      );
      try {
        if (pending.kind === "spin") {
          validateReceipt(result);
          if (result.bet !== pending.body.bet || result.mathVersion !== pending.body.mathVersion ||
              result.mathSha256 !== pending.body.mathSha256 || result.engineVersion !== pending.body.engineVersion)
            throw new FreshAccountError("RECEIPT_REQUEST_MISMATCH");
        }
        else if (
          !object(result) ||
          result.roundId !== pending.body.roundId ||
          result.attempt !== pending.body.expectedAttempt ||
          result.choice !== pending.body.choice ||
          !["RED", "BLACK"].includes(result.revealed) ||
          typeof result.won !== "boolean"
        )
          throw new FreshAccountError("INVALID_GAMBLE_RESPONSE");
        if (pending.kind === "gamble") {
          const stake = minor(pending.body.expectedStake), payout = minor(result.payout);
          if (result.won !== (result.choice === result.revealed) || payout !== (result.won ? 2 * stake : 0))
            throw new FreshAccountError("INVALID_GAMBLE_PAYOUT");
          const receipt = result.walletReceipt;
          if (!object(receipt) || receipt.currency !== 'ETB' || minor(receipt.chargedStake) !== stake ||
              minor(receipt.finalWin) !== payout || minor(receipt.balanceAfter) !== minor(result.balanceAfter) ||
              minor(receipt.balanceBefore) - stake + payout !== minor(receipt.balanceAfter))
            throw new FreshAccountError("INVALID_GAMBLE_RECEIPT");
        }
      } catch {
        throw new FreshAccountError("INVALID_ACCOUNT_RESPONSE", {
          ambiguous: true,
        });
      }
      this.pending = null;
      this.persist();
      this.needsRefresh = true;
      try {
        await this.refresh();
      } catch {}
      return {
        kind: pending.kind,
        result,
        state: this.snapshot,
        needsRefresh: this.needsRefresh,
      };
    } catch (error) {
      if (!error.ambiguous) {
        this.pending = null;
        this.persist();
        this.needsRefresh = true;
      }
      throw error;
    } finally {
      this.busy = false;
    }
  }
  retry() {
    if (!this.pending) throw new FreshAccountError("NO_PENDING_ACTION");
    return this.submit(this.pending, { replayOnly: true });
  }
}
