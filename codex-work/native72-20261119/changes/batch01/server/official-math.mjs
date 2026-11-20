/**
 * ZPLAY / existing Railway superwin-nine-slot-engine integration module.
 * Pure, integer-cent game evaluator. No wallet, RNG endpoint, auth, DB or HTTP server.
 * Source: saved first-party SmartSoft interactive demo configuration + paytable
 * in existing Cloudflare SSG_OFFICIAL_REFERENCES/ archive, 2026-11-11.
 * 'reference' coefficients are confirmed; paylines / reel strips / multiplier
 * probabilities / production mathematical certification are NOT confirmed.
 * No game may enter real-money service without an approved server-only profile.
 */
export const GAME_REFERENCE = Object.freeze({
  fresh_multihot20: {
    gameId: 'fresh_multihot20', title: 'Multi Hot 20', reels: 5, rows: 3,
    paylines: 20, wheelValues: [1, 2, 3, 4, 5], maxWinX: 1000,
    observedOfficialMinDMO: '0.20', observedOfficialMaxDMO: '200.00',
    observedOfficialRtpPercent: '96.63', observedGameVersion: 'v1.0.0',
    source: 'archive/multi-hot-20.tar.gz:05-reels-system/observed-states.json',
    paytable: {
      seven:  {3: 50, 4: 400, 5: 2000},
      bell:   {3: 20, 4: 100, 5: 200},
      grape:  {3: 10, 4: 50, 5: 100},
      watermelon: {3: 10, 4: 50, 5: 100},
      lemon:  {3: 5, 4: 10, 5: 50},
      plum:   {3: 5, 4: 10, 5: 50},
      orange: {3: 5, 4: 10, 5: 50},
      cherry: {3: 5, 4: 10, 5: 50},
    },
  },
  fresh_multihot5burnwilds: {
    gameId: 'fresh_multihot5burnwilds', title: 'Multi Hot 5 Burn Wilds',
    reels: 5, rows: 3, paylines: 5, wheelValues: [1, 2, 3, 4, 5],
    maxWinX: 1300, observedOfficialMinDMO: '0.10',
    observedOfficialMaxDMO: '200.00', observedOfficialRtpPercent: null,
    observedGameVersion: 'v1.0.1',
    source: 'archive/multi-hot-5-burn-wilds.tar.gz:05-reels-system/observed-states.json',
    paytable: {
      seven:  {2: 5, 3: 40, 4: 100, 5: 1000},
      grape:  {3: 20, 4: 40, 5: 200},
      watermelon: {3: 20, 4: 40, 5: 200},
      bell:   {3: 10, 4: 20, 5: 100},
      lemon:  {3: 5, 4: 10, 5: 50},
      plum:   {3: 5, 4: 10, 5: 50},
      orange: {3: 5, 4: 10, 5: 50},
      cherry: {3: 5, 4: 10, 5: 50},
      wild:   {},
    },
  },
});

/**
 * Game-by-game certified PRESENTATION/payline paths, reconstructed from actual
 * first-party archived line chart sprites: 06-artwork/*-MultiHot-PayLine.png.
 * Row indices are 0=top, 1=middle, 2=bottom; each path has five reel rows.
 * This verifies geometry ONLY, NOT reel-strip frequencies or RTP.
 * The Burn Wilds chart numbers are deliberately [2 top, 1 middle, 3 bottom].
 */
export const OFFICIAL_LINE_PATHS=Object.freeze({
  fresh_multihot20: Object.freeze([
    [0,0,0,0,0], [1,1,1,1,1], [2,2,2,2,2],
    [0,1,2,1,0], [2,1,0,1,2],
    [0,0,1,2,2], [2,2,1,0,0],
    [1,0,0,0,1], [1,2,2,2,1],
    [0,1,1,1,0], [2,1,1,1,2],
    [0,0,0,0,1], [2,2,2,2,1],
    [0,1,0,1,0], [2,1,2,1,2],
    [1,1,0,1,1], [1,1,2,1,1],
    [0,0,1,0,0], [2,2,1,2,2],
    [1,2,1,2,1],
  ].map(path=>Object.freeze(path))),
  fresh_multihot5burnwilds: Object.freeze([
    [1,1,1,1,1], // line 1: middle
    [0,0,0,0,0], // line 2: top
    [2,2,2,2,2], // line 3: bottom
    [0,1,2,1,0], // line 4: V
    [2,1,0,1,2], // line 5: inverted V
  ].map(path=>Object.freeze(path))),
});

