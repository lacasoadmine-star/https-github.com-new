// Explicit ZPLAY TEST ETB simulation; no cash database.
const __burnModule0 = (() => {
const BURN_WILDS_GAME_ID='zplay72_multi_hot_5_burn_wilds_v1';
const BURN_WILDS_SYMBOLS=Object.freeze(['orange','lemon','plum','grapes','cherry','watermelon','bell','seven','wild']);
const freeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(freeze);}return value;};
const copy=value=>JSON.parse(JSON.stringify(value));
const canonical=value=>JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
const clamp=value=>Math.max(0,Math.min(1,value));
const time=value=>{if(!Number.isFinite(value)||value<0)throw new TypeError('BURN_WILDS_TIME');return value;};

function grid(value) {
  if(!Array.isArray(value)||value.length!==5||value.some(column=>!Array.isArray(column)||column.length!==3||column.some(symbol=>!BURN_WILDS_SYMBOLS.includes(symbol))))throw new TypeError('BURN_WILDS_GRID');
  return value.map(column=>[...column]);
}

/** Validate a supplied authoritative expansion; this module never chooses one. */
function validateBurnWildsReceipt(source) {
  if(!source||source.gameId!==BURN_WILDS_GAME_ID||typeof source.roundId!=='string'||!source.roundId||source.roundId.length>200)throw new TypeError('BURN_WILDS_RECEIPT');
  const originalGrid=grid(source.originalGrid),finalGrid=grid(source.finalGrid);
  if(originalGrid[0].includes('wild')||originalGrid[4].includes('wild'))throw new TypeError('BURN_WILDS_OUTER_WILD');
  if(!Array.isArray(source.expandedColumns)||source.expandedColumns.length>3||new Set(source.expandedColumns).size!==source.expandedColumns.length
    ||source.expandedColumns.some(column=>!Number.isInteger(column)||column<1||column>3))throw new TypeError('BURN_WILDS_EXPANDED_COLUMNS');
  const expandedColumns=[...source.expandedColumns].sort((a,b)=>a-b);
  if(!Array.isArray(source.winLines)||source.winLines.some(line=>!line||!Array.isArray(line.rows)||line.rows.length!==5||line.rows.some(row=>!Number.isInteger(row)||row<0||row>2)))throw new TypeError('BURN_WILDS_WIN_LINES');
  const winLines=source.winLines.map(line=>{const out={rows:[...line.rows]};if(line.id!==undefined){if(!Number.isSafeInteger(line.id)||line.id<1)throw new TypeError('BURN_WILDS_LINE_ID');out.id=line.id;}
    if(line.winMinor!==undefined){if(!Number.isSafeInteger(line.winMinor)||line.winMinor<0)throw new TypeError('BURN_WILDS_LINE_AMOUNT');out.winMinor=line.winMinor;}return out;});
  for(let column=0;column<5;column++) {
    if(expandedColumns.includes(column)) {
      if(!originalGrid[column].includes('wild')||!winLines.some(line=>originalGrid[column][line.rows[column]]==='wild'&&(line.winMinor===undefined||line.winMinor>0)))throw new TypeError('BURN_WILDS_UNTRIGGERED_EXPANSION');
      if(finalGrid[column].some(symbol=>symbol!=='wild'))throw new TypeError('BURN_WILDS_INCOMPLETE_EXPANSION');
    } else if(finalGrid[column].some((symbol,row)=>symbol!==originalGrid[column][row]))throw new TypeError('BURN_WILDS_UNDECLARED_GRID_CHANGE');
  }
  const normalized={gameId:BURN_WILDS_GAME_ID,roundId:source.roundId,originalGrid,finalGrid,expandedColumns,winLines};
  if(source.clientToken!==undefined){if(typeof source.clientToken!=='string'||!source.clientToken||source.clientToken.length>200)throw new TypeError('BURN_WILDS_CLIENT_TOKEN');normalized.clientToken=source.clientToken;}
  if(source.multiplier!==undefined){if(!Number.isInteger(source.multiplier)||source.multiplier<1||source.multiplier>5)throw new TypeError('BURN_WILDS_MULTIPLIER');normalized.multiplier=source.multiplier;}
  for(const key of ['winMinor','balanceMinor','betMinor'])if(source[key]!==undefined){if(!Number.isSafeInteger(source[key])||source[key]<0)throw new TypeError('BURN_WILDS_AMOUNT');normalized[key]=source[key];}
  return freeze(normalized);
}

