/**
 * NON-DESTRUCTIVE ZPLAY Seasons adapter. It speaks the existing Player slots
 * contract (fresh-state, roundToken, receipt, ETB ledger) and creates NO wallet,
 * RNG, payout, table, engine or API. Separate game mechanics remain mandatory.
 *
 * Unlike a generic "all games" bridge, only audited per-game bindings can bet.
 * Demo mode is intentionally fail-closed until the server has a verified
 * no-real-ETB endpoint. Never invent X-Wallet-Mode: DEMO for /api/slots/spin.
 */
import { findSeasonGame } from "./seasons-player-registry.mjs";

const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const SHA = /^[a-f\d]{64}$/i;
const MONEY = /^(0|[1-9]\d{0,12})\.\d{2}$/;
const MODEL_KEYS = Object.freeze(["mathVersion", "engineVersion", "mathSha256"]);
const KNOWN_VALIDATORS = Object.freeze({ "multi-hot-20": validateMultiHot20Receipt });

export class SeasonBridgeError extends Error {
  constructor(code, status = null) {
    super(code);
    this.name = "SeasonBridgeError";
    this.code = code;
    this.status = status;
  }
}
function fail(code, status = null) { throw new SeasonBridgeError(code, status); }
function cents(value) {
  if (typeof value !== "string" || !MONEY.test(value)) fail("INVALID_EXACT_ETB");
  return BigInt(value.replace(".", ""));
}
function requireHash(value) {
  if (typeof value !== "string" || !SHA.test(value)) fail("INVALID_MODEL_OR_SESSION_HASH");
  return value;
}
function requireUUID(value) {
  if (typeof value !== "string" || !UUID.test(value)) fail("INVALID_ROUND_UUID");
  return value;
}
function modelMatches(model, action) {
  if (MODEL_KEYS.some((key) => model?.[key] !== action[key])) fail("GAME_MATH_VERSION_CHANGED");
}
function checkGameState(data, gameId, requireReady = true) {
  if (!data?.authenticated || data.currency !== "ETB" || data.game?.id !== gameId) {
    fail("PLAYER_SESSION_OR_GAME_ID_MISMATCH");
  }
  requireHash(data.sessionGuard);
  requireHash(data.game.mathSha256);
  if (!data.game.mathVersion || !data.game.engineVersion) fail("GAME_MATH_NOT_REGISTERED");
  cents(data.balance);
  if (requireReady && (!data.game.enabled || !data.game.freshReleaseReady ||
      data.blockedByActiveGame || data.game.wagerAvailability === "house_capacity")) {
    fail("GAME_NOT_RELEASE_READY");
  }
  return data;
}

/**
 * A read-only validator for an observed Multi Hot 20 backend receipt. Additional
 * games must register their OWN validators; a Foxy template is not sufficient.
 */
function validateMultiHot20Receipt(receipt, action, gameModel) {
  if (!receipt || receipt.gameId !== action.gameId || receipt.bet !== action.bet ||
      receipt.currency !== "ETB" || !UUID.test(receipt.roundId || "") ||
      typeof receipt.isFree !== "boolean") fail("RECEIPT_IDENTITY_MISMATCH");
  modelMatches(receipt, action);
  if (!Array.isArray(receipt.grid) || receipt.grid.length !== 3 ||
      receipt.grid.some((row) => !Array.isArray(row) || row.length !== 5 ||
        row.some((symbol) => !gameModel.symbols?.includes(symbol)))) {
    fail("RECEIPT_GRID_INVALID");
  }
  if (![1, 2, 3, 4, 5].includes(receipt.wheelMultiplier) ||
      !Array.isArray(receipt.winLines) || receipt.winLines.length > 20 ||
      receipt.winLines.some((line) => !Array.isArray(line.positions) ||
        line.positions.some((pos) => {
          const row = Array.isArray(pos) ? pos[0] : pos?.row;
          const col = Array.isArray(pos) ? pos[1] : pos?.col;
          return !Number.isInteger(row) || !Number.isInteger(col) ||
            row < 0 || row >= 3 || col < 0 || col >= 5;
        }))) fail("RECEIPT_PAYLINES_INVALID");
  const w = receipt.walletReceipt;
  if (!w || w.currency !== "ETB" ||
      cents(w.chargedStake) !== (receipt.isFree ? 0n : cents(action.bet)) ||
      cents(w.finalWin) !== cents(receipt.finalWin) ||
      cents(w.balanceBefore) - cents(w.chargedStake) + cents(w.finalWin) !==
        cents(w.balanceAfter)) fail("RECEIPT_WALLET_SETTLEMENT_INVALID");
  return receipt;
}

export function validateSeasonReceipt(gameSlug, receipt, action, gameModel) {
  const validator = KNOWN_VALIDATORS[gameSlug];
  if (!validator) fail("PER_GAME_RECEIPT_VALIDATOR_NOT_BUILT");
  if (!action || !UUID.test(action.roundToken || "") ||
      !SHA.test(action.sessionGuard || "") ||
      !action.gameId || !action.bet || !gameModel) fail("ROUND_CONTEXT_INVALID");
  return validator(receipt, action, gameModel);
}

