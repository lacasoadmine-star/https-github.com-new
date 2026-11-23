import { GAME_ID, PAYLINES } from './presentation-quote.mjs';

export const EXISTING_M20_GAME_ID = 'fresh_multihot20';
const trusted = new WeakSet();
const nativeReceipts = new WeakMap();
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail = code => { throw Object.assign(new Error(code), {code}); };
export function hostMinor(value) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,10})\.\d{2}$/.test(value)) fail('M20_INVALID_HOST_MONEY');
  const minor = Number(value.replace('.', ''));
  if (!Number.isSafeInteger(minor)) fail('M20_INVALID_HOST_MONEY'); return minor;
}
export function validateHostModel(model) {
  if (!model || model.id !== EXISTING_M20_GAME_ID || model.reels !== 5 || model.rows !== 3 || model.paylines !== 20 ||
    model.currency !== 'ETB' || model.foundationBet !== 1 || model.maxWinMultiplier !== 1000 ||
    !Array.isArray(model.betLevels) || !model.betLevels.length || new Set(model.betLevels).size !== model.betLevels.length ||
    !Array.isArray(model.symbols) || !model.symbols.length || !Array.isArray(model.multiplierValues) ||
    model.multiplierValues.join(',') !== '1,2,3,4,5' ||
    typeof model.mathVersion !== 'string' || !model.mathVersion || typeof model.engineVersion !== 'string' || !model.engineVersion ||
    !/^[a-f0-9]{64}$/i.test(model.mathSha256 || '')) fail('M20_HOST_MODEL_MISMATCH');
  for (const bet of model.betLevels) { const n = hostMinor(bet); if (n < 100 || n > 4000000 || n % 20) fail('M20_HOST_BET_INVALID'); }
  const symbols = ['seven','bell','grape','watermelon','lemon','plum','orange','cherry'];
  if (model.symbols.length !== symbols.length || !symbols.every(symbol => model.symbols.includes(symbol))) fail('M20_HOST_SYMBOLS_MISMATCH');
  return model;
}

/** Validate an existing server receipt and translate its names for this renderer.
 * The existing server already moved BET/WIN atomically; this creates no payout.
 */
export function createHostPresentation(raw, {model, action} = {}) {
  validateHostModel(model);
  if (!raw || raw.gameId !== EXISTING_M20_GAME_ID || action?.gameId !== EXISTING_M20_GAME_ID ||
    raw.currency !== 'ETB' || raw.bet !== action.bet || raw.isFree !== false ||
    !uuid.test(action.roundToken || '') || !uuid.test(raw.roundId || '') ||
    !['mathVersion','engineVersion','mathSha256'].every(key => raw[key] === action[key])) fail('M20_HOST_RECEIPT_IDENTITY');
  if (!Array.isArray(raw.grid) || raw.grid.length !== 3 || raw.grid.some(row => !Array.isArray(row) || row.length !== 5 || row.some(symbol => !model.symbols.includes(symbol))) ||
    !model.multiplierValues.includes(raw.wheelMultiplier) || !Array.isArray(raw.winLines) || raw.winLines.length > 20) fail('M20_HOST_RECEIPT_GRID');
  const wallet = raw.walletReceipt, win = hostMinor(raw.finalWin), bet = hostMinor(raw.bet);
  if (!wallet || wallet.currency !== 'ETB' || hostMinor(wallet.chargedStake) !== bet || hostMinor(wallet.finalWin) !== win ||
    hostMinor(wallet.balanceBefore) - bet + win !== hostMinor(wallet.balanceAfter)) fail('M20_HOST_WALLET_RECEIPT');
  const lineIds = new Set(), lines = [];
  for (const line of raw.winLines) {
    const path = PAYLINES[line.line - 1], count = line.count;
    if (!path || lineIds.has(line.line) || !Number.isInteger(count) || count < 3 || count > 5 ||
      !model.symbols.includes(line.symbol) || !Array.isArray(line.positions) || line.positions.length !== count ||
      line.positions.some((position, column) => !Array.isArray(position) || position.length !== 2 || position[0] !== path[column] || position[1] !== column)) fail('M20_HOST_WIN_LINE');
    lineIds.add(line.line);
    const baseMinor = hostMinor(line.baseWin);
    lines.push(Object.freeze({lineId:line.line,path,count,symbol:line.symbol === 'grape' ? 'grapes' : line.symbol,
      baseMinor,multiplier:raw.wheelMultiplier,quotedMinor:baseMinor * raw.wheelMultiplier}));
  }
  const base = lines.reduce((sum,line) => sum + line.baseMinor, 0), uncapped = base * raw.wheelMultiplier;
  if (hostMinor(raw.baseWin) !== base || typeof raw.maxWinCapped !== 'boolean' ||
    raw.maxWinCapped !== (uncapped > bet * model.maxWinMultiplier) ||
    win !== Math.min(uncapped, bet * model.maxWinMultiplier)) fail('M20_HOST_PAYOUT_RECEIPT');
  const view = Object.freeze({gameId:GAME_ID,requestKey:action.roundToken,roundId:raw.roundId,bet:raw.bet,
    grid:Object.freeze(raw.grid.map(row => Object.freeze(row.map(symbol => symbol === 'grape' ? 'grapes' : symbol)))),
    multiplier:raw.wheelMultiplier,winAmount:raw.finalWin,balance:wallet.balanceAfter,winTier:null,lines:Object.freeze(lines),
    backendGameId:EXISTING_M20_GAME_ID,settlementMode:'SERVER_IMMEDIATE',serverReceiptValidated:true,
    maxWinCapped:raw.maxWinCapped,referenceQuoteOnly:false,settlementValidated:false});
  trusted.add(view);
  nativeReceipts.set(view,Object.freeze({gameId:EXISTING_M20_GAME_ID,roundId:raw.roundId,bet:raw.bet,finalWin:raw.finalWin,
    currency:'ETB',maxWinCapped:raw.maxWinCapped,wheelMultiplier:raw.wheelMultiplier,
    grid:raw.grid.map(row=>[...row]),winLines:structuredClone(raw.winLines)}));
  return view;
}
export const isHostPresentation = view => !!view && trusted.has(view);
export function nativeReceiptFor(view) {
  if (!isHostPresentation(view)) fail('M20_NATIVE_HOST_RECEIPT_REQUIRED');return structuredClone(nativeReceipts.get(view));
}