export class GameMathError extends Error {
  constructor(code, status=422) { super(code); this.name='GameMathError'; this.code=code; this.status=status; }
}
const assert=(ok, code, status)=>{if(!ok)throw new GameMathError(code,status);};
const idPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const moneyPattern=/^(0|[1-9]\d{0,12})\.\d{2}$/;
export function cents(value) {
  assert(typeof value==='string' && moneyPattern.test(value),'INVALID_ETB_AMOUNT',400);
  return BigInt(value.replace('.',''));
}
export function asETB(units) {
  assert(typeof units==='bigint' && units>=0n,'INVALID_ETB_MINOR_UNITS',500);
  return `${units/100n}.${String(units%100n).padStart(2,'0')}`;
}
const knownGame=id=>{const r=GAME_REFERENCE[id];assert(!!r,'UNSUPPORTED_GAME_ID',404);return r;};
function checkGrid(grid,ref){
  assert(Array.isArray(grid)&&grid.length===ref.rows&&grid.every(r=>Array.isArray(r)&&r.length===ref.reels),'INVALID_REEL_GRID',422);
  for(let r=0;r<ref.rows;r++)for(let col=0;col<ref.reels;col++){
    const symbol=grid[r][col];
    assert(typeof symbol==='string'&&Object.hasOwn(ref.paytable,symbol),'INVALID_REEL_SYMBOL',422);
    if(symbol==='wild')assert(ref.gameId==='fresh_multihot5burnwilds'&&col>=1&&col<=3,'ILLEGAL_WILD_REEL',422);
  }
}
function checkPaths(linePaths,ref){
  assert(Array.isArray(linePaths)&&linePaths.length===ref.paylines,'UNVERIFIED_PAYLINE_COUNT',503);
  const unique=new Set();
  for(const p of linePaths){
    assert(Array.isArray(p)&&p.length===ref.reels&&p.every(row=>Number.isInteger(row)&&row>=0&&row<ref.rows),'UNVERIFIED_PAYLINE_SHAPE',503);
    const key=p.join('');assert(!unique.has(key),'DUPLICATE_PAYLINE',503);unique.add(key);
    const official=OFFICIAL_LINE_PATHS[ref.gameId]?.[unique.size-1];
    assert(!!official&&p.every((row,col)=>row===official[col]),'OFFICIAL_PAYLINE_CHART_MISMATCH',503);
  }
}
function lineWins(grid,linePaths,ref,stakePerLine){
  const results=[];
  linePaths.forEach((path,i)=>{
    const symbol=grid[path[0]][0];
    if(!ref.paytable[symbol]||symbol==='wild')return;
    let count=0;
    while(count<ref.reels){
      const current=grid[path[count]][count];
      if(current!==symbol && !(ref.gameId==='fresh_multihot5burnwilds'&&current==='wild'))break;
      count++;
    }
    const factor=ref.paytable[symbol][count]??0;
    if(factor>0){
      const unitWin=stakePerLine*BigInt(factor);
      results.push({line:i+1,symbol,count,positions:path.slice(0,count).map((row,col)=>[row,col]),factor,baseWin:asETB(unitWin),baseWinCents:unitWin});
    }
  });
  return results;
}
export function evaluateCapturedMath({gameId,grid,linePaths,bet,wheelMultiplier}){
  const ref=knownGame(gameId);
  linePaths ??= OFFICIAL_LINE_PATHS[gameId];
  checkGrid(grid,ref);checkPaths(linePaths,ref);
  const stake=cents(bet);
  assert(stake>=100n&&stake<=4000000n,'BET_OUTSIDE_WORKER_POLICY',422);
  assert(stake%BigInt(ref.paylines)===0n,'BET_NOT_DIVISIBLE_BY_PAYLINES',422);
  assert(Number.isInteger(wheelMultiplier)&&ref.wheelValues.includes(wheelMultiplier),'MULTIPLIER_UNVERIFIED',422);
  const perLine=stake/BigInt(ref.paylines);
  const rawGrid=grid.map(row=>[...row]);
  const rawWins=lineWins(rawGrid,linePaths,ref,perLine);
  const expandedWildReels=[];
  if(ref.gameId==='fresh_multihot5burnwilds'){
    for(const win of rawWins)for(const [row,col] of win.positions){
      if(col>=1&&col<=3&&rawGrid[row][col]==='wild'&&!expandedWildReels.includes(col))expandedWildReels.push(col);
    }
  }
  expandedWildReels.sort((a,b)=>a-b);
  const finalGrid=rawGrid.map(row=>[...row]);
  for(const col of expandedWildReels)for(let row=0;row<ref.rows;row++)finalGrid[row][col]='wild';
  const wins=lineWins(finalGrid,linePaths,ref,perLine);
  const baseCents=wins.reduce((total,w)=>total+w.baseWinCents,0n);
  const nonCapped=baseCents*BigInt(wheelMultiplier);
  const cap=stake*BigInt(ref.maxWinX);
  const totalWinCents=nonCapped>cap?cap:nonCapped;
  return {
    gameId, grid:finalGrid, initialGrid:rawGrid,
    expandedWildReels,
    wheelMultiplier,
    winLines:wins.map(({baseWinCents,...item})=>item),
    baseWin:asETB(baseCents),
    finalWin:asETB(totalWinCents),
    finalWinCents:totalWinCents,
    maxWinCapped:nonCapped>cap,
    mathReference:ref.source,
  };
}

