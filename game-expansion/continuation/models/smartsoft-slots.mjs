import sourceModels from './smartsoft-slots.data.json' with {type:'json'};

// These immutable versions use independent ZPLAY sampling. Public provider rules,
// geometry and coefficient references do not establish the provider's private RNG.
const fail=(code,status=422)=>{throw Object.assign(new Error(code),{status});};
const clone=value=>structuredClone(value);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const integer=value=>typeof value==='string'&&/^(0|[1-9]\d*)$/.test(value);
const decimalMinor=value=>{if(typeof value!=='string'||!/^(0|[1-9]\d*)\.\d{2}$/.test(value))fail('INVALID_MODEL_MONEY',500);return BigInt(value.replace('.',''));};
const random=rng=>{const x=rng();if(!Number.isFinite(x)||x<0||x>=1)fail('INVALID_SERVER_RANDOM',500);return x;};
const pick=(rng,n)=>Math.floor(random(rng)*n);
const byId=Object.fromEntries(sourceModels.map(model=>[model.id,freeze(model)]));
const lookups=new Map();

function payoutCeiling(model,stake){
 const absolute=decimalMinor(model.maxWin);
 if(model.winMultiplierCap===undefined)return absolute;
 if(!integer(String(model.winMultiplierCap)))fail('INVALID_MODEL_WIN_MULTIPLIER',500);
 const relative=stake*BigInt(model.winMultiplierCap);
 return relative<absolute?relative:absolute;
}

// Pure exact-money primitive, also exposed for isolated boundary verification.
// Draw once only for a non-integral, uncapped TOTAL; never round each line.
export function roundPayoutMinor(numerator,denominator,cap,rng){
 if(typeof numerator!=='bigint'||typeof denominator!=='bigint'||typeof cap!=='bigint'||numerator<0n||denominator<=0n||cap<0n)fail('INVALID_PAYOUT_RATIO',500);
 if(numerator>=cap*denominator)return cap;
 let total=numerator/denominator;
 if(numerator%denominator>0n&&random(rng)<Number(numerator%denominator)/Number(denominator))total++;
 return total;
}

// A single sequence receives its largest left-to-right award. Wild substitutions
// are evaluated against all eligible paying symbols; scatter symbols never substitute.
export function evaluateSequence(sequence,modelOrId){
 const model=typeof modelOrId==='string'?byId[modelOrId]:modelOrId;
 if(!model)fail('GAME_NOT_FOUND',404);
 let best={units:0,symbol:-1,count:0};
 for(let symbol=0;symbol<model.coefficients.length;symbol++){
  if(model.scatters.some(scatter=>scatter.symbol===symbol))continue;
  const coeff=model.coefficients[symbol];let count=0;
  for(const value of sequence){
   const substitutes=model.wildSymbols.includes(value)&&!model.wildExclusions.includes(symbol);
   if(value!==symbol&&!substitutes)break;
   count++;
  }
  // A two-symbol award is possible only where the displayed table contains it.
  for(let n=2;n<=count;n++){
   const units=coeff[n]??0;
   if(units>best.units)best={units,symbol,count:n};
  }
 }
 return best;
}

// The lookup is an optimization of evaluateSequence, with every outcome enumerated.
// It contains public award rules, never future RNG results or a player-specific profile.
function lookup(model){
 if(lookups.has(model.id))return lookups.get(model.id);
 const n=model.symbols.length,total=n**model.columns,units=new Uint32Array(total),symbols=new Uint8Array(total),counts=new Uint8Array(total);
 const seq=new Array(model.columns);
 for(let code=0;code<total;code++){
  let k=code;for(let c=0;c<model.columns;c++){seq[c]=k%n;k=Math.floor(k/n);}
  const a=evaluateSequence(seq,model);units[code]=a.units;symbols[code]=a.symbol<0?255:a.symbol;counts[code]=a.count;
 }
 const result={units,symbols,counts,n};lookups.set(model.id,result);return result;
}

function evaluateLines(grid,model){
 const table=lookup(model),wins=[];
 for(let line=0;line<model.paths.length;line++){
  const path=model.paths[line];let code=0,power=1;
  for(let c=0;c<model.columns;c++){code+=grid[c][path[c]]*power;power*=table.n;}
  if(table.units[code])wins.push({line:line+1,symbol:table.symbols[code],count:table.counts[code],units:table.units[code],cells:path.slice(0,table.counts[code]).map((row,c)=>[c,row])});
 }
 return wins;
}