export async function playerRequest(path, payload, {
  fetcher = globalThis.fetch,
  timeoutMs = 20000
} = {}) {
  if (typeof path !== "string" || !/^\/api\/slots\/(?:fresh-state\?gameId=[a-zA-Z0-9_-]+|spin)$/.test(path)) {
    fail("UNAPPROVED_PLAYER_API_PATH");
  }
  if (typeof fetcher !== "function") fail("FETCH_UNAVAILABLE");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(path, {
      method: payload === undefined ? "GET" : "POST",
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        ...(payload === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const code = (typeof data?.code === "string" && data.code) ||
        (typeof data?.error === "string" && data.error) || "HTTP_" + response.status;
      fail(code, response.status);
    }
    if (!data || typeof data !== "object") fail("INVALID_SERVER_JSON");
    return data;
  } finally {
    clearTimeout(timer);
  }
}

const pendingKey = (slug) => "zplay.seasons.v1.pending." + slug;
const activeSpins = new Set();
function requireAdapter(request, storage, uuid) {
  if (typeof request !== "function" || typeof storage?.getItem !== "function" ||
      typeof storage?.setItem !== "function" ||
      typeof storage?.removeItem !== "function" || typeof uuid !== "function") {
    fail("SEASONS_CLIENT_DEPENDENCIES_MISSING");
  }
}
function gameBinding(gameSlug) {
  const game = findSeasonGame(gameSlug);
  if (!game.releaseApproved || !game.playableVerified) {
    fail("GAME_RELEASE_NOT_VERIFIED");
  }
  if (!game.engineGameId || !KNOWN_VALIDATORS[game.slug]) {
    fail("GAME_ENGINE_OR_RECEIPT_VALIDATOR_NOT_BOUND");
  }
  return game;
}
function validateWalletMode(walletMode) {
  if (walletMode === "DEMO") fail("DEMO_WALLET_ISOLATION_NOT_VERIFIED");
  if (walletMode !== "ETB") fail("INVALID_WALLET_MODE");
}
function shouldDropPending(error) {
  return [400, 402, 422].includes(error?.status) &&
    error?.code !== "INVALID_SERVER_JSON";
}

/** Execute exactly one real ETB wager via the existing validated Player API. */
export async function executeAuthoritativeSpin({
  gameSlug, stakeAmount, walletMode = "ETB", requestId,
  request = playerRequest, storage = globalThis.sessionStorage,
  uuid = () => globalThis.crypto.randomUUID()
} = {}) {
  validateWalletMode(walletMode);
  const game = gameBinding(gameSlug);
  requireAdapter(request, storage, uuid);
  const key = pendingKey(game.slug);
  // Acquire synchronously BEFORE the first await to prevent concurrent double taps.
  if (activeSpins.has(key)) fail("ROUND_ALREADY_IN_PROGRESS");
  activeSpins.add(key);
  try {
  if (storage.getItem(key) !== null) fail("PENDING_ROUND_REQUIRES_RECOVERY");
  const modelState = checkGameState(
    await request("/api/slots/fresh-state?gameId=" + encodeURIComponent(game.engineGameId)),
    game.engineGameId
  );
  if (!modelState.game.betLevels?.includes(stakeAmount)) fail("STAKE_NOT_ALLOWED_BY_SERVER");
  const bet = cents(stakeAmount);
  if (bet < 100n || bet > 4_000_000n || bet > cents(modelState.balance)) {
    fail("BET_OUTSIDE_VERIFIED_LIMITS");
  }
  const action = {
    gameId: game.engineGameId,
    bet: stakeAmount,
    roundToken: requireUUID(requestId === undefined ? uuid() : requestId),
    sessionGuard: modelState.sessionGuard,
    mathVersion: modelState.game.mathVersion,
    engineVersion: modelState.game.engineVersion,
    mathSha256: modelState.game.mathSha256,
  };
  storage.setItem(key, JSON.stringify(action)); // BEFORE POST: never double-bet on timeout.
  try {
    const receipt = await request("/api/slots/spin", action);
    validateSeasonReceipt(game.slug, receipt, action, modelState.game);
    storage.removeItem(key);
    return receipt; // Preserve the SERVER's receipt unchanged; no local win calculations.
  } catch (error) {
    if (shouldDropPending(error)) storage.removeItem(key);
    throw error; // Network/5xx/invalid receipt: keep saved token for replay-only recovery.
  }
  } finally {
    activeSpins.delete(key);
  }
}

/** A read-only replay of the SAME token. It never silently places a new wager. */
export async function recoverSeasonSpin({
  gameSlug, walletMode = "ETB",
  request = playerRequest, storage = globalThis.sessionStorage,
  uuid = () => globalThis.crypto.randomUUID()
} = {}) {
  validateWalletMode(walletMode);
  const game = gameBinding(gameSlug);
  requireAdapter(request, storage, uuid);
  const key = pendingKey(game.slug);
  const saved = storage.getItem(key);
  if (!saved) fail("NO_PENDING_SEASONS_ROUND");
  let action;
  try { action = JSON.parse(saved); } catch { fail("PENDING_ROUND_CORRUPTED"); }
  if (action.gameId !== game.engineGameId || !UUID.test(action.roundToken || "") ||
      !SHA.test(action.sessionGuard || "") || !action.mathVersion ||
      !action.engineVersion || !SHA.test(action.mathSha256 || "")) {
    fail("PENDING_ROUND_IDENTITY_INVALID");
  }
  cents(action.bet);
  const current = checkGameState(
    await request("/api/slots/fresh-state?gameId=" + encodeURIComponent(game.engineGameId)),
    game.engineGameId, false
  );
  if (current.sessionGuard !== action.sessionGuard) fail("DIFFERENT_PLAYER_SESSION");
  // Models can change while an old settled round is being replayed.
  const receipt = await request("/api/slots/spin", { ...action, replayOnly: true });
  validateSeasonReceipt(game.slug, receipt, action, current.game);
  storage.removeItem(key);
  return receipt;
}

export function inspectPendingSeasonRound(gameSlug, storage = globalThis.sessionStorage) {
  const game = findSeasonGame(gameSlug);
  return storage?.getItem?.(pendingKey(game.slug)) !== null;
}