/** A presentation timeline for one authenticated host round; no RNG or transport. */
class BurnWildsExpansion {
  constructor({onEvent=()=>{},now=()=>performance.now()}={}) {
    this.onEvent=onEvent;this.now=now;this.phase='IDLE';this.requestKey=null;this.receipt=null;this.pending=null;
    this.startedAt=0;this.lastTime=0;this.acceptedAt=0;this.elapsed=0;this.quick=false;this.accelerated=false;this.disposed=false;
    this.history=new Map();this.events=new Set();this.expansions=[];
  }
  emit(type,column) {
    const key=`${type}:${column??''}`;if(this.events.has(key))return;this.events.add(key);
    try{this.onEvent({type,gameId:BURN_WILDS_GAME_ID,roundId:this.pending?.roundId||this.receipt?.roundId||null,requestKey:this.requestKey,...(column===undefined?{}:{column})});}catch{}
  }
  start({requestKey,quick=false,at=this.now()}={}) {
    if(this.disposed)throw new Error('BURN_WILDS_DISPOSED');time(at);
    if(typeof requestKey!=='string'||!requestKey||requestKey.length>200)throw new TypeError('BURN_WILDS_REQUEST_KEY');
    if(this.phase!=='IDLE'){if(requestKey===this.requestKey)return false;throw new Error('BURN_WILDS_ROUND_ACTIVE');}
    this.phase='SPINNING';this.requestKey=requestKey;this.pending=null;this.startedAt=at;this.lastTime=at;this.elapsed=0;
    this.quick=!!quick;this.accelerated=false;this.events.clear();this.expansions=[];this.emit('spin');return true;
  }
  accept(source,at=this.now()) {
    if(this.disposed)throw new Error('BURN_WILDS_DISPOSED');time(at);
    const accepted=validateBurnWildsReceipt(source),signature=canonical(accepted),known=this.history.get(accepted.roundId);
    if(known!==undefined){if(known!==signature)throw new Error('BURN_WILDS_RECEIPT_CONFLICT');return false;}
    if(this.pending)throw new Error('BURN_WILDS_RECEIPT_ALREADY_ACCEPTED');
    if(this.phase!=='IDLE'&&accepted.clientToken!==undefined&&accepted.clientToken!==this.requestKey)throw new Error('BURN_WILDS_REQUEST_MISMATCH');
    this.history.set(accepted.roundId,signature);if(this.history.size>64)this.history.delete(this.history.keys().next().value);
    if(this.phase==='IDLE'){this.receipt=accepted;this.expansions=accepted.expandedColumns.map(column=>({column,progress:1,flame:0}));return true;}
    this.pending=accepted;this.acceptedAt=Math.max(at,this.lastTime);this.lastTime=this.acceptedAt;this.elapsed=0;this.phase='REELS';this.tick(this.lastTime);return true;
  }
  stop(at=this.now()) {
    if(this.disposed||this.phase==='IDLE')return false;time(at);
    this.tick(at);if(!this.accelerated){this.accelerated=true;this.emit('stop-request');}return true;
  }
  reject(requestKey) {
    if(this.disposed)throw new Error('BURN_WILDS_DISPOSED');
    if(this.phase!=='SPINNING'||this.pending||requestKey!==this.requestKey)throw new Error('BURN_WILDS_REJECTION_MISMATCH');
    this.phase='IDLE';this.pending=null;this.requestKey=null;this.elapsed=0;this.expansions=[];this.emit('rejected');return true;
  }
  tick(at=this.now()) {
    if(this.disposed)return this.snapshot();time(at);
    const next=Math.max(this.lastTime,at),delta=next-this.lastTime;this.lastTime=next;
    if(!this.pending)return this.snapshot();
    this.elapsed+=delta*(this.accelerated?6:this.quick?3:1);
    const reelDelay=240,columnDelay=120,burnDuration=660,revealDuration=240,columns=this.pending.expandedColumns;
    if(this.elapsed>=reelDelay)this.emit('original-grid');
    let finish=reelDelay;
    this.expansions=columns.map((column,index)=>{
      const begins=reelDelay+index*columnDelay,progress=clamp((this.elapsed-begins)/burnDuration);finish=Math.max(finish,begins+burnDuration);
      if(this.elapsed>=begins)this.emit('burn-start',column);if(progress===1)this.emit('column-expanded',column);
      return {column,progress,flame:this.elapsed<begins||progress>=1?0:Math.sin(progress*Math.PI)};
    });
    this.phase=this.elapsed<reelDelay?'REELS':this.elapsed<finish?'BURNING':'REVEALING';
    if(this.elapsed>=finish+revealDuration){this.receipt=this.pending;this.pending=null;this.phase='IDLE';this.expansions=this.expansions.map(item=>({...item,progress:1,flame:0}));this.emit('settled');}
    return this.snapshot();
  }
  snapshot() {
    const accepted=this.pending||this.receipt;
    let presentationGrid=null;
    if(this.pending&&this.elapsed>=240)presentationGrid=this.pending.originalGrid.map((column,index)=>this.expansions.some(item=>item.column===index&&item.progress===1)?[...this.pending.finalGrid[index]]:[...column]);
    else if(this.receipt)presentationGrid=this.receipt.finalGrid.map(column=>[...column]);
    return freeze({gameId:BURN_WILDS_GAME_ID,phase:this.phase,requestKey:this.requestKey,receipt:this.receipt?copy(this.receipt):null,
      acceptedReceipt:accepted?copy(accepted):null,presentationGrid,expansions:copy(this.expansions),elapsed:this.elapsed,accelerated:this.accelerated,disposed:this.disposed});
  }
  dispose(){if(this.disposed)return;this.disposed=true;this.onEvent=()=>{};this.history.clear();}
}


return {BURN_WILDS_GAME_ID,BURN_WILDS_SYMBOLS,validateBurnWildsReceipt,BurnWildsExpansion};
})();