function sampleGrid(model,rng,frozen,previous){
 return Array.from({length:model.columns},(_,c)=>frozen?.has(c)?previous[c].slice():Array.from({length:model.rows},()=>{
  const pool=model.sampling[c];return pool[pick(rng,pool.length)];
 }));
}

// The official client animates every cell whose final BarabanExpanded becomes
// wild. There is no one-added-cell restriction in that public presentation
// contract. This pure transformation leaves the private trigger distribution
// to the explicitly independent, currently disabled draft sampler.
export function applyAddedWilds(grid,cells,wildSymbol=0){
 const result=clone(grid),added=[];
 for(const cell of cells){
  if(!Array.isArray(cell)||cell.length!==2||!cell.every(Number.isInteger))fail('INVALID_ADDED_WILD_CELL',500);
  const [reel,row]=cell;
  if(!Array.isArray(result[reel])||row<0||row>=result[reel].length)fail('INVALID_ADDED_WILD_CELL',500);
  if(result[reel][row]!==wildSymbol){result[reel][row]=wildSymbol;added.push([reel,row]);}
 }
 return {grid:result,addedWilds:added};
}

function burningExpand(grid,model,rng,initial,frozen){
 const expandedReels=[],coinReels=[];
 const isScatter=s=>model.scatters.some(scatter=>scatter.symbol===s);
 for(const c of model.expandingReels){
  if(frozen?.has(c))continue;
  if(grid[c].includes(0)){
   grid[c]=grid[c].map(s=>isScatter(s)?s:0);expandedReels.push(c);
  }
 }
 if(initial&&model.coinChanceDenominator&&pick(rng,model.coinChanceDenominator)===0){
  const c=model.coinReels[pick(rng,model.coinReels.length)];
  grid[c]=grid[c].map(s=>isScatter(s)?s:model.coinWildSymbol);coinReels.push(c);
 }
 return {expandedReels,coinReels};
}

function scatterAwards(grid,model){
 return model.scatters.flatMap(scatter=>{
  const cells=[];
  for(const c of scatter.reels){
   for(let row=0;row<model.rows;row++)if(grid[c][row]===scatter.symbol){
    cells.push([c,row]);if(scatter.mode==='reels')break;
   }
  }
  const actualCount=cells.length,count=Math.min(actualCount,model.coefficients[scatter.symbol].length-1);
  const coefficient=count>=scatter.minCount?(model.coefficients[scatter.symbol][count]??0):0;
  return coefficient?[{symbol:scatter.symbol,count,actualCount,cells,units:coefficient*model.lineStakeDivisor,scatter:true}]:[];
 });
}

// All bonus results are resolved within the accepted server transaction. The
// optional trace only removes presentation allocation during offline calibration.
export function sampleOutcome(id,rng,{trace=true}={}){
 const model=byId[id];if(!model)fail('GAME_NOT_FOUND',404);
 let grid=sampleGrid(model,rng),rawUnits=0;
 const frames=[],awards=[];
 if(model.mechanic==='freeze-respin'){
  const frozen=new Set(),paidLines=new Array(model.paths.length).fill(0),paidScatters=new Map();
  for(let frame=0;frame<model.maxFrames;frame++){
   const effect=burningExpand(grid,model,rng,frame===0,frozen);
   const current=evaluateLines(grid,model),fresh=[];
   for(const win of current){
    const previous=paidLines[win.line-1];
    if(win.units<=previous)continue;
    paidLines[win.line-1]=win.units;
    const delta={...win,units:win.units-previous,frame};fresh.push(delta);
    for(const [c]of win.cells)frozen.add(c);
   }
   for(const scatter of scatterAwards(grid,model)){
    const previous=paidScatters.get(scatter.symbol)??0;
    if(scatter.units<=previous)continue;
    fresh.push({...scatter,units:scatter.units-previous,frame});paidScatters.set(scatter.symbol,scatter.units);
    for(const [c]of scatter.cells)frozen.add(c);
   }
   const frameUnits=fresh.reduce((sum,w)=>sum+w.units,0);rawUnits+=frameUnits;awards.push(...fresh);
   const feature={type:'freeze-respin',step:frame,frozenReels:[...frozen].sort(),...effect};
   if(trace)frames.push({grid:clone(grid),awards:clone(fresh),feature,rawUnits:frameUnits});
   // Frozen awards are not paid a second time. A new or improved line earns one
   // further automatic respin; an unchanged result, full freeze or bound ends it.
   if(!fresh.length||frozen.size===model.columns||frame+1===model.maxFrames)break;
   grid=sampleGrid(model,rng,frozen,grid);
  }
  return {grid,awards,frames,rawUnits,feature:trace?frames.at(-1).feature:{type:'freeze-respin'}};
 }
 const multiplier=1+pick(rng,5);let addedWilds=[],beforeWildGrid=null;
 if(model.mechanic==='super-wild'){
  const mask=[];beforeWildGrid=clone(grid);
  for(let c=0;c<model.columns;c++)for(let r=0;r<model.rows;r++){
   if(pick(rng,model.addWildChanceDenominator)===0)mask.push([c,r]);
  }
  const transformed=applyAddedWilds(grid,mask);grid=transformed.grid;addedWilds=transformed.addedWilds;
 }
 const feature={type:model.mechanic,multiplier};
 if(model.mechanic==='super-wild'){
  feature.addedWilds=addedWilds;
  if(trace&&addedWilds.length)frames.push({grid:beforeWildGrid,awards:[],feature:{type:'super-wild-before',multiplier},rawUnits:0});
 }
 if(model.mechanic==='safari-multiplier'){
  const symbol=grid[0][0],expandedReels=[];
  if([4,5,6].includes(symbol))for(let c=0;c<model.columns;c++){
   if(grid[c].every(s=>s===symbol))expandedReels.push(c);else break;
  }
  feature.expandedReels=expandedReels;
 }
 for(const win of evaluateLines(grid,model))awards.push({...win,units:win.units*multiplier,frame:trace?frames.length:0});
 rawUnits=awards.reduce((sum,w)=>sum+w.units,0);
 if(trace)frames.push({grid:clone(grid),awards:clone(awards),feature,rawUnits});
 return {grid,awards,frames,rawUnits,feature};
}