/**
 * Server-only certified sampling profile. Nothing from the Player request may
 * populate profile fields. Certification must be derived from operator-approved
 * line chart, strips, wheel probabilities and an audited expected-return check.
 */
export function requireApprovedProfile(profile){
  assert(profile&&profile.productionApproved===true&&profile.probabilityModelAudited===true&&
    typeof profile.auditReference==='string'&&profile.auditReference.length>=8&&
    /^[a-f0-9]{64}$/i.test(profile.mathSha256||''),'UNCERTIFIED_MATH_PROFILE',503);
  const ref=knownGame(profile.gameId);
  checkPaths(profile.linePaths,ref);
  assert(Array.isArray(profile.reelStrips)&&profile.reelStrips.length===5&&
    profile.reelStrips.every(strip=>Array.isArray(strip)&&strip.length>=3),'UNVERIFIED_REEL_STRIPS',503);
  for(const [col,strip] of profile.reelStrips.entries()){
    for(const symbol of strip){
      assert(typeof symbol==='string'&&Object.hasOwn(ref.paytable,symbol),'UNVERIFIED_STRIP_SYMBOL',503);
      if(symbol==='wild')assert(ref.gameId==='fresh_multihot5burnwilds'&&col>=1&&col<=3,'ILLEGAL_WILD_REEL',503);
    }
  }
  assert(Array.isArray(profile.wheelWeights)&&profile.wheelWeights.length===5&&
    profile.wheelWeights.every(w=>Number.isSafeInteger(w)&&w>0)&&
    Number.isSafeInteger(profile.wheelWeights.reduce((a,b)=>a+b,0)),'UNVERIFIED_WHEEL_WEIGHTS',503);
  assert(typeof profile.mathVersion==='string'&&profile.mathVersion.length>0&&
    typeof profile.engineVersion==='string'&&profile.engineVersion.length>0,'MATH_VERSION_MISSING',503);
  return profile;
}
export function secureIndex(bound){
  assert(Number.isSafeInteger(bound)&&bound>0&&bound<=0xFFFFFFFF,'INVALID_RANDOM_BOUND',500);
  const range=0x100000000;
  const limit=Math.floor(range/bound)*bound;
  const sample=new Uint32Array(1);
  let value;
  do {crypto.getRandomValues(sample);value=sample[0];}while(value>=limit);
  return value%bound;
}
export function spinCertifiedMath({profile,bet,drawIndex=secureIndex,newRoundId=()=>crypto.randomUUID()}){
  requireApprovedProfile(profile);
  const ref=knownGame(profile.gameId);
  const stake=cents(bet);
  assert(stake>=100n&&stake<=4000000n&&stake%BigInt(ref.paylines)===0n,'BET_OUTSIDE_WORKER_POLICY',422);
  const stops=profile.reelStrips.map(strip=>drawIndex(strip.length));
  stops.forEach((stop,c)=>assert(Number.isInteger(stop)&&stop>=0&&stop<profile.reelStrips[c].length,'RNG_OUT_OF_RANGE',500));
  const grid=Array.from({length:3},(_,row)=>stops.map((stop,col)=>{
    const strip=profile.reelStrips[col];
    return strip[(stop+row-1+strip.length)%strip.length];
  }));
  const sum=profile.wheelWeights.reduce((a,b)=>a+b,0);
  let selection=drawIndex(sum);assert(Number.isInteger(selection)&&selection>=0&&selection<sum,'RNG_OUT_OF_RANGE',500);
  let wheelMultiplier=1;
  for(let i=0;i<5;i++){
    if(selection<profile.wheelWeights[i]){wheelMultiplier=i+1;break}
    selection-=profile.wheelWeights[i];
  }
  const math=evaluateCapturedMath({gameId:profile.gameId,grid,linePaths:profile.linePaths,bet,wheelMultiplier});
  const roundId=newRoundId();assert(idPattern.test(roundId),'ROUND_ID_INVALID',500);
  return {...math,roundId,bet,isFree:false,currency:'ETB',stops,mathVersion:profile.mathVersion,
    engineVersion:profile.engineVersion,mathSha256:profile.mathSha256,
    features:{expandedWildReels:math.expandedWildReels}};
}