const __burnModule1 = (() => {
const {BURN_WILDS_GAME_ID, BURN_WILDS_SYMBOLS} = __burnModule0;

// Refreshed in the game's own v1.0.1 rules on 23 November 2026 at both
// 0.10 and 0.20 DMO. These are payouts per displayed total stake, not RNG
// weights. The initially unrefreshed placeholder paytable was discarded.
const BURN_WILDS_RULES_VERSION='burn-wilds-observed-v1.0.1-20261123';
const BURN_WILDS_PAYLINES=Object.freeze([
  [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2]
].map(Object.freeze));
const fruit=Object.freeze({3:5,4:10,5:50});
const BURN_WILDS_PAYTABLE_AT_TEN_MINOR=Object.freeze({
  seven:Object.freeze({2:5,3:40,4:100,5:1000}),
  grapes:Object.freeze({3:20,4:40,5:200}),
  watermelon:Object.freeze({3:20,4:40,5:200}),
  bell:Object.freeze({3:10,4:20,5:100}),
  orange:fruit,lemon:fruit,plum:fruit,cherry:fruit
});
const amount=value=>{if(!Number.isSafeInteger(value)||value<0)throw new TypeError('BURN_WILDS_AMOUNT');return BigInt(value);};

function quoteBurnWildsLine(symbol,count,betMinor,multiplier=1){
  if(!(symbol in BURN_WILDS_PAYTABLE_AT_TEN_MINOR)||!Number.isInteger(count)||count<0||count>5)throw new TypeError('BURN_WILDS_LINE_QUOTE');
  if(!Number.isInteger(multiplier)||multiplier<1||multiplier>5)throw new TypeError('BURN_WILDS_MULTIPLIER');
  const stake=amount(betMinor);if(stake===0n)throw new TypeError('BURN_WILDS_STAKE');
  const numerator=BigInt(BURN_WILDS_PAYTABLE_AT_TEN_MINOR[symbol][count]||0)*stake*BigInt(multiplier);
  if(numerator%10n)throw new RangeError('BURN_WILDS_FRACTIONAL_MINOR');
  const value=numerator/10n;if(value>BigInt(Number.MAX_SAFE_INTEGER))throw new RangeError('BURN_WILDS_AMOUNT_OVERFLOW');
  return Number(value);
}

/** Quote one supplied final-grid line. This never selects a grid, expands a
 * reel, applies a maximum-win cap, or writes the wallet. The host remains the
 * authority for the accepted expansion, total settlement and probability model.
 */
function evaluateBurnWildsLine(finalGrid,lineId,betMinor,multiplier=1){
  if(!Array.isArray(finalGrid)||finalGrid.length!==5||finalGrid.some(column=>!Array.isArray(column)||column.length!==3||column.some(s=>!BURN_WILDS_SYMBOLS.includes(s)))||finalGrid[0].includes('wild')||finalGrid[4].includes('wild'))throw new TypeError('BURN_WILDS_GRID');
  if(!Number.isInteger(lineId)||lineId<1||lineId>5)throw new TypeError('BURN_WILDS_LINE_ID');
  const rows=BURN_WILDS_PAYLINES[lineId-1],symbol=finalGrid[0][rows[0]];let count=1;
  for(let column=1;column<5;column++){const s=finalGrid[column][rows[column]];if(s!==symbol&&s!=='wild')break;count++;}
  const baseWinMinor=quoteBurnWildsLine(symbol,count,betMinor),winMinor=quoteBurnWildsLine(symbol,count,betMinor,multiplier);
  return Object.freeze({gameId:BURN_WILDS_GAME_ID,lineId,rows,symbol,count,baseWinMinor,winMinor});
}

function describeBurnWildsPaytable(betMinor){
  return Object.freeze(Object.fromEntries(Object.entries(BURN_WILDS_PAYTABLE_AT_TEN_MINOR).map(([symbol,coefficients])=>[
    symbol,Object.freeze(Object.fromEntries(Object.keys(coefficients).map(count=>[count,quoteBurnWildsLine(symbol,Number(count),betMinor)])))
  ])));
}


return {BURN_WILDS_RULES_VERSION,BURN_WILDS_PAYLINES,BURN_WILDS_PAYTABLE_AT_TEN_MINOR,quoteBurnWildsLine,evaluateBurnWildsLine,describeBurnWildsPaytable};
})();

const __burnModule2 = (() => {
const {BURN_WILDS_GAME_ID, validateBurnWildsReceipt} = __burnModule0;

const {BURN_WILDS_PAYLINES, evaluateBurnWildsLine} = __burnModule1;

/**
 * Server-side eligibility audit for the own, currently observed v1.0.1
 * Multi Hot 5 Burn Wilds paytable. This is NOT a random outcome generator,
 * RTP implementation, cash wallet, host transport or proof of licensed assets.
 * A separate authoritative server must first select and durably accept a
 * valid original grid, expansion and multiplier. Unverified financial states
 * are rejected, not guessed or silently capped.
 */
const fail = code => { throw new TypeError('BURN_WILDS_OUTCOME_' + code); };

function quoteBurnWildsFinalGrid({finalGrid, betMinor, multiplier}) {
  if (!Number.isSafeInteger(betMinor) || betMinor <= 0) fail('STAKE');
  if (!Number.isInteger(multiplier) || multiplier < 1 || multiplier > 5) fail('MULTIPLIER');
  const lineQuotes = BURN_WILDS_PAYLINES.map((_, index) =>
    evaluateBurnWildsLine(finalGrid, index + 1, betMinor, multiplier)
  );
  let totalWinMinor = 0;
  const winLines = [];
  for (const line of lineQuotes) {
    if (!Number.isSafeInteger(line.winMinor) || line.winMinor < 0 ||
        !Number.isSafeInteger(totalWinMinor + line.winMinor)) fail('AMOUNT_OVERFLOW');
    totalWinMinor += line.winMinor;
    if (line.winMinor > 0) {
      winLines.push(Object.freeze({
        id: line.lineId, rows: Object.freeze([...line.rows]),
        symbol: line.symbol, count: line.count, winMinor: line.winMinor
      }));
    }
  }
  return Object.freeze({
    gameId: BURN_WILDS_GAME_ID, betMinor, multiplier, totalWinMinor,
    winLines: Object.freeze(winLines)
  });
}

/**
 * Validate payout consistency of an externally accepted receipt before a
 * release or settlement gate treats its result as proved. No network call and
 * no balance change occur here. The authoritative host also needs separate
 * evidence for probability/reel weights and the payout contract.
 */
function auditBurnWildsPayout(receipt) {
  const accepted = validateBurnWildsReceipt(receipt);
  if (!Number.isSafeInteger(accepted.betMinor) || accepted.betMinor <= 0 ||
      !Number.isSafeInteger(accepted.winMinor) || accepted.winMinor < 0 ||
      !Number.isInteger(accepted.multiplier)) fail('FINANCIAL_FIELDS_REQUIRED');
  const quoted = quoteBurnWildsFinalGrid({
    finalGrid: accepted.finalGrid, betMinor: accepted.betMinor,
    multiplier: accepted.multiplier
  });
  if (accepted.winMinor !== quoted.totalWinMinor) fail('TOTAL_MISMATCH');
  if (accepted.winLines.length !== quoted.winLines.length) fail('LINE_COUNT_MISMATCH');
  const seen = new Set();
  for (const line of accepted.winLines) {
    if (!Number.isSafeInteger(line.id) || line.id < 1 ||
        line.id > BURN_WILDS_PAYLINES.length || seen.has(line.id)) fail('LINE_ID');
    seen.add(line.id);
    const expected = quoted.winLines.find(item => item.id === line.id);
    if (!expected || !Number.isSafeInteger(line.winMinor) ||
        line.winMinor !== expected.winMinor ||
        line.rows.length !== expected.rows.length ||
        line.rows.some((row, index) => row !== expected.rows[index]))
      fail('LINE_MISMATCH');
  }
  return Object.freeze({
    gameId: BURN_WILDS_GAME_ID, roundId: accepted.roundId,
    betMinor: accepted.betMinor, winMinor: quoted.totalWinMinor,
    multiplier: accepted.multiplier, lineCount: quoted.winLines.length,
    payoutConsistent: true, probabilityModelVerified: false,
    liveSettlementVerified: false
  });
}


return {quoteBurnWildsFinalGrid,auditBurnWildsPayout};
})();