function paidOutcome(model,outcome,stake,rng){
 const scaleN=BigInt(model.scale.numerator),scaleD=BigInt(model.scale.denominator),denominator=10n*BigInt(model.lineStakeDivisor)*scaleD;
 const amounts=outcome.awards.map(w=>({win:w,numerator:stake*BigInt(w.units)*scaleN}));
 const cap=payoutCeiling(model,stake);
 const raw=amounts.reduce((sum,a)=>sum+a.numerator,0n),capped=raw>cap*denominator;
 const total=roundPayoutMinor(raw,denominator,cap,rng);
 // One unbiased whole-santim rounding draw for the TOTAL, using the existing
 // committed server RNG after all outcome draws. Exact integers and capped
 // totals need no draw. Largest-remainder allocation then preserves this total.
 const allocation=amounts.map(a=>raw?{...a,paid:a.numerator*total/raw,remainder:a.numerator*total%raw}:{...a,paid:0n,remainder:0n});
 let remaining=total-allocation.reduce((sum,a)=>sum+a.paid,0n);
 for(const a of allocation.slice().sort((a,b)=>a.remainder>b.remainder?-1:a.remainder<b.remainder?1:0)){
  if(remaining===0n)break;a.paid++;remaining--;
 }
 const wins=allocation.filter(a=>a.paid>0n).map(({win,paid})=>({symbol:String(win.symbol),count:win.count,cells:clone(win.cells),...(win.line?{line:win.line}:{}),...(win.scatter?{scatter:true}:{}),frame:win.frame,payoutMinor:String(paid)}));
 const frames=outcome.frames.map((frame,i)=>({grid:frame.grid.map(reel=>reel.map(String)),wins:wins.filter(w=>w.frame===i),feature:clone(frame.feature),payoutMinor:String(wins.filter(w=>w.frame===i).reduce((sum,w)=>sum+BigInt(w.payoutMinor),0n))}));
 return {payoutMinor:String(total),grid:outcome.grid.map(reel=>reel.map(String)),wins,frames,feature:{...clone(outcome.feature),capped}};
}

function reserveFor(model,stake){
 const lineMax=Math.max(0,...model.coefficients.flatMap((row,symbol)=>model.scatters.some(s=>s.symbol===symbol)?[]:row));
 const scatterMax=model.scatters.reduce((sum,scatter)=>sum+Math.max(...model.coefficients[scatter.symbol]),0);
 // A respin pays only increases over the largest prior award on each line.
 // Consequently the total round bound is one maximum award per line, plus
 // one maximum award per scatter symbol. It does not depend on the outcome.
 const multiplier=model.mechanic==='freeze-respin'?1:5;
 const rawMax=BigInt(lineMax*model.paths.length*multiplier+scatterMax*model.lineStakeDivisor);
 const numerator=stake*rawMax*BigInt(model.scale.numerator),denominator=10n*BigInt(model.lineStakeDivisor)*BigInt(model.scale.denominator);
 const maximum=(numerator+denominator-1n)/denominator;
 const cap=payoutCeiling(model,stake);
 return String(maximum>cap?cap:maximum);
}