/**
 * Atomic adapter to existing PostgreSQL ledger & sw_nine.game_rounds.
 * withExistingTransaction must COMMIT on success / ROLLBACK on throw.
 * tx.lockExistingWallets(userId) must lock user+house account rows BEFORE
 * tx.findExistingRound() to serialize requests by user. Required methods:
 * findExistingRound, assertReleaseEnabled, balanceCents, houseReserveCents,
 * applyExistingLedger, recordExistingRound. No detached wallet/database.
 */
export async function settleExistingPlayerRound({
  userId,gameId,bet,roundToken,replayOnly=false,profile,
  withExistingTransaction,drawIndex=secureIndex,newRoundId=()=>crypto.randomUUID(),
}){
  assert(typeof userId==='string'&&userId.length>0,'PLAYER_SESSION_REQUIRED',401);
  assert(idPattern.test(roundToken||''),'ROUND_TOKEN_INVALID',400);
  const ref=knownGame(gameId);
  assert(typeof withExistingTransaction==='function','EXISTING_LEDGER_REQUIRED',503);
  const wager=cents(bet);
  assert(wager>=100n&&wager<=4000000n&&wager%BigInt(ref.paylines)===0n,'BET_OUTSIDE_WORKER_POLICY',422);
  // Replay must return a previously settled receipt even when an old math
  // profile has since been disabled, removed or superseded.
  // Both new and replay requests use the same authenticated transaction.
  return withExistingTransaction(async tx=>{
    for(const method of ['lockExistingWallets','findExistingRound','assertReleaseEnabled',
      'balanceCents','houseReserveCents','applyExistingLedger','recordExistingRound']){
      assert(typeof tx?.[method]==='function','INCOMPLETE_EXISTING_LEDGER_ADAPTER',503);
    }
    await tx.lockExistingWallets(userId);
    const prior=await tx.findExistingRound(userId,roundToken);
    if(prior){
      assert(prior.gameId===gameId&&prior.bet===bet&&prior.userId===userId,'IDEMPOTENCY_PARAMETER_CONFLICT',409);
      return prior.receipt;
    }
    if(replayOnly)throw new GameMathError('ROUND_NOT_FOUND_FOR_REPLAY',404);
    // Server-only approval, never from a request body or a client flag.
    assert(profile?.gameId===gameId,'GAME_MATH_PROFILE_MISMATCH',503);
    requireApprovedProfile(profile);
    await tx.assertReleaseEnabled(gameId);
    const balance=await tx.balanceCents(userId);
    const houseReserve=await tx.houseReserveCents(gameId);
    assert(typeof balance==='bigint'&&typeof houseReserve==='bigint','EXISTING_LEDGER_UNAVAILABLE',503);
    assert(balance>=wager,'INSUFFICIENT_FUNDS',402);
    const maximumLoss=wager*BigInt(ref.maxWinX);
    assert(houseReserve>=maximumLoss,'HOUSE_RESERVE_INSUFFICIENT',503);
    const spin=spinCertifiedMath({profile,bet,drawIndex,newRoundId});
    const win=spin.finalWinCents;
    const expectedAfter=balance-wager+win;
    const expectedHouseAfter=houseReserve+wager-win;
    const ledger=await tx.applyExistingLedger({userId,gameId,roundToken,roundId:spin.roundId,
      wagerCents:wager,winCents:win});
    assert(ledger?.balanceBeforeCents===balance&&ledger?.balanceAfterCents===expectedAfter&&
      ledger?.houseBeforeCents===houseReserve&&ledger?.houseAfterCents===expectedHouseAfter,
      'EXISTING_LEDGER_SETTLEMENT_MISMATCH',500);
    const receipt={...spin,finalWin:asETB(win),walletReceipt:{currency:'ETB',
      balanceBefore:asETB(balance),chargedStake:bet,finalWin:asETB(win),
      balanceAfter:asETB(expectedAfter)}};
    delete receipt.finalWinCents;
    await tx.recordExistingRound({userId,gameId,bet,roundToken,roundId:receipt.roundId,
      mathSha256:profile.mathSha256,receipt});
    return receipt;
  });
}