const __burnModule3 = (() => {
const {BURN_WILDS_GAME_ID} = __burnModule0;

const {quoteBurnWildsFinalGrid} = __burnModule2;

const {quoteBurnWildsLine} = __burnModule1;

// Original ZPLAY probability DRAFT, not reverse-engineered provider weights.
// None of these probabilities were inferred from seven official sample rounds.
// This sampler is not approved for cash settlement or a production release.
const BURN_CANDIDATE_MATH_VERSION='zplay-burn-wilds-own-candidate-v1';
const BURN_CANDIDATE_OUTER_WEIGHTS=Object.freeze([
  ['orange',150],['lemon',150],['plum',150],['cherry',150],
  ['grapes',140],['watermelon',120],['bell',95],['seven',45]
].map(Object.freeze));
const BURN_CANDIDATE_INNER_WEIGHTS=Object.freeze([
  ['orange',147],['lemon',147],['plum',147],['cherry',147],
  ['grapes',125],['watermelon',105],['bell',85],['seven',40],['wild',57]
].map(Object.freeze));
const BURN_CANDIDATE_WHEEL=Object.freeze([1,3,5,2,4]);

const fail=code=>{throw new TypeError('BURN_CANDIDATE_'+code);};
function validateWeights(weights){
  const sum=weights.reduce((total,[,n])=>total+n,0);
  if(sum<=0||sum>65536||!weights.every(([symbol,weight])=>
    (typeof symbol==='string'||Number.isSafeInteger(symbol))&&Number.isSafeInteger(weight)&&weight>0))fail('WEIGHTS');
  return sum;
}
validateWeights(BURN_CANDIDATE_OUTER_WEIGHTS);
validateWeights(BURN_CANDIDATE_INNER_WEIGHTS);
const wheelWeights=Object.freeze(BURN_CANDIDATE_WHEEL.map(value=>Object.freeze([value,1])));
const clone=value=>structuredClone(value);

function createBurnWildsCandidateSampler({getEntropy=buffer=>globalThis.crypto.getRandomValues(buffer)}={}){
  if(typeof getEntropy!=='function')fail('ENTROPY_REQUIRED');

  // Cryptographic rejection sampling. No modulo bias, Math.random,
  // pre-recorded screenshot outcomes or client-generated result authority.
  function draw(weights){
    const size=validateWeights(weights);
    const limit=65536-(65536%size);
    for(let attempt=0;attempt<1024;attempt++){
      const bytes=new Uint8Array(2);
      const response=getEntropy(bytes);
      if(response!==undefined&&response!==bytes&&
        !(response instanceof Uint8Array))fail('ENTROPY_TYPE');
      const selected=response instanceof Uint8Array?response:bytes;
      if(selected.length!==2)fail('ENTROPY_LENGTH');
      const raw=(selected[0]<<8)|selected[1];
      if(raw>=limit)continue;
      let x=raw%size;
      for(const [value,weight] of weights){
        if(x<weight)return value;
        x-=weight;
      }
      fail('PICK_RANGE');
    }
    fail('ENTROPY_EXHAUSTED');
  }
  function sampleOutcome({gameId,roundId,betMinor}={}){
    if(gameId!==BURN_WILDS_GAME_ID||typeof roundId!=='string'||
      !roundId||roundId.length>200||!Number.isSafeInteger(betMinor)||
      betMinor<10||betMinor%10!==0)fail('INPUT');
    const originalGrid=Array.from({length:5},(_,column)=>
      Array.from({length:3},()=>draw(
        column===0||column===4?BURN_CANDIDATE_OUTER_WEIGHTS:BURN_CANDIDATE_INNER_WEIGHTS
      )));
    const multiplier=draw(wheelWeights);
    const initial=quoteBurnWildsFinalGrid({finalGrid:originalGrid,betMinor,multiplier});
    const expandedColumns=[1,2,3].filter(column=>
      initial.winLines.some(line=>originalGrid[column][line.rows[column]]==='wild'));
    const finalGrid=clone(originalGrid);
    for(const column of expandedColumns)finalGrid[column]=['wild','wild','wild'];
    const finalQuote=quoteBurnWildsFinalGrid({finalGrid,betMinor,multiplier});
    const winLines=finalQuote.winLines.map(({id,rows,winMinor})=>({id,rows:[...rows],winMinor}));
    return {
      originalGrid,finalGrid,expandedColumns,winLines,
      multiplier,winMinor:finalQuote.totalWinMinor
    };
  }
  function maximumPayoutMinor(stakeMinor){
    if(typeof stakeMinor!=='bigint'||stakeMinor<10n||
      stakeMinor%10n!==0n||stakeMinor>BigInt(Number.MAX_SAFE_INTEGER))fail('STAKE');
    return BigInt(quoteBurnWildsLine('seven',5,Number(stakeMinor),5))*5n;
  }
  return Object.freeze({
    gameId:BURN_WILDS_GAME_ID,
    mathVersion:BURN_CANDIDATE_MATH_VERSION,
    approved:false,
    verification:Object.freeze({
      legalOutcomesVerified:false,outcomeDistributionVerified:false,
      aggregatePayoutVerified:false,roundingVerified:false,
      immediateLifecycleVerified:false,etbPolicyVerified:false,
      assetRightsVerified:false
    }),
    sampleOutcome,maximumPayoutMinor,
    // Explicitly no probability-to-RTP claim or operator sign-off.
    verifiedRtp:null,licensedArtwork:false,cashReleaseReady:false
  });
}


return {BURN_CANDIDATE_MATH_VERSION,BURN_CANDIDATE_OUTER_WEIGHTS,BURN_CANDIDATE_INNER_WEIGHTS,BURN_CANDIDATE_WHEEL,createBurnWildsCandidateSampler};
})();