function publicConfig(model){
 const scaleN=BigInt(model.scale.numerator),scaleD=BigInt(model.scale.denominator);
 return {id:model.id,name:model.name,type:'slots',launchable:model.launchable,columns:model.columns,rows:model.rows,paylines:model.ways?0:model.paths.length,...(model.ways?{ways:model.ways}:{}),...(model.winMultiplierCap?{maxWinMultiplier:model.winMultiplierCap}:{}),paylinePaths:clone(model.paths),symbols:clone(model.symbols),theme:clone(model.theme),featureDescription:model.featureDescription,version:model.version,actions:[],minStake:model.minStake,maxStake:model.maxStake,stakeValues:model.stakeMinorValues.map(value=>`${BigInt(value)/100n}.${String(BigInt(value)%100n).padStart(2,'0')}`),stakeMinorValues:clone(model.stakeMinorValues),referenceStakeSchedule:clone(model.referenceStakeSchedule),referenceLimits:clone(model.referenceLimits),currencyAdaptation:clone(model.currencyAdaptation),maxWin:model.maxWin,officialReference:model.officialReference,officialPrivateMathVerified:false,releaseGate:clone(model.releaseGate),referenceNotes:clone(model.referenceNotes),math:clone(model.math),paytable:model.coefficients.map((counts,symbol)=>({symbol:String(symbol),basis:model.scatters.some(s=>s.symbol===symbol)?'total stake':model.ways?'total stake per winning way':'stake divided by '+model.lineStakeDivisor,counts:Object.fromEntries(counts.flatMap((value,count)=>value?[[count,{numerator:String(BigInt(value)*scaleN),denominator:String(10n*scaleD),value:Number(BigInt(value)*scaleN)/Number(10n*scaleD)}]]:[]))})),rules:clone(model.rules)};
}
export const publicGames=freeze(sourceModels.map(publicConfig));
export const publicGameConfigs=freeze(Object.fromEntries(publicGames.map(game=>[game.id,game])));
export const definitions=freeze(Object.fromEntries(publicGames.map(game=>[game.id,{...game,math:game.math.description}])));

export function start(gameId,options,rng,now){
 const model=byId[gameId];if(!model)fail('GAME_NOT_FOUND',404);
 if(!model.launchable)fail('GAME_MODEL_NOT_READY',409);
 return evaluateDraftRound(gameId,options,rng,now);
}

// Pure verification entry point for an isolated test database. It has no wallet,
// network or persistence access. Production routing must use start(), whose
// release gate remains mandatory even while draft rules are being verified.
export function evaluateDraftRound(gameId,options,rng,now){
 const model=byId[gameId];if(!model)fail('GAME_NOT_FOUND',404);
 if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>k!=='stakeMinor')||!integer(options.stakeMinor))fail('INVALID_SLOT_OPTIONS');
 const stake=BigInt(options.stakeMinor);if(!model.stakeMinorValues.includes(options.stakeMinor))fail('STAKE_NOT_IN_REFERENCE_SCHEDULE');
 if(!Number.isSafeInteger(now)||now<0)fail('INVALID_SERVER_TIME',500);
 const paid=paidOutcome(model,sampleOutcome(gameId,rng),stake,rng);
 const liabilityMinor=reserveFor(model,stake);
 const state={gameId,modelVersion:model.version,family:'slots',status:'settled',stakeMinor:String(stake),startedAt:now,settledAt:now,expiresAt:now,liabilityMinor,...paid};
 return {state,debitMinor:String(stake),maxPayoutMinor:liabilityMinor,payoutMinor:paid.payoutMinor};
}
export function act(state,input,rng,now){fail('ROUND_ALREADY_SETTLED',409);}
export function expire(state,rng,now){
 const model=byId[state?.gameId];
 if(!model||state.modelVersion!==model.version||state.status!=='settled'||!integer(state.payoutMinor)||BigInt(state.payoutMinor)>payoutCeiling(model,BigInt(state.stakeMinor)))fail('INVALID_SLOT_STATE',500);
 return {state:clone(state),debitMinor:'0',maxPayoutMinor:state.liabilityMinor,payoutMinor:state.payoutMinor};
}
export function publicState(state,now){
 const {gameId,modelVersion,family,status,stakeMinor,startedAt,settledAt,expiresAt,payoutMinor,grid,wins,frames,feature}=state;
 return clone({gameId,modelVersion,family,status,stakeMinor,startedAt,settledAt,expiresAt,payoutMinor,grid,wins,frames,feature});
}