/** The authenticated state returns the historical spin without its request key.
 * A display-only restoration uses its round ID; it never becomes a new POST.
 */
export function restoreHostPresentation(raw,model) {
  return createHostPresentation(raw,{model,action:{gameId:EXISTING_M20_GAME_ID,roundToken:raw?.roundId,bet:raw?.bet,
    ...Object.fromEntries(['mathVersion','engineVersion','mathSha256'].map(key=>[key,raw?.[key]]))}});
}

export function createHostGamblePresentation(raw,action) {
  if (!raw || raw.kind!=='GAMBLE' || raw.gameId!==EXISTING_M20_GAME_ID || raw.currency!=='ETB' ||
    !uuid.test(raw.actionId||'') || raw.roundId!==action?.roundId || raw.roundToken!==action?.roundToken ||
    raw.choice!==action.choice || !['RED','BLACK'].includes(raw.color) || typeof raw.won!=='boolean' ||
    raw.won!==(raw.color===raw.choice) || raw.attempt!==action.expectedAttempt || raw.stake!==action.expectedStake ||
    !['mathVersion','engineVersion','mathSha256'].every(key=>raw[key]===action[key])) fail('M20_GAMBLE_RECEIPT_IDENTITY');
  const stake=hostMinor(raw.stake),payout=hostMinor(raw.payout),wallet=raw.walletReceipt;
  if (stake<=0 || payout!==(raw.won?stake*2:0) || !wallet || wallet.currency!=='ETB' ||
    hostMinor(wallet.chargedStake)!==stake || hostMinor(wallet.finalWin)!==payout ||
    hostMinor(wallet.balanceBefore)-stake+payout!==hostMinor(wallet.balanceAfter) || raw.balanceAfter!==wallet.balanceAfter ||
    raw.maxAttempts!==5 || raw.maxStake!=='500.00' || !Number.isInteger(raw.attempt) || raw.attempt<1 || raw.attempt>5 ||
    stake>hostMinor(raw.maxStake)) fail('M20_GAMBLE_WALLET_RECEIPT');
  return Object.freeze({gameId:GAME_ID,action:'GAMBLE',requestKey:raw.roundToken,roundId:raw.roundId,actionId:raw.actionId,
    choice:raw.choice,color:raw.color,won:raw.won,attempt:raw.attempt,stake:raw.stake,payout:raw.payout,
    balance:raw.balanceAfter,maxAttempts:raw.maxAttempts,maxStake:raw.maxStake,settlementMode:'SERVER_IMMEDIATE'});
}