const __burnModule4 = (() => {
const { BURN_WILDS_GAME_ID, validateBurnWildsReceipt } = __burnModule0;

const { createBurnWildsCandidateSampler, BURN_CANDIDATE_MATH_VERSION } = __burnModule3;

const { auditBurnWildsPayout } = __burnModule2;

/**
 * Explicit, ephemeral TEST ETB simulation inside the existing Railway engine.
 * No database, cash wallet, player authentication, payment or ledger is used.
 * This original ZPLAY candidate distribution is NOT the provider's RTP/RNG.
 * Sessions and all their accepted receipts expire and are lost on a restart.
 */
const BURN_TEST_VERSION = 'burn-wilds-server-simulation-20261123-r1';
const BURN_TEST_BASE = '/api/new-games90/burn-wilds/test';
const BURN_TEST_PLAYER_BASE = '/api/slots/new-games90/burn-wilds/test';
const BURN_TEST_BETS = Object.freeze([100, 200, 500, 1000, 2000]);
const MODE = Object.freeze({ mode: 'SIMULATION', currency: 'ETB', cashEnabled: false,
  authenticated: false, simulationOnly: true, gameId: BURN_WILDS_GAME_ID });
const MAX_BODY = 8192, MAX_MONEY = 1_000_000_000, MAX_DOUBLE = 5;
const REQUEST_KEY = /^[A-Za-z0-9-]{16,180}$/;
const TOKEN = /^[a-f0-9]{64}$/;
const copy = value => structuredClone(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const money = value => Number.isSafeInteger(value) && value >= 0 && value <= MAX_MONEY;
const routes = new Map([BURN_TEST_BASE, BURN_TEST_PLAYER_BASE].flatMap(base =>
  ['session', 'state', 'spin', 'take', 'double', 'history', 'logs', 'health'].map(name => [base + '/' + name, name])));

class BurnTestError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
const fail = (code, status) => { throw new BurnTestError(code, status); };
const response = (value, status = 200, extra = {}) => new Response(JSON.stringify(value), { status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
    'x-content-type-options': 'nosniff', ...extra } });

async function readBody(request) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json')
    fail('BURN_TEST_JSON_REQUIRED', 415);
  const declared = request.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY))
    fail('BURN_TEST_BODY_LIMIT', 413);
  if (!request.body) fail('BURN_TEST_BODY_REQUIRED');
  const reader = request.body.getReader(), parts = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > MAX_BODY) fail('BURN_TEST_BODY_LIMIT', 413);
      parts.push(value);
    }
  } finally { try { await reader.cancel(); } catch {} reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  let result;
  try { result = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { fail('BURN_TEST_JSON_INVALID'); }
  if (!object(result)) fail('BURN_TEST_BODY_INVALID');
  return result;
}

function normalizeAction(operation, raw) {
  const action = { spin: 'SPIN', take: 'TAKE', double: 'DOUBLE' }[operation];
  const fields = operation === 'spin' ? ['betMinor', 'auto', 'collectRoundId'] :
    operation === 'take' ? ['roundId'] : ['roundId', 'choice', 'expectedStakeMinor'];
  const allowed = new Set(['gameId', 'action', 'requestKey', 'testSubject', 'replayOnly', ...fields]);
  if (!object(raw) || Object.keys(raw).some(key => !allowed.has(key)) ||
      raw.gameId !== undefined && raw.gameId !== BURN_WILDS_GAME_ID ||
      raw.action !== undefined && raw.action !== action || !REQUEST_KEY.test(raw.requestKey || '') ||
      typeof raw.testSubject !== 'string' || !/^bt_[a-f0-9-]{36}$/i.test(raw.testSubject) ||
      raw.replayOnly !== undefined && typeof raw.replayOnly !== 'boolean')
    fail('BURN_TEST_ACTION_INVALID');
  if (operation === 'spin') {
    if (!BURN_TEST_BETS.includes(raw.betMinor)) fail('BURN_TEST_BET_UNAVAILABLE', 422);
    if (typeof raw.auto !== 'boolean' || raw.collectRoundId !== null &&
        !(typeof raw.collectRoundId === 'string' && REQUEST_KEY.test(raw.collectRoundId)))
      fail('BURN_TEST_SPIN_INVALID');
  } else {
    if (!REQUEST_KEY.test(raw.roundId || '')) fail('BURN_TEST_ROUND_INVALID');
    if (operation === 'double' && (!['RED', 'BLACK'].includes(raw.choice) ||
        !money(raw.expectedStakeMinor) || raw.expectedStakeMinor <= 0)) fail('BURN_TEST_DOUBLE_INVALID');
  }
  const normalized = { gameId: BURN_WILDS_GAME_ID, action, requestKey: raw.requestKey, testSubject: raw.testSubject };
  for (const field of fields) normalized[field] = raw[field];
  return { action: normalized, fingerprint: JSON.stringify(normalized), replayOnly: raw.replayOnly === true };
}

function createBurnTestRuntime({
  playerOrigin = 'https://superwin-player.apdiy61.workers.dev',
  cryptoImpl = globalThis.crypto, now = () => Date.now(), logger = record => console.info(JSON.stringify(record)),
  sessionTtlMs = 2 * 60 * 60 * 1000, maxSessions = 8, maxRounds = 2000, maxActions = 4096,
  initialBalanceMinor = 2_000_000, sampler = null, cardSampler = null
} = {}) {
  const origin = new URL(playerOrigin);
  if (origin.origin !== playerOrigin || origin.protocol !== 'https:' ||
      typeof cryptoImpl?.getRandomValues !== 'function' || typeof cryptoImpl?.randomUUID !== 'function' ||
      typeof now !== 'function' || typeof logger !== 'function' ||
      !Number.isSafeInteger(sessionTtlMs) || sessionTtlMs < 1000 || sessionTtlMs > 24 * 60 * 60 * 1000 ||
      !Number.isSafeInteger(maxSessions) || maxSessions < 1 || maxSessions > 128 ||
      !Number.isSafeInteger(maxRounds) || maxRounds < 1 || maxRounds > 5000 ||
      !Number.isSafeInteger(maxActions) || maxActions < 1 || maxActions > 10000 ||
      !money(initialBalanceMinor) || initialBalanceMinor < BURN_TEST_BETS[0])
    throw new TypeError('BURN_TEST_RUNTIME_CONFIGURATION');
  const model = sampler || createBurnWildsCandidateSampler({ getEntropy: bytes => cryptoImpl.getRandomValues(bytes) });
  if (typeof model.sampleOutcome !== 'function' || typeof model.maximumPayoutMinor !== 'function')
    throw new TypeError('BURN_TEST_MODEL_REQUIRED');
  const sessions = new Map(); let createTimes = [];
  function timestamp() {
    const value = now(); if (!Number.isSafeInteger(value) || value < 0) throw new TypeError('BURN_TEST_CLOCK');
    return value;
  }
  function record(session, event, data = {}) {
    const item = { timestamp: new Date(timestamp()).toISOString(), ...MODE,
      event, testSessionId: session.subject, ...data };
    session.logs.push(item); if (session.logs.length > 200) session.logs.shift();
    // A logging sink cannot change an accepted simulation result. Never log
    // opaque session tokens, request headers, cookies or exception text.
    try { logger(copy(item)); } catch {}
  }
  function canDouble(session) {
    return session.pendingWinMinor > 0 && session.round !== null &&
      session.doubleCount < MAX_DOUBLE && session.pendingWinMinor * 2 + session.balanceMinor <= MAX_MONEY;
  }
  function state(session) {
    return { ...MODE, subject: session.subject, testSessionId: session.subject,
      expiresAt: new Date(session.expiresAt).toISOString(), serverTime: new Date(timestamp()).toISOString(),
      canPlay: session.rounds < maxRounds && session.requests.size < maxActions &&
        session.balanceMinor + session.pendingWinMinor >= BURN_TEST_BETS[0],
      balanceMinor: session.balanceMinor, pendingWinMinor: session.pendingWinMinor,
      betLevelsMinor: [...BURN_TEST_BETS], round: copy(session.round), canDouble: canDouble(session),
      remainingRounds: maxRounds - session.rounds, remainingActions: maxActions - session.requests.size,
      modelVersion: BURN_CANDIDATE_MATH_VERSION, providerProbabilityModel: false, verifiedRtp: null,
      settlementMode: 'SIMULATION_PENDING_WIN', persistence: 'ephemeral-until-expiry-or-restart' };
  }
  function authenticateTest(request) {
    const token = request.headers.get('x-burn-test-session');
    if (!TOKEN.test(token || '')) fail('BURN_TEST_SESSION_REQUIRED', 401);
    const session = sessions.get(token); if (!session) fail('BURN_TEST_SESSION_UNKNOWN', 401);
    if (timestamp() >= session.expiresAt) { sessions.delete(token); fail('BURN_TEST_SESSION_EXPIRED', 410); }
    return session;
  }
  function createSession() {
    const at = timestamp();
    for (const [key, session] of sessions) if (at >= session.expiresAt) sessions.delete(key);
    createTimes = createTimes.filter(value => at - value < 60_000);
    if (sessions.size >= maxSessions || createTimes.length >= 12) fail('BURN_TEST_SESSION_CAPACITY', 429);
    let token;
    for (let tries = 0; tries < 4; tries++) {
      const bytes = cryptoImpl.getRandomValues(new Uint8Array(32));
      token = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
      if (!sessions.has(token)) break;
      token = null;
    }
    if (!token || !TOKEN.test(token)) fail('BURN_TEST_ENTROPY_UNAVAILABLE', 503);
    const session = { subject: 'bt_' + cryptoImpl.randomUUID(), expiresAt: at + sessionTtlMs,
      balanceMinor: initialBalanceMinor, pendingWinMinor: 0, round: null, rounds: 0,
      doubleCount: 0, requests: new Map(), history: [], logs: [], actionTimes: [] };
    sessions.set(token, session); createTimes.push(at);
    record(session, 'test-session-started', { initialTestBalanceMinor: initialBalanceMinor });
    return { ...MODE, testSessionToken: token, state: state(session) };
  }
  function drawCard() {
    if (cardSampler) return cardSampler();
    let index;
    for (let tries = 0; tries < 1024; tries++) {
      const bytes = cryptoImpl.getRandomValues(new Uint8Array(2));
      const value = (bytes[0] << 8) | bytes[1];
      if (value < 65_520) { index = value % 52; break; }
    }
    if (index === undefined) fail('BURN_TEST_ENTROPY_UNAVAILABLE', 503);
    const suit = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'][Math.floor(index / 13)];
    return { rank: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][index % 13],
      suit, color: ['HEARTS', 'DIAMONDS'].includes(suit) ? 'RED' : 'BLACK' };
  }
  function perform(session, operation, raw) {
    const { action, fingerprint, replayOnly } = normalizeAction(operation, raw);
    if (action.testSubject !== session.subject) fail('BURN_TEST_SESSION_SUBJECT_CHANGED', 403);
    const previous = session.requests.get(action.requestKey);
    if (previous) {
      if (previous.fingerprint !== fingerprint) fail('BURN_TEST_IDEMPOTENCY_CONFLICT', 409);
      record(session, 'test-action-replayed', { action: action.action, requestKey: action.requestKey,
        roundId: previous.result.roundId });
      return copy(previous.result);
    }
    if (replayOnly) fail('BURN_TEST_REPLAY_NOT_FOUND', 404);
    if (session.requests.size >= maxActions) fail('BURN_TEST_ACTION_LIMIT', 429);
    const at = timestamp(), recent = session.actionTimes.filter(value => at - value < 60_000);
    if (recent.length >= 120) fail('BURN_TEST_RATE_LIMIT', 429);
    const before = { balanceMinor: session.balanceMinor, pendingWinMinor: session.pendingWinMinor };
    let balance = session.balanceMinor, pending = session.pendingWinMinor,
      round = session.round, doubleCount = session.doubleCount, rounds = session.rounds, result;
    if (operation === 'spin') {
      if (rounds >= maxRounds) fail('BURN_TEST_ROUND_LIMIT', 429);
      if (pending > 0) {
        if (action.collectRoundId !== round?.roundId) fail('BURN_TEST_PENDING_WIN_MUST_BE_COLLECTED', 409);
        balance += pending; pending = 0;
      } else if (action.collectRoundId !== null) fail('BURN_TEST_COLLECTION_CONFLICT', 409);
      if (balance < action.betMinor) fail('BURN_TEST_INSUFFICIENT_BALANCE', 402);
      // Simulated stake is reserved before the server sampler runs; all changes
      // stay in local variables until outcome validation has fully succeeded.
      balance -= action.betMinor;
      const roundId = cryptoImpl.randomUUID();
      const outcome = model.sampleOutcome({ gameId: BURN_WILDS_GAME_ID, roundId, betMinor: action.betMinor });
      round = validateBurnWildsReceipt({ ...outcome, gameId: BURN_WILDS_GAME_ID, roundId,
        clientToken: action.requestKey, betMinor: action.betMinor, balanceMinor: balance });
      auditBurnWildsPayout(round);
      if (BigInt(round.winMinor) > model.maximumPayoutMinor(BigInt(action.betMinor)))
        fail('BURN_TEST_PAYOUT_LIMIT', 503);
      pending = round.winMinor; doubleCount = 0; rounds++;
      if (!money(balance + pending)) fail('BURN_TEST_BALANCE_LIMIT', 409);
      result = { ...copy(round), ...MODE, requestKey: action.requestKey, subject: session.subject,
        balanceMinor: balance, pendingWinMinor: pending, canDouble: pending > 0 && balance + pending * 2 <= MAX_MONEY,
        modelVersion: BURN_CANDIDATE_MATH_VERSION, providerProbabilityModel: false,
        settlementMode: 'SIMULATION_PENDING_WIN', collectedRoundId: action.collectRoundId };
    } else {
      if (!round || action.roundId !== round.roundId || pending <= 0)
        fail('BURN_TEST_NO_PENDING_WIN', 409);
      if (operation === 'take') {
        const collectedMinor = pending; balance += pending; pending = 0;
        if (!money(balance)) fail('BURN_TEST_BALANCE_LIMIT', 409);
        result = { ...MODE, requestKey: action.requestKey, roundId: round.roundId, subject: session.subject,
          balanceMinor: balance, pendingWinMinor: 0, canDouble: false, collected: true, collectedMinor };
      } else {
        if (action.expectedStakeMinor !== pending) fail('BURN_TEST_PENDING_STAKE_CHANGED', 409);
        if (!canDouble(session)) fail('BURN_TEST_DOUBLE_LIMIT', 409);
        const card = drawCard();
        if (!object(card) || !['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'].includes(card.suit) ||
            !['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].includes(card.rank) ||
            card.color !== (['HEARTS', 'DIAMONDS'].includes(card.suit) ? 'RED' : 'BLACK'))
          fail('BURN_TEST_CARD_INVALID', 503);
        const stakeMinor = pending, won = action.choice === card.color;
        pending = won ? pending * 2 : 0; doubleCount++;
        result = { ...MODE, requestKey: action.requestKey, roundId: round.roundId, subject: session.subject,
          choice: action.choice, won, stakeMinor, payoutMinor: pending, card: copy(card),
          balanceMinor: balance, pendingWinMinor: pending,
          canDouble: pending > 0 && doubleCount < MAX_DOUBLE && balance + pending * 2 <= MAX_MONEY,
          doubleCount, gambleModel: 'zplay-test-fair-card-colour-v1' };
      }
    }
    // No await occurs in validation/commit: overlapping input is serialized by
    // this process and the original accepted request is stored before response.
    session.balanceMinor = balance; session.pendingWinMinor = pending;
    session.round = copy(round); session.doubleCount = doubleCount; session.rounds = rounds;
    session.actionTimes = [...recent, at];
    session.requests.set(action.requestKey, { fingerprint, result: copy(result) });
    const entry = { action: action.action, requestKey: action.requestKey, roundId: result.roundId,
      ...(operation === 'spin' ? { betMinor: action.betMinor, winMinor: result.winMinor,
        multiplier: result.multiplier, auto: action.auto } : {}),
      ...(operation === 'take' ? { collectedMinor: result.collectedMinor } : {}),
      ...(operation === 'double' ? { choice: result.choice, won: result.won,
        stakeMinor: result.stakeMinor, payoutMinor: result.payoutMinor, card: result.card } : {}),
      balanceMinor: balance, pendingWinMinor: pending };
    session.history.push({ timestamp: new Date(at).toISOString(), ...MODE, ...copy(entry) });
    if (session.history.length > 1000) session.history.shift();
    record(session, 'test-action-accepted', { ...entry, before });
    return copy(result);
  }
  return Object.freeze({
    handles: request => routes.has(new URL(request.url).pathname),
    async fetch(request) {
      const url = new URL(request.url), operation = routes.get(url.pathname);
      if (!operation) return null;
      const method = ['session', 'spin', 'take', 'double'].includes(operation) ? 'POST' : 'GET';
      if (request.method !== method) return response({ ...MODE, code: 'METHOD_NOT_ALLOWED',
        definitiveRejection: true }, 405, { allow: method });
      try {
        if (url.search) fail('BURN_TEST_QUERY_NOT_ALLOWED');
        const requestOrigin = request.headers.get('origin');
        if (method === 'POST' ? requestOrigin !== playerOrigin : requestOrigin !== null && requestOrigin !== playerOrigin)
          fail('BURN_TEST_ORIGIN_REJECTED', 403);
        if (operation === 'health') return response({ ...MODE, version: BURN_TEST_VERSION,
          status: 'ready', serverAuthoritative: true, existingService: true,
          productionWalletUsed: false, databaseUsed: false, providerProbabilityModel: false,
          verifiedRtp: null, betLevelsMinor: [...BURN_TEST_BETS],
          persistence: 'ephemeral-until-expiry-or-restart', sessionTtlMs, maxSessions, maxRounds, maxActions });
        if (operation === 'session') {
          const body = await readBody(request);
          if (body.mode !== 'SIMULATION' || Object.keys(body).some(key => key !== 'mode'))
            fail('BURN_TEST_EXPLICIT_SIMULATION_REQUIRED');
          return response(createSession(), 201);
        }
        const session = authenticateTest(request);
        if (operation === 'state') return response(state(session));
        if (operation === 'history' || operation === 'logs') return response({ ...MODE,
          subject: session.subject, expiresAt: new Date(session.expiresAt).toISOString(),
          records: copy(session[operation]),
          ...(operation === 'history' ? { history: copy(session.history) } : {}) });
        return response(perform(session, operation, await readBody(request)));
      } catch (error) {
        const known = error instanceof BurnTestError;
        return response({ ...MODE, code: known ? error.code : 'BURN_TEST_UNAVAILABLE',
          definitiveRejection: known }, known ? error.status : 503);
      }
    }
  });
}

/** Compose with the retained runtime fetch; preserve unrelated input identity. */
function bindBurnTestFetch(existingFetch, options) {
  if (typeof existingFetch !== 'function') throw new TypeError('BURN_TEST_EXISTING_FETCH_REQUIRED');
  const runtime = createBurnTestRuntime(options);
  return function(request, ...args) {
    return runtime.handles(request) ? runtime.fetch(request) : existingFetch.call(this, request, ...args);
  };
}

return {BURN_TEST_VERSION,BURN_TEST_BASE,BURN_TEST_PLAYER_BASE,BURN_TEST_BETS,BurnTestError,createBurnTestRuntime,bindBurnTestFetch};
})();

export const {BURN_TEST_VERSION,BURN_TEST_BASE,BURN_TEST_PLAYER_BASE,BURN_TEST_BETS,BurnTestError,createBurnTestRuntime,bindBurnTestFetch} = __burnModule4;
