export const BURN_WILDS_GAME_ID='zplay72_multi_hot_5_burn_wilds_v1';
export const BURN_WILDS_SYMBOLS=Object.freeze(['orange','lemon','plum','grapes','cherry','watermelon','bell','seven','wild']);
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
export function validateBurnWildsReceipt(source) {
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
export class BurnWildsExpansion {
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
